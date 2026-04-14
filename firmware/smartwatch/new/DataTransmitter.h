#ifndef DATA_TRANSMITTER_H
#define DATA_TRANSMITTER_H

#include "MyNetworkManager.h"
#include "IMUManager.h"
#include "FallDetection.h"
#include "BLELocation.h"
#include "PowerManager.h"
#include "Config.h"
#include "Types.h"
#include <Arduino.h>
#include <esp_system.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <vector>
#include <algorithm>  // 添加这个用于 min 函数

// MQTT 主题定义
#define MQTT_TOPIC_PREFIX "smartwatch"
#define MQTT_TOPIC_STATUS "smartwatch/%s/status"        // 上行 - 状态更新
#define MQTT_TOPIC_LOCATION "smartwatch/%s/location"    // 上行 - 位置更新
#define MQTT_TOPIC_SOS "smartwatch/%s/sos"              // 上行 - SOS
#define MQTT_TOPIC_FALL "smartwatch/%s/fall"            // 上行 - 跌倒
#define MQTT_TOPIC_DOOR "smartwatch/%s/door"            // 上行 - 门禁
#define MQTT_TOPIC_LIGHT "smartwatch/%s/light"          // 上行 - 灯光
#define MQTT_TOPIC_LOG "smartwatch/%s/log"              // 上行 - 日志
#define MQTT_TOPIC_HEARTBEAT "smartwatch/%s/heartbeat"  // 上行 - 心跳

#define MQTT_TOPIC_NAVIGATION "smartwatch/%s/navigation"    // 下行 - 导航
#define MQTT_TOPIC_FLIGHT "smartwatch/%s/flight"            // 下行 - 航班
#define MQTT_TOPIC_ALERT "smartwatch/%s/alert"              // 下行 - 警报
#define MQTT_TOPIC_VOICE "smartwatch/%s/voice"              // 下行 - 语音
#define MQTT_TOPIC_DOOR_CTRL "smartwatch/%s/door_control"   // 下行 - 门禁控制
#define MQTT_TOPIC_LIGHT_CTRL "smartwatch/%s/light_control" // 下行 - 灯光控制
#define MQTT_TOPIC_SYSTEM "smartwatch/%s/system_command"    // 下行 - 系统命令
#define MQTT_TOPIC_CONFIG "smartwatch/%s/config"             // 下行 - 配置更新
#define MQTT_TOPIC_HEARTBEAT_RESP "smartwatch/%s/heartbeat"  // 下行 - 心跳响应
#define MQTT_TOPIC_TEXT "smartwatch/%s/text"                 // 下行 - 文本消息

// 常量定义
#define MAX_BEACON_STORE 6  // 最多存储6个信标

// 前向声明
class NavigationManager;
class FlightInfoManager;
class VoiceMessageManager;

// 门禁配置结构
struct DoorConfig {
    String door_id;
    String beacon_mac;
    float trigger_distance;
    bool is_active;
    unsigned long last_trigger_time;
    unsigned long cooldown_period;
};

// 日志条目结构
struct LogEntry {
    String level;
    String message;
    unsigned long timestamp;
};

// 信标信息结构（用于 JSON）
struct BeaconInfo {
    String mac;
    int rssi;
    float distance;
};

class DataTransmitter {
private:
    MyNetworkManager* network;
    IMUManager* imu;
    FallDetection* fall_detector;
    BLELocation* ble_location;
    PowerManager* power;
    NavigationManager* nav_manager;
    FlightInfoManager* flight_manager;
    VoiceMessageManager* voice_manager;
    
    unsigned long relative_time;
    unsigned long last_transmit;
    unsigned long transmit_interval;
    
    // 设备ID
    String device_id;
    
    // MQTT 客户端
    WiFiClient mqttWifiClient;
    PubSubClient mqttClient;
    bool mqttEnabled;
    String mqttServer;
    int mqttPort;
    String mqttUser;
    String mqttPassword;
    
    // 导航目标位置
    float target_x;
    float target_y;
    String target_name;
    bool navigation_active;
    
    // SOS 状态
    bool sos_active;
    unsigned long sos_trigger_time;
    int sos_trigger_count;
    String sos_trigger_method;
    
    // 门禁配置
    DoorConfig doors[5];
    int door_count;
    
    // 夜间移动检测
    bool night_mode_active;
    unsigned long night_start_time;
    unsigned long night_end_time;
    bool light_triggered_tonight;
    unsigned long last_movement_time;
    float movement_threshold;
    
    // 传感器数据
    HeartRateData heart_rate;
    SpO2Data spo2;
    unsigned long last_heartbeat_time;
    
    // 心跳检测
    bool heartbeat_detected;
    unsigned long last_heartbeat_check;
    unsigned long heartbeat_interval;
    
    // 日志队列
    static const int MAX_LOG_ENTRIES = 6;
    LogEntry log_entries[MAX_LOG_ENTRIES];
    int log_index;
    int log_count;
    
    // 当前位置
    float current_x;
    float current_y;
    int beacon_count;
    String location_quality;
    float accuracy;
    
    // 存储最近的信标信息
    BeaconInfo last_beacons[MAX_BEACON_STORE];
    int last_beacon_count;

    volatile bool ble_scanning_active;  // BLE 是否正在扫描
    SemaphoreHandle_t rfMutex;           // 射频互斥锁
    
public:
    DataTransmitter(MyNetworkManager* net, IMUManager* imu_mgr,
                   FallDetection* fall_det, BLELocation* ble_loc, 
                   PowerManager* pwr);
    
    void update();
    void transmitFallAlert(const FallEvent& fall_event);
    void transmitSOSAlert();
    void transmitLocation();
    void transmitAllData();
    void transmitHeartbeat();

    bool isMQTTConnected() { return mqttClient.connected(); }
    String getSOSMethod() { return sos_trigger_method; }
    int getSOSCount() { return sos_trigger_count; }
    
    // 设置管理器
    void setNavigationManager(NavigationManager* mgr) { nav_manager = mgr; }
    void setFlightManager(FlightInfoManager* mgr) { flight_manager = mgr; }
    void setVoiceManager(VoiceMessageManager* mgr) { voice_manager = mgr; }
    
    // 设置导航目标
    void setTargetPosition(float x, float y, const String& name = "");
    void setNavigationActive(bool active);
    
    // 设置 SOS 状态
    void setSOSActive(bool active, const String& method = "button");
    bool isSOSActive() { return sos_active; }
    
    // 更新当前位置（带信标信息）
    void setCurrentPosition(float x, float y, float acc, int beacons, const String& quality, 
                           const std::vector<Beacon>& beacon_list) {
        current_x = x;
        current_y = y;
        accuracy = acc;
        beacon_count = beacons;
        location_quality = quality;
        
        // 存储信标信息
        int store_count = min((int)beacon_list.size(), MAX_BEACON_STORE);
        last_beacon_count = store_count;
        for (int i = 0; i < store_count; i++) {
            last_beacons[i].mac = beacon_list[i].uuid;
        }
        
        Serial.printf("DataTransmitter 位置更新: (%.2f, %.2f) 精度=%.1f 信标=%d, 存储=%d\n", 
                      x, y, acc, beacons, store_count);
    }
    
    // 门禁配置
    void addDoor(const String& door_id, const String& beacon_mac, float trigger_distance);
    void checkDoorProximity(const String& beacon_mac, float distance);
    void triggerDoorOpen(const String& door_id);
    String getDoorBeaconMac(const String& door_id);
    
    // 夜间移动检测
    void checkNightMovement(float current_x, float current_y, 
                           const String& current_beacon_mac, 
                           float beacon_distance);
    
    // 夜间模式
    void updateNightMode();
    void triggerLightControl(bool turn_on);
    
    // 传感器数据更新
    void updateHeartRate(int bpm, float confidence = 0.9);
    void updateSpO2(int percentage, float confidence = 0.9);
    void checkHeartbeat();
    
    // 日志
    void addLog(const String& level, const String& message);
    
    // MQTT 配置    
    bool ensureMQTTConnected();
    void setMQTTConfig(const String& server, int port, 
                       const String& user = "", const String& password = "");
    void mqttLoop();
    bool publishToMQTT(const String& topic, const String& payload);
    bool publishToMQTT(const String& topic, const String& payload, bool retained);

    // ✅ 添加这两个新方法
    void setBLEScanning(bool scanning);
    bool isBLEScanning() { return ble_scanning_active; }
        
    // MQTT 消息处理
    void handleMQTTMessage(const String& topic, const String& payload);
    
    // 获取完整的JSON数据
    String getAllDataJSON();
    String getFallJSON(const FallEvent& fall_event);
    String getSOSJSON();
    String getLocationJSON();
    String getHeartbeatJSON();
    
private:
    String createTimestamp();
    String getSystemStatusJSON();
    String getNavigationJSON();
    String getSOSStatusJSON();
    String getDoorEventsJSON();
    String getNightModeJSON();
    String getSensorDataJSON();
    String getLogsJSON();
    float calculateDistanceToTarget();
    String calculateDirectionToTarget();
    bool isNightTime();
    
    // MQTT 辅助
    static void mqttCallbackStatic(char* topic, byte* payload, unsigned int length);
    void mqttCallback(char* topic, byte* payload, unsigned int length);
    String getDeviceTopic(const char* baseTopic);
};

#endif