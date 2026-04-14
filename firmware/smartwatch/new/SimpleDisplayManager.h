#ifndef SIMPLE_DISPLAY_MANAGER_H
#define SIMPLE_DISPLAY_MANAGER_H

#include <Arduino.h>
#include <Wire.h>
#include "Arduino_GFX_Library.h"
#include "pin_config.h"
#include "FT6146.h"
#include <SD_MMC.h>
#include <TJpg_Decoder.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include "PageManager.h"
#include "Config.h"

extern SemaphoreHandle_t spiMutex;

class SimpleDisplayManager {
private:
    Arduino_GFX* gfx;
    FT6146* touch;
    
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
    
    // 状态
    char status_str[50] = "";
    bool show_nav = false;
    bool screenOn = true;
    bool wifi_connected = false;
    int battery_level = 100;
    int wifi_rssi = 0;
    bool sos_emergency_mode = false;
    unsigned long sos_start_time = 0;
    unsigned long lastBlink = 0;
    bool fallAlertActive = false;
    unsigned long fallAlertStartTime = 0;
    
    // 健康数据
    int heartRate = 75;
    int bloodPressureHigh = 120;
    int bloodPressureLow = 80;
    int spo2 = 98;
    int sleepQuality = 85;
    
    // 页面管理
    PageManager pageManager;
    
    bool needRedraw;

    // ========== 新增：地图相关成员 ==========
    uint16_t* fullMapBuffer;     // 完整地图缓冲
    bool map_loaded;             // 地图是否已加载
    bool isLoading;              // 是否正在加载
    
    // 触摸相关
    bool touch_enabled;
    int touch_start_x, touch_start_y;
    unsigned long touch_start_time;
    bool is_touching;
    bool touch_swipe_detected;
    const int SWIPE_THRESHOLD_X = 80;
    const int SWIPE_THRESHOLD_Y = 100;
    const unsigned long SWIPE_TIMEOUT = 500;
    const unsigned long SCREEN_TIMEOUT = 10000;
    unsigned long lastActivityTime;

    // 页面刷新间隔（毫秒）
    const unsigned long HOME_REFRESH_INTERVAL = 10000;   // 10秒
    const unsigned long NAV_REFRESH_INTERVAL = 2000;     // 2秒
    const unsigned long HEALTH_REFRENAV_REFRESH_INTERVALSH_INTERVAL = 10000; // 10秒

    // 页面刷新控制
    unsigned long lastPageRenderTime;
    unsigned long lastDataUpdateTime;
    int lastBatteryLevel;
    int lastHour, lastMinute, lastSecond;
    int lastHeartRate, lastSpO2;
    bool lastSOSState;
    bool lastFallState; 

    unsigned long lastNavRefreshTime;  // 导航页上次刷新时间

    // 紧急页面闪烁控制
    unsigned long lastBlinkTime;
    bool blinkState;

    unsigned long alarmTriggerTime;     // 报警触发时间
    bool alarmReportPending;            // 报警上报待处理
    bool alarmDisplayActive;            // 报警画面是否显示中
     
public:
    static SimpleDisplayManager* instance;
    
    SimpleDisplayManager(Arduino_GFX* display);
    
    bool init();
    void update();
    
    // 基本函数
    void setTime(uint8_t h, uint8_t m, uint8_t s);
    void setDate(uint16_t y, uint8_t mon, uint8_t d);
    void setStatus(const char* status);
    void showSOS(bool active);
    void showFallAlert(bool active);
    
    // 位置函数
    void setCurrentPosition(float x, float y);
    void setTargetPosition(float x, float y);
    void setTargetPosition(float x, float y, const char* name);
    
    // 状态函数
    void setWiFiStatus(bool connected, int rssi = 0);
    void setBatteryLevel(int level);
    
    // 健康数据
    void updateHealthData(int hr, int bph, int bpl, int spo, int sleep);
    
    // 页面控制
    void nextPage();
    void prevPage();
    void switchToHomePage();
    void switchToNavPage();
    void switchToHealthPage();
    ScreenPage getCurrentPage();
    
    // 触摸
    void initTouch();
    
    // 屏幕控制
    void wakeScreen();
    bool isScreenOn() { return screenOn; }
    void forceRedraw() { needRedraw = true; }

    // ========== 新增：地图相关方法 ==========
    bool initMap(const char* filename);
    void drawScreen();
    void drawPositions();
    bool isMapLoaded() { return map_loaded; }

    bool isAlarmDisplayActive() { return alarmDisplayActive; }
    bool isAlarmReportPending() { return alarmReportPending; }
    
private:
    void drawText(int x, int y, const char* text, uint16_t color = 0xFFFF, int size = 2);
    void drawStatusBar();
    void drawWiFiIcon(int x, int y);
    void drawBatteryIcon(int x, int y);
    void drawHomePage();
    void drawNavPage();
    void drawHealthPage();
    void drawSideButtons();
    void drawFallAlertPage();
    void drawSOSPage();      // SOS 紧急页面
    String getWeekday();
    
    
    void updateTouch();
    void handleTouchPress(int x, int y);
    void handleTouchMove(int x, int y);
    void handleTouchRelease(int x, int y);
    void handleTap(int x, int y);
    void updateScreenTimeout();
    
    static bool jpeg_output(int16_t x, int16_t y, uint16_t w, uint16_t h, uint16_t* bitmap);

    // ========== 新增：JPEG 解码回调 ==========
    static bool jpeg_output_callback(int16_t x, int16_t y, uint16_t w, uint16_t h, uint16_t* bitmap);
};

#endif