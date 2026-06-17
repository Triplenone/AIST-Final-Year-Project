// SimpleDisplayManager.h - 完整修复版本

#ifndef SIMPLE_DISPLAY_MANAGER_H
#define SIMPLE_DISPLAY_MANAGER_H

#include <Arduino.h>
#include <Wire.h>
#include <cstring>
#include <cstdio>
#include <cstdint>
#include <vector>  // 添加 vector 头文件
#include "Arduino_GFX_Library.h"
#include "pin_config.h"
#include <SD_MMC.h>
#include <TJpg_Decoder.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include "PageManager.h"
#include "Config.h"

// 前向声明
class IMUManager;
class VibrationManager;
class DataTransmitter;
class FallDetection;
class BLELocation;

// 声明外部互斥锁
extern SemaphoreHandle_t spiMutex;

struct NavDisplayInfo;  // 前向声明

// 航班信息结构体
struct FlightInfoData {
    String flight_number;
    String airline;
    String destination;
    String scheduled_departure;
    String estimated_departure;
    String boarding_time;
    String boarding_gate;
    String status;
    String terminal;
    String checkin_counter;
    int delay_minutes;
    String delay_reason;
    bool gate_changed;
    String previous_gate;
    bool valid;
    unsigned long last_update;
};

class SimpleDisplayManager {
public:
    // 导航路径点结构体 - 放在 public 区域
    struct Waypoint {
        float x, y;
        String name;
    };

    // 弹窗类型
    enum PopupType {
        POPUP_NONE = 0,
        POPUP_FLIGHT_DELAY,
        POPUP_GATE_CHANGE,
        POPUP_BOARDING,
        POPUP_FLIGHT_CANCELLED,
        POPUP_ARRIVAL
    };
    
    static SimpleDisplayManager* instance;
    
    SimpleDisplayManager(Arduino_GFX* display);
    
    bool init();
    void update();
    
    // 基本函数
    void setTime(uint8_t h, uint8_t m, uint8_t s);
    void setDate(uint16_t y, uint8_t mon, uint8_t d);
    void setStatus(const char* status);
    
    // 位置函数
    void setCurrentPosition(float x, float y);
    void setTargetPosition(float x, float y);
    void setTargetPosition(float x, float y, const char* name);
    
    // 状态函数
    void setWiFiStatus(bool connected, int rssi = 0);
    void setBatteryLevel(int level);
    void updateHealthData(int hr, int bph, int bpl, int spo, int sleep);
    
    // 紧急事件
    void showSOS(bool active);
    void showFallAlert(bool active);
    void triggerAlarm(bool isSOS, bool isFall);
    void cancelAlarm();
    
    // 页面控制
    void nextPage();
    void prevPage();
    void switchToHomePage();
    void switchToNavPage();
    void switchToFlightPage();
    void switchToHealthPage();
    ScreenPage getCurrentPage();
    
    // 地图
    bool initMap(const char* filename);
    bool isMapLoaded() { return map_loaded; }
    uint16_t* getFullMapBuffer() { return fullMapBuffer; }
    uint16_t* getScreenBuffer() { return screenBuffer; }
    void forceRedraw() { needRedraw = true; }
    
    // 屏幕控制
    void setBacklight(bool on);
    void wakeScreen();
    void sleepScreen();
    bool isScreenOn() { return screenOn; }
    
    // 报警状态查询
    bool isSOSActive() { return sos_emergency_mode; }
    bool isFallActive() { return fallAlertActive; }
    bool isAlarmDisplayActive() { return alarmDisplayActive; }
    bool isAlarmReportPending() { return alarmReportPending; }
    unsigned long getAlarmTriggerTime() { return alarmTriggerTime; }
    void setAlarmReportPending(bool pending) { alarmReportPending = pending; }
    
    // 紧急页面绘制
    void drawSOSPage();
    void drawFallAlertPage();
    
    // 传感器管理器
    void setIMUManager(IMUManager* imuMgr) { imu = imuMgr; }
    void setVibrationManager(VibrationManager* vib) { vibration = vib; }
    
    // 抬手检测
    void checkWristRaise();
    void updateScreenTimeout();
    
    // 振动
    void vibrateShort();
    
    // 周期控制
    void setBLEScanNeeded() { bleScanNeeded = true; }
    void setUploadNeeded() { uploadNeeded = true; }
    
    // 航班信息
    void setFlightInfo(const String& flightNo, const String& airline,
                       const String& destination, const String& gate,
                       const String& boardingTime, int delayMinutes,
                       const String& status, const String& terminal,
                       const String& scheduledDeparture, 
                       const String& estimatedDeparture,
                       const String& delayReason);
    
    void setFlightInfoSimple(const String& flightNo, const String& airline,
                             const String& destination, const String& gate,
                             const String& time, int delay = 0);
    
    void setFlightStatus(const String& status);
    void updateFlightDelay(int minutes, const String& reason = "");
    void updateFlightGate(const String& newGate, const String& oldGate = "");
    void clearFlightInfo();
    bool hasFlightInfo() { return flightInfo.valid; }
    
    // 导航路径相关
    void setNavigationPath(const std::vector<Waypoint>& path);
    void setDestination(float x, float y, const String& name, const String& gate);
    void setTargetGate(const String& gate, float x, float y);
    void checkArrivalAtCurrentPosition();
    bool setSmartNavigationDestination(const String& destinationKey, bool fromFlightInfo = false);
    void openDestinationPicker();
    bool isDestinationPickerActive() const { return destinationPickerActive; }
    void moveNavigationDestinationSelection(int delta);
    void cycleNavigationDestination();
    bool confirmNavigationSelection();
    void cancelDestinationPicker();
    void printNavigationDestinations();
    void updateNavigationInfo(const String& instruction, float distance, const String& direction);
    void clearNavigationPath();
    bool hasNavigationPathSet() const { return hasNavigationPath; }
    bool hasManualNavigationDestination() const { return hasNavigationPath && !activeNavigationFromFlight; }
    
    // 调试
    void printMapInfo();

    // 显示弹窗
    void showPopup(PopupType type, const String& title, const String& message);
    void hidePopup();
    bool isPopupActive() { return popupActive; }
    
    // 弹窗确认（点击侧边按钮时调用）
    void confirmPopup();

private:
    Arduino_GFX* gfx;
    
    // 时间日期
    uint8_t hour = 12, minute = 0, second = 0;
    uint16_t year = 2024;
    uint8_t month = 1, day = 1;
    
    // 位置信息
    float current_x = 3.0, current_y = 14.0;
    float target_x = 6.0, target_y = 2.0;
    float accuracy = 5.0;
    int beacon_count = 0;
    char target_name[30] = "Gate";
    float last_current_x = -1, last_current_y = -1;
    
    // 状态
    char status_str[50] = "";
    bool show_nav = false;
    bool show_legend = false;
    bool follow_mode = false;
    bool arrivalPopupShown = false;
    String arrivalPopupTarget;
    String activeArrivalKey;
    String activeArrivalLabel;
    bool activeNavigationFromFlight = false;
    unsigned long nav_timeout = 0;
    
    // 系统状态
    bool wifi_connected = false;
    int battery_level = 100;
    int wifi_rssi = 0;
    
    // 紧急状态
    bool sos_emergency_mode = false;
    bool fallAlertActive = false;
    unsigned long sos_start_time = 0;
    unsigned long fallAlertStartTime = 0;
    
    // 健康数据
    int heartRate = 75;
    int bloodPressureHigh = 120;
    int bloodPressureLow = 80;
    int spo2 = 98;
    int sleepQuality = 85;
    
    // 页面管理
    PageManager pageManager;
    
    // 缓冲
    uint16_t* fullMapBuffer = nullptr;
    uint16_t* screenBuffer = nullptr;
    bool map_loaded = false;
    bool needRedraw = true;
    bool isLoading = false;
    unsigned long loadStartTime = 0;
    
    // 地图参数
    float view_center_x = 6.0, view_center_y = 8.0;
    float view_width = 12.0, view_height = 16.0;
    float map_scale_x = 1.0, map_scale_y = 1.0;
    float map_min_x = 0.0, map_max_x = 12.0;
    float map_min_y = 0.0, map_max_y = 16.0;
    int map_img_width = 600, map_img_height = 800;
    
    // 刷新控制
    unsigned long lastPageRenderTime = 0;
    unsigned long lastNavRefreshTime = 0;
    unsigned long lastBlinkTime = 0;
    bool blinkState = false;
    
    // 报警延迟上报
    unsigned long alarmTriggerTime = 0;
    bool alarmReportPending = false;
    bool alarmDisplayActive = false;
    
    // 屏幕控制
    bool screenOn = true;
    unsigned long lastActivityTime = 0;
    const unsigned long SCREEN_TIMEOUT_MS = 20000;
    
    // 传感器管理器
    IMUManager* imu = nullptr;
    VibrationManager* vibration = nullptr;
    
    // 航班信息
    FlightInfoData flightInfo;
    bool flight_info_visible = true;
    
    // 导航相关 - 使用正确的类型
    std::vector<Waypoint> navigationPath;
    bool hasNavigationPath = false;
    bool destinationPickerActive = false;
    bool destinationPickerIntentSeen = false;
    unsigned long destinationPickerLastActivity = 0;
    static const unsigned long DESTINATION_PICKER_AUTO_CONFIRM_MS = 5000;
    int selectedDestinationIndex = 0;

    // 导航显示方法
    void calculateMapViewByDirection(int& startX, int& startY, int& playerX, int& playerY, 
                                      int mapHeight, const NavDisplayInfo& navInfo);
    void calculateMapViewCentered(int& startX, int& startY, int& playerX, int& playerY, 
                                   int mapHeight);
    void drawPlayerMarker(int x, int y);
    void drawTargetMarker(int x, int y, const String& gate);
    void drawNavigationGuides(const NavDisplayInfo& navInfo);
    void drawGateDisplay(const String& gate, float distance);
    void drawProgressBar(int y, float progress);
    void noteDestinationPickerActivity();
    bool updateDestinationPickerAutoConfirm();
    
    // 目的地信息
    struct DestInfo {
        float x, y;
        String name;
        String gate;
    } destination;
    
    // 导航指令
    String currentNavInstruction = "";
    float currentNavDistance = 0;
    String currentNavDirection = "";
    unsigned long lastNavUpdate = 0;
    
    // 上次值记录
    int lastBatteryLevel = -1;
    int lastHour = -1, lastMinute = -1, lastSecond = -1;
    int lastHeartRate = -1, lastSpO2 = -1;
    bool lastSOSState = false;
    bool lastFallState = false;
    float lastNavX = -1, lastNavY = -1;
    
    // 周期控制
    bool bleScanNeeded = false;
    bool uploadNeeded = false;
    unsigned long lastBLEScan = 0;
    unsigned long lastUpload = 0;
    unsigned long lastDisplayUpdate = 0;
    
    // 抬手检测
    bool wristRaised = false;
    float lastAccelZ = 0;
    
    // 刷新间隔常量
    static constexpr unsigned long HOME_REFRESH_INTERVAL = 10000;
    static constexpr unsigned long NAV_REFRESH_INTERVAL = 2000;
    static constexpr unsigned long FLIGHT_REFRESH_INTERVAL = 10000;
    
    // 绘制函数
    void drawStatusBar();
    void drawWiFiIcon(int x, int y);
    void drawBatteryIcon(int x, int y);
    void drawHomePage();
    void drawNavPage();
    void drawHealthPage();
    void drawFlightPage();
    void drawSideButtons();
    void drawFlightInfo();
    void drawNavigationDirection();
    void drawPositions();
    void drawLegend();
    void drawFlightStatusBadge();
    void drawNavigationPanel(int x, int y, int width, int height);
    void drawGateInfo(int x, int y, int width, int height);
    void drawDestinationPicker();
    void drawNavigationPath(int startX, int startY, int startPixelX, int startPixelY, 
                            int mapX, int mapY, int mapWidth, int mapHeight);
    void drawLineWithArrow(int x1, int y1, int x2, int y2, uint16_t color);
    void drawDestinationMarker(int x, int y);
    void drawWaypointMarker(int x, int y, int index);
    
    bool selectNavigationDestinationByIndex(int index, bool fromFlightInfo = false);
    
    // 辅助函数
    void updateMapScale();
    void handleEmergencyDisplay();
    int mapToPixelX(float map_x);
    int mapToPixelY(float map_y);
    void mapToScreen(float map_x, float map_y, int& screen_x, int& screen_y);
    String getWeekday();
    void drawText(int x, int y, const char* text, uint16_t color = 0xFFFF, int size = 2);
    bool isNearDestination();
    
    // BMP 加载
    bool loadBMP(const char* filename);

    // 弹窗相关
    bool popupActive = false;
    PopupType currentPopupType = POPUP_NONE;
    String popupTitle;
    String popupMessage;
    unsigned long popupStartTime = 0;
    bool popupNeedsRedraw = false;
    const unsigned long POPUP_ARRIVAL_AUTO_CLOSE_MS = 5000;
    const unsigned long POPUP_AUTO_CLOSE_MS = 10000;  // 10秒自动关闭
    
    void drawPopup();  // 绘制弹窗

    void drawNavigationPath(int startX, int startY, int playerX, int playerY, int mapY, int mapHeight);
    
    // 静态 JPEG 回调
    static bool jpegCallback(int16_t x, int16_t y, uint16_t w, uint16_t h, uint16_t* bitmap);
    static bool jpeg_output(int16_t x, int16_t y, uint16_t w, uint16_t h, uint16_t* bitmap);
};

#endif
