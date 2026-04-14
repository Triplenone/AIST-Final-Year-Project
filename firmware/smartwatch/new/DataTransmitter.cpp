#include "DataTransmitter.h"
#include "NavigationManager.h"
#include "FlightInfoManager.h"
#include "VoiceMessageManager.h"
#include <time.h>
#include <esp_system.h>
#include <ArduinoJson.h>

// ================ 构造函数 ================
// 构造函数中修复 MAC 地址获取
DataTransmitter::DataTransmitter(MyNetworkManager* net, IMUManager* imu_mgr,
                               FallDetection* fall_det, BLELocation* ble_loc,
                               PowerManager* pwr)
    : network(net), imu(imu_mgr), fall_detector(fall_det),
      ble_location(ble_loc), power(pwr),
      nav_manager(nullptr), flight_manager(nullptr), voice_manager(nullptr),
      relative_time(0), last_transmit(0), transmit_interval(5000),
      mqttClient(mqttWifiClient), mqttEnabled(false),
      target_x(0), target_y(0), target_name(""), navigation_active(false),
      sos_active(false), sos_trigger_time(0), sos_trigger_count(0), sos_trigger_method("none"),
      door_count(0), night_mode_active(false), light_triggered_tonight(false),
      movement_threshold(2.0), heartbeat_detected(false), heartbeat_interval(30000),
      current_x(0), current_y(0), accuracy(0), beacon_count(0), location_quality("unknown"),
      last_beacon_count(0), log_index(0), log_count(0), ble_scanning_active(false) {
    
    // 生成唯一的设备ID - 修复 MAC 地址获取
    uint8_t mac[6];
    
    // 使用 WiFi.macAddress() 获取 MAC
    String macStr = WiFi.macAddress();
    if (macStr.length() > 0 && macStr != "00:00:00:00:00:00") {
        macStr.replace(":", "");
        device_id = "ESP32_" + macStr;
    } else {
        // 备用方法：使用 ESP.getEfuseMac()
        uint64_t chipId = ESP.getEfuseMac();
        char deviceId[32];
        snprintf(deviceId, sizeof(deviceId), "ESP32_%08X%08X", 
                 (uint32_t)(chipId >> 32), (uint32_t)chipId);
        device_id = String(deviceId);
    }
    
    // 初始化传感器数据
    heart_rate = {0, 0.0, 0, false};
    spo2 = {0, 0.0, 0, false};
    
    // 设置夜间时间 (20:00 - 07:00)
    night_start_time = 20 * 3600;
    night_end_time = 7 * 3600;
    
    // 初始化日志
    for (int i = 0; i < MAX_LOG_ENTRIES; i++) {
        log_entries[i].level = "";
        log_entries[i].message = "";
        log_entries[i].timestamp = 0;
    }

    rfMutex = xSemaphoreCreateMutex();
    
    Serial.printf("DataTransmitter初始化完成, 设备ID: %s\n", device_id.c_str());
}

// ================ 设置 MQTT 配置 ================
void DataTransmitter::setMQTTConfig(const String& server, int port, 
                                     const String& user, const String& password) {
    mqttServer = server;
    mqttPort = port;
    mqttUser = user;
    mqttPassword = password;
    
    mqttClient.setServer(mqttServer.c_str(), mqttPort);
    mqttClient.setCallback([this](char* topic, byte* payload, unsigned int length) {
        // 将 payload 转换为字符串
        char message[length + 1];
        memcpy(message, payload, length);
        message[length] = '\0';
        this->handleMQTTMessage(String(topic), String(message));
    });
    
    mqttEnabled = true;
    Serial.println("MQTT 配置完成");
}

// ================ 获取设备主题 ================
String DataTransmitter::getDeviceTopic(const char* baseTopic) {
    Serial.printf("getDeviceTopic: base=%s, device=%s\n", baseTopic, device_id.c_str());    
    char topic[128];
    snprintf(topic, sizeof(topic), baseTopic, device_id.c_str());
    return String(topic);
}

// ================ 确保 MQTT 连接 ================
bool DataTransmitter::ensureMQTTConnected() {
    if (!mqttEnabled) return false;
    
    if (!network || !network->isConnected()) return false;
    
    if (mqttClient.connected()) return true;
    
    Serial.printf("连接 MQTT 服务器 %s:%d...\n", mqttServer.c_str(), mqttPort);
    
    // ===== 关键：设置超大缓冲区（10KB）=====
    mqttClient.setBufferSize(10240);  // 10KB 缓冲区
    
    mqttClient.setKeepAlive(30);       // 30秒保活
    
    String clientId = "ESP32_" + String(random(0xffff), HEX) + "_" + String(millis() % 10000);
    
    bool connected = mqttClient.connect(clientId.c_str());
    
    if (connected) {
        Serial.println("✅ MQTT 连接成功");
        String subscribeTopic = "smartwatch/" + device_id + "/#";
        mqttClient.subscribe(subscribeTopic.c_str());
        return true;
    } else {
        Serial.printf("❌ MQTT 连接失败, 状态码: %d\n", mqttClient.state());
        return false;
    }
}

// ================ 发布到 MQTT（两个参数，默认不保留） ================
bool DataTransmitter::publishToMQTT(const String& topic, const String& payload) {
    return publishToMQTT(topic, payload, false);
}

// ================ 发布到 MQTT（三个参数，带重试机制） ================
bool DataTransmitter::publishToMQTT(const String& topic, const String& payload, bool retained) {
    if (!ensureMQTTConnected()) {
        Serial.println("MQTT 未连接");
        return false;
    }
    
    // 检查数据大小
    int payloadSize = payload.length();
    int maxSize = mqttClient.getBufferSize();
    
    Serial.printf("数据大小: %d 字节, 缓冲区: %d 字节\n", payloadSize, maxSize);
    
    if (payloadSize > maxSize) {
        Serial.printf("❌ 数据太大！需要 %d 字节，但缓冲区只有 %d 字节\n", 
                     payloadSize, maxSize);
        return false;
    }
    
    // 发布
    bool success = mqttClient.publish(topic.c_str(), payload.c_str(), retained);
    
    if (success) {
        Serial.println("✅ 发布成功");
    } else {
        Serial.printf("❌ 发布失败, 状态码: %d\n", mqttClient.state());
    }
    
    return success;
}

// ================ MQTT 循环 ================
void DataTransmitter::mqttLoop() {
    if (mqttEnabled && mqttClient.connected()) {
        mqttClient.loop();
    }
}

// ================ 处理 MQTT 消息 ================
void DataTransmitter::handleMQTTMessage(const String& topic, const String& payload) {
    Serial.printf("MQTT 收到 [%s]: %s\n", topic.c_str(), payload.c_str());
    
    // 解析 JSON
    DynamicJsonDocument doc(4096);
    DeserializationError error = deserializeJson(doc, payload);
    
    if (error) {
        Serial.printf("JSON 解析失败: %s\n", error.c_str());
        return;
    }
    
    // 根据主题类型处理
    if (topic.endsWith("/navigation")) {
        if (nav_manager) {
            nav_manager->parseNavigationPlan(payload);
        }
        
        // 处理导航命令
        if (doc.containsKey("navigation")) {
            JsonObject nav = doc["navigation"];
            String action = nav["action"] | "";
            
            if (action == "set_target") {
                JsonObject target = nav["target"];
                float x = target["x"] | 0.0;
                float y = target["y"] | 0.0;
                String name = target["name"] | "";
                setTargetPosition(x, y, name);
                setNavigationActive(true);
                
                addLog("info", "Navigation target set: " + name);
            }
        }
    }
    else if (topic.endsWith("/flight")) {
        if (flight_manager) {
            flight_manager->parseFlightInfo(payload);
            addLog("info", "Flight info updated");
        }
    }
    else if (topic.endsWith("/voice")) {
        if (voice_manager) {
            voice_manager->parseIncomingMessage(payload);
            addLog("info", "Voice message received");
        }
    }
    else if (topic.endsWith("/alert")) {
        if (doc.containsKey("alerts") && doc["alerts"].size() > 0) {
            JsonObject alert = doc["alerts"][0];
            String title = alert["title"] | "Alert";
            String message = alert["message"] | "";
            
            addLog("warning", title + ": " + message);
            
            // 这里可以触发显示和声音
        }
    }
    else if (topic.endsWith("/door_control")) {
        if (doc.containsKey("door_control")) {
            JsonObject door = doc["door_control"];
            String door_id = door["door_id"] | "";
            String action = door["action"] | "";
            
            Serial.printf("Door control: %s %s\n", door_id.c_str(), action.c_str());
            addLog("info", "Door " + action + ": " + door_id);
        }
    }
    else if (topic.endsWith("/light_control")) {
        if (doc.containsKey("light_control")) {
            JsonObject light = doc["light_control"];
            String action = light["action"] | "";
            int brightness = light["brightness"] | 80;
            
            Serial.printf("Light control: %s (%d%%)\n", action.c_str(), brightness);
            addLog("info", "Light " + action);
        }
    }
    else if (topic.endsWith("/system_command")) {
        if (doc.containsKey("system_command")) {
            JsonObject sys = doc["system_command"];
            String command = sys["command"] | "";
            
            if (command == "restart") {
                addLog("info", "System restart command received");
                delay(1000);
                ESP.restart();
            } else if (command == "sleep") {
                // 进入睡眠模式
            } else if (command == "sync_time") {
                // 同步时间
            }
        }
    }
    else if (topic.endsWith("/config")) {
        if (doc.containsKey("config_update")) {
            JsonObject config = doc["config_update"];
            
            // 更新门禁配置
            if (config.containsKey("door_triggers")) {
                // 更新门禁配置
            }
            
            // 更新夜间模式配置
            if (config.containsKey("night_mode")) {
                JsonObject night = config["night_mode"];
                movement_threshold = night["movement_threshold"] | 2.0;
            }
            
            addLog("info", "Configuration updated");
        }
    }
    else if (topic.endsWith("/heartbeat")) {
        if (doc.containsKey("heartbeat_response")) {
            JsonObject hb = doc["heartbeat_response"];
            int next_check = hb["next_check"] | 5000;
            heartbeat_interval = next_check;
        }
    }
    else if (topic.endsWith("/text")) {
        if (doc.containsKey("text_message")) {
            JsonObject txt = doc["text_message"];
            String sender = txt["sender"] | "Unknown";
            String text = txt["text"] | "";
            
            Serial.printf("Text from %s: %s\n", sender.c_str(), text.c_str());
            addLog("info", "Message from " + sender + ": " + text);
        }
    }
}

// ================ 获取导航 JSON ================
String DataTransmitter::getNavigationJSON() {
    String json = "{";
    json += "\"x\":" + String(target_x, 2) + ",";
    json += "\"y\":" + String(target_y, 2) + ",";
    json += "\"name\":\"" + target_name + "\",";
    
    if (navigation_active && ble_location) {
        float distance = calculateDistanceToTarget();
        String direction = calculateDirectionToTarget();
        float bearing = atan2(target_y - ble_location->getLocation().y, 
                              target_x - ble_location->getLocation().x) * 180 / PI;
        
        json += "\"distance\":" + String(distance, 2) + ",";
        json += "\"direction\":\"" + direction + "\",";
        json += "\"bearing\":" + String(bearing, 1) + ",";
        json += "\"eta\":" + String((int)(distance / 1.4));
    } else {
        json += "\"distance\":0.0,\"direction\":\"none\",\"bearing\":0,\"eta\":0";
    }
    
    json += "}";
    return json;
}

// ================ 获取所有数据的完整JSON ================
String DataTransmitter::getAllDataJSON() {
    String json = "{";
    
    // 基础信息
    json += "\"device_id\":\"" + device_id + "\",";
    json += "\"timestamp\":" + String(millis() / 1000) + ",";
    json += "\"data_type\":\"status_update\",";
    
    // ============ 1. Location Information ============
    json += "\"location\":{";
    
    // current location
    json += "\"current\":{";
    json += "\"x\":" + String(current_x, 2) + ",";
    json += "\"y\":" + String(current_y, 2) + ",";
    json += "\"accuracy\":" + String(accuracy, 2) + ",";
    json += "\"quality\":\"" + location_quality + "\",";
    json += "\"beacon_count\":" + String(beacon_count) + ",";
    
    // beacons_used array
 json += "\"beacons_used\":[";
    for (int i = 0; i < last_beacon_count; i++) {
        if (i > 0) json += ",";
        json += "{";
        json += "\"mac\":\"" + last_beacons[i].mac + "\"";
        json += "}";
    }
    json += "]";
    json += "},";
    
    // target location
    json += "\"target\":{";
    json += "\"x\":" + String(target_x, 2) + ",";
    json += "\"y\":" + String(target_y, 2) + ",";
    json += "\"name\":\"" + target_name + "\",";
    json += "\"distance\":" + String(calculateDistanceToTarget(), 2) + ",";
    json += "\"direction\":\"" + calculateDirectionToTarget() + "\",";
    
    float bearing = atan2(target_y - current_y, target_x - current_x) * 180 / PI;
    json += "\"bearing\":" + String(bearing, 1) + ",";
    
    float eta = calculateDistanceToTarget() / 1.4;  // 假设步行速度 1.4 m/s
    json += "\"eta\":" + String((int)eta);
    json += "}";
    json += "},";
    
    // ============ 2. IMU/Motion Data ============
    json += "\"motion\":{";
    if (imu) {
        IMUData data = imu->getData();
        json += "\"accelerometer\":{";
        json += "\"x\":" + String(data.accel_x, 3) + ",";
        json += "\"y\":" + String(data.accel_y, 3) + ",";
        json += "\"z\":" + String(data.accel_z, 3);
        json += "},";
        
        json += "\"gyroscope\":{";
        json += "\"x\":" + String(data.gyro_x, 3) + ",";
        json += "\"y\":" + String(data.gyro_y, 3) + ",";
        json += "\"z\":" + String(data.gyro_z, 3);
        json += "},";
        
        json += "\"magnitude\":" + String(imu->getAccelerationMagnitude(), 3) + ",";
    } else {
        json += "\"accelerometer\":{\"x\":0,\"y\":0,\"z\":0},";
        json += "\"gyroscope\":{\"x\":0,\"y\":0,\"z\":0},";
        json += "\"magnitude\":0.0,";
    }
    json += "\"step_count\":0,";
    json += "\"movement_status\":\"" + String(fall_detector && fall_detector->isFallDetected() ? "falling" : "walking") + "\"";
    json += "},";
    
    // ============ 3. Fall Detection ============
    json += "\"fall_detection\":{";
    if (fall_detector) {
        FallEvent event = fall_detector->getFallEvent();
        json += "\"state\":" + String(event.state) + ",";
        json += "\"state_description\":\"" + event.description + "\",";
        json += "\"confidence\":" + String(event.confidence, 2) + ",";
        json += "\"is_fall_confirmed\":" + String(event.is_fall_confirmed ? "true" : "false") + ",";
        json += "\"impact_force\":" + String(event.impact_force, 2) + ",";
        json += "\"direction\":\"" + event.direction + "\",";
        json += "\"fall_time\":" + String(event.fall_time / 1000);
    } else {
        json += "\"state\":0,\"state_description\":\"normal\",\"confidence\":0.0,\"is_fall_confirmed\":false,\"impact_force\":0.0,\"direction\":\"unknown\",\"fall_time\":0";
    }
    json += "},";
    
    // ============ 4. SOS Status ============
    json += "\"sos\":{";
    json += "\"active\":" + String(sos_active ? "true" : "false") + ",";
    json += "\"trigger_method\":\"" + sos_trigger_method + "\",";
    json += "\"trigger_time\":" + String(sos_trigger_time / 1000) + ",";
    json += "\"trigger_count\":" + String(sos_trigger_count) + ",";
    json += "\"duration\":" + String(sos_active ? (millis() - sos_trigger_time) / 1000 : 0);
    json += "},";
    
    // ============ 5. Door Events ============
    json += "\"door_events\":[";
    bool first = true;
    for (int i = 0; i < door_count; i++) {
        if (doors[i].last_trigger_time > 0) {  // 只显示有触发的门禁
            if (!first) json += ",";
            first = false;
            json += "{";
            json += "\"door_id\":\"" + doors[i].door_id + "\",";
            json += "\"beacon_mac\":\"" + doors[i].beacon_mac + "\",";
            json += "\"distance\":" + String(doors[i].trigger_distance, 1) + ",";
            json += "\"trigger_time\":" + String(doors[i].last_trigger_time / 1000) + ",";
            json += "\"action\":\"unlock\"";
            json += "}";
        }
    }
    json += "],";
    
    // ============ 6. Night Mode ============
    json += "\"night_mode\":{";
    json += "\"active\":" + String(night_mode_active ? "true" : "false") + ",";
    json += "\"light_triggered\":" + String(light_triggered_tonight ? "true" : "false") + ",";
    json += "\"movement_detected\":" + String((millis() - last_movement_time) < 5000 ? "true" : "false") + ",";
    json += "\"last_movement\":" + String(last_movement_time / 1000);
    json += "},";
    
    // ============ 7. Sensor Data ============
    json += "\"sensors\":{";
    json += "\"heart_rate\":{";
    json += "\"bpm\":" + String(heart_rate.bpm) + ",";
    json += "\"confidence\":" + String(heart_rate.confidence, 2) + ",";
    json += "\"timestamp\":" + String(heart_rate.timestamp / 1000) + ",";
    json += "\"valid\":" + String(heart_rate.valid ? "true" : "false");
    json += "},";
    json += "\"spo2\":{";
    json += "\"percentage\":" + String(spo2.percentage) + ",";
    json += "\"confidence\":" + String(spo2.confidence, 2) + ",";
    json += "\"timestamp\":" + String(spo2.timestamp / 1000) + ",";
    json += "\"valid\":" + String(spo2.valid ? "true" : "false");
    json += "}";
    json += "},";
    
    // ============ 8. System Status ============
    json += "\"system\":{";
    
    // battery
    json += "\"battery\":{";
    json += "\"level\":" + (power ? String(power->getBatteryPercent()) : "0") + ",";
    json += "\"voltage\":" + (power ? String(power->getBatteryVoltage(), 2) : "0.0") + ",";
    json += "\"charging\":";
    json += (power && power->isCharging()) ? "true" : "false";
    json += "},";
    
    // wifi
    json += "\"wifi\":{";
    json += "\"connected\":" + String(network && network->isConnected() ? "true" : "false") + ",";
    json += "\"ssid\":\"" + String(WIFI_SSID) + "\",";
    json += "\"rssi\":";
    if (network && network->isConnected()) {
        json += String(WiFi.RSSI());
    } else {
        json += "0";
    }
    json += ",";
    json += "\"ip\":\"";
    if (network && network->isConnected()) {
        json += WiFi.localIP().toString();
    } else {
        json += "0.0.0.0";
    }
    json += "\"";
    json += "},";
    
    // memory
    json += "\"memory\":{";
    json += "\"free_heap\":" + String(esp_get_free_heap_size()) + ",";
    json += "\"min_free_heap\":" + String(esp_get_minimum_free_heap_size()) + ",";
    json += "\"psram_free\":" + (psramFound() ? String(ESP.getFreePsram()) : "0");
    json += "},";
    
    // uptime & temperature
    json += "\"uptime\":" + String(millis()) + ",";
    json += "\"temperature\":42.5";
    json += "},";
    
    // ============ 9. Logs ============
    json += getLogsJSON();
    
    json += "}";
    
    return json;
}

// ================ 上传所有数据 ================
void DataTransmitter::transmitAllData() {
    String jsonData = getAllDataJSON();
    
    // 通过 MQTT 发布
    String topic = getDeviceTopic(MQTT_TOPIC_STATUS);
    Serial.print("主题: ");
    Serial.println(topic);
    Serial.print("数据: ");
    Serial.println(jsonData);
    publishToMQTT(topic, jsonData);
    
    // 同时保留 HTTP 作为备选
    if (network && network->isConnected()) {
        network->sendHTTPData(jsonData);
    }
}

// ================ 上传跌倒警报 ================
void DataTransmitter::transmitFallAlert(const FallEvent& fall_event) {
    String jsonData = getFallJSON(fall_event);
    
    String topic = getDeviceTopic(MQTT_TOPIC_FALL);
    publishToMQTT(topic, jsonData, true);  // retained
    
    if (network && network->isConnected()) {
        network->sendHTTPData(jsonData);
    }
    
    addLog("warning", "Fall detected: " + fall_event.description);
    transmit_interval = 1000;
}

// ================ 上传SOS警报 ================
void DataTransmitter::transmitSOSAlert() {
    String jsonData = getSOSJSON();
    
    String topic = getDeviceTopic(MQTT_TOPIC_SOS);
    publishToMQTT(topic, jsonData, true);  // retained
    
    if (network && network->isConnected()) {
        network->sendHTTPData(jsonData);
    }
    
    addLog("error", "SOgetDoorBeaconMacS activated: " + sos_trigger_method);
}

// ================ 触发开门 ================
void DataTransmitter::triggerDoorOpen(const String& door_id) {
    Serial.printf("触发开门: %s\n", door_id.c_str());
    
    // 构建门禁事件 JSON
    String json = "{";
    json += "\"device_id\":\"" + device_id + "\",";
    json += "\"timestamp\":" + String(millis() / 1000) + ",";
    json += "\"data_type\":\"door_event\",";
    json += "\"door_events\":[{";
    json += "\"door_id\":\"" + door_id + "\",";
    json += "\"beacon_mac\":\"" + getDoorBeaconMac(door_id) + "\",";
    json += "\"distance\":1.2,";
    json += "\"trigger_time\":" + String(millis() / 1000) + ",";
    json += "\"action\":\"unlock\"";
    json += "}]";
    json += "}";
    
    String topic = getDeviceTopic(MQTT_TOPIC_DOOR);
    publishToMQTT(topic, json);
    
    addLog("info", "Door opened: " + door_id);
}

// ================ 触发灯光控制 ================
void DataTransmitter::triggerLightControl(bool turn_on) {
    String json = "{";
    json += "\"device_id\":\"" + device_id + "\",";
    json += "\"timestamp\":" + String(millis() / 1000) + ",";
    json += "\"data_type\":\"light_event\",";
    json += "\"night_mode\":{";
    json += "\"active\":" + String(night_mode_active ? "true" : "false") + ",";
    json += "\"light_triggered\":" + String(turn_on ? "true" : "false") + ",";
    json += "\"movement_detected\":true,";
    json += "\"last_movement\":" + String(millis() / 1000);
    json += "}";
    json += "}";
    
    String topic = getDeviceTopic(MQTT_TOPIC_LIGHT);
    publishToMQTT(topic, json);
    
    addLog("info", String(turn_on ? "Light ON" : "Light OFF"));
}

// ================ update函数（自动上传） ================
void DataTransmitter::update() {
    unsigned long current_time = millis();
    static unsigned long lastMqttReconnect = 0;
    static unsigned long lastStatusUpload = 0;
    static unsigned long lastDebugPrint = 0;
    
    // MQTT 循环
    mqttLoop();
    
    // 每10秒打印一次状态
    if (current_time - lastDebugPrint > 10000) {
        lastDebugPrint = current_time;
        Serial.printf("[MQTT] WiFi:%s MQTT:%s\n", 
                     network && network->isConnected() ? "连" : "断",
                     mqttClient.connected() ? "连" : "断");
    }
    
    // 自动重连 MQTT
    if (network && network->isConnected() && !mqttClient.connected()) {
        if (current_time - lastMqttReconnect > 5000) {  // 5秒尝试重连
            lastMqttReconnect = current_time;
            Serial.println("尝试重连MQTT...");
            ensureMQTTConnected();
        }
    }

    if (network && network->isConnected() && mqttClient.connected()) {
        if (current_time - lastStatusUpload >= 1000) {
            // 🔑 关键：如果 BLE 正在扫描，延迟上传
            if (ble_scanning_active) {
                // 记录需要重试，下次再传
                return;
            }
            
            // 尝试获取射频互斥锁
            if (rfMutex && xSemaphoreTake(rfMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
                String topic = getDeviceTopic(MQTT_TOPIC_STATUS);
                String jsonData = getAllDataJSON();
                
                Serial.printf("[MQTT] 上传状态数据 (%d bytes)\n", jsonData.length());
                
                if (publishToMQTT(topic, jsonData)) {
                    Serial.println("  ✅ 上传成功");
                } else {
                    Serial.println("  ❌ 上传失败");
                }
                
                xSemaphoreGive(rfMutex);
                lastStatusUpload = current_time;
            }    
        }
    }
    
    updateNightMode();
    checkHeartbeat();
}

// 计算到目标的距离
float DataTransmitter::calculateDistanceToTarget() {
    float dx = target_x - current_x;
    float dy = target_y - current_y;
    return sqrt(dx*dx + dy*dy);
}

// 计算到目标的方向
String DataTransmitter::calculateDirectionToTarget() {
    float dx = target_x - current_x;
    float dy = target_y - current_y;
    float angle = atan2(dy, dx) * 180 / PI;
    if (angle < 0) angle += 360;
    
    if (angle >= 337.5 || angle < 22.5) return "east";
    else if (angle >= 22.5 && angle < 67.5) return "northeast";
    else if (angle >= 67.5 && angle < 112.5) return "north";
    else if (angle >= 112.5 && angle < 157.5) return "northwest";
    else if (angle >= 157.5 && angle < 202.5) return "west";
    else if (angle >= 202.5 && angle < 247.5) return "southwest";
    else if (angle >= 247.5 && angle < 292.5) return "south";
    else return "southeast";
}

// ================ 获取跌倒警报JSON ================
String DataTransmitter::getFallJSON(const FallEvent& fall_event) {
    String json = "{";
    
    json += "\"device_id\":\"" + device_id + "\",";
    json += "\"timestamp\":" + String(time(nullptr)) + ",";
    json += "\"data_type\":\"fall\",";
    
    json += "\"fall_detection\":{";
    json += "\"state\":" + String(fall_event.state) + ",";
    json += "\"state_description\":\"" + fall_event.description + "\",";
    json += "\"confidence\":" + String(fall_event.confidence, 2) + ",";
    json += "\"is_fall_confirmed\":" + String(fall_event.is_fall_confirmed ? "true" : "false") + ",";
    json += "\"impact_force\":" + String(fall_event.impact_force, 2) + ",";
    json += "\"direction\":\"" + fall_event.direction + "\",";
    json += "\"fall_time\":" + String(fall_event.fall_time);
    json += "},";
    
    json += "\"location\":{";
    if (ble_location) {
        Location loc = ble_location->getLocation();
        json += "\"x\":" + String(loc.x, 2) + ",";
        json += "\"y\":" + String(loc.y, 2) + ",";
        json += "\"accuracy\":" + String(loc.accuracy, 2);
    } else {
        json += "\"x\":0,\"y\":0,\"accuracy\":0";
    }
    json += "},";
    
    json += "\"system\":{";
    json += "\"battery\":" + (power ? String(power->getBatteryPercent()) : "0");
    json += "}";
    
    json += "}";
    return json;
}

// ================ 获取SOS警报JSON ================
String DataTransmitter::getSOSJSON() {
    String json = "{";
    
    json += "\"device_id\":\"" + device_id + "\",";
    json += "\"timestamp\":" + String(time(nullptr)) + ",";
    json += "\"data_type\":\"sos\",";
    
    json += "\"sos\":{";
    json += "\"active\":true,";
    json += "\"trigger_method\":\"" + sos_trigger_method + "\",";
    json += "\"trigger_time\":" + String(sos_trigger_time) + ",";
    json += "\"trigger_count\":" + String(sos_trigger_count);
    json += "},";
    
    json += "\"location\":{";
    if (ble_location) {
        Location loc = ble_location->getLocation();
        json += "\"x\":" + String(loc.x, 2) + ",";
        json += "\"y\":" + String(loc.y, 2) + ",";
        json += "\"accuracy\":" + String(loc.accuracy, 2);
    } else {
        json += "\"x\":0,\"y\":0,\"accuracy\":0";
    }
    json += "},";
    
    json += "\"system\":{";
    json += "\"battery\":" + (power ? String(power->getBatteryPercent()) : "0");
    json += "}";
    
    json += "}";
    return json;
}

// ================ 获取位置JSON ================
String DataTransmitter::getLocationJSON() {
    String json = "{";
    
    json += "\"device_id\":\"" + device_id + "\",";
    json += "\"timestamp\":" + String(time(nullptr)) + ",";
    json += "\"data_type\":\"location\",";
    
    json += "\"location\":{";
    if (ble_location) {
        Location loc = ble_location->getLocation();
        json += "\"x\":" + String(loc.x, 2) + ",";
        json += "\"y\":" + String(loc.y, 2) + ",";
        json += "\"accuracy\":" + String(loc.accuracy, 2) + ",";
        json += "\"quality\":\"" + loc.quality + "\"";
    } else {
        json += "\"x\":0,\"y\":0,\"accuracy\":0,\"quality\":\"unknown\"";
    }
    json += "},";
    
    json += "\"system\":{";
    json += "\"battery\":" + (power ? String(power->getBatteryPercent()) : "0");
    json += "}";
    
    json += "}";
    return json;
}

// ================ 获取心跳JSON ================
String DataTransmitter::getHeartbeatJSON() {
    String json = "{";
    
    json += "\"device_id\":\"" + device_id + "\",";
    json += "\"timestamp\":" + String(time(nullptr)) + ",";
    json += "\"data_type\":\"heartbeat\",";
    json += "\"battery\":" + (power ? String(power->getBatteryPercent()) : "0") + ",";
    json += "\"wifi\":" + String(network && network->isConnected() ? "true" : "false");
    
    json += "}";
    return json;
}

// ================ 上传位置 ================
void DataTransmitter::transmitLocation() {
    String jsonData = getLocationJSON();
    
    String topic = getDeviceTopic(MQTT_TOPIC_LOCATION);
    publishToMQTT(topic, jsonData);
    
    if (network && network->isConnected()) {
        network->sendHTTPData(jsonData);
    }
    
    addLog("info", "Location published");
}

// ================ 设置导航目标 ================
void DataTransmitter::setTargetPosition(float x, float y, const String& name) {
    target_x = x;
    target_y = y;
    target_name = name;
    Serial.printf("导航目标设置: (%.1f, %.1f) %s\n", x, y, name.c_str());
}

// ================ 设置导航激活状态 ================
void DataTransmitter::setNavigationActive(bool active) {
    navigation_active = active;
    Serial.printf("导航状态: %s\n", active ? "开启" : "关闭");
}

// ================ 设置 SOS 状态 ================
void DataTransmitter::setSOSActive(bool active, const String& method) {
    if (active && !sos_active) {
        sos_active = true;
        sos_trigger_time = millis();
        sos_trigger_count++;
        sos_trigger_method = method;
        Serial.printf("🚨 SOS触发! 方式: %s, 次数: %d\n", method.c_str(), sos_trigger_count);
        transmitSOSAlert();
    } else if (!active && sos_active) {
        sos_active = false;
        sos_trigger_method = "cleared";
        Serial.println("SOS已解除");
    }
}

// ================ 夜间移动检测 ================
void DataTransmitter::checkNightMovement(float current_x, float current_y, 
                                         const String& current_beacon_mac, 
                                         float beacon_distance) {
    static float last_x = current_x;
    static float last_y = current_y;
    static unsigned long last_check = millis();
    static bool was_in_range = false;
    static unsigned long enter_range_time = 0;
    
    if (!night_mode_active) {
        return;
    }
    
    if (light_triggered_tonight) {
        return;
    }
    
    // 检查是否在CA信标1米范围内
    bool in_range = (current_beacon_mac == "20:A7:16:60:F7:CA" && beacon_distance <= 1.0);
    
    if (in_range && !was_in_range) {
        enter_range_time = millis();
        last_x = current_x;
        last_y = current_y;
        last_check = millis();
        Serial.printf("[夜间模式] 进入CA信标范围 (距离: %.2fm)\n", beacon_distance);
    }
    
    if (in_range) {
        unsigned long now = millis();
        float time_in_range = (now - enter_range_time) / 1000.0;
        
        if (time_in_range >= 3.0) {
            float time_diff = (now - last_check) / 1000.0;
            
            if (time_diff >= 2.0) {
                float dx = current_x - last_x;
                float dy = current_y - last_y;
                float distance = sqrt(dx*dx + dy*dy);
                
                if (distance > movement_threshold) {
                    Serial.printf("[夜间模式] 检测到移动 %.1fm，触发开灯\n", distance);
                    triggerLightControl(true);
                    light_triggered_tonight = true;
                }
                
                last_x = current_x;
                last_y = current_y;
                last_check = now;
            }
        }
    }
    
    was_in_range = in_range;
    last_movement_time = millis();
}

// ================ 检查门禁 proximity ================
void DataTransmitter::checkDoorProximity(const String& beacon_mac, float distance) {
    for (int i = 0; i < door_count; i++) {
        if (doors[i].beacon_mac == beacon_mac && doors[i].is_active) {
            if (distance <= doors[i].trigger_distance) {
                unsigned long now = millis();
                if (now - doors[i].last_trigger_time > doors[i].cooldown_period) {
                    doors[i].last_trigger_time = now;
                    triggerDoorOpen(doors[i].door_id);
                }
            }
            break;
        }
    }
}

// ================ 添加门禁 ================
void DataTransmitter::addDoor(const String& door_id, const String& beacon_mac, float trigger_distance) {
    if (door_count < 5) {
        doors[door_count].door_id = door_id;
        doors[door_count].beacon_mac = beacon_mac;
        doors[door_count].trigger_distance = trigger_distance;
        doors[door_count].is_active = true;
        doors[door_count].last_trigger_time = 0;
        doors[door_count].cooldown_period = 5000;  // 5秒冷却
        door_count++;
        
        Serial.printf("添加门禁: %s, 信标: %s, 触发距离: %.1fm\n", 
                     door_id.c_str(), beacon_mac.c_str(), trigger_distance);
    }
}

// ================ 获取门禁对应的信标MAC ================
String DataTransmitter::getDoorBeaconMac(const String& door_id) {
    for (int i = 0; i < door_count; i++) {
        if (doors[i].door_id == door_id) {
            return doors[i].beacon_mac;
        }
    }
    return "";
}

// ================ 更新夜间模式 ================
void DataTransmitter::updateNightMode() {
    bool was_active = night_mode_active;
    night_mode_active = isNightTime();
    
    if (night_mode_active != was_active) {
        Serial.printf("夜间模式: %s\n", night_mode_active ? "开启" : "关闭");
        if (!night_mode_active) {
            light_triggered_tonight = false;
        }
    }
}

// ================ 判断是否为夜间 ================
bool DataTransmitter::isNightTime() {
    time_t now;
    time(&now);
    struct tm timeinfo;
    
    if (!getLocalTime(&timeinfo)) {
        return false;
    }
    
    unsigned long current_seconds = timeinfo.tm_hour * 3600 + 
                                    timeinfo.tm_min * 60 + 
                                    timeinfo.tm_sec;
    
    if (night_start_time <= night_end_time) {
        return (current_seconds >= night_start_time || current_seconds < night_end_time);
    } else {
        return (current_seconds >= night_start_time && current_seconds < night_end_time);
    }
}

// ================ 更新心率数据 ================
void DataTransmitter::updateHeartRate(int bpm, float confidence) {
    heart_rate.bpm = bpm;
    heart_rate.confidence = confidence;
    heart_rate.timestamp = millis();
    heart_rate.valid = (bpm > 30 && bpm < 220);
    
    if (heart_rate.valid) {
        Serial.printf("心率更新: %d bpm, 置信度: %.2f\n", bpm, confidence);
    }
}

// ================ 更新血氧数据 ================
void DataTransmitter::updateSpO2(int percentage, float confidence) {
    spo2.percentage = percentage;
    spo2.confidence = confidence;
    spo2.timestamp = millis();
    spo2.valid = (percentage >= 70 && percentage <= 100);
    
    if (spo2.valid) {
        Serial.printf("血氧更新: %d%%, 置信度: %.2f\n", percentage, confidence);
    }
}

// ================ 检查心跳 ================
void DataTransmitter::checkHeartbeat() {
    unsigned long now = millis();
    
    if (now - last_heartbeat_time >= heartbeat_interval) {
        transmitHeartbeat();
        last_heartbeat_time = now;
    }
}

// ================ 上传心跳 ================
void DataTransmitter::transmitHeartbeat() {
    String jsonData = getHeartbeatJSON();
    
    String topic = getDeviceTopic(MQTT_TOPIC_HEARTBEAT);
    publishToMQTT(topic, jsonData);
    
    if (network && network->isConnected()) {
        network->sendHTTPData(jsonData);
    }
}

// ================ 获取系统状态 JSON ================
String DataTransmitter::getSystemStatusJSON() {
    String json = "\"system\":{";
    
    json += "\"battery\":{";
    json += "\"level\":" + (power ? String(power->getBatteryPercent()) : "0") + ",";
    json += "\"voltage\":" + (power ? String(power->getBatteryVoltage(), 2) : "0.0") + ",";
    json += "\"charging\":";
    json += (power && power->isCharging()) ? "true" : "false";
    json += "},";
    
    json += "\"wifi\":{";
    json += "\"connected\":" + String(network && network->isConnected() ? "true" : "false") + ",";
    json += "\"ssid\":\"" + String(WIFI_SSID) + "\",";
    json += "\"rssi\":";
    if (network && network->isConnected()) {
        json += String(WiFi.RSSI());
    } else {
        json += "0";
    }
    json += "}";
    
    json += "}";
    return json;
}

// ================ 获取SOS状态JSON ================
String DataTransmitter::getSOSStatusJSON() {
    String json = "\"sos\":{";
    json += "\"active\":" + String(sos_active ? "true" : "false") + ",";
    json += "\"trigger_method\":\"" + sos_trigger_method + "\",";
    json += "\"trigger_time\":" + String(sos_trigger_time) + ",";
    json += "\"trigger_count\":" + String(sos_trigger_count) + ",";
    json += "\"duration\":" + String(sos_active ? (millis() - sos_trigger_time) / 1000 : 0);
    json += "}";
    return json;
}

// ================ 获取门禁事件JSON ================
String DataTransmitter::getDoorEventsJSON() {
    String json = "\"door_events\":[";
    bool first = true;
    
    for (int i = 0; i < door_count; i++) {
        if (!first) json += ",";
        first = false;
        
        json += "{";
        json += "\"door_id\":\"" + doors[i].door_id + "\",";
        json += "\"beacon_mac\":\"" + doors[i].beacon_mac + "\",";
        json += "\"distance\":" + String(doors[i].trigger_distance, 1) + ",";
        json += "\"trigger_time\":" + String(doors[i].last_trigger_time / 1000) + ",";
        json += "\"action\":\"unlock\"";
        json += "}";
    }
    
    json += "]";
    return json;
}

// ================ 获取夜间模式JSON ================
String DataTransmitter::getNightModeJSON() {
    String json = "\"night_mode\":{";
    json += "\"active\":" + String(night_mode_active ? "true" : "false") + ",";
    json += "\"light_triggered\":" + String(light_triggered_tonight ? "true" : "false") + ",";
    json += "\"movement_detected\":" + String((millis() - last_movement_time) < 5000 ? "true" : "false") + ",";
    json += "\"last_movement\":" + String(last_movement_time / 1000);
    json += "}";
    return json;
}

// ================ 获取传感器数据JSON ================
String DataTransmitter::getSensorDataJSON() {
    String json = "\"sensors\":{";
    
    json += "\"heart_rate\":{";
    json += "\"bpm\":" + String(heart_rate.bpm) + ",";
    json += "\"confidence\":" + String(heart_rate.confidence, 2) + ",";
    json += "\"timestamp\":" + String(heart_rate.timestamp / 1000) + ",";
    json += "\"valid\":" + String(heart_rate.valid ? "true" : "false");
    json += "},";
    
    json += "\"spo2\":{";
    json += "\"percentage\":" + String(spo2.percentage) + ",";
    json += "\"confidence\":" + String(spo2.confidence, 2) + ",";
    json += "\"timestamp\":" + String(spo2.timestamp / 1000) + ",";
    json += "\"valid\":" + String(spo2.valid ? "true" : "false");
    json += "}";
    
    json += "}";
    return json;
}

// ================ 获取日志JSON ================
String DataTransmitter::getLogsJSON() {
    String json = "\"log\":[";
    
    int start = (log_index - log_count + MAX_LOG_ENTRIES) % MAX_LOG_ENTRIES;
    bool first = true;
    
    for (int i = 0; i < log_count; i++) {
        int idx = (start + i) % MAX_LOG_ENTRIES;
        
        if (!first) json += ",";
        first = false;
        
        json += "{";
        json += "\"level\":\"" + log_entries[idx].level + "\",";
        json += "\"message\":\"" + log_entries[idx].message + "\",";
        json += "\"timestamp\":" + String(log_entries[idx].timestamp);
        json += "}";
    }
    
    json += "]";
    return json;
}

// ================ 添加日志 ================
void DataTransmitter::addLog(const String& level, const String& message) {
    log_entries[log_index].level = level;
    log_entries[log_index].message = message;
    log_entries[log_index].timestamp = millis() / 1000;
    
    log_index = (log_index + 1) % MAX_LOG_ENTRIES;
    if (log_count < MAX_LOG_ENTRIES) log_count++;
}

void DataTransmitter::setBLEScanning(bool scanning) {
    ble_scanning_active = scanning;
}