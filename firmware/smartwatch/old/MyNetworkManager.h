#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <WiFi.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include "Config.h"

class MyNetworkManager {
private:
    WiFiClient wifiClient;
    PubSubClient mqttClient;
    WiFiUDP ntpUDP;
    NTPClient timeClient;
    
    bool wifiConnected;
    bool mqttConnected;
    unsigned long last_update;
    
public:
    MyNetworkManager();
    bool connectWiFi();
    bool ensureWiFiConnected();  // 新增
    bool connectMQTT();
    bool sendHTTPData(const String& json_data);
    bool sendMQTTData(const String& topic, const String& data);
    unsigned long getTimestamp();
    void update();
    bool isConnected() { return wifiConnected; }
    bool isMQTTConnected() { return mqttConnected; }
    void disconnect();
    
    // 获取 WiFi 客户端（用于 MQTT）
    WiFiClient& getWiFiClient() { return wifiClient; }
};

#endif