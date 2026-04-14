#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/queue.h>
#include <freertos/semphr.h>
#include <SD_MMC.h>
#include <FS.h>
#include <Wire.h>
#include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include <vector>
#include <WiFi.h>
#include <HTTPClient.h>
#include <PubSubClient.h>

// 首先包含类型定义
#include "Types.h"

// 然后包含其他头文件
#include "Config.h"
#include "pin_config.h"
#include "SimpleDisplayManager.h"
#include "IMUManager.h"
#include "FallDetection.h"
#include "BLELocation.h"
#include "MyNetworkManager.h"
#include "PowerManager.h"
#include "ButtonManager.h"
#include "AudioManager.h"
#include "DataTransmitter.h"
#include "NavigationManager.h"
#include "FlightInfoManager.h"
#include "VoiceMessageManager.h"

// 定义管理器指针
NavigationManager* nav_manager = nullptr;
FlightInfoManager* flight_manager = nullptr;
VoiceMessageManager* voice_manager = nullptr;

// ==================== 类型定义 ====================
enum MapMode {
    MAP_MODE_VECTOR = 0,
    MAP_MODE_IMAGE,
    MAP_MODE_HYBRID
};

// 按钮事件数据结构
struct ButtonEventData {
    enum ButtonEventType {
        NO_EVENT = 0,
        PWR_SINGLE_CLICK,
        PWR_DOUBLE_CLICK,
        BOOT_SOS_ACTIVATED,
        BOOT_SOS_CLEARED
    } type;
    uint32_t timestamp;
};

// IMU数据结构
struct IMUDataPacket {
    uint32_t timestamp;
    float accel_x, accel_y, accel_z;
    float gyro_x, gyro_y, gyro_z;
    float temperature;
    float magnitude;
};

// 定位数据
struct LocationData {
    float x, y;
    float accuracy;
    String quality;
    int beaconCount;
    uint32_t timestamp;
};

// 地图更新命令
struct MapCommand {
    enum MapCommandType {
        MAP_UPDATE_POSITION,
        MAP_UPDATE_TARGET,
        MAP_TOGGLE_MODE,
        MAP_TOGGLE_LEGEND,
        MAP_TOGGLE_GRID,
        MAP_SCROLL,
        MAP_LOAD_IMAGE,
        MAP_SHOW_SOS,
        MAP_SHOW_NAVIGATION
    } command;
    float param1, param2;
    bool bool_param;
};

// ==================== Beacon配置 ====================
struct BeaconConfig {
    String macAddress;
    String uuid;
    int major;
    int minor;
    float position[4];
    float calibrationFactor;
    int referenceRssi;
};

BeaconConfig beaconConfigs[] = {
    {"20:A7:16:60:F7:C4", "01122334-4556-6778-899A-ABBCCDDEEFF0", 1800, 1286, {0, 0, 0, 0}, 1.0, -59},
    {"20:A7:16:60:F7:CA", "01122334-4556-6778-899A-ABBCCDDEEFF0", 1800, 1286, {5, 0, 0, 0}, 1.0, -59},
    {"20:A7:16:5E:EF:24", "01122334-4556-6778-899A-ABBCCDDEEFF0", 1800, 1286, {0, 5, 0, 0}, 1.0, -59},
    {"20:A7:16:61:02:3F", "01122334-4556-6778-899A-ABBCCDDEEFF0", 1800, 1286, {5, 5, 0, 0}, 1.0, -59},
    {"F0:6B:EF:1D:7E:71", "B9407F30-F5F8-466E-AFF9-25556B57FE6D", 1, 5, {2.5, 0, 2, 0}, 1.0, -59},
    {"E1:33:B7:89:78:3E", "B9407F30-F5F8-466E-AFF9-25556B57FE6D", 1, 6, {2.5, 5, 2, 0}, 1.0, -59}
};

const int MY_BEACON_COUNT = sizeof(beaconConfigs) / sizeof(beaconConfigs[0]);

// BLE设备信息结构体
struct BLEDeviceInfo {
    String macAddress;
    String name;
    int rssi;
    String addressType;
    bool isConnectable;
    String manufacturerData;
    bool isIBeacon;
    String uuid;
    int major;
    int minor;
    int beaconTxPower;
    float estimatedDistance;
    float calibratedDistance;
    unsigned long timestamp;
    bool isTargetBeacon;
    BeaconConfig* config;
};

// ==================== 全局变量 ====================
MapMode current_map_mode = MAP_MODE_IMAGE;
bool show_legend = true;
bool show_grid = true;

// 全局对象指针
Arduino_DataBus *bus = nullptr;
Arduino_GFX *gfx = nullptr;
SimpleDisplayManager *display = nullptr;
IMUManager *imu = nullptr;
FallDetection *fall_detector = nullptr;
MyNetworkManager *network = nullptr;
PowerManager *power = nullptr;
AudioManager *audio = nullptr;
DataTransmitter *data_transmitter = nullptr;
ButtonManager* buttonManager = nullptr;


// BLE相关
BLEScan* pBLEScan = nullptr;
std::vector<BLEDeviceInfo> allDevices;
std::vector<BLEDeviceInfo> foundTargetBeacons;
PositionSmoother positionSmoother;

// ==================== 任务句柄 ====================
TaskHandle_t imuSamplingTaskHandle = nullptr;
TaskHandle_t fallDetectionTaskHandle = nullptr;
TaskHandle_t buttonTaskHandle = nullptr;
TaskHandle_t bleLocationTaskHandle = nullptr;
TaskHandle_t mapDisplayTaskHandle = nullptr;
TaskHandle_t networkTaskHandle = nullptr;
TaskHandle_t audioTaskHandle = nullptr;
TaskHandle_t powerTaskHandle = nullptr;
TaskHandle_t mainCoordinatorTaskHandle = nullptr;

// ==================== 队列和信号量 ====================
QueueHandle_t imuDataQueue = nullptr;
QueueHandle_t buttonEventQueue = nullptr;
QueueHandle_t locationDataQueue = nullptr;
QueueHandle_t mapUpdateQueue = nullptr;
QueueHandle_t audioCommandQueue = nullptr;
QueueHandle_t displayCommandQueue = nullptr;

SemaphoreHandle_t i2cMutex = nullptr;
SemaphoreHandle_t spiMutex = nullptr;
SemaphoreHandle_t sdMutex = nullptr;

// ==================== 状态变量 ====================
volatile bool systemRunning = true;
bool navigation_active = false;
bool sos_active = false;
bool display_on = true;
bool wifiConnected = false;
bool dataUploadEnabled = false;

// 位置信息
float current_x = 3.0, current_y = 14.0;
float target_x = 6.0, target_y = 2.0;
LocationData currentLocation = {3.0, 2.0, 5.0, "unknown", 0, 0};

// ==================== 函数声明 ====================
void initHardware();
void initDisplay();
void initIMU();
void initFallDetection();
void initBLE();
void initNetwork();
void initPower();
void initAudio();
void initDataTransmitter();

void imuSamplingTask(void* param);
void fallDetectionTask(void* param);
void buttonTask(void* param);
void bleLocationTask(void* param);
void mapDisplayTask(void* param);
void networkTask(void* param);
void audioTask(void* param);
void powerTask(void* param);
void mainCoordinatorTask(void* param);
void mutexMonitorTask(void* param);

void handleButtonEvent(const ButtonEventData& event);
void handleNavigation();
void handleSerialCommands();
void printSystemStatus();
void checkSystemHealth();
String getDirection(float from_x, float from_y, float to_x, float to_y);

// BLE辅助函数
String getManufacturerDataHex(BLEAdvertisedDevice& device);
bool parseManufacturerDataAsIBeacon(BLEAdvertisedDevice& device, BLEDeviceInfo& deviceInfo);
float calculateDistance(int rssi, int txPower, float calibrationFactor = 1.0);
BeaconConfig* checkIfTargetBeacon(const String& mac, const String& uuid, int major, int minor, bool isIBeacon);
void processBLEDevice(BLEAdvertisedDevice advertisedDevice);
LocationData calculateLocation();
BLELocation *ble_location = nullptr;

// 网络函数
bool connectWiFi();
void disconnectWiFi();
String createLocationJson(float x, float y, float accuracy, String quality, int beaconCount);
bool uploadLocation(float x, float y, float accuracy, String quality, int beaconCount);

// ==================== BLE辅助函数实现 ====================
String getManufacturerDataHex(BLEAdvertisedDevice& device) {
    if (!device.haveManufacturerData()) return "";
    String mfgData = device.getManufacturerData();
    String result = "";
    for (size_t i = 0; i < mfgData.length(); i++) {
        char buffer[4];
        sprintf(buffer, "%02X", (uint8_t)mfgData[i]);
        result += buffer;
    }
    return result;
}

bool parseManufacturerDataAsIBeacon(BLEAdvertisedDevice& device, BLEDeviceInfo& deviceInfo) {
    if (!device.haveManufacturerData()) return false;
    
    String mfgDataStr = device.getManufacturerData();
    if (mfgDataStr.length() == 0) return false;
    
    String hexData = "";
    for (size_t i = 0; i < mfgDataStr.length(); i++) {
        char buffer[3];
        sprintf(buffer, "%02X", (uint8_t)mfgDataStr[i]);
        hexData += buffer;
    }
    
    if (!hexData.startsWith("4C00") && !hexData.startsWith("4C00")) return false;
    
    String cleanHex = hexData;
    cleanHex.replace(" ", "");
    
    if (cleanHex.length() < 8 || cleanHex.substring(4, 8) != "0215") return false;
    if (cleanHex.length() < 48) return false;
    
    String hexUUID = cleanHex.substring(8, 40);
    char formattedUUID[37];
    snprintf(formattedUUID, 37,
             "%s-%s-%s-%s-%s",
             hexUUID.substring(0, 8).c_str(),
             hexUUID.substring(8, 12).c_str(),
             hexUUID.substring(12, 16).c_str(),
             hexUUID.substring(16, 20).c_str(),
             hexUUID.substring(20, 32).c_str());
    
    deviceInfo.uuid = String(formattedUUID);
    deviceInfo.uuid.toUpperCase();
    
    deviceInfo.major = strtol(cleanHex.substring(40, 44).c_str(), NULL, 16);
    deviceInfo.minor = strtol(cleanHex.substring(44, 48).c_str(), NULL, 16);
    
    if (cleanHex.length() >= 50) {
        int8_t txPower = strtol(cleanHex.substring(48, 50).c_str(), NULL, 16);
        if (txPower > 127) txPower = txPower - 256;
        deviceInfo.beaconTxPower = txPower;
    } else {
        deviceInfo.beaconTxPower = -59;
    }
    
    return true;
}

float calculateDistance(int rssi, int txPower, float calibrationFactor) {
    if (rssi == 0 || rssi > -30) return -1.0;
    
    float n = 2.5;
    if (rssi < -100) rssi = -100;
    
    float ratio = (float)(txPower - rssi) / (10.0 * n);
    float distance = pow(10.0, ratio);
    distance *= calibrationFactor;
    
    if (rssi > -60) distance *= 0.8;
    else if (rssi < -80 && distance > 15.0) distance = 15.0;
    
    if (distance < 0.3) distance = 0.3;
    if (distance > 30.0) distance = 30.0;
    
    return distance;
}

BeaconConfig* checkIfTargetBeacon(const String& mac, const String& uuid, int major, int minor, bool isIBeacon) {
    String normalizedMac = mac;
    normalizedMac.toUpperCase();
    
    for (int i = 0; i < MY_BEACON_COUNT; i++) {
        if (normalizedMac.equalsIgnoreCase(beaconConfigs[i].macAddress)) {
            return &beaconConfigs[i];
        }
    }
    
    if (isIBeacon && uuid.length() > 0) {
        String normalizedUuid = uuid;
        normalizedUuid.toUpperCase();
        
        for (int i = 0; i < MY_BEACON_COUNT; i++) {
            String configUuid = beaconConfigs[i].uuid;
            configUuid.toUpperCase();
            
            if (normalizedUuid.equalsIgnoreCase(configUuid) &&
                major == beaconConfigs[i].major &&
                minor == beaconConfigs[i].minor) {
                return &beaconConfigs[i];
            }
        }
    }
    
    return nullptr;
}

void processBLEDevice(BLEAdvertisedDevice advertisedDevice) {
    BLEDeviceInfo deviceInfo;
    
    deviceInfo.macAddress = advertisedDevice.getAddress().toString().c_str();
    deviceInfo.macAddress.toUpperCase();
    deviceInfo.rssi = advertisedDevice.getRSSI();
    deviceInfo.timestamp = millis();
    
    if (advertisedDevice.haveName()) {
        deviceInfo.name = advertisedDevice.getName().c_str();
    }
    
    deviceInfo.manufacturerData = getManufacturerDataHex(advertisedDevice);
    deviceInfo.isIBeacon = parseManufacturerDataAsIBeacon(advertisedDevice, deviceInfo);
    
    if (deviceInfo.isIBeacon && deviceInfo.rssi != 0 && deviceInfo.beaconTxPower != 0) {
        deviceInfo.estimatedDistance = calculateDistance(deviceInfo.rssi, deviceInfo.beaconTxPower, 1.0);
    }
    
    deviceInfo.config = checkIfTargetBeacon(
        deviceInfo.macAddress, deviceInfo.uuid,
        deviceInfo.major, deviceInfo.minor, deviceInfo.isIBeacon
    );
    
    deviceInfo.isTargetBeacon = (deviceInfo.config != nullptr);
    
    if (!deviceInfo.isTargetBeacon) {
        for (int i = 0; i < MY_BEACON_COUNT; i++) {
            if (deviceInfo.macAddress.equalsIgnoreCase(beaconConfigs[i].macAddress)) {
                deviceInfo.config = &beaconConfigs[i];
                deviceInfo.isTargetBeacon = true;
                break;
            }
        }
    }
    
    if (deviceInfo.isTargetBeacon && deviceInfo.config) {
        int txPowerToUse = (deviceInfo.config->referenceRssi != 0) ? 
                           deviceInfo.config->referenceRssi : deviceInfo.beaconTxPower;
        deviceInfo.calibratedDistance = calculateDistance(
            deviceInfo.rssi, txPowerToUse, deviceInfo.config->calibrationFactor);
    }
    
    bool found = false;
    for (auto& device : allDevices) {
        if (device.macAddress == deviceInfo.macAddress) {
            device = deviceInfo;
            found = true;
            break;
        }
    }
    
    if (!found) {
        allDevices.push_back(deviceInfo);
    }
    
    if (deviceInfo.isTargetBeacon) {
        bool targetFound = false;
        for (auto& device : foundTargetBeacons) {
            if (device.macAddress == deviceInfo.macAddress) {
                device = deviceInfo;
                targetFound = true;
                break;
            }
        }
        if (!targetFound) {
            foundTargetBeacons.push_back(deviceInfo);
        }
    }
}

class ScanCallback : public BLEAdvertisedDeviceCallbacks {
public:
    void onResult(BLEAdvertisedDevice advertisedDevice) {
        processBLEDevice(advertisedDevice);
    }
};

LocationData calculateLocation() {
    LocationData result = {0, 0, 100.0, "none", 0, millis()};
    
    if (foundTargetBeacons.empty()) {
        Serial.println("⚠️ foundTargetBeacons 为空");
        return result;
    }
    
    float sumWeight = 0, sumX = 0, sumY = 0;
    int validBeacons = 0;
    float minDistance = 100.0;
    
    // 找出最小距离
    for (const auto& beacon : foundTargetBeacons) {
        if (beacon.config && beacon.calibratedDistance > 0 && beacon.calibratedDistance < 20) {
            if (beacon.calibratedDistance < minDistance) {
                minDistance = beacon.calibratedDistance;
            }
        }
    }
    
    Serial.printf("最小距离: %.2f\n", minDistance);
    
    for (const auto& beacon : foundTargetBeacons) {
        if (beacon.config && beacon.calibratedDistance > 0 && beacon.calibratedDistance < 20) {
            float distance = beacon.calibratedDistance;
            float weight = 1.0 / (distance * distance * distance + 0.1);
            
            if (distance == minDistance && minDistance < 5.0) weight *= 2.0;
            if (beacon.rssi > -60) weight *= 1.5;
            else if (beacon.rssi < -85) weight *= 0.5;
            
            Serial.printf("  使用信标: %s 距离=%.2f 权重=%.3f\n", 
                         beacon.macAddress.c_str(), distance, weight);
            
            sumX += beacon.config->position[0] * weight;
            sumY += beacon.config->position[1] * weight;
            sumWeight += weight;
            validBeacons++;
        }
    }
    
    Serial.printf("有效信标数: %d, 总权重: %.3f\n", validBeacons, sumWeight);
    
    if (validBeacons >= 1 && sumWeight > 0) {
        result.x = sumX / sumWeight;
        result.y = sumY / sumWeight;
        
        if (validBeacons >= 3) {
            result.accuracy = 2.0;
            result.quality = "high";
        } else if (validBeacons == 2) {
            result.accuracy = 3.0;
            result.quality = "medium";
        } else {
            result.accuracy = 5.0;
            result.quality = "low";
        }
        
        if (minDistance < 2.0) {
            result.accuracy = 1.0;
            result.quality = "very_high";
        }
        
        result.x = constrain(result.x, 0, 20);
        result.y = constrain(result.y, 0, 10);
        result.beaconCount = validBeacons;
        
        Serial.printf("✅ 定位成功: (%.2f, %.2f) 精度=%.1f 质量=%s\n",
                     result.x, result.y, result.accuracy, result.quality.c_str());
    } else {
        Serial.println("❌ 定位失败：没有有效信标");
    }
    
    return result;
}

// ==================== 网络函数实现 ====================
bool connectWiFi() {
    Serial.printf("\n连接WiFi: %s", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        Serial.println("\n✅ WiFi连接成功!");
        Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
        return true;
    } else {
        wifiConnected = false;
        Serial.println("\n❌ WiFi连接失败!");
        return false;
    }
}

void disconnectWiFi() {
    WiFi.disconnect();
    wifiConnected = false;
    Serial.println("WiFi已断开");
}

String createLocationJson(float x, float y, float accuracy, String quality, int beaconCount) {
    String json = "{";
    json += "\"device\":\"ESP32-S3\",";
    json += "\"timestamp\":" + String(millis()) + ",";
    json += "\"location\":{";
    json += "\"x\":" + String(x, 2) + ",";
    json += "\"y\":" + String(y, 2) + ",";
    json += "\"accuracy\":" + String(accuracy, 2) + ",";
    json += "\"quality\":\"" + quality + "\",";
    json += "\"beacons\":" + String(beaconCount);
    json += "}";
    json += "}";
    return json;
}

bool uploadLocation(float x, float y, float accuracy, String quality, int beaconCount) {
    if (!wifiConnected || !dataUploadEnabled) return false;
    
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");
    
    String jsonData = createLocationJson(x, y, accuracy, quality, beaconCount);
    int httpCode = http.POST(jsonData);
    bool success = (httpCode == 200 || httpCode == 201);
    
    if (success) {
        Serial.printf("✅ 上传成功, HTTP %d\n", httpCode);
    } else {
        Serial.printf("❌ 上传失败, HTTP %d\n", httpCode);
    }
    
    http.end();
    return success;
}

// ==================== 硬件初始化函数 ====================
void initHardware() {
    Serial.println("初始化硬件...");
    
    bus = new Arduino_ESP32QSPI(
        LCD_CS, LCD_SCLK, LCD_SDIO0, LCD_SDIO1, LCD_SDIO2, LCD_SDIO3);
    
    gfx = new Arduino_CO5300(bus, LCD_RESET, 0, LCD_WIDTH, LCD_HEIGHT, 22, 0, 0, 0);
    
    if (!gfx->begin()) {
        Serial.println("显示屏初始化失败!");
        while(1);
    }
    
    gfx->fillScreen(RGB565_BLACK);
    Serial.println("硬件初始化完成");
}

void initDisplay() {
    Serial.println("初始化显示管理器...");
    display = new SimpleDisplayManager(gfx);
    if (!display->init()) {
        Serial.println("显示管理初始化失败!");
    }
    
    display->setTime(12, 0, 0);
    display->setDate(2024, 1, 1);
    display->setStatus("系统启动中...");
    
    Serial.println("显示管理初始化完成");
}

void initIMU() {
    Serial.println("初始化IMU...");
    imu = new IMUManager();
    if (!imu->init()) {
        Serial.println("IMU初始化失败，使用模拟数据");
    }
}

void initFallDetection() {
    Serial.println("初始化跌倒检测...");
    fall_detector = new FallDetection(imu);
}

void initBLE() {
    Serial.println("初始化BLE定位...");
    
    BLEDevice::init(DEVICE_ID);
    
    if (!ble_location) {
        ble_location = new BLELocation();
    }
    
    if (ble_location) {
        ble_location->init();
        Serial.println("✅ BLE定位初始化成功");
        
        // 获取扫描器并配置
        pBLEScan = BLEDevice::getScan();
        pBLEScan->setAdvertisedDeviceCallbacks(new ScanCallback());
        pBLEScan->setActiveScan(true);
        
        // ===== 优化扫描参数 =====
        pBLEScan->setInterval(500);      // 扫描间隔 500ms
        pBLEScan->setWindow(450);        // 扫描窗口 450ms (90%时间在扫描)
        pBLEScan->setDuplicateFilter(false);  // 不过滤重复设备
        
        Serial.println("BLE扫描参数配置完成：");
        Serial.println("  间隔: 500ms");
        Serial.println("  窗口: 450ms");
        Serial.println("  重复过滤: 关闭");
    } else {
        Serial.println("❌ BLE定位初始化失败");
    }
}

void initNetwork() {
    Serial.println("初始化网络...");
    network = new MyNetworkManager();
}

void initPower() {
    Serial.println("初始化电源管理...");
    power = new PowerManager();
    power->init();
}

void initAudio() {
    Serial.println("初始化音频管理...");
    audio = new AudioManager();
    audio->init();
}

void initDataTransmitter() {
    Serial.println("初始化数据传输...");
    data_transmitter = new DataTransmitter(network, imu, fall_detector, nullptr, power);
}

// ==================== FreeRTOS任务实现 ====================

// IMU采样任务 (100Hz)
void imuSamplingTask(void* param) {
    const TickType_t samplingInterval = pdMS_TO_TICKS(10);
    TickType_t lastWakeTime = xTaskGetTickCount();
    
    uint32_t sampleCount = 0;
    uint32_t lastStatsTime = millis();
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, samplingInterval);
        
        if (imu != NULL) {
            if (i2cMutex != NULL && xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(5)) == pdTRUE) {
                imu->update();
                IMUData imu_data = imu->getData();  // 获取 IMU 数据
                
                IMUDataPacket packet;  // 创建数据包
                packet.timestamp = micros();
                packet.accel_x = imu_data.accel_x;
                packet.accel_y = imu_data.accel_y;
                packet.accel_z = imu_data.accel_z;
                packet.gyro_x = imu_data.gyro_x;
                packet.gyro_y = imu_data.gyro_y;
                packet.gyro_z = imu_data.gyro_z;
                packet.temperature = imu_data.temperature;
                packet.magnitude = sqrt(packet.accel_x*packet.accel_x + 
                                       packet.accel_y*packet.accel_y + 
                                       packet.accel_z*packet.accel_z);
                
                // 发送到队列
                if (imuDataQueue != NULL) {
                    xQueueSend(imuDataQueue, &packet, 0);
                }
                
                xSemaphoreGive(i2cMutex);
                sampleCount = 100 ;

            }
        }
        
        uint32_t now = millis();
        if (now - lastStatsTime >= 10000) {
            Serial.printf("[IMU] 采样率: %d Hz\n", sampleCount);
            sampleCount = 0;
            lastStatsTime = now;
        }
    }
    vTaskDelete(NULL);
}

// 跌倒检测任务
void fallDetectionTask(void* param) {
    const TickType_t detectionInterval = pdMS_TO_TICKS(20);
    TickType_t lastWakeTime = xTaskGetTickCount();
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, detectionInterval);
        
        if (fall_detector) {
            fall_detector->update();
            
            if (fall_detector->isFallDetected()) {
                FallEvent fall_event = fall_detector->getFallEvent();
                Serial.printf("[FALL] %s\n", fall_event.description.c_str());
                
                AudioCommand audio_cmd;
                audio_cmd.command = AudioCommand::AUDIO_PLAY_ALERT;
                if (audioCommandQueue) xQueueSend(audioCommandQueue, &audio_cmd, 0);
                
                if (data_transmitter) data_transmitter->transmitFallAlert(fall_event);
            }
        }
    }
    vTaskDelete(nullptr);
}

// 按钮处理任务
void buttonTask(void* param) {
    const TickType_t buttonInterval = pdMS_TO_TICKS(20);
    TickType_t lastWakeTime = xTaskGetTickCount();
    
    ButtonManager buttonManager;
    buttonManager.init();
    
    Serial.println("[按钮] 按钮任务启动");
    Serial.printf("[按钮] BOOT引脚: %d\n", BOOT_BUTTON_PIN);
    Serial.printf("[按钮] PWR引脚: %d\n", PWR_BUTTON_PIN);
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, buttonInterval);
        
        buttonManager.update();
        int event = buttonManager.getEvent();
        
        if (event != 0) {
            Serial.printf("[按钮] 检测到事件: %d\n", event);
            
            ButtonEventData btnEvent;
            btnEvent.timestamp = millis();
            
            switch(event) {
                case 1:
                    btnEvent.type = ButtonEventData::PWR_SINGLE_CLICK;
                    Serial.println("[按钮] PWR单击");
                    break;
                case 2:
                    btnEvent.type = ButtonEventData::PWR_DOUBLE_CLICK;
                    Serial.println("[按钮] PWR双击");
                    break;
                case 3:
                    btnEvent.type = ButtonEventData::BOOT_SOS_ACTIVATED;
                    Serial.println("[按钮] 🚨 SOS激活");
                    break;
                case 4:
                    btnEvent.type = ButtonEventData::BOOT_SOS_CLEARED;
                    Serial.println("[按钮] SOS解除");
                    break;
            }
            
            if (buttonEventQueue) {
                if (xQueueSend(buttonEventQueue, &btnEvent, 0) == pdTRUE) {
                    Serial.println("[按钮] 事件已发送到队列");
                } else {
                    Serial.println("[按钮] 队列发送失败！");
                }
            } else {
                Serial.println("[按钮] buttonEventQueue为空！");
            }
        }
    }
    vTaskDelete(nullptr);
}

// BLE定位任务
void bleLocationTask(void* param) {
    const TickType_t locationInterval = pdMS_TO_TICKS(3000);  // 2秒一次
    TickType_t lastWakeTime = xTaskGetTickCount();

    // 首次运行设置起始点
    static bool firstRun = true;
    if (firstRun) {
        current_x = 2.0;
        current_y = 2.0;
        currentLocation.x = 2.0;
        currentLocation.y = 2.0;
        if (display) {
            display->setCurrentPosition(2, 2);
        }
        Serial.println("📍 起始点设置为 (2,2)");
        firstRun = false;
    }
            
    // 配置平滑器参数
    if (ble_location) {
        ble_location->setSmootherParams(8, 2.5, 4.0);
        Serial.println("BLE定位平滑器已配置");
    } else {
        Serial.println("❌ ble_location 为空！");
    }
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, locationInterval);
        
        Serial.println("\n=== BLE定位任务开始 ===");
        
        if (!ble_location) {
            Serial.println("❌ ble_location 为空");
            vTaskDelay(pdMS_TO_TICKS(100));
            continue;
        }
        
        // ===== 1. 开始扫描 =====
        Serial.println("开始BLE扫描...");
        ble_location->startScan();  // public 函数
        
        // 扫描 1500ms
        vTaskDelay(pdMS_TO_TICKS(1500));
        
        ble_location->stopScan();  // public 函数
        Serial.println("扫描完成");
        
        // ===== 2. 获取位置（直接使用 public 函数）=====
        Location loc = ble_location->getLocation();  // ✅ 正确！public 函数
        
        // ===== 3. 获取扫描到的信标 =====
        int beaconCount = ble_location->getBeaconCount();  // public 函数
        Serial.printf("扫描到 %d 个目标信标\n", beaconCount);
        
        // ===== 4. 打印定位信息 =====
        Serial.printf("📍 当前位置: (%.2f, %.2f) 精度=%.1f 质量=%s 信标=%d\n",
                     loc.x, loc.y, loc.accuracy, loc.quality.c_str(), loc.beacon_count);
        
        // ===== 5. 获取信标详情（通过 public 的 getScannedBeacons()）=====
        const auto& beacons = ble_location->getScannedBeacons();  // public 函数
        
        // ===== 6. 更新显示和数据传输 =====
        if (loc.beacon_count > 0) {
            if (data_transmitter) {
                data_transmitter->setCurrentPosition(
                    loc.x, loc.y, 
                    loc.accuracy,
                    loc.beacon_count, 
                    loc.quality,
                    beacons
                );
            }

            if (display) {
                display->setCurrentPosition(loc.x, loc.y);
            }

            // 更新全局变量
            currentLocation.x = loc.x;
            currentLocation.y = loc.y;
            currentLocation.accuracy = loc.accuracy;
            currentLocation.quality = loc.quality;
            currentLocation.beaconCount = loc.beacon_count;
            currentLocation.timestamp = millis() / 1000;

            // 打印定位信息（你原来的那行）
            // 打印定位信息
            Serial.printf("\n📍 当前位置: (%.2f, %.2f) [12x16] 精度=%.1f 质量=%s 信标=%d\n",
                     loc.x, loc.y, loc.accuracy, loc.quality.c_str(), loc.beacon_count);
            } else {
            Serial.println("⏸️ 无新信标，保持上次位置");
        }

        // 更新显示器的WiFi状态
        if (display) {
            display->setWiFiStatus(wifiConnected, WiFi.RSSI());
        }
        
        // 夜间移动检测（CA信标）
        String ca_mac = "";
        float ca_distance = 999.0;
        
        for (const auto& beacon : beacons) {
            // 门禁检测
            if (data_transmitter) {
                data_transmitter->checkDoorProximity(beacon.uuid, beacon.distance);
                Serial.printf("门禁检测: %s 距离=%.2f\n", beacon.uuid.c_str(), beacon.distance);
            }
            
            if (beacon.uuid == ca_mac) {
                ca_distance = beacon.distance;
                Serial.printf("CA信标距离: %.2f\n", ca_distance);
            }
        }
        
        // 夜间移动检测
        if (data_transmitter) {
            data_transmitter->checkNightMovement(loc.x, loc.y, ca_mac, ca_distance);
            Serial.println("夜间移动检测完成");
        }
        
        // 自动上传位置
        if (dataUploadEnabled) {
            uploadLocation(loc.x, loc.y, loc.accuracy, loc.quality, loc.beacon_count);
            Serial.println("位置已上传");
        }
        
        pBLEScan->clearResults();
        Serial.println("=== BLE定位任务结束 ===\n");
    }
    vTaskDelete(nullptr);
}

void setTargetPosition(float x, float y, const String& name) {
    target_x = x;
    target_y = y;
    
    if (data_transmitter) {
        data_transmitter->setTargetPosition(x, y, name);
    }
}

void setNavigationActive(bool active) {
    navigation_active = active;
    if (data_transmitter) {
        data_transmitter->setNavigationActive(active);
    }
}

// 地图显示任务
void mapDisplayTask(void* param) {
    const TickType_t displayInterval = pdMS_TO_TICKS(50);
    TickType_t lastWakeTime = xTaskGetTickCount();
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, displayInterval);
        
        if (mapUpdateQueue != NULL) {
            MapCommand map_cmd;
            while (xQueueReceive(mapUpdateQueue, &map_cmd, 0) == pdTRUE) {
                if (display != NULL) {
                    switch (map_cmd.command) {
                        case MapCommand::MAP_UPDATE_POSITION:
                            display->setCurrentPosition(map_cmd.param1, map_cmd.param2);
                            break;
                        case MapCommand::MAP_UPDATE_TARGET:
                            // 修改这里：使用两个参数的版本
                            display->setTargetPosition(map_cmd.param1, map_cmd.param2);
                            break;
                    }
                }
            }
        }
        
        if (locationDataQueue != NULL) {
            LocationData locData;
            while (xQueueReceive(locationDataQueue, &locData, 0) == pdTRUE) {
                if (display != NULL) {
                    display->setCurrentPosition(locData.x, locData.y);
                }
            }
        }
        
        if (display != NULL) {
            display->update();
        }
        
        taskYIELD();
    }
    vTaskDelete(NULL);
}

// 网络任务
void networkTask(void* param) {
    const TickType_t networkInterval = pdMS_TO_TICKS(1000);
    TickType_t lastWakeTime = xTaskGetTickCount();
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, networkInterval);
        
        if (network) network->update();
        
        static uint32_t lastStatus = 0;
        if (millis() - lastStatus > 10000) {
            Serial.printf("[网络] WiFi: %s\n",
                         network && network->isConnected() ? "已连" : "未连");
            lastStatus = millis();
        }
    }
    vTaskDelete(nullptr);
}

// 音频任务
void audioTask(void* param) {
    Serial.println("音频任务启动");
    
    AudioManager audio;
    audio.init();
    
    while (systemRunning) {
        AudioCommand audio_cmd;
        if (audioCommandQueue && xQueueReceive(audioCommandQueue, &audio_cmd, pdMS_TO_TICKS(100)) == pdTRUE) {
            Serial.printf("音频任务收到命令: %d\n", audio_cmd.command);
            
            switch (audio_cmd.command) {
                case AudioCommand::AUDIO_PLAY_ALERT:
                    // 检查是否是文件路径
                    if (strlen(audio_cmd.text) > 0 && audio_cmd.text[0] == '/') {
                        Serial.printf("播放文件: %s\n", audio_cmd.text);
                        audio.playFileFromSD(audio_cmd.text);
                    } else {
                        audio.playAlert();
                    }
                    break;
                    
                case AudioCommand::AUDIO_PLAY_TTS:
                    audio.playTTS(audio_cmd.text);
                    break;
                    
                case AudioCommand::AUDIO_STOP:
                    audio.stop();
                    break;
            }
        }
        audio.update();
        vTaskDelay(pdMS_TO_TICKS(10));
    }
    vTaskDelete(nullptr);
}

// 电源管理任务
void powerTask(void* param) {
    const TickType_t powerInterval = pdMS_TO_TICKS(1000);
    TickType_t lastWakeTime = xTaskGetTickCount();
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, powerInterval);
        
        if (power) {
            power->update();
            
            static uint32_t lastWarning = 0;
            int battery = power->getBatteryPercent();
            
            // 更新显示器的电量
            if (display) {
                display->setBatteryLevel(battery);
            }
                        
            if (battery < 20 && !power->isCharging() && !sos_active) {
                if (millis() - lastWarning > 60000) {
                    AudioCommand audio_cmd;
                    audio_cmd.command = AudioCommand::AUDIO_PLAY_TTS;
                    snprintf(audio_cmd.text, sizeof(audio_cmd.text), "低电量警告");
                    if (audioCommandQueue) xQueueSend(audioCommandQueue, &audio_cmd, 0);
                    lastWarning = millis();
                }
            }
        }
    }
    vTaskDelete(nullptr);
}

// 主协调任务
void mainCoordinatorTask(void* param) {
    const TickType_t mainInterval = pdMS_TO_TICKS(100);
    TickType_t lastWakeTime = xTaskGetTickCount();
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, mainInterval);
        
        ButtonEventData btn_event;
        while (buttonEventQueue && xQueueReceive(buttonEventQueue, &btn_event, 0) == pdTRUE) {
            handleButtonEvent(btn_event);
        }
        
        if (navigation_active) {
            handleNavigation();
        }
        
        handleSerialCommands();
        
        static uint32_t lastHealthCheck = 0;
        if (millis() - lastHealthCheck >= 30000) {
            checkSystemHealth();
            lastHealthCheck = millis();
        }
    }
    vTaskDelete(nullptr);
}

// 互斥锁监控任务
void mutexMonitorTask(void* param) {
    const TickType_t interval = pdMS_TO_TICKS(1000);
    
    while (systemRunning) {
        vTaskDelay(interval);
        
        // 检查 spiMutex
        if (spiMutex == NULL) {
            Serial.printf("[严重] spiMutex 为 NULL! 重新创建\n");
            spiMutex = xSemaphoreCreateBinary();
            xSemaphoreGive(spiMutex);
        } else {
            // 测试锁是否有效
            if (xSemaphoreTake(spiMutex, 0) == pdTRUE) {
                xSemaphoreGive(spiMutex);
            }
        }
        
        // 检查 i2cMutex
        if (i2cMutex == NULL) {
            i2cMutex = xSemaphoreCreateBinary();
            xSemaphoreGive(i2cMutex);
        }
        
        // 检查 sdMutex
        if (sdMutex == NULL) {
            sdMutex = xSemaphoreCreateBinary();
            xSemaphoreGive(sdMutex);
        }
        
        static uint32_t lastPrint = 0;
        if (millis() - lastPrint > 10000) {
            lastPrint = millis();
            Serial.printf("互斥锁状态 - spi:%s i2c:%s sd:%s\n",
                         spiMutex ? "OK" : "NULL",
                         i2cMutex ? "OK" : "NULL",
                         sdMutex ? "OK" : "NULL");
        }
    }
    vTaskDelete(NULL);
}

// ==================== 事件处理函数 ====================
void handleButtonEvent(const ButtonEventData& event) {
    Serial.printf("处理按钮事件: type=%d\n", event.type);
    
    switch (event.type) {
        case ButtonEventData::PWR_SINGLE_CLICK:
            display_on = !display_on;
            Serial.printf("屏幕: %s\n", display_on ? "开" : "关");
            break;
            
        case ButtonEventData::PWR_DOUBLE_CLICK:
            // 双击PWR：切换导航显示
            navigation_active = !navigation_active;
            if (display) {
                display->setShowNavigation(navigation_active);  // 需要添加这个函数
            }
            
            // ===== 播放SOS报警音乐 =====
            if (audio) {
                audio->playSOSAlert();  // 直接调用播放文件
                Serial.println("  播放SOS报警音乐");
            } else {
                Serial.println("  audio为空，尝试用队列");
                // 备用：通过队列播放
                if (audioCommandQueue) {
                    AudioCommand audio_cmd;
                    audio_cmd.command = AudioCommand::AUDIO_PLAY_ALERT;
                    strcpy(audio_cmd.text, "/alerts/sos.mp3");
                    xQueueSend(audioCommandQueue, &audio_cmd, 0);
                }
            }
            break;
            
        case ButtonEventData::BOOT_SOS_ACTIVATED:
            Serial.println("[事件] 🚨 处理SOS激活");
            sos_active = true;
            
            // 检查各个组件
            Serial.printf("  - display: %p\n", display);
            Serial.printf("  - audioCommandQueue: %p\n", audioCommandQueue);
            Serial.printf("  - data_transmitter: %p\n", data_transmitter);
            
            // 更新显示
            if (display) {
                Serial.println("[事件] 调用 display->showSOS(true)");
                display->showSOS(true);
            } else {
                Serial.println("[事件] display为空！");
            }
            
            // 播放声音
            if (audioCommandQueue) {
                AudioCommand audio_cmd;
                audio_cmd.command = AudioCommand::AUDIO_PLAY_ALERT;
                strcpy(audio_cmd.text, "SOS");
                if (xQueueSend(audioCommandQueue, &audio_cmd, 0) == pdTRUE) {
                    Serial.println("[事件] 音频命令发送成功");
                } else {
                    Serial.println("[事件] 音频队列满或发送失败");
                }
            } else {
                Serial.println("[事件] audioCommandQueue为空！");
            }
            
            // 更新数据发射器
            if (data_transmitter) {
                data_transmitter->setSOSActive(true, "button");
                Serial.println("[事件] DataTransmitter已更新");
            }
            break;
            
        case ButtonEventData::BOOT_SOS_CLEARED:
            Serial.println("[事件] 处理SOS解除");
            sos_active = false;
            
            if (display) {
                display->showSOS(false);
            }
            
            if (audioCommandQueue) {
                AudioCommand audio_cmd;
                audio_cmd.command = AudioCommand::AUDIO_STOP;
                xQueueSend(audioCommandQueue, &audio_cmd, 0);
            }
            
            if (data_transmitter) {
                data_transmitter->setSOSActive(false, "button");
            }
            break;
    }
}

void handleNavigation() {
    if (!navigation_active) return;
    
    float distance = sqrt(pow(currentLocation.x - target_x, 2) + 
                         pow(currentLocation.y - target_y, 2));
    
    // 计算方向
    String direction = getDirection(currentLocation.x, currentLocation.y, 
                                    target_x, target_y);
    
    // 每10米提示一次
    static float lastDistance = 999;
    if (abs(distance - lastDistance) > 5.0) {
        Serial.printf("🧭 导航: 距离目标 %.1f米, 方向 %s\n", 
                      distance, direction.c_str());
        
        // 语音提示
        AudioCommand audio_cmd;
        audio_cmd.command = AudioCommand::AUDIO_PLAY_TTS;
        snprintf(audio_cmd.text, sizeof(audio_cmd.text), 
                "Distance to boarding gate %.0f meters, direction %s", 
                distance, direction.c_str());
        if (audioCommandQueue) {
            xQueueSend(audioCommandQueue, &audio_cmd, 0);
        }
        
        lastDistance = distance;
    }
    
    // 到达目的地
    if (distance < 2.0) {
        navigation_active = false;
        Serial.println("✅ 已到达登机口！");
        
        AudioCommand audio_cmd;
        audio_cmd.command = AudioCommand::AUDIO_PLAY_TTS;
        snprintf(audio_cmd.text, sizeof(audio_cmd.text), 
                "You have arrived at boarding gate");
        if (audioCommandQueue) {
            xQueueSend(audioCommandQueue, &audio_cmd, 0);
        }
        
        // 更新显示
        if (display) {
            display->setStatus("Arrived at Boarding Gate");
        }
    }
}

// ==================== 串口命令处理 ====================
void handleSerialCommands() {
    if (!Serial.available()) return;
    
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    
    if (cmd == "HELP") {
        Serial.println("\n可用命令:");
        Serial.println("  HELP     - 显示此帮助");
        Serial.println("  WIFI     - 手动连接WiFi");
        Serial.println("  WIFIOFF  - 断开WiFi");
        Serial.println("  MQTT     - 手动连接MQTT");
        Serial.println("  UPLOAD   - 切换数据上传");
        Serial.println("  STATUS   - 显示状态");
        Serial.println("  LOC     - 显示当前位置");
        Serial.println("  SOSON   - 手动触发SOS");
        Serial.println("  SOSOFF  - 解除SOS");
        Serial.println("  MEM     - 显示内存");
        Serial.println("  RESET   - 重启系统");
    }
    else if (cmd == "WIFI") {
        if (network) {
            if (network->connectWiFi()) {
                Serial.println("WiFi连接成功");
                // 自动配置MQTT
                if (data_transmitter) {
                    data_transmitter->setMQTTConfig(MQTT_BROKER, MQTT_PORT);
                }
            }
        }
    }
    else if (cmd == "WIFIOFF") {
        disconnectWiFi();
    }
    else if (cmd == "MQTT") {
        if (network && network->isConnected() && data_transmitter) {
            data_transmitter->ensureMQTTConnected();
        }
    }
    else if (cmd == "UPLOAD") {
        dataUploadEnabled = !dataUploadEnabled;
        Serial.printf("数据上传: %s\n", dataUploadEnabled ? "开启" : "关闭");
    }
    else if (cmd == "LOC") {
        Serial.printf("当前位置: (%.1f, %.1f), 精度: %.1f, 质量: %s, 信标: %d\n",
                     currentLocation.x, currentLocation.y,
                     currentLocation.accuracy, currentLocation.quality.c_str(),
                     currentLocation.beaconCount);
    }
    else if (cmd == "SOSON") {
        ButtonEventData event = {ButtonEventData::BOOT_SOS_ACTIVATED, millis()};
        if (buttonEventQueue) xQueueSend(buttonEventQueue, &event, 0);
    }
    else if (cmd == "SOSOFF") {
        ButtonEventData event = {ButtonEventData::BOOT_SOS_CLEARED, millis()};
        if (buttonEventQueue) xQueueSend(buttonEventQueue, &event, 0);
    }
    else if (cmd == "MEM") {
        Serial.printf("空闲堆: %d bytes\n", esp_get_free_heap_size());
        Serial.printf("最小空闲: %d bytes\n", esp_get_minimum_free_heap_size());
    }
        else if (cmd == "SHOWALL") {
        if (display) {
            // 显示整个地图
            display->setViewSize(12, 16);        // 视口设为整个地图大小
            display->setViewCenter(6, 8);         // 中心点在地图中间 (6,8)
            display->setFollowMode(false);        // 临时关闭跟随模式
            
            Serial.println("🗺️ 显示整个地图:");
            Serial.println("  视口: 12x16 (全图)");
            Serial.println("  中心: (6,8)");
            Serial.println("  跟随模式: 临时关闭");
            
            // 打印所有重要位置
            Serial.println("\n📍 重要位置:");
            Serial.println("  Check-in: (3,2)");
            Serial.println("  Security: (4,7)");
            Serial.println("  Toilet: (9,10)");
            Serial.println("  Boarding Gate: (6,14)");
            Serial.printf("  当前位置: (%.1f,%.1f)\n", current_x, current_y);
        }
    }
    
    else if (cmd == "FOLLOW") {
        if (display) {
            bool newMode = !display->getFollowMode();
            display->setFollowMode(newMode);
            Serial.printf("📍 跟随模式: %s\n", newMode ? "开启" : "关闭");
            
            if (newMode) {
                display->setViewCenter(current_x, current_y);
                display->setViewSize(12, 16);
            }
        }
    }
    
    else if (cmd == "SETGATE") {
        // 修改这里：使用两个参数的版本
        target_x = 6.0;
        target_y = 14.0;
        if (data_transmitter) {
            data_transmitter->setTargetPosition(6, 14, "Boarding Gate");
        }
        if (display) {
            display->setTargetPosition(6, 14);  // 使用两个参数的版本
        }
        Serial.println("✅ 目标已设置为 Boarding Gate (6,14)");
    }
    
    else if (cmd == "WHERE") {
        // 显示当前位置信息
        Serial.println("\n📍 当前位置信息:");
        Serial.printf("  坐标: (%.1f, %.1f)\n", current_x, current_y);
        Serial.printf("  目标: (%.1f, %.1f)\n", target_x, target_y);
        Serial.printf("  距离目标: %.1f 米\n", 
                     sqrt(pow(current_x - target_x, 2) + pow(current_y - target_y, 2)));
        
        // 计算方向
        float dx = target_x - current_x;
        float dy = target_y - current_y;
        float angle = atan2(dy, dx) * 180 / PI;
        if (angle < 0) angle += 360;
        
        const char* dirs[] = {"东", "东北", "北", "西北", "西", "西南", "南", "东南"};
        int dirIndex = (int)((angle + 22.5) / 45) % 8;
        
        Serial.printf("  方向: %s (%.1f°)\n", dirs[dirIndex], angle);
    }
    
    else if (cmd == "TESTAUDIO") {
        if (audio) {
            audio->playTone(1000, 1000);
            Serial.println("测试音频");
        }
    }
    else if (cmd == "TESTSOS") {
        if (audio) {
            audio->playSOSAlert();
            Serial.println("测试SOS音频");
        }
    }
    else if (cmd == "MQTTTEST") {
        if (data_transmitter) {
            data_transmitter->transmitAllData();
            Serial.println("手动上传MQTT");
        }
    }
    else if (cmd == "MQTTSUB") {
        Serial.println("订阅测试主题");
        // 订阅主题用于接收消息
    }
    else if (cmd == "MQTTLOC") {
        Serial.println("发布位置数据");
        if (data_transmitter) {
            data_transmitter->transmitLocation();
        }
    }
    else if (cmd == "MQTTALL") {
        Serial.println("发布所有数据");
        if (data_transmitter) {
            data_transmitter->transmitAllData();
        }
    }

    else if (cmd == "TASKS") {
        char taskList[512];
        vTaskList(taskList);
        Serial.println("\n任务列表:");
        Serial.println(taskList);
    }
    else if (cmd == "UPLOADALL") {
        if (data_transmitter) {
            data_transmitter->transmitAllData();
        }
    }
    else if (cmd == "STATUS") {
        printSystemStatus();
    }
    else if (cmd == "RESET") {
        Serial.println("重启系统...");
        delay(100);
        ESP.restart();
    }
    else if (cmd == "NAVON") {
        navigation_active = true;
        Serial.println("🧭 导航已开启 - 目标: Boarding Gate (6,2)");

        AudioCommand audio_cmd;
        audio_cmd.command = AudioCommand::AUDIO_PLAY_TTS;
        snprintf(audio_cmd.text, sizeof(audio_cmd.text), 
                "Navigation started, destination boarding gate");
        if (audioCommandQueue) {
            xQueueSend(audioCommandQueue, &audio_cmd, 0);
        }
    }

    else if (cmd == "NAVOFF") {
        navigation_active = false;
        Serial.println("🧭 导航已关闭");
    }
}

void printSystemStatus() {
    Serial.println("\n=== 系统状态 ===");
    Serial.printf("当前位置: (%.1f, %.1f)\n", currentLocation.x, currentLocation.y);
    Serial.printf("目标位置: (%.1f, %.1f)\n", target_x, target_y);
    Serial.printf("导航状态: %s\n", navigation_active ? "开启" : "关闭");
    Serial.printf("SOS状态: %s\n", sos_active ? "激活" : "未激活");
    Serial.printf("WiFi: %s\n", wifiConnected ? "已连" : "未连");
    Serial.printf("上传: %s\n", dataUploadEnabled ? "开启" : "关闭");
    Serial.printf("内存: %d bytes\n", esp_get_free_heap_size());
    Serial.println("==================\n");
}

void checkSystemHealth() {
    Serial.println("\n=== 系统健康检查 ===");
    
    UBaseType_t watermark;
    
    if (imuSamplingTaskHandle) {
        watermark = uxTaskGetStackHighWaterMark(imuSamplingTaskHandle);
        Serial.printf("IMU任务: %d words\n", watermark);
    }
    if (bleLocationTaskHandle) {
        watermark = uxTaskGetStackHighWaterMark(bleLocationTaskHandle);
        Serial.printf("BLE任务: %d words\n", watermark);
    }
    if (mapDisplayTaskHandle) {
        watermark = uxTaskGetStackHighWaterMark(mapDisplayTaskHandle);
        Serial.printf("显示任务: %d words\n", watermark);
    }
    
    Serial.printf("空闲堆: %d bytes\n", esp_get_free_heap_size());
    Serial.printf("最小空闲: %d bytes\n", esp_get_minimum_free_heap_size());
    Serial.println("====================\n");
}

String getDirection(float from_x, float from_y, float to_x, float to_y) {
    float dx = to_x - from_x;
    float dy = to_y - from_y;
    float angle = atan2(dy, dx) * 180 / PI;
    if (angle < 0) angle += 360;
    
    if (angle >= 315 || angle < 45) return "East";
    else if (angle >= 45 && angle < 135) return "North";
    else if (angle >= 135 && angle < 225) return "West";
    else return "South";
}

// ==================== setup ====================
void setup() {
    Serial.begin(115200);
    delay(2000);

    // 彻底禁用看门狗
    disableCore0WDT();
    disableCore1WDT();
    disableLoopWDT();
    
    Serial.println("\n\n=== 智能手表系统启动 ===");
    
    // 创建互斥锁
    spiMutex = xSemaphoreCreateBinary();
    xSemaphoreGive(spiMutex);
    i2cMutex = xSemaphoreCreateBinary();
    xSemaphoreGive(i2cMutex);
    sdMutex = xSemaphoreCreateBinary();
    xSemaphoreGive(sdMutex);

    // ===== 创建队列（关键修复！）=====
    buttonEventQueue = xQueueCreate(10, sizeof(ButtonEventData));
    audioCommandQueue = xQueueCreate(10, sizeof(AudioCommand));
    imuDataQueue = xQueueCreate(20, sizeof(IMUDataPacket));
    locationDataQueue = xQueueCreate(5, sizeof(LocationData));
    mapUpdateQueue = xQueueCreate(10, sizeof(MapCommand));
    displayCommandQueue = xQueueCreate(10, sizeof(DisplayCommand));   
     
    // 初始化硬件
    initHardware();
    initDisplay();
    initIMU();
    initFallDetection();
    initBLE();
    initPower();
    initAudio();
    initNetwork();  // 初始化网络
    initDataTransmitter();
    
    // ===== 自动连接 WiFi =====
    Serial.println("\n🔌 自动连接 WiFi...");
    if (network) {
        if (network->connectWiFi()) {
            Serial.println("✅ WiFi 自动连接成功");
            
            // WiFi 连接成功后自动配置 MQTT
            if (data_transmitter) {
                data_transmitter->setMQTTConfig(MQTT_BROKER, MQTT_PORT);
                Serial.println("✅ MQTT 配置完成");
            }
            
            // 自动开启数据上传
            dataUploadEnabled = true;
            Serial.println("✅ 数据自动上传已开启");
        } else {
            Serial.println("❌ WiFi 自动连接失败，可在需要时输入 WIFI 命令手动连接");
        }
    }
    
    // 初始化导航管理器
    nav_manager = new NavigationManager();
    flight_manager = new FlightInfoManager();
    voice_manager = new VoiceMessageManager();
    voice_manager->init();
    buttonManager = new ButtonManager();
    buttonManager->init();
    
    // 设置管理器到 DataTransmitter
    if (data_transmitter) {
        data_transmitter->setNavigationManager(nav_manager);
        data_transmitter->setFlightManager(flight_manager);
        data_transmitter->setVoiceManager(voice_manager);
    }
    
    // // 配置门禁/以后配置
    // if (data_transmitter) {
    //     data_transmitter->addDoor("main_entrance", "20:A7:16:60:F7:C4", 2.0);
    //     data_transmitter->addDoor("side_door", "20:A7:16:60:F7:CA", 1.5);
    // }
    
    // ===== 在导航管理器中设置默认目标 =====
    if (nav_manager) {
        // 创建一个默认的导航计划
        String defaultNav = "{";
        defaultNav += "\"navigation\":{";
        defaultNav += "\"action\":\"set_target\",";
        defaultNav += "\"target\":{";
        defaultNav += "\"x\":6.0,";
        defaultNav += "\"y\":1.5,";
        defaultNav += "\"name\":\"Boarding Gate\",";
        defaultNav += "\"gate_number\":\"A12\",";
        defaultNav += "\"flight_number\":\"CA1234\",";
        defaultNav += "\"boarding_time\":\"14:30\"";
        defaultNav += "}";
        defaultNav += "}";
        defaultNav += "}";
        
        nav_manager->parseNavigationPlan(defaultNav);
        Serial.println("✅ 导航管理器默认目标已设置");
    }
    // 设置测试航班信息
    if (display) {
        display->setFlightInfo(
            "CA1234",      // 航班号
            "Beijing",     // 目的地
            "A12",         // 登机口
            "14:30",       // 登机时间
            15             // 延误分钟
        );
        Serial.println("✅ 测试航班信息已设置");
    }

        // 检查SOS报警文件
    if (SD_MMC.begin("/sdcard", true)) {
        if (SD_MMC.exists("/alerts/sos.mp3")) {
            File f = SD_MMC.open("/alerts/sos.mp3");
            Serial.printf("✅ SOS报警文件存在，大小: %d bytes\n", f.size());
            f.close();
        } else {
            Serial.println("❌ SOS报警文件不存在: /alerts/sos.mp3");
        }
    }
    // 检查音频
    if (audio) {
        Serial.println("测试音频...");
        audio->playTone(1000, 500);  // 测试蜂鸣器
    }
    
    // 检查MQTT
    if (data_transmitter && network && network->isConnected()) {
        data_transmitter->ensureMQTTConnected();
    }

    // ===== 设置地图参数 - 12x16 =====
    if (display) {
        display->setMapBounds(0, 12, 0, 16);        // 地图坐标范围 X:0-12, Y:0-16
        display->setMapImageSize(600, 800);       // BMP实际像素尺寸
        display->setViewSize(12, 16);                // 视口显示范围匹配地图
        display->setFollowMode(true);                 // 开启跟随模式
        
        // 设置初始位置（地图中心）
        display->setCurrentPosition(3, 14);
        
        // ===== 设置默认目标为 Boarding Gate (6,14) =====
        display->setTargetPosition(6, 1.5, "Boarding Gate");
        Serial.println("✅ 默认目标: Boarding Gate (6,2)");
    }

    // ===== 在 DataTransmitter 中设置默认目标 =====
    if (data_transmitter) {
        // 设置默认目标为登机口
        data_transmitter->setTargetPosition(6, 1.5, "Boarding Gate");
        data_transmitter->setNavigationActive(false);  // 初始不激活导航
        
        Serial.println("✅ DataTransmitter 默认目标已设置");
    }
    
    // 加载地图
    display->startLoadingMap("/Boarding_Hall01.bmp");
    
    // 创建任务
    xTaskCreatePinnedToCore(imuSamplingTask, "IMU", 4096, nullptr, 3, &imuSamplingTaskHandle, 1);
    xTaskCreatePinnedToCore(fallDetectionTask, "Fall", 4096, nullptr, 2, &fallDetectionTaskHandle, 1);
    xTaskCreatePinnedToCore(buttonTask, "Button", 2048, nullptr, 3, &buttonTaskHandle, 0);
    xTaskCreatePinnedToCore(bleLocationTask, "BLE", 4096, nullptr, 2, &bleLocationTaskHandle, 0);
    xTaskCreatePinnedToCore(mapDisplayTask, "Display", 4096, nullptr, 1, &mapDisplayTaskHandle, 0);
    xTaskCreatePinnedToCore(networkTask, "Network", 4096, nullptr, 1, &networkTaskHandle, 0);
    xTaskCreatePinnedToCore(audioTask, "Audio", 4096, nullptr, 1, &audioTaskHandle, 0);
    xTaskCreatePinnedToCore(powerTask, "Power", 2048, nullptr, 1, &powerTaskHandle, 0);
    xTaskCreatePinnedToCore(mainCoordinatorTask, "Main", 4096, nullptr, 2, &mainCoordinatorTaskHandle, 0);
    
    Serial.println("\n✅ 系统初始化完成！输入 HELP 查看命令");
    Serial.println("================================\n");
}

// ==================== loop ====================
void loop() {  
    vTaskDelay(pdMS_TO_TICKS(1000));
}