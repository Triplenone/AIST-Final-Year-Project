#include "MyNetworkManager.h"
#include "Config.h"
#include <esp_wifi.h>

static const char* wifiStatusName(wl_status_t status) {
    switch (status) {
        case WL_IDLE_STATUS: return "IDLE";
        case WL_NO_SSID_AVAIL: return "NO_SSID";
        case WL_SCAN_COMPLETED: return "SCAN_COMPLETED";
        case WL_CONNECTED: return "CONNECTED";
        case WL_CONNECT_FAILED: return "CONNECT_FAILED";
        case WL_CONNECTION_LOST: return "CONNECTION_LOST";
        case WL_DISCONNECTED: return "DISCONNECTED";
        default: return "UNKNOWN";
    }
}

// ================ 构造函数 ================
static volatile bool wifiConnectInProgress = false;

struct WiFiScanResult {
    bool found = false;
    int32_t channel = 0;
    int32_t rssi = -127;
    wifi_auth_mode_t authMode = WIFI_AUTH_OPEN;
    uint8_t bssid[6] = {0};
    String bssidStr;
};

static const char* authModeName(wifi_auth_mode_t authMode) {
    switch (authMode) {
        case WIFI_AUTH_OPEN: return "OPEN";
        case WIFI_AUTH_WEP: return "WEP";
        case WIFI_AUTH_WPA_PSK: return "WPA";
        case WIFI_AUTH_WPA2_PSK: return "WPA2";
        case WIFI_AUTH_WPA_WPA2_PSK: return "WPA/WPA2";
        case WIFI_AUTH_WPA3_PSK: return "WPA3";
        case WIFI_AUTH_WPA2_WPA3_PSK: return "WPA2/WPA3";
        default: return "OTHER";
    }
}

static void installWiFiEventLogger() {
    static bool installed = false;
    if (installed) return;

    WiFi.onEvent([](WiFiEvent_t event, WiFiEventInfo_t info) {
        Serial.println("[WiFiEvent] STA connected to AP");
    }, ARDUINO_EVENT_WIFI_STA_CONNECTED);

    WiFi.onEvent([](WiFiEvent_t event, WiFiEventInfo_t info) {
        Serial.printf("[WiFiEvent] Got IP: %s\n", WiFi.localIP().toString().c_str());
    }, ARDUINO_EVENT_WIFI_STA_GOT_IP);

    WiFi.onEvent([](WiFiEvent_t event, WiFiEventInfo_t info) {
        uint8_t reason = info.wifi_sta_disconnected.reason;
        Serial.printf("[WiFiEvent] Disconnected, reason=%u (%s)\n",
                      reason,
                      WiFi.disconnectReasonName((wifi_err_reason_t)reason));
    }, ARDUINO_EVENT_WIFI_STA_DISCONNECTED);

    installed = true;
}

static WiFiScanResult scanForSSID(const char* targetSsid) {
    WiFiScanResult result;
    Serial.printf("[WiFiScan] scanning for SSID: %s\n", targetSsid);

    int networkCount = WiFi.scanNetworks(false, true);
    if (networkCount < 0) {
        Serial.printf("[WiFiScan] scan failed: %d\n", networkCount);
        return result;
    }

    Serial.printf("[WiFiScan] networks found: %d\n", networkCount);

    for (int i = 0; i < networkCount; i++) {
        String ssid = WiFi.SSID(i);
        bool isTarget = (ssid == targetSsid);
        wifi_auth_mode_t authMode = static_cast<wifi_auth_mode_t>(WiFi.encryptionType(i));
        if (isTarget || i < 8) {
            Serial.printf("[WiFiScan] %sSSID=\"%s\", RSSI=%d, channel=%d, auth=%d (%s), BSSID=%s\n",
                          isTarget ? "TARGET " : "",
                          ssid.c_str(),
                          WiFi.RSSI(i),
                          WiFi.channel(i),
                          WiFi.encryptionType(i),
                          authModeName(authMode),
                          WiFi.BSSIDstr(i).c_str());
        }
        if (isTarget && (!result.found || WiFi.RSSI(i) > result.rssi)) {
            result.found = true;
            result.channel = WiFi.channel(i);
            result.rssi = WiFi.RSSI(i);
            result.authMode = authMode;
            result.bssidStr = WiFi.BSSIDstr(i);
            memcpy(result.bssid, WiFi.BSSID(i), sizeof(result.bssid));
        }
    }

    if (!result.found) {
        Serial.println("[WiFiScan] TARGET SSID NOT FOUND. Check 2.4GHz, hidden SSID, channel, and router security.");
    }

    WiFi.scanDelete();
    return result;
}

static void scanForConfiguredSSID() {
    scanForSSID(WIFI_SSID);
}

struct WiFiCandidate {
    const char* ssid;
    const char* password;
    const char* label;
};

static bool isDuplicateCandidate(const WiFiCandidate* candidates, int count, const char* ssid) {
    if (!ssid || strlen(ssid) == 0) return true;
    for (int i = 0; i < count; i++) {
        if (strcmp(candidates[i].ssid, ssid) == 0) {
            return true;
        }
    }
    return false;
}

static int buildWiFiCandidates(WiFiCandidate* candidates, int maxCandidates) {
    int count = 0;
    auto addCandidate = [&](const char* ssid, const char* password, const char* label) {
        if (count >= maxCandidates || isDuplicateCandidate(candidates, count, ssid)) return;
        candidates[count++] = {ssid, password, label};
    };

    addCandidate(WIFI_SSID, WIFI_PASSWORD, "primary");
#if defined(WIFI_ALT1_SSID) && defined(WIFI_ALT1_PASSWORD)
    addCandidate(WIFI_ALT1_SSID, WIFI_ALT1_PASSWORD, "alternate");
#endif
#if defined(WIFI_ALT2_SSID) && defined(WIFI_ALT2_PASSWORD)
    addCandidate(WIFI_ALT2_SSID, WIFI_ALT2_PASSWORD, "alternate");
#endif
#if defined(WIFI_FALLBACK_SSID) && defined(WIFI_FALLBACK_PASSWORD)
    addCandidate(WIFI_FALLBACK_SSID, WIFI_FALLBACK_PASSWORD, "fallback");
#endif

    return count;
}

static void addBrokerCandidate(String brokers[], int& count, int maxCount, const String& host) {
    String clean = host;
    clean.trim();
    if (clean.length() == 0) return;

    for (int i = 0; i < count; i++) {
        if (brokers[i] == clean) return;
    }
    if (count < maxCount) {
        brokers[count++] = clean;
    }
}

static void addBrokerCandidate(String brokers[], int& count, int maxCount, const char* host) {
    if (!host) return;
    addBrokerCandidate(brokers, count, maxCount, String(host));
}

static void buildMqttBrokerCandidates(String brokers[], int& count, int maxCount, const String& configuredServer) {
    count = 0;
    String ssid = WiFi.SSID();

#if defined(MQTT_BROKER_MILLION1)
#if defined(WIFI_SSID)
    if (ssid == String(WIFI_SSID)) addBrokerCandidate(brokers, count, maxCount, MQTT_BROKER_MILLION1);
#endif
#if defined(WIFI_ALT1_SSID)
    if (ssid == String(WIFI_ALT1_SSID)) addBrokerCandidate(brokers, count, maxCount, MQTT_BROKER_MILLION1);
#endif
#if defined(WIFI_ALT2_SSID)
    if (ssid == String(WIFI_ALT2_SSID)) addBrokerCandidate(brokers, count, maxCount, MQTT_BROKER_MILLION1);
#endif
#endif

#if defined(WIFI_FALLBACK_SSID) && defined(MQTT_BROKER_TRIPLE_NONE)
    if (ssid == String(WIFI_FALLBACK_SSID)) addBrokerCandidate(brokers, count, maxCount, MQTT_BROKER_TRIPLE_NONE);
#endif

    addBrokerCandidate(brokers, count, maxCount, configuredServer);
#if defined(MQTT_BROKER_MILLION1)
    addBrokerCandidate(brokers, count, maxCount, MQTT_BROKER_MILLION1);
#endif
#if defined(MQTT_BROKER_TRIPLE_NONE)
    addBrokerCandidate(brokers, count, maxCount, MQTT_BROKER_TRIPLE_NONE);
#endif
#if defined(MQTT_BROKER_FALLBACK_1)
    addBrokerCandidate(brokers, count, maxCount, MQTT_BROKER_FALLBACK_1);
#endif
#if defined(MQTT_BROKER_FALLBACK_2)
    addBrokerCandidate(brokers, count, maxCount, MQTT_BROKER_FALLBACK_2);
#endif
}

static bool connectCandidate(const WiFiCandidate& candidate, int maxAttempts) {
    Serial.printf("\n[WiFi] Trying %s SSID: %s\n", candidate.label, candidate.ssid);
    WiFi.disconnect(false, false);
    delay(300);
    WiFiScanResult ap = scanForSSID(candidate.ssid);
    if (!ap.found) {
        Serial.printf("[WiFi] SSID skipped because it was not visible: %s\n", candidate.ssid);
        return false;
    }

    WiFi.setMinSecurity(WIFI_AUTH_WPA2_PSK);
    WiFi.setScanMethod(WIFI_ALL_CHANNEL_SCAN);
    WiFi.setSortMethod(WIFI_CONNECT_AP_BY_SIGNAL);
    WiFi.setTxPower(WIFI_POWER_19_5dBm);

    if (ap.authMode == WIFI_AUTH_WPA2_WPA3_PSK) {
        Serial.println("[WiFi] WPA2/WPA3 mixed AP detected; trying WPA2-compatible station config");
        wifi_config_t conf;
        memset(&conf, 0, sizeof(conf));
        strncpy(reinterpret_cast<char*>(conf.sta.ssid), candidate.ssid, sizeof(conf.sta.ssid));
        strncpy(reinterpret_cast<char*>(conf.sta.password), candidate.password, sizeof(conf.sta.password));
        conf.sta.channel = ap.channel;
        conf.sta.bssid_set = 1;
        memcpy(conf.sta.bssid, ap.bssid, sizeof(conf.sta.bssid));
        conf.sta.scan_method = WIFI_ALL_CHANNEL_SCAN;
        conf.sta.sort_method = WIFI_CONNECT_AP_BY_SIGNAL;
        conf.sta.threshold.rssi = -127;
        conf.sta.threshold.authmode = WIFI_AUTH_WPA2_PSK;
        conf.sta.pmf_cfg.capable = false;
        conf.sta.pmf_cfg.required = false;

        esp_err_t cfgErr = esp_wifi_set_config(WIFI_IF_STA, &conf);
        if (cfgErr == ESP_OK) {
            esp_err_t connectErr = esp_wifi_connect();
            if (connectErr != ESP_OK) {
                Serial.printf("[WiFi] esp_wifi_connect failed: 0x%x\n", connectErr);
            }
        } else {
            Serial.printf("[WiFi] esp_wifi_set_config failed: 0x%x\n", cfgErr);
        }
    } else {
        Serial.printf("[WiFi] Locking to BSSID %s on channel %d\n", ap.bssidStr.c_str(), ap.channel);
        WiFi.begin(candidate.ssid, candidate.password, ap.channel, ap.bssid);
    }

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
        delay(500);
        Serial.print(".");
        attempts++;

        if (attempts % 10 == 0) {
            wl_status_t status = WiFi.status();
            Serial.printf("\n[WiFi] %s status=%d (%s), attempts=%d/%d\n",
                          candidate.ssid, status, wifiStatusName(status), attempts, maxAttempts);
        }
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WiFi] Connected using SSID: %s\n", WiFi.SSID().c_str());
        Serial.printf("[WiFi] IP: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("[WiFi] RSSI: %d dBm\n", WiFi.RSSI());
        return true;
    }

    wl_status_t status = WiFi.status();
    Serial.printf("\n[WiFi] SSID failed: %s, status=%d (%s)\n",
                  candidate.ssid, status, wifiStatusName(status));
    if (ap.authMode == WIFI_AUTH_WPA2_WPA3_PSK) {
        Serial.println("[WiFi] Mixed WPA2/WPA3 hotspot failed. On phone hotspot, enable WPA2/Max Compatibility/Compatibility Mode if available.");
    }
    return false;
}

MyNetworkManager::MyNetworkManager() 
    : mqttClient(wifiClient),
      timeClient(ntpUDP, NTP_SERVER, 3600*8, 60000),
      wifiConnected(false),
      mqttConnected(false) {}

// ================ connectWiFi函数（自动重连版） ================
bool MyNetworkManager::connectWiFi() {
    installWiFiEventLogger();
    if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        Serial.println("[WiFi] already connected");
        return true;
    }
    if (wifiConnectInProgress) {
        Serial.println("[WiFi] connect already in progress; skipping duplicate request");
        return false;
    }
    wifiConnectInProgress = true;

    WiFi.persistent(false);
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false);
    WiFi.setAutoReconnect(true);
    WiFi.setTxPower(WIFI_POWER_19_5dBm);

    WiFiCandidate candidates[4];
    int candidateCount = buildWiFiCandidates(candidates, 4);
    Serial.printf("\n[WiFi] configured SSID candidates: %d\n", candidateCount);

    const int wifiCandidateMaxAttempts = 40;
    for (int i = 0; i < candidateCount; i++) {
        if (connectCandidate(candidates[i], wifiCandidateMaxAttempts)) {
            wifiConnected = true;
            timeClient.begin();
            timeClient.update();
            wifiConnectInProgress = false;
            return true;
        }
    }

    wifiConnected = false;
    wifiConnectInProgress = false;
    Serial.printf("\n[WiFi] all configured SSIDs failed, final status=%d (%s)\n",
                  WiFi.status(), wifiStatusName(WiFi.status()));
    return false;

    Serial.printf("\n[WiFi] Connecting to SSID: %s\n", WIFI_SSID);
    Serial.printf("\n连接WiFi: %s", WIFI_SSID);
    
    // 配置 WiFi
    WiFi.persistent(false);
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false);
    WiFi.setAutoReconnect(true);
    WiFi.setTxPower(WIFI_POWER_19_5dBm);
    WiFi.disconnect(false, false);
    delay(300);
    scanForConfiguredSSID();
    WiFi.setTxPower(WIFI_POWER_19_5dBm);  // 设置最大发射功率
    scanForConfiguredSSID();
    
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    const int maxAttempts = 40;  // 最多尝试40次（20秒）
    
    while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
        delay(500);
        Serial.print(".");
        attempts++;
        
        // 每10次打印一次状态
        if (attempts % 10 == 0) {
            wl_status_t readableStatus = WiFi.status();
            Serial.printf("\n[WiFi] status=%d (%s), attempts=%d/%d\n",
                          readableStatus, wifiStatusName(readableStatus), attempts, maxAttempts);
            int status = WiFi.status();
            Serial.printf("\nWiFi状态: %d, 尝试次数: %d\n", status, attempts);
        }
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        Serial.println("\n[WiFi] Connected");
        Serial.printf("[WiFi] IP: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("[WiFi] RSSI: %d dBm\n", WiFi.RSSI());
        Serial.println("\n✅ WiFi连接成功!");
        Serial.printf("IP地址: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("信号强度: %d dBm\n", WiFi.RSSI());
        
        timeClient.begin();
        timeClient.update();
        wifiConnectInProgress = false;
        return true;
    } else {
        wifiConnected = false;
        wl_status_t readableStatus = WiFi.status();
        Serial.printf("\n[WiFi] Failed, status=%d (%s)\n",
                      readableStatus, wifiStatusName(readableStatus));
#if defined(WIFI_FALLBACK_SSID) && defined(WIFI_FALLBACK_PASSWORD)
        if (strlen(WIFI_FALLBACK_SSID) > 0 && strcmp(WIFI_SSID, WIFI_FALLBACK_SSID) != 0) {
            Serial.printf("[WiFi] Primary SSID failed; trying fallback SSID: %s\n", WIFI_FALLBACK_SSID);
            WiFi.disconnect(false, false);
            delay(300);
            scanForSSID(WIFI_FALLBACK_SSID);
            WiFi.begin(WIFI_FALLBACK_SSID, WIFI_FALLBACK_PASSWORD);

            attempts = 0;
            while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
                delay(500);
                Serial.print(".");
                attempts++;

                if (attempts % 10 == 0) {
                    wl_status_t fallbackStatus = WiFi.status();
                    Serial.printf("\n[WiFi] fallback status=%d (%s), attempts=%d/%d\n",
                                  fallbackStatus, wifiStatusName(fallbackStatus), attempts, maxAttempts);
                }
            }

            if (WiFi.status() == WL_CONNECTED) {
                wifiConnected = true;
                Serial.println("\n[WiFi] Connected using fallback");
                Serial.printf("[WiFi] SSID: %s\n", WiFi.SSID().c_str());
                Serial.printf("[WiFi] IP: %s\n", WiFi.localIP().toString().c_str());
                Serial.printf("[WiFi] RSSI: %d dBm\n", WiFi.RSSI());

                timeClient.begin();
                timeClient.update();
                wifiConnectInProgress = false;
                return true;
            }

            Serial.printf("\n[WiFi] fallback failed, status=%d (%s)\n",
                          WiFi.status(), wifiStatusName(WiFi.status()));
        }
#endif
        wifiConnectInProgress = false;
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

    if (wifiConnectInProgress) {
        Serial.println("[WiFi] reconnect skipped; connect already in progress");
        return false;
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
    
    mqttClient.setKeepAlive(30);
    mqttClient.setSocketTimeout(4);

    String brokerCandidates[6];
    int brokerCount = 0;
    buildMqttBrokerCandidates(brokerCandidates, brokerCount, 6, String(MQTT_BROKER));
    if (brokerCount <= 0) return false;
    Serial.printf("[MQTT] SSID=%s broker candidates=%d\n", WiFi.SSID().c_str(), brokerCount);
    mqttClient.setServer(brokerCandidates[0].c_str(), MQTT_PORT);
    
    String clientId = "ESP32-SmartWatch-" + String(random(0xffff), HEX);
    if (mqttClient.connect(clientId.c_str())) {
        mqttConnected = true;
        Serial.println("MQTT连接成功!");
        
        // 订阅下行主题
        String subscribeTopic = String(MQTT_TOPIC_ROOT) + "/+/command";
        mqttClient.subscribe(subscribeTopic.c_str());
        return true;
    }
    
    for (int i = 1; i < brokerCount; i++) {
        String broker = brokerCandidates[i];
        mqttClient.setServer(broker.c_str(), MQTT_PORT);
        Serial.printf("[MQTT] fallback connecting %s:%d\n", broker.c_str(), MQTT_PORT);

        String fallbackClientId = "ESP32-SmartWatch-" + String(random(0xffff), HEX);
        if (mqttClient.connect(fallbackClientId.c_str())) {
            mqttConnected = true;
            Serial.printf("[MQTT] connected broker=%s\n", broker.c_str());

            String subscribeTopic = String(MQTT_TOPIC_ROOT) + "/+/command";
            mqttClient.subscribe(subscribeTopic.c_str());
            return true;
        }

        Serial.printf("[MQTT] fallback failed broker=%s state=%d\n", broker.c_str(), mqttClient.state());
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
