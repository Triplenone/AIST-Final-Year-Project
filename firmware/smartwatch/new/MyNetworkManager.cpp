#include "MyNetworkManager.h"
#include "Config.h"

// ================ 构造函数 ================
MyNetworkManager::MyNetworkManager() 
    : mqttClient(wifiClient),
      timeClient(ntpUDP, NTP_SERVER, 3600*8, 60000),
      wifiConnected(false),
      mqttConnected(false) {}

// ================ connectWiFi函数（自动重连版） ================
bool MyNetworkManager::connectWiFi() {
    Serial.printf("\n连接WiFi: %s", WIFI_SSID);
    
    // 配置 WiFi
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(true);  // 禁用省电模式，保持稳定连接`        
    WiFi.setTxPower(WIFI_POWER_19_5dBm);  // 设置最大发射功率
    
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    const int maxAttempts = 40;  // 最多尝试40次（20秒）
    
    while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
        delay(500);
        Serial.print(".");
        attempts++;
        
        // 每10次打印一次状态
        if (attempts % 10 == 0) {
            int status = WiFi.status();
            Serial.printf("\nWiFi状态: %d, 尝试次数: %d\n", status, attempts);
        }
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        Serial.println("\n✅ WiFi连接成功!");
        Serial.printf("IP地址: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("信号强度: %d dBm\n", WiFi.RSSI());
        
        timeClient.begin();
        timeClient.update();
        return true;
    } else {
        wifiConnected = false;
        Serial.printf("\n❌ WiFi连接失败! 状态码: %d\n", WiFi.status());
        return false;
    }
}

// ================ 确保 WiFi 连接 ================
bool MyNetworkManager::ensureWiFiConnected() {
    if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        return true;
    }
    
    // 尝试重连
    Serial.println("WiFi断开，尝试重连...");
    WiFi.reconnect();
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        attempts++;
    }
    
    wifiConnected = (WiFi.status() == WL_CONNECTED);
    if (wifiConnected) {
        Serial.println("WiFi重连成功");
    }
    
    return wifiConnected;
}

// ================ connectMQTT函数 ================
bool MyNetworkManager::connectMQTT() {
    if (!ensureWiFiConnected()) {
        return false;
    }
    
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    
    String clientId = "ESP32-SmartWatch-" + String(random(0xffff), HEX);
    if (mqttClient.connect(clientId.c_str())) {
        mqttConnected = true;
        Serial.println("MQTT连接成功!");
        
        // 订阅下行主题
        String subscribeTopic = "smartwatch/+/command";
        mqttClient.subscribe(subscribeTopic.c_str());
        return true;
    }
    
    mqttConnected = false;
    Serial.print("MQTT连接失败, rc=");
    Serial.println(mqttClient.state());
    return false;
}

// ================ sendHTTPData函数 ================
bool MyNetworkManager::sendHTTPData(const String& json_data) {
    if (!ensureWiFiConnected()) {
        Serial.println("WiFi未连接，HTTP发送失败");
        return false;
    }
    
    HTTPClient http;
    http.begin(wifiClient, SERVER_URL);
    http.addHeader("Content-Type", "application/json");
    
    int httpCode = http.POST(json_data);
    bool success = (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED);
    
    if (success) {
        Serial.println("HTTP数据发送成功");
    } else {
        Serial.printf("HTTP数据发送失败, 代码: %d\n", httpCode);
    }
    
    http.end();
    return success;
}

// ================ sendMQTTData函数 ================
bool MyNetworkManager::sendMQTTData(const String& topic, const String& data) {
    if (!ensureWiFiConnected()) {
        return false;
    }
    
    if (!mqttClient.connected()) {
        if (!connectMQTT()) return false;
    }
    
    bool success = mqttClient.publish(topic.c_str(), data.c_str());
    if (success) {
        Serial.printf("MQTT数据发送成功 [%s]\n", topic.c_str());
    } else {
        Serial.printf("MQTT数据发送失败 [%s]\n", topic.c_str());
    }
    return success;
}

// ================ getTimestamp函数 ================
unsigned long MyNetworkManager::getTimestamp() {
    timeClient.update();
    return timeClient.getEpochTime();
}

// ================ update函数（自动重连） ================
void MyNetworkManager::update() {
    static unsigned long lastReconnectAttempt = 0;
    static unsigned long lastStatusPrint = 0;
    unsigned long now = millis();
    
    // 检查 WiFi 状态
    if (WiFi.status() != WL_CONNECTED) {
        wifiConnected = false;
        mqttConnected = false;
        
        // 每30秒尝试重连一次
        if (now - lastReconnectAttempt > 30000) {
            lastReconnectAttempt = now;
            Serial.println("尝试重连WiFi...");
            connectWiFi();
        }
    } else {
        wifiConnected = true;
    }
    
    // 如果 WiFi 已连接但 MQTT 断开，尝试重连 MQTT
    if (wifiConnected && !mqttClient.connected()) {
        if (now - lastReconnectAttempt > 10000) {  // 每10秒尝试重连MQTT
            lastReconnectAttempt = now;
            connectMQTT();
        }
    }
    
    // MQTT 循环
    if (mqttClient.connected()) {
        mqttClient.loop();
    }
    
    // 更新时间
    if (now - last_update > 60000) {
        timeClient.update();
        last_update = now;
    }
    
    // 每30秒打印状态
    if (now - lastStatusPrint > 30000) {
        lastStatusPrint = now;
        Serial.printf("[网络] WiFi: %s, MQTT: %s, IP: %s\n",
                     wifiConnected ? "已连" : "未连",
                     mqttClient.connected() ? "已连" : "未连",
                     wifiConnected ? WiFi.localIP().toString().c_str() : "0.0.0.0");
    }
}