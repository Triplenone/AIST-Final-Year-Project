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

#include "Types.h"
#include "Config.h"
#include "pin_config.h"
#include "SimpleRTC.h"
#include "SimpleDisplayManager.h"
#include "IMUManager.h"
#include "FallDetection.h"
#include "BLELocation.h"
#include "MyNetworkManager.h"
#include "PowerManager.h"
#include "ButtonManager.h"
#include "AudioManager.h"
#include "DataTransmitter.h"
#include "VibrationManager.h"
#include "HeartRateManager.h"
#include "FlightInfoManager.h"
#include "NavigationManager.h"
#include "SmartNavigationPlanner.h"

// SOS rotary/wheel input is intentionally disabled for FlyCare navigation.
// The hardware is unreliable, so destination selection uses SOS short-clicks.
#define SOS_WHEEL_ENABLED 0

class VibrationManager;
class SimpleRTC;

// ==================== 全局对象 ====================
SimpleDisplayManager* display = nullptr;
IMUManager* imu = nullptr;
AudioManager* audio = nullptr;
FallDetection* fall_detector = nullptr;
MyNetworkManager* network = nullptr;
PowerManager* power = nullptr;
ButtonManager* buttonManager = nullptr;
DataTransmitter* data_transmitter = nullptr;
BLELocation* ble_location = nullptr;
BLEScan* pBLEScan = nullptr;
VibrationManager* vibration = nullptr;
FlightInfoManager* flight_manager = nullptr;
NavigationManager* navManager = nullptr;

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

// ==================== 全局变量 ====================
volatile bool systemRunning = true;
bool sos_active = false;
bool wifiConnected = false;
bool dataUploadEnabled = true;
bool navigation_active = false;
float current_x = 3.0, current_y = 14.0;
float target_x = 4.4, target_y = 1.8;
char target_name[30] = "Gate 11";

// 外部声明
extern SimpleDisplayManager* display;
extern AudioManager* audio;
extern DataTransmitter* data_transmitter;
SimpleRTC rtc;
bool debugMode = false;

Arduino_DataBus* bus = nullptr;
Arduino_GFX* gfx = nullptr;
HeartRateManager heartRateSensor;

// ==================== 按钮事件结构 ====================
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

// Beacon config for FlyCare airport positioning.
struct BeaconConfigItem {
    String macAddress;
    float x, y;
    int rssi_ref;
    String name;
};

BeaconConfigItem beaconConfigs[] = {
    {"20:a7:16:60:f7:c4", 7.6, 14.6, -65, "Check-in"},
    {"20:a7:16:60:eb:73", 7.6, 14.6, -65, "Check-in"},
    {"20:a7:16:60:f7:ca", 6.2, 4.0, -65, "Customer Services"},
    {"20:a7:16:5e:ef:24", 6.6, 10.4, -65, "Security Check"},
    {"20:a7:16:61:02:3f", 1.6, 2.2, -65, "Toilet"},
    {"20:a7:16:61:09:40", 4.4, 1.8, -65, "Gate 11"},
    {"20:a7:16:60:fb:ff", 4.4, 1.8, -65, "Gate 11"},
    {"20:a7:16:5e:bc:32", 8.0, 1.8, -65, "Gate 10"},
    {"20:a7:16:60:f3:d9", 8.0, 1.8, -65, "Gate 10"},
    {"20:a7:16:61:02:2a", 1.6, 2.2, -65, "Toilet"},
    {"20:a7:16:61:02:03", 6.6, 10.4, -65, "Security Check"},
    {"20:a7:16:61:02:42", 6.2, 4.0, -65, "Customer Services"}
};

const int BEACON_CONFIG_COUNT = sizeof(beaconConfigs) / sizeof(beaconConfigs[0]);

// ==================== 函数声明 ====================
void initHardware();
void initI2C();
void initDisplay();
void initIMU();
void initFallDetection();
void initBLE();
void initNetwork();
void initPower();
void initAudio();
void initDataTransmitter();
void printSDRootFiles();

void imuSamplingTask(void* param);
void fallDetectionTask(void* param);
void buttonTask(void* param);
void bleLocationTask(void* param);
void mapDisplayTask(void* param);
void networkTask(void* param);
void audioTask(void* param);
void powerTask(void* param);
void mainCoordinatorTask(void* param);

void handleButtonEvent(const ButtonEventData& event);
void handleSerialCommands();
void runWheelPinScan(unsigned long seconds);
void printSystemStatus();
void checkSystemHealth();
void activateSOSAlert(const String& method);
void clearSOSAlert(const String& method);
void toggleSOSAlert(const String& method);

// ==================== 硬件初始化 ====================
void activateSOSAlert(const String& method) {
    Serial.printf("[SOS] Activate via %s\n", method.c_str());
    sos_active = true;

    if (data_transmitter) {
        data_transmitter->setSOSActive(true, method);
    }

    if (display) {
        display->showSOS(true);
    }

    if (audioCommandQueue) {
        AudioCommand audio_cmd;
        memset(&audio_cmd, 0, sizeof(audio_cmd));
        audio_cmd.command = AudioCommand::AUDIO_PLAY_ALERT;
        xQueueSend(audioCommandQueue, &audio_cmd, 0);
    }

    if (vibration) {
        vibration->pattern(3, 200);
    }
}

void clearSOSAlert(const String& method) {
    Serial.printf("[SOS] Clear via %s\n", method.c_str());
    sos_active = false;

    if (data_transmitter) {
        data_transmitter->setSOSActive(false, method);
    }

    if (display) {
        display->showSOS(false);
#if ENABLE_FALL_DETECTION
        display->showFallAlert(false);
#endif
    }

#if ENABLE_FALL_DETECTION
    if (fall_detector) {
        fall_detector->reset();
    }
#endif

    if (audioCommandQueue) {
        AudioCommand audio_cmd;
        memset(&audio_cmd, 0, sizeof(audio_cmd));
        audio_cmd.command = AudioCommand::AUDIO_STOP;
        xQueueSend(audioCommandQueue, &audio_cmd, 0);
    }

    if (vibration) {
        vibration->shortVib();
    }
}

void toggleSOSAlert(const String& method) {
    if (sos_active || (display && display->isAlarmDisplayActive())) {
        clearSOSAlert(method);
    } else {
        activateSOSAlert(method);
    }
}

void initHardware() {
    Serial.println("初始化硬件...");
    
    bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, -1, HSPI);
    gfx = new Arduino_ST7789(bus, TFT_RST, 0, true);  // 旋转角度 0
    
    if (!gfx->begin()) {
        Serial.println("显示屏初始化失败!");
        while (1);
    }
    
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);
    gfx->fillScreen(RGB565_BLACK);
    Serial.println("硬件初始化完成");
}

void initI2C() {
    Wire.begin(IIC_SDA, IIC_SCL);
    Wire.setClock(400000);
    Serial.println("I2C初始化完成");
}

void printSDRootFiles() {
    File root = SD_MMC.open("/");
    if (!root) {
        Serial.println("[SD] Cannot open root directory");
        return;
    }

    Serial.println("[SD] Root files:");
    File file = root.openNextFile();
    int count = 0;
    while (file) {
        Serial.printf("[SD]   %s%s (%u bytes)\n",
                      file.name(),
                      file.isDirectory() ? "/" : "",
                      static_cast<unsigned int>(file.size()));
        file = root.openNextFile();
        count++;
    }

    if (count == 0) {
        Serial.println("[SD]   (empty)");
    }
    root.close();
}

void initDisplay() {
    Serial.println("初始化显示管理器...");
    display = new SimpleDisplayManager(gfx);
    if (!display->init()) {
        Serial.println("显示管理器初始化失败!");
    }
    Serial.println("[Touch] disabled: side-button navigation only");
    display->setTime(12, 0, 0);
    display->setDate(2026, 4, 16);
    display->setStatus("FlyCare Airport");
    
    // ========== 初始化 SD 卡并加载地图 ==========
    pinMode(43, OUTPUT);      // 设置 GPIO43 为输出模式
    digitalWrite(43, LOW);   // 输出低电平，使能 SD 卡供电
    delay(100);
        
    SD_MMC.setPins(SDMMC_CLK, SDMMC_CMD, SDMMC_DATA);
    if (!SD_MMC.begin("/sdcard", true)) {
        Serial.println("⚠️ SD 卡初始化失败");
    } else {
        Serial.println("✅ SD 卡初始化成功");
        
        // 加载地图（使用 BMP 格式）
        if (!SD_MMC.exists("/Boarding_Hall.bmp")) {
            Serial.println("[SD] Missing /Boarding_Hall.bmp on SD card root");
            printSDRootFiles();
        }

        bool mapLoaded = display->initMap("/Boarding_Hall.bmp");
        if (mapLoaded) {
            Serial.println("✅ 地图加载到 PSRAM 成功");
        } else {
            Serial.println("❌ 地图加载失败");
        }
    }
    
    Serial.println("显示管理器初始化完成");
}

void initIMU() {
    Serial.println("初始化IMU...");
    imu = new IMUManager();
    if (!imu->init()) {
        Serial.println("IMU初始化失败，使用模拟数据");
    }
}

void initFallDetection() {
#if ENABLE_FALL_DETECTION
    Serial.println("初始化跌倒检测...");
    fall_detector = new FallDetection(imu);
#else
    fall_detector = nullptr;
    Serial.println("[FallDetection] runtime disabled");
#endif
}

void initBLE() {
    Serial.println("初始化BLE定位...");
    
    // BLEDevice::init 返回 void，不能赋值给 bool
    BLEDevice::init(DEVICE_ID);
    Serial.println("BLEDevice::init 完成");
    
    // 获取扫描器（使用全局的 pBLEScan）
    extern BLEScan* pBLEScan;  // 声明外部变量
    pBLEScan = BLEDevice::getScan();
    if (!pBLEScan) {
        Serial.println("❌ 获取扫描器失败！");
        return;
    }
    Serial.println("✅ 扫描器获取成功");
    
    // 配置扫描参数
    pBLEScan->setActiveScan(true);
    pBLEScan->setInterval(100);
    pBLEScan->setWindow(99);
    // pBLEScan->setDuplicateFilter(false);  // 不过滤重复设备
    
    Serial.println("BLE扫描参数配置完成");
    
    // 测试扫描
    Serial.println("测试扫描 2 秒...");
    BLEScanResults* testResults = pBLEScan->start(2, false);
    int testCount = testResults->getCount();
    Serial.printf("测试扫描结果: %d 个设备\n", testCount);
    pBLEScan->clearResults();
    
    if (testCount == 0) {
        Serial.println("❌ 警告：测试扫描没有发现任何设备！");
        Serial.println("   可能原因：");
        Serial.println("   1. PSRAM 与 BLE 冲突（尝试禁用 PSRAM）");
        Serial.println("   2. BLE 天线问题");
        Serial.println("   3. 信标未上电或距离太远");
    } else {
        Serial.println("✅ BLE 扫描正常工作");
    }
    
    // 创建 BLELocation 对象
    ble_location = new BLELocation();
    ble_location->init();

    ble_location->setScanHandle(pBLEScan);

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
#if ENABLE_AUDIO_ALERTS
    audio = new AudioManager();
    audio->init();
    pinMode(PA_EN, OUTPUT);
    digitalWrite(PA_EN, HIGH);
#else
    audio = nullptr;
    pinMode(PA_EN, OUTPUT);
    digitalWrite(PA_EN, LOW);
    Serial.println("[Audio] disabled for final demo stability; popup/vibration remain active");
#endif
}

void initDataTransmitter() {
    Serial.println("初始化数据传输...");
#if ENABLE_FALL_DETECTION
    FallDetection* fallForTelemetry = fall_detector;
#else
    FallDetection* fallForTelemetry = nullptr;
#endif
    data_transmitter = new DataTransmitter(network, imu, fallForTelemetry, ble_location, power);
}

void syncTime() {
    configTime(8 * 3600, 0, NTP_SERVER, "time.nist.gov");
    Serial.print("同步时间");
    
    struct tm timeinfo;
    int retry = 0;
    while (!getLocalTime(&timeinfo) && retry < 30) {
        delay(500);
        Serial.print(".");
        retry++;
    }
    
    if (retry < 30) {
        // 定义 timestamp 变量
        unsigned long timestamp = mktime(&timeinfo);
        
        // 更新显示
        if (display) {
            display->setTime(timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
            display->setDate(timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday);
        }
        
        // 更新 DataTransmitter 的时间戳
        if (data_transmitter) {
            data_transmitter->setCurrentTimestamp(timestamp);
        }
        
        Serial.println(" 时间同步成功");
    } else {
        Serial.println(" 时间同步失败");
    }
}

// ==================== FreeRTOS任务 ====================
void imuSamplingTask(void* param) {
    const TickType_t samplingInterval = pdMS_TO_TICKS(10);
    TickType_t lastWakeTime = xTaskGetTickCount();
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, samplingInterval);
        if (imu) {
            if (i2cMutex && xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(5)) == pdTRUE) {
                imu->update();
                xSemaphoreGive(i2cMutex);
            }
        }
    }
    vTaskDelete(NULL);
}

#if ENABLE_FALL_DETECTION
void fallDetectionTask(void* param) {
    const TickType_t detectionInterval = pdMS_TO_TICKS(20);
    TickType_t lastWakeTime = xTaskGetTickCount();
    
    // 跌倒状态变量
    static bool fallActive = false;      // 跌倒是否激活
    static bool fallReported = false;    // 是否已上报
    static unsigned long fallTriggerTime = 0;
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, detectionInterval);
        
        if (fall_detector && !fallActive) {
            fall_detector->update();
            
            if (fall_detector->isFallDetected()) {
                FallEvent event = fall_detector->getFallEvent();
                Serial.printf("[跌倒] %s\n", event.description.c_str());
                
                // 立即显示跌倒报警
                if (display) {
                    display->showFallAlert(true);
                }
                
                // 播放报警声
                if (audioCommandQueue) {
                    AudioCommand audio_cmd;
                    audio_cmd.command = AudioCommand::AUDIO_PLAY_ALERT;
                    strcpy(audio_cmd.text, "/alerts/fall.mp3");
                    xQueueSend(audioCommandQueue, &audio_cmd, 0);
                }
                
                // 振动
                if (vibration) {
                    vibration->pattern(3, 500);
                }
                
                fallActive = true;
                fallReported = false;
                fallTriggerTime = millis();
                Serial.println("[跌倒] 触发，立即显示，15秒后上报");
            }
        }
        
        // 处理延迟上报（只上报一次）
        if (fallActive && !fallReported) {
            unsigned long elapsed = millis() - fallTriggerTime;
            if (elapsed >= ALARM_REPORT_DELAY) {
                fallReported = true;
                Serial.println("[跌倒] 15秒已到，执行上报");
                
                if (fall_detector && data_transmitter) {
                    FallEvent event = fall_detector->getFallEvent();
                    data_transmitter->transmitFallAlert(event);
                    Serial.println("[跌倒] 上报完成，报警继续");
                }
            }
        }
        
        // 注意：报警声和振动会持续，直到用户按下 SOS 按钮取消
        // 取消逻辑在 handleButtonEvent 中处理
    }
    vTaskDelete(nullptr);
}
#endif

void buttonTask(void* param) {
    pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
    pinMode(PWR_BUTTON_PIN, INPUT_PULLUP);

    int lastBootState = HIGH;
    int lastPwrState = HIGH;
    unsigned long bootPressStart = 0;
    unsigned long pwrPressStart = 0;
    bool bootLongPressTriggered = false;
    bool pwrLongPressTriggered = false;

    Serial.println("[Button] task started");

    while (systemRunning) {
        int bootState = digitalRead(BOOT_BUTTON_PIN);
        int pwrState = digitalRead(PWR_BUTTON_PIN);

        if (bootState == LOW && lastBootState == HIGH) {
            bootPressStart = millis();
            bootLongPressTriggered = false;
        } else if (bootState == LOW && !bootLongPressTriggered) {
            if (millis() - bootPressStart >= SOS_HOLD_TIME) {
                bootLongPressTriggered = true;
                toggleSOSAlert("ButtonLong");
                Serial.println("[Button] SOS long press - SOS toggled");
            }
        } else if (bootState == HIGH && lastBootState == LOW) {
            unsigned long duration = millis() - bootPressStart;
            if (!bootLongPressTriggered && duration >= 20 && duration < SOS_HOLD_TIME) {
                if (display) {
                    display->nextPage();
                    Serial.printf("[Button] SOS short press - next page: %d\n",
                                  display->getCurrentPage());
                }
            }
        }
        lastBootState = bootState;

        if (pwrState == LOW && lastPwrState == HIGH) {
            pwrPressStart = millis();
            pwrLongPressTriggered = false;
        } else if (pwrState == LOW && !pwrLongPressTriggered) {
            if (millis() - pwrPressStart >= SOS_HOLD_TIME) {
                pwrLongPressTriggered = true;
                if (display) {
                    if (display->isScreenOn()) {
                        display->sleepScreen();
                        Serial.println("[Button] PWR long press - screen off");
                    } else {
                        display->wakeScreen();
                        Serial.println("[Button] PWR long press - screen on");
                    }
                }
            }
        } else if (pwrState == HIGH && lastPwrState == LOW) {
            unsigned long duration = millis() - pwrPressStart;
            if (!pwrLongPressTriggered && duration >= 20 && duration < SOS_HOLD_TIME && display) {
                if (display->isScreenOn()) {
                    display->sleepScreen();
                    Serial.println("[Button] PWR short press - screen off");
                } else {
                    display->wakeScreen();
                    Serial.println("[Button] PWR short press - screen on");
                }
            }
        }
        lastPwrState = pwrState;

        vTaskDelay(pdMS_TO_TICKS(20));
    }
    vTaskDelete(NULL);
}

void legacyButtonTask(void* param) {
    buttonTask(param);
}

#if 0
void legacyButtonTask_old(void* param) {
    pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
    pinMode(PWR_BUTTON_PIN, INPUT_PULLUP);
    
    int lastBootState = HIGH;
    int lastPwrState = HIGH;
    unsigned long bootPressStart = 0;
    unsigned long pwrPressStart = 0;
    bool bootLongPressTriggered = false;
    bool pwrShortPressTriggered = false;
    unsigned long lastPageSwitch = 0;
    const unsigned long PAGE_SWITCH_DELAY = 30;
    unsigned long lastBootNavClick = 0;
    unsigned long lastPwrNavClick = 0;
    bool bootNavClickPending = false;
    bool pwrNavClickPending = false;
    const unsigned long NAV_CONFIRM_DOUBLE_CLICK_MS = 450;
    
    Serial.println("[按钮] 按钮任务启动");
    
    while (systemRunning) {
        int bootState = digitalRead(BOOT_BUTTON_PIN);
        int pwrState = digitalRead(PWR_BUTTON_PIN);
        
        // ========== BOOT 按钮 ==========
        if (bootState == LOW && lastBootState == HIGH) {
            // 按下
            bootPressStart = millis();
            bootLongPressTriggered = false;
        } 
        else if (bootState == LOW && !bootLongPressTriggered) {
            // 按住中，检查是否达到 3 秒
            if (millis() - bootPressStart >= SOS_HOLD_TIME) {
                bootLongPressTriggered = true;
                toggleSOSAlert("ButtonLong");
#if 0
                Serial.println("[按钮] BOOT 长按3秒");
                
                // 检查是否有报警正在显示
                if (display && display->isAlarmDisplayActive()) {
                    // 取消报警
                    Serial.println("[按钮] 取消报警");
                    if (display) {
                        display->showSOS(false);
#if ENABLE_FALL_DETECTION
                        display->showFallAlert(false);
#endif
                    }
#if ENABLE_FALL_DETECTION
                    if (fall_detector) {
                        fall_detector->reset();
                    }
#endif
                    if (audioCommandQueue) {
                        AudioCommand audio_cmd;
                        audio_cmd.command = AudioCommand::AUDIO_STOP;
                        xQueueSend(audioCommandQueue, &audio_cmd, 0);
                    }
                    sos_active = false;
                } else {
                    // 触发 SOS
                    Serial.println("[按钮] 🚨 触发 SOS");
                    if (display) {
                        display->showSOS(true);
                    }

                }
#endif
            }
        }
        else if (bootState == HIGH && lastBootState == LOW) {
            // 释放
            unsigned long duration = millis() - bootPressStart;
            if (!bootLongPressTriggered && duration >= 20 && duration < SOS_HOLD_TIME) {
                if (display) {
                    if (display->isDestinationPickerActive()) {
                        display->cycleNavigationDestination();
                        Serial.println("[Button] SOS click - picker next destination");
                    } else {
                        display->nextPage();
                        Serial.printf("[Button] SOS click - next page: %d\n",
                                      display->getCurrentPage());
                    }
                }
            }
        }
#if 0
                unsigned long now = millis();
                if (now - lastPageSwitch > PAGE_SWITCH_DELAY && display) {
                    if (display->isScreenOn() && display->getCurrentPage() == PAGE_NAV) {
                        if (bootNavClickPending &&
                            now - lastBootNavClick <= NAV_CONFIRM_DOUBLE_CLICK_MS) {
                            display->confirmNavigationSelection();
                            bootNavClickPending = false;
                            Serial.println("[按钮] BOOT 双击 - 确认导航目的地");
                        } else {
                            display->cycleNavigationDestination();
                            bootNavClickPending = true;
                            lastBootNavClick = now;
                            Serial.println("[按钮] BOOT 单击 - 地图页选择目的地");
                        }
                    } else {
                        display->nextPage();
                        bootNavClickPending = false;
                        Serial.println("[按钮] BOOT 短按 - 下一页");
                    }
                    lastPageSwitch = now;
                }
#endif
            }
        }
        lastBootState = bootState;
        
        // ========== PWR 按钮（熄屏/亮屏）==========
        if (pwrState == LOW && lastPwrState == HIGH) {
            // 按下
            pwrPressStart = millis();
            pwrShortPressTriggered = false;
        }
        else if (pwrState == HIGH && lastPwrState == LOW) {
            unsigned long duration = millis() - pwrPressStart;
            if (!pwrShortPressTriggered && duration >= 20 && duration < 1000 && display) {
                if (!display->isScreenOn()) {
                    display->wakeScreen();
                    Serial.println("[Button] PWR click - wake screen");
                } else if (display->isDestinationPickerActive()) {
                    display->cancelDestinationPicker();
                    Serial.println("[Button] PWR click - cancel destination picker");
                } else if (display->getCurrentPage() == PAGE_NAV) {
                    display->openDestinationPicker();
                    Serial.println("[Button] PWR click - open destination picker");
                } else {
                    display->sleepScreen();
                    Serial.println("[Button] PWR click - sleep screen");
                }
            }
        }
#if 0
                unsigned long now = millis();
                if (display->isScreenOn() && display->getCurrentPage() == PAGE_NAV) {
                    if (pwrNavClickPending &&
                        now - lastPwrNavClick <= NAV_CONFIRM_DOUBLE_CLICK_MS) {
                        display->confirmNavigationSelection();
                        pwrNavClickPending = false;
                        Serial.println("[按钮] PWR 双击 - 确认导航目的地");
                    } else {
                        display->cycleNavigationDestination();
                        pwrNavClickPending = true;
                        lastPwrNavClick = now;
                        Serial.println("[按钮] PWR 单击 - 地图页选择目的地");
                    }
                } else if (display->isScreenOn()) {
                    display->sleepScreen();
                    pwrNavClickPending = false;
                    Serial.println("[按钮] PWR 短按 - 熄屏");
                } else {
                    display->wakeScreen();
                    pwrNavClickPending = false;
                    Serial.println("[按钮] PWR 短按 - 亮屏");
                }
            }
        }
        #endif
        lastPwrState = pwrState;
        
        vTaskDelay(pdMS_TO_TICKS(20));
    }
    vTaskDelete(NULL);
}

#endif

void bleLocationTask(void* param) {
    const TickType_t locationInterval = pdMS_TO_TICKS(BLE_LOCATION_TASK_INTERVAL_MS);
    TickType_t lastWakeTime = xTaskGetTickCount();

    // 首次运行设置起始点
    static bool firstRun = true;
    if (firstRun) {
        current_x = 7.6;
        current_y = 14.6;
        if (display) {
            display->setCurrentPosition(7.6, 14.6);
        }
        Serial.println("📍 起始点设置为 (7.6,14.6)");
        firstRun = false;
    }
            
    // 配置平滑器参数
    if (ble_location) {
        ble_location->setSmootherParams(3, 5.0, 6.0);
        Serial.println("BLE定位平滑器已配置");
    } else {
        Serial.println("❌ ble_location 为空！");
    }
    
    unsigned long lastBleScanMs = 0;
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, locationInterval);
        
        Serial.println("\n=== BLE定位任务开始 ===");
        
        if (ble_location) {
            if (data_transmitter && network && network->isConnected() &&
                !data_transmitter->isMQTTConnected() &&
                millis() - lastBleScanMs < 15000) {
                data_transmitter->setBLEScanning(false);
                Serial.println("[BLE] skipped: MQTT reconnect pending");
                continue;
            }
            lastBleScanMs = millis();
            if (data_transmitter) data_transmitter->setBLEScanning(true);
            if (data_transmitter && !data_transmitter->isBLEScanning()) {
                Serial.println("[BLE] skipped: RF held for MQTT");
                continue;
            }
            ble_location->startScan();
            
            Location loc = ble_location->getLocation();
            
            if (loc.beacon_count > 0) {
                current_x = loc.x;
                current_y = loc.y;
                
                if (display) {
                    display->setCurrentPosition(loc.x, loc.y);
                }
                if (data_transmitter) {
                    data_transmitter->setCurrentPosition(loc.x, loc.y, 
                        loc.accuracy, loc.beacon_count, loc.quality,
                        ble_location->getScannedBeacons());
                }
            }
            if (data_transmitter) data_transmitter->setBLEScanning(false);
        }
    }
}

void mapDisplayTask(void* param) {
    Serial.println("显示任务启动");
    
    // 等待地图加载完成
    if (display && !display->isMapLoaded()) {
        Serial.println("Map not loaded; display task will continue without map.");
    }
    const bool blockDisplayUntilMapLoaded = false;
    while (blockDisplayUntilMapLoaded && display && !display->isMapLoaded()) {
        Serial.println("等待地图加载...");
        vTaskDelay(pdMS_TO_TICKS(500));
    }
    if (display && display->isMapLoaded()) {
        Serial.println("Map loaded; display task started.");
    }
    
    while (systemRunning) {
        if (display) {
            display->update();
        }
        vTaskDelay(pdMS_TO_TICKS(20));
    }
    vTaskDelete(NULL);
}

void networkTask(void* param) {
    const TickType_t networkInterval = pdMS_TO_TICKS(2000);  // 2秒更新一次
    TickType_t lastWakeTime = xTaskGetTickCount();
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, networkInterval);
        
        if (network) {
            network->update();
            wifiConnected = network->isConnected();
            
            // 更新显示器的 WiFi 状态
            if (display) {
                int rssi = wifiConnected ? WiFi.RSSI() : -100;
                display->setWiFiStatus(wifiConnected, rssi);
            }
        }
        
        // 可选：打印网络状态
        if (data_transmitter) {
            data_transmitter->update();
        }

        static unsigned long lastPrint = 0;
        if (millis() - lastPrint > 30000) {
            Serial.printf("[网络] WiFi: %s, RSSI: %d dBm\n", 
                         wifiConnected ? "已连接" : "未连接",
                         wifiConnected ? WiFi.RSSI() : 0);
            lastPrint = millis();
        }
    }
    vTaskDelete(NULL);
}

void audioTask(void* param) {
    while (systemRunning) {
        AudioCommand audio_cmd;
        if (audioCommandQueue && xQueueReceive(audioCommandQueue, &audio_cmd, pdMS_TO_TICKS(100)) == pdTRUE) {
#if ENABLE_AUDIO_ALERTS
            if (audio) {
                switch (audio_cmd.command) {
                    case AudioCommand::AUDIO_PLAY_ALERT:
                    {
                        const char* alertPath = audio_cmd.text[0] ? audio_cmd.text : "/sos.wav";
                        bool isSosAlert = (strcmp(alertPath, "/sos.wav") == 0 ||
                                           strcmp(alertPath, "/sos.mp3") == 0);
                        String alertFile = String(alertPath);
                        alertFile.toLowerCase();
                        bool wavOnSd = alertFile.endsWith(".wav") && audio->fileExists(alertPath);

                        if (wavOnSd && audio->playFileFromSD(alertPath)) {
                            break;
                        }

                        if (isSosAlert) {
                            audio->playSOSAlert();
                        } else {
                            Serial.printf("[Audio] fallback tone for alert: %s\n", alertPath);
                            audio->playTone(880, 120);
                            delay(60);
                            audio->playTone(1320, 120);
                        }
                        break;
                    }
                    case AudioCommand::AUDIO_PLAY_TTS:
                        audio->playTTS(audio_cmd.text);
                        break;
                    case AudioCommand::AUDIO_STOP:
                        audio->stop();
                        break;
                }
            }
#else
            if (audio_cmd.command != AudioCommand::AUDIO_STOP) {
                Serial.printf("[Audio] skipped command=%d; audio disabled for final demo stability\n",
                              static_cast<int>(audio_cmd.command));
            }
#endif
        }
        vTaskDelay(pdMS_TO_TICKS(10));
    }
    vTaskDelete(NULL);
}

void powerTask(void* param) {
    const TickType_t powerInterval = pdMS_TO_TICKS(10000);
    TickType_t lastWakeTime = xTaskGetTickCount();
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, powerInterval);
        if (power) {
            power->update();
            if (display) display->setBatteryLevel(power->getBatteryPercent());
        }
    }
    vTaskDelete(NULL);
}

void heartRateTask(void* param) {
    TickType_t lastUploadTime = 0;
    const TickType_t sampleInterval = pdMS_TO_TICKS(HR_SAMPLE_INTERVAL_MS);
    const TickType_t uploadInterval = pdMS_TO_TICKS(HR_UPLOAD_INTERVAL_MS);

    while (systemRunning) {
        heartRateSensor.update();

        TickType_t now = xTaskGetTickCount();
        if (data_transmitter && (lastUploadTime == 0 || now - lastUploadTime >= uploadInterval)) {
            int hr = heartRateSensor.getHeartRate();
            int spo = heartRateSensor.getSpO2();
            data_transmitter->updateHeartRate(hr, heartRateSensor.getConfidence());
            data_transmitter->updateSpO2(spo, heartRateSensor.getSpO2Confidence());
            lastUploadTime = now;
        }

        vTaskDelay(sampleInterval);
    }
    vTaskDelete(NULL);
}

void mainCoordinatorTask(void* param) {
    const TickType_t mainInterval = pdMS_TO_TICKS(100);
    TickType_t lastWakeTime = xTaskGetTickCount();
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, mainInterval);

        static unsigned long lastCheck = 0;
        if (millis() - lastCheck > 10000) {
            UBaseType_t stack = uxTaskGetStackHighWaterMark(NULL);
            Serial.printf("[Display] 剩余栈: %d words\n", stack);
            lastCheck = millis();
        }

        ButtonEventData btn_event;
        while (buttonEventQueue && xQueueReceive(buttonEventQueue, &btn_event, 0) == pdTRUE) {
            handleButtonEvent(btn_event);
        }
        
        handleSerialCommands();
        
        static uint32_t lastHealthCheck = 0;
        if (millis() - lastHealthCheck >= 10000) {
            checkSystemHealth();
            lastHealthCheck = millis();
        }

    }
    vTaskDelete(NULL);
}

// ==================== 事件处理 ====================
void handleButtonEvent(const ButtonEventData& event) {
    switch (event.type) {
        case ButtonEventData::BOOT_SOS_ACTIVATED:
        {
            toggleSOSAlert("ButtonLong");
#if 0
            Serial.println("[按钮] BOOT 长按3秒");
            
            // 检查是否有报警画面正在显示
            if (display && display->isAlarmDisplayActive()) {
                // 取消报警，不上报
                Serial.println("[按钮] 取消报警（不上报）");
                if (display) {
                    display->showSOS(false);
#if ENABLE_FALL_DETECTION
                    display->showFallAlert(false);
#endif
                }
#if ENABLE_FALL_DETECTION
                if (fall_detector) {
                    fall_detector->reset();
                }
#endif
                if (audioCommandQueue) {
                    AudioCommand audio_cmd;
                    audio_cmd.command = AudioCommand::AUDIO_STOP;
                    xQueueSend(audioCommandQueue, &audio_cmd, 0);
                }
                if (vibration) {
                    vibration->shortVib();
                }

                sos_active = false;
                break;
            }
            
            // 原有逻辑：激活 SOS
            Serial.println("[按钮] 激活 SOS");
            sos_active = true;
            if (display) display->showSOS(true);
            if (audioCommandQueue) {
                AudioCommand audio_cmd;
                audio_cmd.command = AudioCommand::AUDIO_PLAY_ALERT;
                xQueueSend(audioCommandQueue, &audio_cmd, 0);
            }
            // 注意：不在这里上报，等5秒后自动上报
            break;
#endif
        }
        
        case ButtonEventData::BOOT_SOS_CLEARED:
        {
            toggleSOSAlert("Button");
#if 0
            Serial.println("[按钮] BOOT 短按");
            if (display) {
                if (display->isScreenOn() && display->getCurrentPage() == PAGE_NAV) {
                    display->cycleNavigationDestination();
                    Serial.println("[按钮] BOOT 事件 - 地图页选择目的地");
                } else {
                    display->nextPage();
                }
            }
            break;
#endif
            break;
        }
        
        default:
            break;
    }
}

void handleSerialCommands() {
    if (!Serial.available()) return;
    
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.length() == 0) return;

    String rawCmd = cmd;
    String upperCmd = rawCmd;
    upperCmd.toUpperCase();

    if (upperCmd.startsWith("FLYCARE_DOWNLINK ")) {
        int firstSpace = rawCmd.indexOf(' ');
        int secondSpace = rawCmd.indexOf(' ', firstSpace + 1);
        if (firstSpace < 0 || secondSpace < 0) {
            Serial.printf("[SERIAL_DOWNLINK] invalid: %s\n", rawCmd.c_str());
            return;
        }

        String topic = rawCmd.substring(firstSpace + 1, secondSpace);
        String payload = rawCmd.substring(secondSpace + 1);
        topic.trim();
        payload.trim();

        if (topic.length() == 0 || payload.length() == 0) {
            Serial.println("[SERIAL_DOWNLINK] ignored empty topic/payload");
            return;
        }

        Serial.printf("[SERIAL_DOWNLINK] topic=%s len=%d\n", topic.c_str(), payload.length());
        bool handled = false;
        if (topic.endsWith("/flight") && data_transmitter && data_transmitter->isBLEScanning()) {
            unsigned long waitStart = millis();
            while (data_transmitter->isBLEScanning() && millis() - waitStart < 5000UL) {
                delay(50);
            }
            Serial.printf("[SERIAL_DOWNLINK] flight waited for BLE idle: %lu ms active=%d\n",
                          millis() - waitStart,
                          data_transmitter->isBLEScanning() ? 1 : 0);
        }
        if (topic.endsWith("/flight") && data_transmitter) {
            data_transmitter->handleMQTTMessage(topic, payload);
            handled = true;
        } else if (topic.endsWith("/flight") && flight_manager) {
            handled = flight_manager->parseFlightInfo(payload);
        } else if (data_transmitter) {
            data_transmitter->handleMQTTMessage(topic, payload);
            handled = true;
        }
        Serial.printf("[SERIAL_DOWNLINK] handled=%d\n", handled ? 1 : 0);
        return;
    }

    cmd = upperCmd;
    
    // ========================================================================
    // 1. 基础命令
    // ========================================================================
    if (cmd == "HELP" || cmd == "H") {
        Serial.println("\n╔══════════════════════════════════════════════════════════════╗");
        Serial.println("?                     FlyCare Airport - Debug Commands             ?");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ 基础命令:                                                     ║");
        Serial.println("║   HELP, H    - 显示此帮助                                      ║");
        Serial.println("║   STATUS, ST - 显示系统状态                                    ║");
        Serial.println("║   RESET, RST - 重启系统                                       ║");
        Serial.println("║   MEM, M     - 显示内存信息                                    ║");
        Serial.println("║   TASKS      - 显示任务状态                                    ║");
        Serial.println("║   QUEUES     - 显示队列状态                                    ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ BLE 定位命令:                                                 ║");
        Serial.println("║   BLE SCAN   - 执行一次 BLE 扫描并显示结果                     ║");
        Serial.println("║   BLE SHOW   - 显示当前信标状态和位置                          ║");
        Serial.println("║   BLE STATS  - 显示 BLE 统计信息                               ║");
        Serial.println("║   BLE RESET  - 重置 BLE 平滑器                                 ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ 位置命令:                                                     ║");
        Serial.println("║   LOC, POS   - 显示当前位置                                    ║");
        Serial.println("║   SETPOS X Y - 手动设置位置 (如: SETPOS 3.5 14.2)             ║");
        Serial.println("║   SETTARGET X Y NAME - 设置目标位置 (如: SETTARGET 6 1.5 Gate)║");
        Serial.println("║   SHOWPOS    - 显示详细位置信息                                ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ 传感器命令:                                                   ║");
        Serial.println("║   IMU        - 显示 IMU 数据                                   ║");
        Serial.println("║   FALL       - 显示跌倒检测状态                                  ║");
        Serial.println("║   SIMFALL    - 模拟跌倒并上传 fall payload                       ║");
        Serial.println("║   HR         - 检测心跳和血氧                                  ║");
        Serial.println("║   HRDEBUG    - Print MAX30102 IR/red/contact diagnostics        ║");
        Serial.println("║   HRSENSOR   - Print MAX30102 part ID, revision, temperature    ║");
        Serial.println("║   HRCAL      - Sample raw MAX30102 IR/red for 10 seconds         ║");
        Serial.println("║   HRLED 0x1F - Set/report MAX30102 red/IR LED brightness         ║");
        Serial.println("║   HRSWEEP    - Sweep MAX30102 LED levels and print HRCAL stats   ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ 网络命令:                                                     ║");
        Serial.println("║   WIFI       - 连接 WiFi                                       ║");
        Serial.println("║   WIFIOFF    - 断开 WiFi                                       ║");
        Serial.println("║   WIFISTAT   - 显示 WiFi 状态                                  ║");
        Serial.println("║   MQTT       - 连接 MQTT                                       ║");
        Serial.println("║   MQTTOFF    - 断开 MQTT                                       ║");
        Serial.println("║   UPLOAD     - 切换数据上传                                    ║");
        Serial.println("║   SENDLOC    - 手动发送位置                                    ║");
        Serial.println("║   SENDALL    - 手动发送所有数据                                ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ SOS 命令:                                                     ║");
        Serial.println("║   SOSON      - 触发 SOS                                        ║");
        Serial.println("║   SOSOFF     - 解除 SOS                                        ║");
        Serial.println("║   SOSSTATUS  - 显示 SOS 状态                                   ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ 音频命令:                                                     ║");
        Serial.println("║   TONE       - 播放测试音                                      ║");
        Serial.println("║   ALERT      - 播放警报                                        ║");
        Serial.println("║   TESTSOUND  - 播放提示音并加入英文 TTS                         ║");
        Serial.println("║   SAY TEXT   - TTS 语音 (如: SAY 你好)                        ║");
        Serial.println("║   STOPAUDIO  - 停止音频                                        ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ 显示命令:                                                     ║");
        Serial.println("║   PAGE N     - 切换页面 (0=首页, 1=导航, 2=航班)               ║");
        Serial.println("║   REDRAW     - 强制重绘                                        ║");
        Serial.println("║   SCREENON   - 强制亮屏                                        ║");
        Serial.println("║   SCREENOFF  - 强制熄屏                                        ║");
        Serial.println("║   MAPSTATUS  - 显示地图状态                                    ║");
        Serial.println("║   SOSDISP    - 显示 SOS 界面                                   ║");
        Serial.println("║   FALLDISP   - 显示跌倒报警界面                                  ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ 航班命令:                                                     ║");
        Serial.println("║   TESTFLIGHT   - 测试航班信息并导航到 A11                      ║");
        Serial.println("║   FLIGHTCLEAR  - 清除航班信息                                  ║");
        Serial.println("║   TESTPOPUP    - 测试登机口变更弹窗                            ║");
        Serial.println("║   TESTARRIVAL [DEST] - 测试抵达弹窗/TTS                         ║");
        Serial.println("║   TESTDELAY    - 测试延误弹窗                                  ║");
        Serial.println("║   TESTBOARDING - 测试登机提醒                                  ║");
        Serial.println("║   TESTFINAL    - 测试最后登机提醒                              ║");
        Serial.println("║   TESTCANCEL   - 测试航班取消                                  ║");
        Serial.println("║   TESTONTIME   - 测试航班准点                                  ║");
        Serial.println("║   SIMFLIGHT    - 模拟 Gate 10 航班 JSON                         ║");
        Serial.println("║   SIMFLIGHT11  - 模拟 Gate 11 航班 JSON                         ║");
        Serial.println("║   SIMDELAY     - Simulate delayed flight JSON                    ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ 导航命令:                                                     ║");
        Serial.println("║   NAVLIST        - 显示 smart navigation 目的地                 ║");
        Serial.println("║   NAVPICK        - 打开目的地菜单                                ║");
        Serial.println("║   NAVNEXT        - 模拟 SOS 单击切换下一個目的地                   ║");
        Serial.println("║   NAVCANCEL      - 取消目的地菜单                                ║");
        Serial.println("║   NAVDEST DEST   - 设置目的地 (Gate10/Security/Toilet/CheckIn)           ║");
        Serial.println("║   TESTROUTE DEST - 打印并设置 smart navigation 路线             ║");
        Serial.println("║   SETGATE 名称 X Y - 设置登机口目标                           ║");
        Serial.println("║   NAV 指令 距离 方向 - 设置导航指令                            ║");
        Serial.println("║   SETPATH        - 设置测试导航路径                            ║");
        Serial.println("║   DEST X Y 名称 登机口 - 设置目的地                            ║");
        Serial.println("║   CLEARPATH      - 清除导航路径                                ║");
        Serial.println("║   SHOWPATH       - 显示导航路径信息                            ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ 调试命令:                                                     ║");
        Serial.println("║   DEBUG ON   - 开启调试模式                                    ║");
        Serial.println("║   DEBUG OFF  - 关闭调试模式                                    ║");
        Serial.println("║   LOOP       - 测试循环计数                                    ║");
        Serial.println("║   MUTEX      - 显示互斥锁状态                                  ║");
        Serial.println("║   I2CSCAN    - 扫描 I2C 设备                                   ║");
        Serial.println("╚══════════════════════════════════════════════════════════════╝\n");
    }
    
    // ========== 系统状态 ==========
    else if (cmd == "STATUS" || cmd == "ST") {
        Serial.println("\n╔══════════════════════════════════════════════════════════════╗");
        Serial.println("║                        系统状态                               ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.printf("║ 当前位置:      (%.2f, %.2f)\n", current_x, current_y);
        Serial.printf("║ 目标位置:      (%.2f, %.2f)\n", target_x, target_y);
        Serial.printf("║ 导航状态:      %s\n", navigation_active ? "开启" : "关闭");
        Serial.printf("║ SOS状态:       %s\n", sos_active ? "激活" : "未激活");
        Serial.printf("║ 跌倒报警:      %s\n", ENABLE_FALL_DETECTION ? ((display && display->isFallActive()) ? "激活" : "未激活") : "已禁用");
        Serial.printf("║ WiFi状态:      %s\n", wifiConnected ? "已连接" : "未连接");
        if (wifiConnected) {
            Serial.printf("║ WiFi RSSI:     %d dBm\n", WiFi.RSSI());
            Serial.printf("║ IP地址:        %s\n", WiFi.localIP().toString().c_str());
        }
        Serial.printf("║ MQTT状态:      %s\n", (data_transmitter && data_transmitter->isMQTTConnected()) ? "已连接" : "未连接");
        Serial.printf("║ 数据上传:      %s\n", dataUploadEnabled ? "开启" : "关闭");
        Serial.printf("║ 电池电量:      %d%%\n", power ? power->getBatteryPercent() : 0);
        Serial.printf("║ 电池电压:      %.2fV\n", power ? power->getBatteryVoltage() : 0);
        Serial.printf("║ 充电状态:      %s\n", (power && power->isCharging()) ? "充电中" : "放电中");
        Serial.printf("║ 屏幕状态:      %s\n", (display && display->isScreenOn()) ? "亮屏" : "熄屏");
        Serial.printf("║ 系统运行时间:  %lu 秒\n", millis() / 1000);
        Serial.println("╚══════════════════════════════════════════════════════════════╝\n");
    }
    
    // ========== 内存信息 ==========
    else if (cmd == "MEM" || cmd == "M") {
        Serial.println("\n╔══════════════════════════════════════════════════════════════╗");
        Serial.println("║                        内存信息                               ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.printf("║ 空闲堆内存:    %d bytes (%.2f KB)\n", 
                      esp_get_free_heap_size(), esp_get_free_heap_size() / 1024.0);
        Serial.printf("║ 最小空闲堆:    %d bytes (%.2f KB)\n", 
                      esp_get_minimum_free_heap_size(), esp_get_minimum_free_heap_size() / 1024.0);
        if (psramFound()) {
            Serial.printf("║ PSRAM 总大小:  %d bytes (%.2f MB)\n", 
                          ESP.getPsramSize(), ESP.getPsramSize() / 1024.0 / 1024.0);
            Serial.printf("║ PSRAM 空闲:    %d bytes (%.2f KB)\n", 
                          ESP.getFreePsram(), ESP.getFreePsram() / 1024.0);
        } else {
            Serial.println("║ PSRAM:         未检测到");
        }
        Serial.println("╚══════════════════════════════════════════════════════════════╝\n");
    }
    
    // ========== 任务状态 ==========
    else if (cmd == "TASKS") {
        Serial.println("\n╔══════════════════════════════════════════════════════════════╗");
        Serial.println("║                        任务状态                               ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        char taskList[512];
        vTaskList(taskList);
        Serial.println(taskList);
        Serial.println("╚══════════════════════════════════════════════════════════════╝\n");
    }
    
    // ========== 队列状态 ==========
    else if (cmd == "QUEUES") {
        Serial.println("\n╔══════════════════════════════════════════════════════════════╗");
        Serial.println("║                        队列状态                               ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        if (buttonEventQueue) Serial.printf("║ buttonEventQueue:   %d/%d 个消息\n", uxQueueMessagesWaiting(buttonEventQueue), 10);
        if (audioCommandQueue) Serial.printf("║ audioCommandQueue:  %d/%d 个消息\n", uxQueueMessagesWaiting(audioCommandQueue), 10);
        if (imuDataQueue) Serial.printf("║ imuDataQueue:       %d/%d 个消息\n", uxQueueMessagesWaiting(imuDataQueue), 20);
        if (locationDataQueue) Serial.printf("║ locationDataQueue:  %d/%d 个消息\n", uxQueueMessagesWaiting(locationDataQueue), 5);
        if (mapUpdateQueue) Serial.printf("║ mapUpdateQueue:     %d/%d 个消息\n", uxQueueMessagesWaiting(mapUpdateQueue), 10);
        if (displayCommandQueue) Serial.printf("║ displayCommandQueue:%d/%d 个消息\n", uxQueueMessagesWaiting(displayCommandQueue), 10);
        Serial.println("╚══════════════════════════════════════════════════════════════╝\n");
    }
    
    // ========== I2C 扫描 ==========
    else if (cmd == "I2CSCAN") {
        Serial.println("\n扫描 I2C 设备...");
        for (uint8_t addr = 1; addr < 127; addr++) {
            Wire.beginTransmission(addr);
            if (Wire.endTransmission() == 0) {
                Serial.printf("找到设备: 0x%02X\n", addr);
            }
        }
        Serial.println("扫描完成");
    }
    
    // ========== BLE 扫描 ==========
    else if (cmd == "BLE SCAN") {
        Serial.println("\n╔══════════════════════════════════════════════════════════════╗");
        Serial.println("║                      BLE 扫描测试                             ║");
        Serial.println("╚══════════════════════════════════════════════════════════════╝");
        if (!pBLEScan) {
            Serial.println("❌ BLE 扫描器未初始化");
            return;
        }
        Serial.println("开始扫描 3 秒...");
        BLEScanResults* results = pBLEScan->start(3, false);
        if (results) {
            int count = results->getCount();
            Serial.printf("\n📡 扫描到 %d 个设备\n", count);
            if (count == 0) {
                Serial.println("⚠️ 没有扫描到任何设备！");
            } else {
                Serial.println("\n设备列表:");
                Serial.println("─────────────────────────────────────────────────────────────");
                int targetCount = 0;
                for (int i = 0; i < count && i < 30; i++) {
                    BLEAdvertisedDevice device = results->getDevice(i);
                    String address = device.getAddress().toString().c_str();
                    address.toLowerCase();
                    int rssi = device.getRSSI();
                    Serial.printf("%2d | MAC: %s | RSSI: %d", i, address.c_str(), rssi);
                    if (device.haveName()) Serial.printf(" | 名称: %s", device.getName().c_str());
                    Serial.println();
                    for (int j = 0; j < BEACON_CONFIG_COUNT; j++) {
                        String beaconMac = String(beaconConfigs[j].macAddress);
                        beaconMac.toLowerCase();
                        if (address.equals(beaconMac)) {
                            Serial.printf("    ✅ 匹配信标 %d: %s @ (%.1f,%.1f)\n", j, beaconConfigs[j].name.c_str(), beaconConfigs[j].x, beaconConfigs[j].y);
                            targetCount++;
                            break;
                        }
                    }
                }
                Serial.printf("\n🎯 找到 %d 个目标信标\n", targetCount);
            }
        }
        pBLEScan->clearResults();
        Serial.println("扫描完成\n");
    }
    
    // ========== 显示信标状态 ==========
    else if (cmd == "BLE SHOW") {
        Serial.println("\n╔══════════════════════════════════════════════════════════════╗");
        Serial.println("║                      信标状态                                 ║");
        Serial.println("╚══════════════════════════════════════════════════════════════╝");
        if (ble_location) {
            ble_location->printBeaconInfo();
            Location loc = ble_location->getLocation();
            Serial.printf("\n📍 BLE 定位结果: (%.2f, %.2f), 精度=%.1f, 信标数=%d\n", loc.x, loc.y, loc.accuracy, loc.beacon_count);
        }
        Serial.printf("\n📍 系统位置: (%.2f, %.2f)\n", current_x, current_y);
        Serial.printf("🎯 目标位置: (%.2f, %.2f) - %s\n", target_x, target_y, target_name);
        float distance = sqrt(pow(current_x - target_x, 2) + pow(current_y - target_y, 2));
        Serial.printf("📏 到目标距离: %.2f 米\n", distance);
    }
    
    // ========== BLE 统计 ==========
    else if (cmd == "BLE STATS") {
        Serial.println("\n╔══════════════════════════════════════════════════════════════╗");
        Serial.println("║                     BLE 统计信息                              ║");
        Serial.println("╚══════════════════════════════════════════════════════════════╝");
        if (ble_location) ble_location->printStatistics();
        else Serial.println("❌ BLELocation 未初始化");
    }
    
    // ========== 重置 BLE 平滑器 ==========
    else if (cmd == "BLE RESET") {
        Serial.println("重置 BLE 位置平滑器...");
        if (ble_location) {
            ble_location->resetSmoother();
            Serial.println("✅ 平滑器已重置");
        }
    }
    
    // ========== 位置显示 ==========
    else if (cmd == "LOC" || cmd == "POS") {
        Serial.println("\n📍 当前位置信息:");
        Serial.printf("  坐标: (%.2f, %.2f)\n", current_x, current_y);
        Serial.printf("  目标: (%.2f, %.2f) - %s\n", target_x, target_y, target_name);
        float dx = target_x - current_x, dy = target_y - current_y;
        float distance = sqrt(dx*dx + dy*dy);
        float angle = atan2(dy, dx) * 180 / PI;
        if (angle < 0) angle += 360;
        const char* dirs[] = {"东", "东北", "北", "西北", "西", "西南", "南", "东南"};
        int dirIndex = (int)((angle + 22.5) / 45) % 8;
        Serial.printf("  到目标距离: %.2f 米\n", distance);
        Serial.printf("  方向: %s (%.1f°)\n", dirs[dirIndex], angle);
    }
    
    // ========== 详细位置信息 ==========
    else if (cmd == "SHOWPOS") {
        Serial.println("\n📍 详细位置信息:");
        Serial.printf("  当前坐标: (%.2f, %.2f)\n", current_x, current_y);
        Serial.printf("  目标坐标: (%.2f, %.2f)\n", target_x, target_y);
        float dx = target_x - current_x, dy = target_y - current_y;
        Serial.printf("  差值: (%.2f, %.2f)\n", dx, dy);
        Serial.printf("  距离: %.2f 米\n", sqrt(dx*dx + dy*dy));
        float angle = atan2(dy, dx) * 180 / PI;
        if (angle < 0) angle += 360;
        Serial.printf("  方位角: %.1f°\n", angle);
        Serial.printf("  预计到达: %.0f 秒\n", sqrt(dx*dx + dy*dy) / 1.4);
        if (ble_location) {
            const auto& beacons = ble_location->getScannedBeacons();
            Serial.printf("\n  扫描到 %d 个信标:\n", beacons.size());
            for (const auto& beacon : beacons) {
                Serial.printf("    - %s: 距离 %.1f米, RSSI=%d\n", beacon.uuid.c_str(), beacon.distance, beacon.last_rssi);
            }
        }
    }
    
    // ========== 手动设置位置 ==========
    else if (cmd.startsWith("SETPOS ")) {
        float x, y;
        if (sscanf(cmd.c_str() + 7, "%f %f", &x, &y) == 2) {
            current_x = constrain(x, 0, 12);
            current_y = constrain(y, 0, 16);
            Serial.printf("✅ 位置已设置为: (%.2f, %.2f)\n", current_x, current_y);
            if (display) {
                display->setCurrentPosition(current_x, current_y);
                display->forceRedraw();
            }
        } else {
            Serial.println("❌ 用法: SETPOS X Y (如: SETPOS 3.5 14.2)");
        }
    }
    
    // ========== 设置目标位置 ==========
    else if (cmd.startsWith("SETTARGET ")) {
        float x, y;
        char name[30] = "";
        int matched = sscanf(cmd.c_str() + 10, "%f %f %s", &x, &y, name);
        if (matched >= 2) {
            target_x = constrain(x, 0, 12);
            target_y = constrain(y, 0, 16);
            Serial.printf("✅ 目标位置已设置为: (%.2f, %.2f)", target_x, target_y);
            if (matched == 3) {
                strncpy(target_name, name, sizeof(target_name)-1);
                Serial.printf(" 名称: %s", target_name);
                if (data_transmitter) data_transmitter->setTargetPosition(target_x, target_y, String(name));
                if (display) display->setTargetPosition(target_x, target_y, name);
            } else {
                if (data_transmitter) data_transmitter->setTargetPosition(target_x, target_y, "");
                if (display) display->setTargetPosition(target_x, target_y);
            }
            Serial.println();
        } else {
            Serial.println("❌ 用法: SETTARGET X Y [NAME] (如: SETTARGET 6 1.5 Gate)");
        }
    }
    
    // ========== IMU 数据 ==========
    else if (cmd == "IMU") {
        Serial.println("\n📊 IMU 数据:");
        if (imu) {
            IMUData data = imu->getData();
            Serial.printf("  加速度: X=%.3f, Y=%.3f, Z=%.3f\n", data.accel_x, data.accel_y, data.accel_z);
            Serial.printf("  陀螺仪: X=%.3f, Y=%.3f, Z=%.3f\n", data.gyro_x, data.gyro_y, data.gyro_z);
            Serial.printf("  姿态:  俯仰=%.1f°, 横滚=%.1f°\n", data.pitch, data.roll);
            Serial.printf("  温度:   %.1f°C\n", data.temperature);
            Serial.printf("  合加速度: %.3f G\n", imu->getAccelerationMagnitude());
        } else {
            Serial.println("  IMU 未初始化");
        }
    }
    
    // ========== 跌倒检测 ==========
    else if (cmd == "FALL") {
#if ENABLE_FALL_DETECTION
        Serial.println("\n⚠️ 跌倒检测状态:");
        if (fall_detector) {
            FallEvent event = fall_detector->getFallEvent();
            Serial.printf("  状态: %s\n", event.description.c_str());
            Serial.printf("  置信度: %.2f\n", event.confidence);
            Serial.printf("  冲击力: %.2f G\n", event.impact_force);
            Serial.printf("  方向: %s\n", event.direction.c_str());
            Serial.printf("  是否确认: %s\n", event.is_fall_confirmed ? "是" : "否");
        } else {
            Serial.println("  跌倒检测未初始化");
        }
#else
        Serial.println("[FallDetection] disabled for power saving");
#endif
    }
    
    // ========== 模拟跌倒 ==========
    else if (cmd == "SIMFALL") {
#if ENABLE_FALL_DETECTION
        Serial.println("⚠️ 模拟跌倒事件...");
        if (fall_detector && display) {
            FallEvent event = fall_detector->getFallEvent();
            event.state = STATE_FALL_CONFIRMED;
            event.description = "Fall confirmed";
            event.confidence = 0.9;
            event.is_fall_confirmed = true;
            event.impact_force = max(event.impact_force, (float)IMPACT_THRESHOLD);
            event.fall_time = millis();

            display->showFallAlert(true);
            if (data_transmitter) {
                data_transmitter->transmitFallAlert(event);
            }
            Serial.println("[FallDetection] SIMFALL alert displayed and uploaded");
        } else {
            Serial.println("❌ 跌倒检测或显示未初始化");
        }
#else
        Serial.println("[FallDetection] SIMFALL disabled for power saving");
#endif
    }
    
    // ========== 心率血氧 ==========
    else if (cmd == "HR") {
        Serial.printf("心率: %d bpm\n", heartRateSensor.getHeartRate());
        Serial.printf("血氧: %d%%\n", heartRateSensor.getSpO2());
        heartRateSensor.printData();
    }
    else if (cmd == "HRDEBUG") {
        heartRateSensor.printDiagnostics();
    }
    else if (cmd == "HRSENSOR") {
        heartRateSensor.printSensorHealth();
    }
    else if (cmd == "HRCAL") {
        heartRateSensor.printRawWindow();
    }
    else if (cmd.startsWith("HRSWEEP")) {
        String valueText = cmd.substring(7);
        valueText.trim();

        unsigned long windowMs = 4000;
        if (valueText.length() > 0) {
            char* endPtr = nullptr;
            unsigned long parsed = strtoul(valueText.c_str(), &endPtr, 0);
            if (endPtr == valueText.c_str() || parsed < 1000 || parsed > 15000) {
                Serial.println("[HRSWEEP] usage: HRSWEEP 4000   (window ms 1000-15000)");
                return;
            }
            windowMs = parsed;
        }
        heartRateSensor.printLedSweep(windowMs);
    }
    else if (cmd.startsWith("HRLED")) {
        String valueText = cmd.substring(5);
        valueText.trim();

        if (valueText.length() == 0) {
            Serial.printf("[HRLED] brightness=0x%02X (%u)\n",
                          heartRateSensor.getLedBrightness(),
                          heartRateSensor.getLedBrightness());
        } else {
            char* endPtr = nullptr;
            unsigned long parsed = strtoul(valueText.c_str(), &endPtr, 0);
            if (endPtr == valueText.c_str() || parsed > 255) {
                Serial.println("[HRLED] usage: HRLED 0x1F   (range 0x00-0xFF)");
            } else if (!heartRateSensor.setLedBrightness((uint8_t)parsed)) {
                Serial.println("[HRLED] MAX30102 not initialized");
            }
        }
    }
    
    // ========== WiFi 连接 ==========
    else if (cmd == "WIFI") {
        Serial.println("正在连接 WiFi...");
        if (network) {
            if (network->connectWiFi()) {
                Serial.println("✅ WiFi 连接成功");
                wifiConnected = true;
                if (data_transmitter) data_transmitter->setMQTTConfig(MQTT_BROKER, MQTT_PORT);
            } else {
                Serial.println("❌ WiFi 连接失败");
            }
        }
    }
    else if (cmd == "WIFIOFF") {
        if (network) {
            WiFi.disconnect();
            wifiConnected = false;
            Serial.println("✅ WiFi 已断开");
        }
    }
    else if (cmd == "WIFISTAT") {
        Serial.printf("WiFi 状态: %s\n", wifiConnected ? "已连接" : "未连接");
        if (wifiConnected) {
            Serial.printf("  SSID: %s\n", WiFi.SSID().c_str());
            Serial.printf("  RSSI: %d dBm\n", WiFi.RSSI());
            Serial.printf("  IP: %s\n", WiFi.localIP().toString().c_str());
        }
    }
    else if (cmd == "SCREENSIZE") {
        if (gfx) Serial.printf("屏幕尺寸: %d x %d\n", gfx->width(), gfx->height());
    }
    
    // ========== MQTT 连接 ==========
    else if (cmd == "MQTT") {
        Serial.println("正在连接 MQTT...");
        if (data_transmitter) {
            if (data_transmitter->ensureMQTTConnected()) Serial.println("✅ MQTT 连接成功");
            else Serial.println("❌ MQTT 连接失败");
        }
    }
    else if (cmd == "MQTTOFF") {
        Serial.println("断开 MQTT...");
    }
    
    // ========== 数据上传 ==========
    else if (cmd == "UPLOAD") {
        dataUploadEnabled = !dataUploadEnabled;
        Serial.printf("数据上传: %s\n", dataUploadEnabled ? "开启" : "关闭");
    }
    else if (cmd == "SENDLOC") {
        Serial.println("手动发送位置数据...");
        if (data_transmitter) {
            data_transmitter->transmitLocation();
            Serial.println("✅ 位置数据已发送");
        }
    }
    else if (cmd == "SENDALL") {
        Serial.println("手动发送所有数据...");
        if (data_transmitter) {
            data_transmitter->transmitAllData();
            Serial.println("✅ 所有数据已发送");
        }
    }
    
    // ========== SOS 命令 ==========
    else if (cmd == "SOSON") {
        activateSOSAlert("Serial");
#if 0
        Serial.println("🚨 触发 SOS...");
        sos_active = true;
        if (data_transmitter) {
            data_transmitter->setSOSActive(true, "Serial");
        }
        if (display) {
            display->showSOS(true);
            Serial.println("✅ SOS 已触发");
        }
#endif
    }
    else if (cmd == "SOSOFF") {
        clearSOSAlert("Serial");
#if 0
        Serial.println("解除 SOS...");
        sos_active = false;
        if (data_transmitter) {
            data_transmitter->setSOSActive(false, "Serial");
        }
        if (display) {
            display->showSOS(false);
            Serial.println("✅ SOS 已解除");
        }
#endif
    }
    else if (cmd == "SOSSTATUS") {
        Serial.printf("SOS 状态: %s\n", sos_active ? "激活" : "未激活");
        if (display) {
            Serial.printf("显示 SOS: %s\n", display->isSOSActive() ? "激活" : "未激活");
            Serial.printf("报警待上报: %s\n", display->isAlarmReportPending() ? "是" : "否");
            if (display->isAlarmReportPending()) {
                unsigned long elapsed = millis() - display->getAlarmTriggerTime();
                Serial.printf("  已过时间: %lu 秒\n", elapsed / 1000);
            }
        }
    }
    
    // ========== 音频命令 ==========
    else if (cmd == "TONE") {
        Serial.println("播放测试音...");
        if (audio) audio->playTone(1000, 500);
    }
    else if (cmd == "ALERT") {
        Serial.println("播放警报...");
        if (audio) audio->playAlert();
    }
    else if (cmd == "TESTSOUND") {
        Serial.println("测试提示音和 TTS...");
        if (audioCommandQueue) {
            AudioCommand alert_cmd;
            alert_cmd.command = AudioCommand::AUDIO_PLAY_ALERT;
            snprintf(alert_cmd.text, sizeof(alert_cmd.text), "%s", "/alerts/notify.wav");
            xQueueSend(audioCommandQueue, &alert_cmd, 0);

            AudioCommand tts_cmd;
            tts_cmd.command = AudioCommand::AUDIO_PLAY_TTS;
            snprintf(tts_cmd.text, sizeof(tts_cmd.text), "%s", "Smart navigation sound test.");
            xQueueSend(audioCommandQueue, &tts_cmd, 0);
            Serial.println("✅ TESTSOUND 已加入音频队列");
        } else {
            Serial.println("❌ 音频队列未初始化");
        }
    }
    else if (cmd == "STOPAUDIO") {
        Serial.println("停止音频...");
        if (audio) audio->stop();
    }
    else if (cmd.startsWith("SAY ")) {
        String text = cmd.substring(4);
        Serial.printf("TTS 语音: %s\n", text.c_str());
        if (audioCommandQueue) {
            AudioCommand audio_cmd;
            audio_cmd.command = AudioCommand::AUDIO_PLAY_TTS;
            snprintf(audio_cmd.text, sizeof(audio_cmd.text), "%s", text.c_str());
            xQueueSend(audioCommandQueue, &audio_cmd, 0);
            Serial.println("✅ TTS 命令已发送");
        }
    }
    
    // ========== 显示命令 ==========
    else if (cmd.startsWith("PAGE ")) {
        int page = cmd.substring(5).toInt();
        if (display) {
            switch (page) {
                case 0: display->switchToHomePage(); Serial.println("✅ 切换到首页"); break;
                case 1: display->switchToNavPage(); Serial.println("✅ 切换到导航页"); break;
                case 2: display->switchToFlightPage(); Serial.println("✅ 切换到航班页"); break;
                default: Serial.println("❌ 无效页面，可用: 0=首页, 1=导航, 2=航班");
            }
        }
    }
    else if (cmd == "REDRAW") {
        Serial.println("强制重绘...");
        if (display) {
            display->forceRedraw();
            Serial.println("✅ 重绘请求已发送");
        }
    }
    else if (cmd == "SCREENON") {
        Serial.println("强制亮屏...");
        if (display) display->wakeScreen();
    }
    else if (cmd == "SCREENOFF") {
        Serial.println("强制熄屏...");
        if (display) display->sleepScreen();
    }
    
    // ========== 地图状态 ==========
    else if (cmd == "MAPSTATUS") {
        Serial.println("\n╔══════════════════════════════════════════════════════════════╗");
        Serial.println("║                      地图状态                                 ║");
        Serial.println("╚══════════════════════════════════════════════════════════════╝");
        if (!display) {
            Serial.println("❌ 显示管理器未初始化");
            return;
        }
        Serial.printf("地图已加载: %s\n", display->isMapLoaded() ? "✅ 是" : "❌ 否");
        if (display->isMapLoaded()) {
            Serial.printf("地图尺寸: %d x %d 像素\n", MAP_PIXEL_WIDTH, MAP_PIXEL_HEIGHT);
            Serial.printf("屏幕尺寸: %d x %d 像素\n", SCREEN_WIDTH, SCREEN_HEIGHT);
            Serial.printf("实际范围: X:0-%.0f, Y:0-%.0f\n", MAP_REAL_WIDTH, MAP_REAL_HEIGHT);
            Serial.printf("当前位置: (%.2f, %.2f)\n", current_x, current_y);
            int center_pixel_x = (int)(current_x / MAP_REAL_WIDTH * MAP_PIXEL_WIDTH);
            int center_pixel_y = (int)(current_y / MAP_REAL_HEIGHT * MAP_PIXEL_HEIGHT);
            Serial.printf("中心像素: (%d, %d)\n", center_pixel_x, center_pixel_y);
        }
        Serial.printf("\n空闲堆内存: %d bytes\n", esp_get_free_heap_size());
        if (psramFound()) Serial.printf("PSRAM 空闲: %d bytes\n", ESP.getFreePsram());
        Serial.println("═══════════════════════════════════════════════════════════════\n");
    }
    
    else if (cmd == "SOSDISP") {
        Serial.println("显示 SOS 界面...");
        if (display) display->showSOS(true);
    }
    else if (cmd == "FALLDISP") {
#if ENABLE_FALL_DETECTION
        Serial.println("显示跌倒报警界面...");
        if (display) display->showFallAlert(true);
#else
        Serial.println("[FallDetection] FALLDISP disabled for power saving");
#endif
    }
    
    // ========== 航班命令 ==========
    else if (cmd == "TESTFLIGHT") {
        Serial.println(">>> TESTFLIGHT 命令被触发 <<<");
        String testJson = "{\"command_type\":\"flight_info\",\"flight_info\":{\"flight_number\":\"CA1234\",\"airline\":\"Air China\",\"destination\":\"Beijing\",\"scheduled_departure\":\"16:50\",\"estimated_departure\":\"16:50\",\"boarding_time\":\"16:00\",\"boarding_gate\":\"11\",\"status\":\"scheduled\",\"delay_minutes\":0,\"\":\"Weather conditions\",\"gate_changed\":false,\"terminal\":\"T3\",\"checkin_counter\":\"C12-C18\"}}";
        if (flight_manager) flight_manager->parseFlightInfo(testJson);
        if (display) display->switchToNavPage();
    }
    
    else if (cmd == "FLIGHTCLEAR") {
        if (display) {
            display->clearFlightInfo();
            Serial.println("✅ 航班信息已清除");
        }
    }
    else if (cmd == "TESTPOPUP") {
        if (display) {
            display->showPopup(SimpleDisplayManager::POPUP_GATE_CHANGE, "Gate Change", "to Gate 10");
            Serial.println("✅ 测试弹窗已显示");
        }
    }
    else if (cmd == "TESTARRIVAL" || cmd.startsWith("TESTARRIVAL ")) {
        String destinationKey = "GATE10";
        if (cmd.startsWith("TESTARRIVAL ")) {
            destinationKey = cmd.substring(12);
            destinationKey.trim();
        }
        const SmartDestination* destination = SmartNavigationPlanner::findDestination(destinationKey);
        if (!destination || destination->zone != NAV_ZONE_RESTRICTED) {
            Serial.printf("❌ TESTARRIVAL 需要 restricted destination: %s\n", destinationKey.c_str());
        } else if (display) {
            display->setSmartNavigationDestination(String(destination->key), true);
            display->setCurrentPosition(destination->x, destination->y);
            Serial.printf("[TEST] arrival popup requested for %s\n", destination->label);
        } else {
            Serial.println("❌ 显示管理器未初始化");
        }
    }
    else if (cmd == "TESTDELAY") {
        if (display) {
            display->showPopup(SimpleDisplayManager::POPUP_FLIGHT_DELAY, "Delay", "Delay 30 minutes\nReason: Weather conditions");
            Serial.println("✅ 延误弹窗已显示");
        }
    }
    else if (cmd == "TESTBOARDING") {
        if (flight_manager) {
            String testJson = "{\"flight_info\":{\"flight_number\":\"CA1234\",\"status\":\"boarding\",\"boarding_gate\":\"A12\",\"boarding_time\":\"14:00\"}}";
            flight_manager->parseFlightInfo(testJson);
            Serial.println("✅ 登机提醒测试");
        }
    }
    else if (cmd == "TESTFINAL") {
        if (flight_manager) {
            String testJson = "{\"flight_info\":{\"flight_number\":\"CA1234\",\"status\":\"final call\",\"boarding_gate\":\"A12\"}}";
            flight_manager->parseFlightInfo(testJson);
            Serial.println("✅ 最后登机提醒测试");
        }
    }
    else if (cmd == "TESTCANCEL") {
        if (flight_manager) {
            String testJson = "{\"flight_info\":{\"flight_number\":\"CA1234\",\"status\":\"cancelled\",\"delay_reason\":\"Weather conditions\"}}";
            flight_manager->parseFlightInfo(testJson);
            Serial.println("✅ 航班取消测试");
        }
    }
    else if (cmd == "TESTONTIME") {
        if (flight_manager) {
            String testJson = "{\"flight_info\":{\"flight_number\":\"CA1234\",\"status\":\"on time\",\"delay_minutes\":0,\"scheduled_departure\":\"14:30\"}}";
            flight_manager->parseFlightInfo(testJson);
            Serial.println("✅ 航班准点测试");
        }
    }
    
    // ========== 导航命令 ==========
    else if (cmd == "PUBLISHSTATUS") {
        if (data_transmitter) {
            data_transmitter->transmitStatusSummary();
            Serial.println("[UPLOAD] status telemetry publish requested");
        } else {
            Serial.println("[UPLOAD] data transmitter unavailable");
        }
    }
    else if (cmd == "PUBLISHHEARTBEAT" || cmd == "SENDHB") {
        if (data_transmitter) {
            data_transmitter->transmitHeartbeat();
            Serial.println("[UPLOAD] heartbeat telemetry publish requested");
        } else {
            Serial.println("[UPLOAD] data transmitter unavailable");
        }
    }
    else if (cmd == "NAVLIST") {
        if (display) {
            display->printNavigationDestinations();
        } else {
            SmartNavigationPlanner::printDestinations(Serial);
        }
    }
    else if (cmd == "NAVPICK") {
        if (display) {
            display->switchToNavPage();
            display->openDestinationPicker();
            Serial.println("[NAVTEST] picker opened");
        } else {
            Serial.println("[NAVTEST] picker unavailable: display not ready");
        }
    }
    else if (cmd == "NAVNEXT") {
        if (display && display->isDestinationPickerActive()) {
            display->cycleNavigationDestination();
            Serial.println("[NAVTEST] picker next destination");
        } else {
            Serial.println("[NAVTEST] picker next ignored: picker not active");
        }
    }
    else if (cmd == "NAVCANCEL") {
        if (display && display->isDestinationPickerActive()) {
            display->cancelDestinationPicker();
            Serial.println("[NAVTEST] picker canceled");
        } else {
            Serial.println("[NAVTEST] picker cancel ignored: picker not active");
        }
    }
    else if (cmd.startsWith("NAVDEST ") || cmd.startsWith("TESTROUTE ")) {
        int offset = cmd.startsWith("NAVDEST ") ? 8 : 10;
        String destinationKey = cmd.substring(offset);
        destinationKey.trim();
        if (display && display->setSmartNavigationDestination(destinationKey, false)) {
            Serial.printf("✅ smart navigation route set: %s\n", destinationKey.c_str());
        } else {
            Serial.printf("❌ unknown smart navigation destination: %s\n", destinationKey.c_str());
            SmartNavigationPlanner::printDestinations(Serial);
        }
    }
    else if (cmd.startsWith("SETGATE ")) {
        char gate[10];
        float x, y;
        if (sscanf(cmd.c_str() + 8, "%s %f %f", gate, &x, &y) >= 2) {
            if (display) {
                display->setTargetGate(String(gate), x, y);
                Serial.printf("✅ 登机口已设置: %s @ (%.1f, %.1f)\n", gate, x, y);
            }
        } else {
            Serial.println("❌ 用法: SETGATE 登机口号 X Y");
        }
    }
    else if (cmd.startsWith("NAV ")) {
        char instruction[50];
        float distance;
        char direction[20];
        if (sscanf(cmd.c_str() + 4, "%s %f %s", instruction, &distance, direction) >= 2 && display) {
            display->updateNavigationInfo(String(instruction), distance, String(direction));
            Serial.printf("✅ 导航指令已设置: %s, %.0fm, %s\n", instruction, distance, direction);
        }
    }
    else if (cmd == "SETPATH") {
        Serial.println("设置测试导航路径...");
        std::vector<SimpleDisplayManager::Waypoint> path;
        path.push_back({3.0, 14.0, "Start"});
        path.push_back({4.5, 12.0, "Waypoint 1"});
        path.push_back({6.0, 10.0, "Waypoint 2"});
        path.push_back({7.5, 8.0, "Waypoint 3"});
        path.push_back({8.0, 5.0, "Waypoint 4"});
        if (display) {
            display->setNavigationPath(path);
            display->setDestination(6.0, 2.0, "Gate A12", "A12");
            Serial.println("✅ 导航路径已设置");
        }
    }
    else if (cmd.startsWith("DEST ")) {
        float x, y;
        char name[20], gate[10];
        if (sscanf(cmd.c_str() + 5, "%f %f %s %s", &x, &y, name, gate) >= 4 && display) {
            display->setDestination(x, y, String(name), String(gate));
            Serial.printf("✅ 目的地已设置: %s (%s) @ (%.1f, %.1f)\n", name, gate, x, y);
        }
    }
    else if (cmd == "CLEARPATH") {
        if (display) {
            display->clearNavigationPath();
            Serial.println("✅ 导航路径已清除");
        }
    }
    else if (cmd == "SHOWPATH") {
        Serial.printf("当前位置: (%.1f, %.1f)\n", current_x, current_y);
        if (display && display->hasNavigationPathSet()) Serial.println("路径已设置");
        else Serial.println("无导航路径");
    }
    
    // ========== 调试命令 ==========
    else if (cmd == "DEBUG ON") {
        debugMode = true;
        Serial.println("✅ 调试模式已开启");
    }
    else if (cmd == "DEBUG OFF") {
        debugMode = false;
        Serial.println("✅ 调试模式已关闭");
    }
    else if (cmd == "LOOP") {
        static int loopCount = 0;
        Serial.printf("循环计数: %d\n", ++loopCount);
    }
    else if (cmd == "NAVSTATUS") {
        if (navManager) {
            Serial.printf("isActive: %d\n", navManager->isActive());
            Serial.printf("stepCount: %d\n", navManager->getDisplayInfo().stepCount);
            Serial.printf("distance: %.1f\n", navManager->getDisplayInfo().currentDistance);
            Serial.printf("targetGate: %s\n", navManager->getDisplayInfo().targetGate.c_str());

            // 打印步骤
            for (int i = 0; i < navManager->getDisplayInfo().stepCount; i++) {
                Serial.printf("  Step %d: %s %.0fm\n", 
                    i+1,
                    navManager->getDisplayInfo().steps[i].instruction.c_str(),
                    navManager->getDisplayInfo().steps[i].distance);
            }
        } else {
            Serial.println("navManager 为空");
        }
    }
    else if (cmd == "MUTEX") {
        Serial.println("\n╔══════════════════════════════════════════════════════════════╗");
        Serial.println("║                      互斥锁状态                               ║");
        Serial.println("╚══════════════════════════════════════════════════════════════╝");
        if (spiMutex) {
            if (xSemaphoreTake(spiMutex, 0) == pdTRUE) { Serial.println("spiMutex: 可用 ✅"); xSemaphoreGive(spiMutex); }
            else Serial.println("spiMutex: 被占用 ⚠️");
        } else Serial.println("spiMutex: 未初始化 ❌");
        if (i2cMutex) {
            if (xSemaphoreTake(i2cMutex, 0) == pdTRUE) { Serial.println("i2cMutex: 可用 ✅"); xSemaphoreGive(i2cMutex); }
            else Serial.println("i2cMutex: 被占用 ⚠️");
        } else Serial.println("i2cMutex: 未初始化 ❌");
        if (sdMutex) {
            if (xSemaphoreTake(sdMutex, 0) == pdTRUE) { Serial.println("sdMutex: 可用 ✅"); xSemaphoreGive(sdMutex); }
            else Serial.println("sdMutex: 被占用 ⚠️");
        } else Serial.println("sdMutex: 未初始化 ❌");
        Serial.println("═══════════════════════════════════════════════════════════════\n");
    }
    
    // ========== 重启 ==========
    else if (cmd == "RESET" || cmd == "RST") {
        Serial.println("系统将在 2 秒后重启...");
        delay(2000);
        ESP.restart();
    }
    else if (cmd == "SIMFLIGHT" || cmd == "SIMFLIGHT11") {
        String testGate = (cmd == "SIMFLIGHT11") ? "11" : "10";
        Serial.println("模拟接收航班信息...");

        String testJson = "{\"command_type\":\"flight_info\",\"flight_info\":{\"flight_number\":\"CA1234\",\"airline\":\"Air China\",\"destination\":\"Beijing\",\"scheduled_departure\":\"12:50\",\"estimated_departure\":\"12:50\",\"boarding_time\":\"12:00\",\"boarding_gate\":\"";
        testJson += testGate;
        testJson += "\",\"status\":\"boarding\",\"delay_minutes\":0,\"\":\"Weather conditions\",\"gate_changed\":true,\"terminal\":\"T3\",\"checkin_counter\":\"C12-C18\"}}";
        
        // 直接调用处理函数
        if (data_transmitter) {
            data_transmitter->handleMQTTMessage("smartwatch/ESP32_00008C292A04A7AC/flight", testJson);
        } else if (flight_manager) {
            flight_manager->parseFlightInfo(testJson);
        }
    }    
    // ========== 未知命令 ==========
    else if (cmd == "SIMDELAY") {
        Serial.println("Simulating delayed flight JSON...");

        String testJson = "{\"command_type\":\"flight_info\",\"flight_info\":{\"flight_number\":\"CX910\",\"airline\":\"Cathay Pacific\",\"destination\":\"Singapore\",\"scheduled_departure\":\"17:35\",\"estimated_departure\":\"17:55\",\"boarding_time\":\"17:05\",\"boarding_gate\":\"Gate 10\",\"status\":\"delayed\",\"delay_minutes\":30,\"delay_reason\":\"Operational readiness\",\"gate_changed\":false,\"terminal\":\"T1\",\"checkin_counter\":\"C12-C18\"}}";

        if (data_transmitter) {
            data_transmitter->handleMQTTMessage("smartwatch/ESP32_48CA43A42298/flight", testJson);
        } else if (flight_manager) {
            flight_manager->parseFlightInfo(testJson);
        }
    }
    else if (cmd.length() > 0) {
        Serial.printf("未知命令: %s\n", cmd.c_str());
        Serial.println("输入 HELP 查看可用命令");
    }

}

void checkSystemHealth() {
    Serial.println("\n=== 系统健康检查 ===");
    Serial.printf("当前位置: (%.1f, %.1f)\n", current_x, current_y);
    Serial.printf("SOS状态: %s\n", sos_active ? "激活" : "未激活");
    Serial.printf("WiFi: %s\n", wifiConnected ? "已连" : "未连");
    Serial.printf("内存: %d bytes\n", esp_get_free_heap_size());
    Serial.printf("PSRAM空闲: %d bytes\n", ESP.getFreePsram());
    Serial.println("====================\n");
}

// ==================== setup ====================
void setup() {
    Serial.setRxBufferSize(2048);
    Serial.setTxBufferSize(2048);
    Serial.begin(115200);
    Serial.setTimeout(250);
    delay(2000);

    // ⭐ 关键修复：禁用 PSRAM 的 I2S 缓存冲突
    #ifdef CONFIG_SPIRAM
        // 强制 I2S 使用内部 DMA 缓冲区
        heap_caps_malloc(1, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    #endif

    // disableCore0WDT();
    // disableCore1WDT();
    // disableLoopWDT();

    pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
    pinMode(PWR_BUTTON_PIN, INPUT_PULLUP);  
    
    Serial.println("\n=== 航站楼导航系统启动 ===");
    
    // 创建互斥锁
    spiMutex = xSemaphoreCreateBinary();
    xSemaphoreGive(spiMutex);
    i2cMutex = xSemaphoreCreateBinary();
    xSemaphoreGive(i2cMutex);
    sdMutex = xSemaphoreCreateBinary();
    xSemaphoreGive(sdMutex);
    
    // 创建队列
    buttonEventQueue = xQueueCreate(10, sizeof(ButtonEventData));
    audioCommandQueue = xQueueCreate(10, sizeof(AudioCommand));
#if ENABLE_IMU_SENSOR || ENABLE_FALL_DETECTION
    imuDataQueue = xQueueCreate(20, sizeof(IMUDataPacket));
#endif
    locationDataQueue = xQueueCreate(5, sizeof(LocationData));
    mapUpdateQueue = xQueueCreate(10, sizeof(MapCommand));
    displayCommandQueue = xQueueCreate(10, sizeof(DisplayCommand));

    // 统一初始化 I2C（只一次）
    Wire.begin(IIC_SDA, IIC_SCL);
    Wire.setClock(400000);    
    
    // ========== 1. 先初始化硬件和显示 ==========
    initHardware();
    initI2C();
    initDisplay();

#if ENABLE_IMU_SENSOR || ENABLE_FALL_DETECTION
    initIMU();
#else
    Serial.println("[IMU] disabled by ENABLE_IMU_SENSOR=0");
#endif

#if ENABLE_FALL_DETECTION
    initFallDetection();
#else
    Serial.println("[FallDetection] disabled by ENABLE_FALL_DETECTION=0");
#endif

    initNetwork();
    if (network) {
        network->connectWiFi();
        wifiConnected = network->isConnected();
    }

#if ENABLE_BLE_LOCATION
    initBLE();
#else
    Serial.println("[BLE] disabled by ENABLE_BLE_LOCATION=0");
#endif
    // initPower();
    initAudio();
    initDataTransmitter();

    // 初始化航班信息管理器
    flight_manager = new FlightInfoManager();    

    navManager = new NavigationManager();

    // 传递给 DataTransmitter
    if (data_transmitter) {
        data_transmitter->setNavigationManager(navManager);
        data_transmitter->setFlightManager(flight_manager);
    }
    
    // 自动连接 WiFi
    if (network) {
        wifiConnected = network->isConnected();
        if (data_transmitter) {
            data_transmitter->setMQTTConfig(MQTT_BROKER, MQTT_PORT);
            dataUploadEnabled = true;
        }
    }

    // 初始化振动
    vibration = new VibrationManager();
    vibration->init();

    // 初始化心率传感器
    heartRateSensor.init();
    
    // 传递振动管理器到显示
    if (display) {
        display->setVibrationManager(vibration);
        display->setIMUManager(imu);
    }
    
    // 同步时间
    syncTime();
    
    // // 创建任务
    xTaskCreatePinnedToCore(buttonTask, "Button", 4096, nullptr, 6, &buttonTaskHandle, 0);
#if ENABLE_BLE_LOCATION
    if (ble_location && pBLEScan) {
        xTaskCreatePinnedToCore(bleLocationTask, "BLE", 12288, nullptr, 5, &bleLocationTaskHandle, 0);
    } else {
        Serial.println("[BLE] location task skipped because BLE init failed");
    }
#endif
    xTaskCreatePinnedToCore(networkTask, "Network", 6144, nullptr, 4, &networkTaskHandle, 1);
    xTaskCreatePinnedToCore(audioTask, "Audio", AUDIO_TASK_STACK_SIZE, nullptr, 4, &audioTaskHandle, 0);
    // xTaskCreatePinnedToCore(mainCoordinatorTask, "Main", 6144, nullptr, 3, &mainCoordinatorTaskHandle, 0);
    xTaskCreatePinnedToCore(heartRateTask, "HeartRate", 4096, nullptr, 2, nullptr, 1);
    xTaskCreatePinnedToCore(mapDisplayTask, "Display", 16384, nullptr, 3, &mapDisplayTaskHandle, 1);
#if ENABLE_FALL_DETECTION && ENABLE_AUTO_FALL_DETECTION
    xTaskCreatePinnedToCore(fallDetectionTask, "Fall", 4096, nullptr, 2, &fallDetectionTaskHandle, 1);
#endif
#if ENABLE_IMU_SENSOR || ENABLE_FALL_DETECTION
    xTaskCreatePinnedToCore(imuSamplingTask, "IMU", 4096, nullptr, 2, &imuSamplingTaskHandle, 1);
#endif
    // xTaskCreatePinnedToCore(powerTask, "Power", 6144, nullptr, 1, &powerTaskHandle, 0);

    Serial.println("\n✅ 系统初始化完成！");
    Serial.println("================================\n");

    // 1. 设置默认航班信息
    String defaultFlightJson = "{"
        "\"command_type\":\"flight_info\","
        "\"flight_info\":{"
        "\"flight_number\":\"CX910\","
        "\"airline\":\"Cathay Pacific\","
        "\"destination\":\"Singapore\","
        "\"scheduled_departure\":\"17:35\","
        "\"estimated_departure\":\"17:35\","
        "\"boarding_time\":\"17:05\","
        "\"boarding_gate\":\"Gate 10\","
        "\"status\":\"scheduled\","
        "\"delay_minutes\":0,"
        "\"delay_reason\":\"\","
        "\"gate_changed\":false,"
        "\"terminal\":\"T1\","
        "\"checkin_counter\":\"C12-C18\""
        "}}";
    
    if (flight_manager) {
        flight_manager->parseFlightInfo(defaultFlightJson);
        Serial.println("✅ 默认航班信息已设置");
    } else {
        Serial.println("❌ flight_manager 为空");
    }
    
    // 2. 设置默认智能导航路径
    if (display && display->setSmartNavigationDestination("GATE10", true)) {
        Serial.println("✅ 默认 smart navigation 路径已设置");
    } else {
        Serial.println("❌ 默认 smart navigation 路径设置失败");
    }
    
    // 3. 可选：设置当前位置（模拟）
    // 如果有 BLE 定位，这里可以不设置，等待 BLE 更新
    // current_x = 7.0;
    // current_y = 8.0;
    // if (display) {
    //     display->setCurrentPosition(current_x, current_y);
    // }
    
    // 4. 可选：默认显示导航页
    if (display) {
        display->switchToNavPage();  // 取消注释则开机显示导航页
        Serial.println("当前页面: " + String(display->getCurrentPage()));
    }
    
    Serial.println(">>> 默认信息设置完成 <<<\n");
}

void loop() {
    handleSerialCommands();
    vTaskDelay(pdMS_TO_TICKS(20));
}
