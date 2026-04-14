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
#include <nvs_flash.h>

#include "Types.h"
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
#include "VoiceMessageManager.h"

// ==================== 全局对象 ====================
SimpleDisplayManager* display = nullptr;
IMUManager* imu = nullptr;
AudioManager* audio = nullptr;
FallDetection* fall_detector = nullptr;
MyNetworkManager* network = nullptr;
PowerManager* power = nullptr;
ButtonManager* buttonManager = nullptr;
DataTransmitter* data_transmitter = nullptr;
VoiceMessageManager* voice_manager = nullptr;
BLELocation* ble_location = nullptr;
BLEScan* pBLEScan = nullptr;  // 添加这行

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
QueueHandle_t buttonEventQueue = nullptr;
QueueHandle_t audioCommandQueue = nullptr;
QueueHandle_t locationDataQueue = nullptr;
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
float target_x = 6.0, target_y = 2.0;

// 外部声明
extern SimpleDisplayManager* display;
extern AudioManager* audio;
extern DataTransmitter* data_transmitter;

Arduino_DataBus* bus = nullptr;
Arduino_GFX* gfx = nullptr;

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

// 信标配置数组（用于匹配）（航站楼需更新，现用老人院）
struct BeaconConfigItem {
    String macAddress;
    float x, y;
    int rssi_ref;
    String name;
};

BeaconConfigItem beaconConfigs[] = {
    {"20:a7:16:60:f7:c4", 0.0, 4.0, -65, "Front Desk"},
    {"20:a7:16:60:f7:ca", 6.0, 0.0, -65, "Activity Room"},
    {"20:a7:16:5e:ef:24", 11.0, 1.0, -65, "Rehabilitation Room"},
    {"20:a7:16:61:02:3f", 11.0, 11.0, -65, "Toilet"},
    {"20:a7:16:61:09:40", 1.0, 11.0, -65, "Door"},
    {"20:a7:16:5e:bc:32", 6.0, 16.0, -65, "Bedroom"}
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
void printSystemStatus();
void checkSystemHealth();

// ==================== 硬件初始化 ====================
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

void initDisplay() {
    Serial.println("初始化显示管理器...");
    display = new SimpleDisplayManager(gfx);
    if (!display->init()) {
        Serial.println("显示管理器初始化失败!");
    }
    display->initTouch();
    display->setTime(12, 0, 0);
    display->setDate(2026, 4, 16);
    display->setStatus("老人院定位系统");
    Serial.println("显示管理器初始化完成");

    // 初始化 SD 卡
    SD_MMC.setPins(SDMMC_CLK, SDMMC_CMD, SDMMC_DATA);
    if (!SD_MMC.begin("/sdcard", true)) {
        Serial.println("⚠️ SD 卡初始化失败");
    } else {
        Serial.println("✅ SD 卡初始化成功");
        
        // 加载地图
        if (display) {
            display->initMap("/Elderly_Homes.jpg");
        }
    }
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
    
    // 设置回调
    pBLEScan->setAdvertisedDeviceCallbacks(new DebugScanCallback());
    
    // 配置扫描参数
    pBLEScan->setActiveScan(true);
    pBLEScan->setInterval(100);
    pBLEScan->setWindow(99);
    
    Serial.println("BLE扫描参数配置完成");
    
    // 测试扫描
    Serial.println("测试扫描 2 秒...");
    BLEScanResults testResults = pBLEScan->start(2, false);
    int testCount = testResults.getCount();
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
    audio = new AudioManager();
    audio->init();
    pinMode(PA_EN, OUTPUT);
    digitalWrite(PA_EN, HIGH);
}

void initDataTransmitter() {
    Serial.println("初始化数据传输...");
    data_transmitter = new DataTransmitter(network, imu, fall_detector, ble_location, power);
    data_transmitter->setVoiceManager(voice_manager);
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

void fallDetectionTask(void* param) {
    const TickType_t detectionInterval = pdMS_TO_TICKS(20);
    TickType_t lastWakeTime = xTaskGetTickCount();
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, detectionInterval);
        
        if (fall_detector) {
            fall_detector->update();
            
            if (fall_detector->isFallDetected()) {
                FallEvent event = fall_detector->getFallEvent();
                Serial.printf("[跌倒] %s\n", event.description.c_str());
                
                // 跌倒时自动激活 SOS（或者只显示跌倒报警）
                if (display) {
                    display->showFallAlert(true);
                }
                
                // 播放报警声
                if (audioCommandQueue) {
                    AudioCommand audio_cmd;
                    audio_cmd.command = AudioCommand::AUDIO_PLAY_ALERT;
                    xQueueSend(audioCommandQueue, &audio_cmd, 0);
                }
                
                // 上传跌倒警报
                if (data_transmitter) {
                    data_transmitter->transmitFallAlert(event);
                }
                
                // 注意：这里不设置 sos_active = true
                // 让 SOS 按钮单独控制 SOS
            }
        }
    }
    vTaskDelete(nullptr);
}

void buttonTask(void* param) {
    const TickType_t buttonInterval = pdMS_TO_TICKS(20);
    TickType_t lastWakeTime = xTaskGetTickCount();
    
    int lastSosState = HIGH;
    int lastPwrState = HIGH;
    unsigned long sosPressStart = 0;
    unsigned long pwrPressStart = 0;
    int pwrClickCount = 0;
    unsigned long lastPwrClick = 0;
    bool localSosActive = false;
    unsigned long lastPageSwitch = 0;
    const unsigned long PAGE_SWITCH_DELAY = 500;
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, buttonInterval);
        
        int sosState = digitalRead(BOOT_BUTTON_PIN);
        int pwrState = digitalRead(PWR_BUTTON_PIN);
        
        // SOS按钮处理
        if (sosState == LOW && lastSosState == HIGH) {
            sosPressStart = millis();
        } else if (sosState == HIGH && lastSosState == LOW) {
            unsigned long pressDuration = millis() - sosPressStart;
            if (pressDuration >= SOS_HOLD_TIME) {
                localSosActive = !localSosActive;
                if (buttonEventQueue) {
                    ButtonEventData event;
                    event.type = localSosActive ? ButtonEventData::BOOT_SOS_ACTIVATED : ButtonEventData::BOOT_SOS_CLEARED;
                    event.timestamp = millis();
                    xQueueSend(buttonEventQueue, &event, 0);
                }
            } else if (pressDuration >= 20 && pressDuration < 3000) {
                unsigned long now = millis();
                if (now - lastPageSwitch > PAGE_SWITCH_DELAY && display) {
                    display->prevPage();
                    lastPageSwitch = now;
                }
            }
        }
        lastSosState = sosState;
        
        // PWR按钮处理
        if (pwrState == HIGH && lastPwrState == LOW) {
            pwrPressStart = millis();
        } else if (pwrState == LOW && lastPwrState == HIGH) {
            unsigned long pressDuration = millis() - pwrPressStart;
            if (pressDuration >= 20 && pressDuration < 500) {
                pwrClickCount++;
                if (pwrClickCount == 1) {
                    lastPwrClick = millis();
                } else if (pwrClickCount == 2) {
                    unsigned long clickInterval = millis() - lastPwrClick;
                    if (clickInterval < 500) {
                        if (display) display->nextPage();
                        pwrClickCount = 0;
                    }
                }
            }
        }
        
        if (pwrClickCount == 1 && (millis() - lastPwrClick) > 500) {
            unsigned long now = millis();
            if (now - lastPageSwitch > PAGE_SWITCH_DELAY && display) {
                display->nextPage();
                lastPageSwitch = now;
            }
            pwrClickCount = 0;
        }
        lastPwrState = pwrState;
    }
    vTaskDelete(NULL);
}

void bleLocationTask(void* param) {
    Serial.println("========== bleLocationTask 启动（300ms扫描）==========");
    
    const int SCAN_DURATION = 300;
    const int CYCLE_TIME = 2000;
    
    while (systemRunning) {
        unsigned long scanStart = millis();
        
        // 扫描 300ms
        pBLEScan->start(SCAN_DURATION / 1000.0, false);
        delay(SCAN_DURATION);
        
        // 获取位置（内部会处理扫描结果）
        if (ble_location) {
            Location loc = ble_location->getLocation();
            
            unsigned long elapsed = millis() - scanStart;
            
            if (loc.beacon_count > 0) {
                current_x = loc.x;
                current_y = loc.y;
                Serial.printf("[BLE] 位置: (%.2f, %.2f), 信标:%d, 耗时:%dms\n", 
                             current_x, current_y, loc.beacon_count, elapsed);
            } else {
                Serial.printf("[BLE] 无位置, 耗时:%dms\n", elapsed);
            }
        }
        
        pBLEScan->clearResults();
        
        // 等待到下一个周期
        int remainingTime = CYCLE_TIME - (millis() - scanStart);
        if (remainingTime > 0) {
            vTaskDelay(pdMS_TO_TICKS(remainingTime));
        }
    }
}

void mapDisplayTask(void* param) {
    const TickType_t displayInterval = pdMS_TO_TICKS(100);
    TickType_t lastWakeTime = xTaskGetTickCount();
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, displayInterval);
        if (display) {
            display->update();
        }
    }
    vTaskDelete(NULL);
}

void networkTask(void* param) {
    const TickType_t networkInterval = pdMS_TO_TICKS(1000);
    TickType_t lastWakeTime = xTaskGetTickCount();
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, networkInterval);
        if (network) network->update();
        wifiConnected = network && network->isConnected();
    }
    vTaskDelete(NULL);
}

void audioTask(void* param) {
    while (systemRunning) {
        AudioCommand audio_cmd;
        if (audioCommandQueue && xQueueReceive(audioCommandQueue, &audio_cmd, pdMS_TO_TICKS(100)) == pdTRUE) {
            if (audio) {
                switch (audio_cmd.command) {
                    case AudioCommand::AUDIO_PLAY_ALERT:
                        audio->playAlert();
                        break;
                    case AudioCommand::AUDIO_PLAY_TTS:
                        audio->playTTS(audio_cmd.text);
                        break;
                    case AudioCommand::AUDIO_STOP:
                        audio->stop();
                        break;
                }
            }
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

void mainCoordinatorTask(void* param) {
    const TickType_t mainInterval = pdMS_TO_TICKS(100);
    TickType_t lastWakeTime = xTaskGetTickCount();
    
    while (systemRunning) {
        vTaskDelayUntil(&lastWakeTime, mainInterval);
        
        ButtonEventData btn_event;
        while (buttonEventQueue && xQueueReceive(buttonEventQueue, &btn_event, 0) == pdTRUE) {
            handleButtonEvent(btn_event);
        }
        
        handleSerialCommands();
        
        static uint32_t lastHealthCheck = 0;
        if (millis() - lastHealthCheck >= 30000) {
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
            Serial.println("[按钮] BOOT 长按3秒");
            
            // 检查是否有报警画面正在显示
            if (display && display->isAlarmDisplayActive()) {
                // 取消报警，不上报
                Serial.println("[按钮] 取消报警（不上报）");
                if (display) {
                    display->showSOS(false);
                    display->showFallAlert(false);
                }
                if (fall_detector) {
                    fall_detector->reset();
                }
                if (audioCommandQueue) {
                    AudioCommand audio_cmd;
                    audio_cmd.command = AudioCommand::AUDIO_STOP;
                    xQueueSend(audioCommandQueue, &audio_cmd, 0);
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
        }
        
        case ButtonEventData::BOOT_SOS_CLEARED:
        {
            Serial.println("[按钮] BOOT 短按");
            if (display) display->nextPage();
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
    cmd.toUpperCase();
    
    // ========== 基础帮助 ==========
    if (cmd == "HELP" || cmd == "H") {
        Serial.println("\n╔══════════════════════════════════════════════════════════════╗");
        Serial.println("║                     老人院定位系统 - 调试命令                   ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ 基础命令:                                                     ║");
        Serial.println("║   HELP, H    - 显示此帮助                                      ║");
        Serial.println("║   STATUS, ST - 显示系统状态                                    ║");
        Serial.println("║   RESET, RST - 重启系统                                       ║");
        Serial.println("║   MEM, M     - 显示内存信息                                    ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ BLE 定位命令:                                                 ║");
        Serial.println("║   BLE SCAN   - 执行一次 BLE 扫描并显示结果                     ║");
        Serial.println("║   BLE SHOW   - 显示当前信标状态和位置                          ║");
        Serial.println("║   BLE CAL    - 校准信标 RSSI（1米处）                          ║");
        Serial.println("║   BLE RESET  - 重置 BLE 平滑器                                 ║");
        Serial.println("║   BLE STATS  - 显示 BLE 统计信息                               ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ 位置命令:                                                     ║");
        Serial.println("║   LOC, POS   - 显示当前位置                                    ║");
        Serial.println("║   SETPOS X Y - 手动设置位置 (如: SETPOS 3.5 14.2)             ║");
        Serial.println("║   SETTARGET X Y NAME - 设置目标位置 (如: SETTARGET 6 1.5 Gate)║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ 传感器命令:                                                   ║");
        Serial.println("║   IMU        - 显示 IMU 数据                                   ║");
        Serial.println("║   FALL       - 显示跌倒检测状态                                ║");
        Serial.println("║   SIMFALL    - 模拟跌倒事件                                    ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ 网络命令:                                                     ║");
        Serial.println("║   WIFI       - 连接 WiFi                                       ║");
        Serial.println("║   WIFIOFF    - 断开 WiFi                                       ║");
        Serial.println("║   MQTT       - 连接 MQTT                                       ║");
        Serial.println("║   MQTTOFF    - 断开 MQTT                                       ║");
        Serial.println("║   UPLOAD     - 切换数据上传                                    ║");
        Serial.println("║   MQTTLOC    - 手动发送位置                                    ║");
        Serial.println("║   MQTTALL    - 手动发送所有数据                                ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ SOS 命令:                                                     ║");
        Serial.println("║   SOSON      - 触发 SOS                                        ║");
        Serial.println("║   SOSOFF     - 解除 SOS                                        ║");
        Serial.println("║   SOSSTATUS  - 显示 SOS 状态                                   ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ 音频命令:                                                     ║");
        Serial.println("║   TONE       - 播放测试音                                      ║");
        Serial.println("║   ALERT      - 播放警报                                        ║");
        Serial.println("║   SAY TEXT   - TTS 语音 (如: SAY 你好)                        ║");
        Serial.println("╠══════════════════════════════════════════════════════════════╣");
        Serial.println("║ 显示命令:                                                     ║");
        Serial.println("║   PAGE N     - 切换页面 (0=首页, 1=导航, 2=健康)               ║");
        Serial.println("║   SOSDISP    - 显示 SOS 界面                                   ║");
        Serial.println("║   FALLDISP   - 显示跌倒报警界面                                ║");
        Serial.println("║   MAPSTATUS  - 显示地图状态                                ║");
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
        Serial.printf("║ WiFi状态:      %s\n", wifiConnected ? "已连接" : "未连接");
        if (wifiConnected) {
            Serial.printf("║ WiFi RSSI:     %d dBm\n", WiFi.RSSI());
            Serial.printf("║ IP地址:        %s\n", WiFi.localIP().toString().c_str());
        }
        // 修改这里：使用 network 来判断 MQTT 状态
        Serial.printf("║ MQTT状态:      %s\n", (network && network->isConnected() && data_transmitter && data_transmitter->ensureMQTTConnected()) ? "已连接" : "未连接");
        Serial.printf("║ 数据上传:      %s\n", dataUploadEnabled ? "开启" : "关闭");
        Serial.printf("║ 电池电量:      %d%%\n", power ? power->getBatteryPercent() : 0);
        Serial.printf("║ 电池电压:      %.2fV\n", power ? power->getBatteryVoltage() : 0);
        Serial.printf("║ 充电状态:      %s\n", (power && power->isCharging()) ? "充电中" : "放电中");
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
    
    // ========== BLE 扫描 ==========
    else if (cmd == "BLE SCAN") {
    Serial.println("\n╔══════════════════════════════════════════════════════════════╗");
    Serial.println("║                      BLE 扫描测试                             ║");
    Serial.println("╚══════════════════════════════════════════════════════════════╝");
    
    if (!pBLEScan) {
        Serial.println("❌ BLE 扫描器未初始化");
        return;
    }
    
    Serial.println("开始异步扫描 3 秒...");
    Serial.println("（扫描期间仍可输入命令）");
    
    // 使用异步扫描，不阻塞
    pBLEScan->start(3, nullptr, false);
    
    // 等待扫描完成，但期间处理串口
    unsigned long startTime = millis();
    while (millis() - startTime < 3500) {
        // 处理串口命令
        if (Serial.available()) {
            String cancel = Serial.readStringUntil('\n');
            cancel.trim();
            if (cancel == "STOP") {
                pBLEScan->stop();
                Serial.println("扫描已停止");
                break;
            }
        }
        delay(100);
        Serial.print(".");
    }
    Serial.println();
    
    // 获取结果
    BLEScanResults results = pBLEScan->getResults();
    int count = results.getCount();
    Serial.printf("\n📡 扫描到 %d 个设备\n", count);
    
    if (count == 0) {
        Serial.println("⚠️ 没有扫描到任何设备！");
    } else {
        Serial.println("\n设备列表（前20个）:");
        Serial.println("─────────────────────────────────────────────────────────────");
        int showCount = min(count, 20);
        for (int i = 0; i < showCount; i++) {
            BLEAdvertisedDevice device = results.getDevice(i);
            String address = device.getAddress().toString().c_str();
            int rssi = device.getRSSI();
            
            Serial.printf("%2d | MAC: %s | RSSI: %d", i, address.c_str(), rssi);
            if (device.haveName()) {
                Serial.printf(" | %s", device.getName().c_str());
            }
            Serial.println();
        }
        Serial.println("─────────────────────────────────────────────────────────────");
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
        } else {
            Serial.println("❌ BLELocation 未初始化");
        }
        
        // 显示当前位置
        Serial.printf("\n📍 当前位置: (%.2f, %.2f)\n", current_x, current_y);
        Serial.printf("🎯 目标位置: (%.2f, %.2f)\n", target_x, target_y);
        
        float distance = sqrt(pow(current_x - target_x, 2) + pow(current_y - target_y, 2));
        Serial.printf("📏 到目标距离: %.2f 米\n", distance);
    }
    
    // ========== 重置 BLE 平滑器 ==========
    else if (cmd == "BLE RESET") {
        Serial.println("重置 BLE 位置平滑器...");
        if (ble_location) {
            ble_location->resetSmoother();
            Serial.println("✅ 平滑器已重置");
        } else {
            Serial.println("❌ BLELocation 未初始化");
        }
    }
    
    // ========== 显示 BLE 统计 ==========
    else if (cmd == "BLE STATS") {
        Serial.println("\n╔══════════════════════════════════════════════════════════════╗");
        Serial.println("║                     BLE 统计信息                              ║");
        Serial.println("╚══════════════════════════════════════════════════════════════╝");
        if (ble_location) {
            ble_location->printStatistics();
        } else {
            Serial.println("❌ BLELocation 未初始化");
        }
    }
    
    // ========== 位置显示 ==========
    else if (cmd == "LOC" || cmd == "POS") {
        Serial.println("\n📍 当前位置信息:");
        Serial.printf("  坐标: (%.2f, %.2f)\n", current_x, current_y);
        Serial.printf("  目标: (%.2f, %.2f)\n", target_x, target_y);
        
        float dx = target_x - current_x;
        float dy = target_y - current_y;
        float distance = sqrt(dx*dx + dy*dy);
        float angle = atan2(dy, dx) * 180 / PI;
        if (angle < 0) angle += 360;
        
        const char* dirs[] = {"东", "东北", "北", "西北", "西", "西南", "南", "东南"};
        int dirIndex = (int)((angle + 22.5) / 45) % 8;
        
        Serial.printf("  到目标距离: %.2f 米\n", distance);
        Serial.printf("  方向: %s (%.1f°)\n", dirs[dirIndex], angle);
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
                Serial.printf(" 名称: %s", name);
                if (data_transmitter) {
                    data_transmitter->setTargetPosition(target_x, target_y, String(name));
                }
                if (display) {
                    display->setTargetPosition(target_x, target_y, name);
                }
            } else {
                if (data_transmitter) {
                    data_transmitter->setTargetPosition(target_x, target_y, "");
                }
                if (display) {
                    display->setTargetPosition(target_x, target_y);
                }
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
    }
    
    // ========== 模拟跌倒 ==========
    else if (cmd == "SIMFALL") {
        Serial.println("⚠️ 模拟跌倒事件...");
        if (fall_detector) {
            // 强制触发跌倒
            FallEvent event = fall_detector->getFallEvent();
            event.state = STATE_FALL_CONFIRMED;
            event.description = "模拟跌倒";
            event.confidence = 0.95;
            
            Serial.println("✅ 跌倒事件已触发");
            
            // 播放警报
            if (audioCommandQueue) {
                AudioCommand audio_cmd;
                audio_cmd.command = AudioCommand::AUDIO_PLAY_ALERT;
                xQueueSend(audioCommandQueue, &audio_cmd, 0);
            }
            
            // 上传跌倒警报
            if (data_transmitter) {
                data_transmitter->transmitFallAlert(event);
            }
            
            // 显示警报
            if (display) {
                display->showFallAlert(true);
            }
        } else {
            Serial.println("❌ 跌倒检测未初始化");
        }
    }
    
    // ========== WiFi 连接 ==========
    else if (cmd == "WIFI") {
        Serial.println("正在连接 WiFi...");
        if (network) {
            if (network->connectWiFi()) {
                Serial.println("✅ WiFi 连接成功");
                if (data_transmitter) {
                    data_transmitter->setMQTTConfig(MQTT_BROKER, MQTT_PORT);
                }
            } else {
                Serial.println("❌ WiFi 连接失败");
            }
        } else {
            Serial.println("❌ 网络管理器未初始化");
        }
    }
    
    else if (cmd == "WIFIOFF") {
        if (network) {
            WiFi.disconnect();
            wifiConnected = false;
            Serial.println("✅ WiFi 已断开");
        }
    }
    
    // ========== MQTT 连接 ==========
    else if (cmd == "MQTT") {
        Serial.println("正在连接 MQTT...");
        if (data_transmitter) {
            if (data_transmitter->ensureMQTTConnected()) {
                Serial.println("✅ MQTT 连接成功");
            } else {
                Serial.println("❌ MQTT 连接失败");
            }
        } else {
            Serial.println("❌ DataTransmitter 未初始化");
        }
    }
    
    else if (cmd == "MQTTOFF") {
        Serial.println("断开 MQTT...");
        // TODO: 实现 MQTT 断开
    }
    
    // ========== 数据上传 ==========
    else if (cmd == "UPLOAD") {
        dataUploadEnabled = !dataUploadEnabled;
        Serial.printf("数据上传: %s\n", dataUploadEnabled ? "开启" : "关闭");
    }
    
    else if (cmd == "MQTTLOC") {
        Serial.println("手动发送位置数据...");
        if (data_transmitter) {
            data_transmitter->transmitLocation();
            Serial.println("✅ 位置数据已发送");
        } else {
            Serial.println("❌ DataTransmitter 未初始化");
        }
    }
    
    else if (cmd == "MQTTALL") {
        Serial.println("手动发送所有数据...");
        Serial.printf("主程序位置: (%.2f, %.2f)\n", current_x, current_y);

        if (data_transmitter) {
            data_transmitter->transmitAllData();
            Serial.println("✅ 所有数据已发送");
        } else {
            Serial.println("❌ DataTransmitter 未初始化");
        }
    }
    
    // ========== SOS 命令 ==========
    else if (cmd == "SOSON") {
        Serial.println("🚨 触发 SOS...");
        ButtonEventData event = {ButtonEventData::BOOT_SOS_ACTIVATED, millis()};
        if (buttonEventQueue) {
            xQueueSend(buttonEventQueue, &event, 0);
            Serial.println("✅ SOS 事件已发送");
        } else {
            Serial.println("❌ 按钮事件队列为空");
        }
    }
    
    else if (cmd == "SOSOFF") {
        Serial.println("解除 SOS...");

        // 方案一：直接调用处理函数（推荐）
        // 模拟长按3秒的效果
        ButtonEventData event;
        event.type = ButtonEventData::BOOT_SOS_ACTIVATED;  // 发送长按事件
        event.timestamp = millis();

        if (buttonEventQueue) {
            xQueueSend(buttonEventQueue, &event, 0);
            Serial.println("✅ SOS 解除事件已发送");
        } else {
            Serial.println("❌ 按钮事件队列为空");
        }
    }
    
    else if (cmd == "SOSSTATUS") {
        Serial.printf("SOS 状态: %s\n", sos_active ? "激活" : "未激活");
    }
    
    // ========== 音频命令 ==========
    else if (cmd == "TONE") {
        Serial.println("播放测试音...");
        if (audio) {
            audio->playTone(1000, 500);
        } else {
            Serial.println("❌ 音频管理器未初始化");
        }
    }
    
    else if (cmd == "ALERT") {
        Serial.println("播放警报...");
        if (audio) {
            audio->playAlert();
        } else {
            Serial.println("❌ 音频管理器未初始化");
        }
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
        } else {
            Serial.println("❌ 音频命令队列为空");
        }
    }
    
    // ========== 显示命令 ==========
    else if (cmd.startsWith("PAGE ")) {
        int page = cmd.substring(5).toInt();
        if (display) {
            switch (page) {
                case 0:
                    display->switchToHomePage();
                    Serial.println("切换到首页");
                    break;
                case 1:
                    display->switchToNavPage();
                    Serial.println("切换到导航页");
                    break;
                case 2:
                    display->switchToHealthPage();
                    Serial.println("切换到健康页");
                    break;
                default:
                    Serial.println("无效页面，可用: 0=首页, 1=导航, 2=健康");
            }
        } else {
            Serial.println("❌ 显示管理器未初始化");
        }
    }

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
        
        // 计算视口位置
        int center_pixel_x = (int)(current_x / MAP_REAL_WIDTH * MAP_PIXEL_WIDTH);
        int center_pixel_y = (int)(current_y / MAP_REAL_HEIGHT * MAP_PIXEL_HEIGHT);
        Serial.printf("中心像素: (%d, %d)\n", center_pixel_x, center_pixel_y);
    }
    
    // 内存信息
    Serial.printf("\n空闲堆内存: %d bytes\n", esp_get_free_heap_size());
    if (psramFound()) {
        Serial.printf("PSRAM 空闲: %d bytes\n", ESP.getFreePsram());
    }
    }
    
    else if (cmd == "SOSDISP") {
        Serial.println("显示 SOS 界面...");
        if (display) {
            display->showSOS(true);  // 改为 showSOS
        }
    }

    else if (cmd == "FALLDISP") {
        Serial.println("显示跌倒报警界面...");
        if (display) {
            display->showFallAlert(true);  // 改为 showFallAlert
        }
    }
    
    // ========== 重启 ==========
    else if (cmd == "RESET" || cmd == "RST") {
        Serial.println("系统将在 2 秒后重启...");
        delay(2000);
        ESP.restart();
    }
    
    // ========== 未知命令 ==========
    else if (cmd.length() > 0) {
        Serial.printf("未知命令: %s\n", cmd.c_str());
        Serial.println("输入 HELP 查看可用命令");
    }
}

void printSystemStatus() {
    Serial.println("\n=== 系统状态 ===");
    Serial.printf("当前位置: (%.1f, %.1f)\n", current_x, current_y);
    Serial.printf("SOS状态: %s\n", sos_active ? "激活" : "未激活");
    Serial.printf("WiFi: %s\n", wifiConnected ? "已连" : "未连");
    Serial.printf("内存: %d bytes\n", esp_get_free_heap_size());
    Serial.println("==================\n");
}

void checkSystemHealth() {
    Serial.println("\n=== 系统健康检查 ===");
    Serial.printf("空闲堆: %d bytes\n", esp_get_free_heap_size());
    Serial.printf("PSRAM空闲: %d bytes\n", ESP.getFreePsram());
    Serial.println("====================\n");
}

// ==================== setup ====================
void setup() {
    Serial.begin(115200);
    delay(2000);
    
    disableCore0WDT();
    disableCore1WDT();
    disableLoopWDT();
    
    Serial.println("\n=== 老人院定位系统启动 ===");
    
    // 创建互斥锁（使用 Mutex 类型）
    spiMutex = xSemaphoreCreateMutex();
    i2cMutex = xSemaphoreCreateMutex();
    sdMutex = xSemaphoreCreateMutex();
    
    if (spiMutex == NULL || i2cMutex == NULL || sdMutex == NULL) {
        Serial.println("❌ 互斥锁创建失败！");
        while(1) {
            delay(1000);
            Serial.print(".");
        }
    }
    Serial.println("✅ 互斥锁创建成功");
    
    // 测试互斥锁
    if (xSemaphoreTake(spiMutex, 0) == pdTRUE) {
        Serial.println("spiMutex 可用");
        xSemaphoreGive(spiMutex);
    } else {
        Serial.println("spiMutex 不可用！");
    }
    
    // 创建队列
    buttonEventQueue = xQueueCreate(5, sizeof(ButtonEventData));
    audioCommandQueue = xQueueCreate(5, sizeof(AudioCommand));
    locationDataQueue = xQueueCreate(3, sizeof(Location));
    displayCommandQueue = xQueueCreate(5, sizeof(DisplayCommand));
    
    // 初始化硬件
    initHardware();
    initI2C();
    initDisplay();
    initIMU();
    initFallDetection();
    initBLE();
    // initNetwork();
    initPower();
    initAudio();
    initDataTransmitter();
    
    voice_manager = new VoiceMessageManager();
    voice_manager->init();
    
    // 自动连接 WiFi
    if (network) {
        network->connectWiFi();
        if (data_transmitter) {
            data_transmitter->setMQTTConfig(MQTT_BROKER, MQTT_PORT);
        }
    }
    
    // 创建任务
    xTaskCreatePinnedToCore(imuSamplingTask, "IMU", 4096, nullptr, 3, &imuSamplingTaskHandle, 1);
    xTaskCreatePinnedToCore(fallDetectionTask, "Fall", 2048, nullptr, 2, &fallDetectionTaskHandle, 1);
    xTaskCreatePinnedToCore(buttonTask, "Button", 4096, nullptr, 3, &buttonTaskHandle, 0);
    xTaskCreatePinnedToCore(bleLocationTask, "BLE", 8192, nullptr, 2, &bleLocationTaskHandle, 0);
    xTaskCreatePinnedToCore(mapDisplayTask, "Display", 4096, nullptr, 1, &mapDisplayTaskHandle, 0);
    xTaskCreatePinnedToCore(networkTask, "Network", 4096, nullptr, 1, &networkTaskHandle, 0);
    xTaskCreatePinnedToCore(audioTask, "Audio", 4096, nullptr, 1, &audioTaskHandle, 0);
    xTaskCreatePinnedToCore(powerTask, "Power", 4096, nullptr, 1, &powerTaskHandle, 0);
    xTaskCreatePinnedToCore(mainCoordinatorTask, "Main", 4096, nullptr, 2, &mainCoordinatorTaskHandle, 0);
    
    Serial.println("\n✅ 系统初始化完成！");
    Serial.println("================================\n");
}

void loop() {
    vTaskDelay(pdMS_TO_TICKS(1000));
}