// SimpleDisplayManager.h - 清理后的版本
#ifndef SIMPLE_DISPLAY_MANAGER_H
#define SIMPLE_DISPLAY_MANAGER_H

#include <Arduino.h>
#include <Wire.h>
#include <cstring>
#include <cstdio>
#include <cstdint>
#include "Arduino_GFX_Library.h"
#include "pin_config.h"
#include <SD_MMC.h>
#include <TJpg_Decoder.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>

// 声明外部互斥锁
extern SemaphoreHandle_t spiMutex;

class SimpleDisplayManager {
private:
    Arduino_GFX* gfx;
    
    // RTC时间
    uint8_t hour = 12, minute = 0, second = 0;
    uint16_t year = 2024;
    uint8_t month = 1, day = 1;
    
    // 显示状态
    char status_str[50] = "";
    char nav_str[50] = "";
    bool show_sos = false;
    bool show_nav = false;
    bool show_legend = true;
    bool follow_mode = true;
    unsigned long nav_timeout = 0;
    
    // 位置信息
    float current_x = 3.0, current_y = 14.0;
    float target_x = 6.0, target_y = 2.0;
    char target_name[30] = "Boarding Gate";
    float last_current_x = -1, last_current_y = -1;
    
    // 视口相关
    float view_center_x = 4.5;
    float view_center_y = 8.0;
    float view_width = 12.0;
    float view_height = 16.0;
    
    // 地图缩放
    float map_scale_x;
    float map_scale_y;
    
    // 地图边界
    float map_min_x = 0.0;
    float map_max_x = 12.0;
    float map_min_y = 0.0;
    float map_max_y = 16.0;
    
    // 地图图像尺寸
    int map_img_width = 600;
    int map_img_height = 800;
    
    // 帧缓冲
    uint16_t* fullMapBuffer;
    uint16_t* screenBuffer;
    bool map_loaded;
    bool needRedraw;
    
    // 加载状态
    volatile bool isLoading;
    unsigned long loadStartTime;
    
    // ===== 新增成员 =====
    bool wifi_connected;
    int battery_level;
    int wifi_rssi;
    bool sos_emergency_mode;
    unsigned long sos_start_time;

    // 航班信息结构
    struct FlightInfo {
        String flight_no;
        String destination;
        String gate;
        String boarding_time;
        int delay_minutes;
        bool has_info;
        
        FlightInfo() {
            flight_no = "";
            destination = "";
            gate = "";
            boarding_time = "";
            delay_minutes = 0;
            has_info = false;
        }
    } flight_info;
    
    bool flight_info_visible;  // 航班信息是否显示
    
public:
    // 设置航班信息
    void setFlightInfo(const char* flight_no, const char* dest, 
                       const char* gate, const char* time, int delay = 0) {
        flight_info.flight_no = flight_no;
        flight_info.destination = dest;
        flight_info.gate = gate;
        flight_info.boarding_time = time;
        flight_info.delay_minutes = delay;
        flight_info.has_info = true;  // 确保设为 true
        flight_info_visible = true;    // 确保可见
        
        Serial.println("[显示] 航班信息已设置:");
        Serial.printf("  %s -> %s Gate %s %s +%dmin\n", 
                     flight_no, dest, gate, time, delay);
    }
    
    void hideFlightInfo() { flight_info_visible = false; }
    void showFlightInfo() { flight_info_visible = true; }
    bool hasFlightInfo() { return flight_info.has_info; }
    
    // 导航控制
    void setShowNavigation(bool show) { 
        show_nav = show; 
        if (!show) {
            nav_timeout = 0;
        }
    }
    
    static SimpleDisplayManager* instance;
    
    // 构造函数 - 只保留这一个声明
    SimpleDisplayManager(Arduino_GFX* display);
    
    bool init();
    void update();
    
    // 基本显示函数
    void setTime(uint8_t h, uint8_t m, uint8_t s);
    void setDate(uint16_t y, uint8_t mon, uint8_t d);
    void setStatus(const char* status);
    void showNavigation(const char* direction, float distance);
    void showSOS(bool active);

    // 地图加载
    bool startLoadingMap(const char* filename);
    bool isLoadingComplete() { return !isLoading && map_loaded; }
    void processLoading();
    
    // 显示函数
    bool updateViewport();
    void drawScreen();
    
    // 位置函数
    void setCurrentPosition(float x, float y);
    void setTargetPosition(float x, float y) {
        setTargetPosition(x, y, "Target");
    }
    void setTargetPosition(float x, float y, const char* name);
    
    void setLegendVisible(bool visible) { show_legend = visible; }
    void clear();
    
    // 视口控制
    void setFollowMode(bool enable) { follow_mode = enable; }
    bool getFollowMode() { return follow_mode; }
    void setViewCenter(float x, float y);
    void setViewSize(float width, float height);
    void setMapBounds(float min_x, float max_x, float min_y, float max_y);
    void setMapImageSize(int width, int height);
    
    // ===== 新增状态设置函数 =====
    void setWiFiStatus(bool connected, int rssi = 0) {
        wifi_connected = connected;
        wifi_rssi = rssi;
    }
    
    void setBatteryLevel(int level) {
        battery_level = constrain(level, 0, 100);
    }
    
    // 调试函数
    void verifyCalibration();
    void debugMapInfo();
    void printScaleInfo();

private:
    // 坐标转换
    int mapToPixelX(float map_x);
    int mapToPixelY(float map_y);
    void mapToScreen(float map_x, float map_y, int& screen_x, int& screen_y);
    
    // 绘制函数
    void drawText(int x, int y, const char* text, uint16_t color = 0xFFFF, int size = 2);
    void drawTime();
    void drawDate();
    void drawStatus();
    void drawPositions();
    void drawLegend();
    void drawCompass();
    
    // ===== 新增绘制函数声明 =====
    void drawFlightInfo();  // <-- 确保这行在这里
    void drawStatusBar();
    void drawWiFiIcon(int x, int y);
    void drawBatteryIcon(int x, int y);
    void drawNavigationDirection();
    
    void updateMapScale();
    static bool jpeg_output(int16_t x, int16_t y, uint16_t w, uint16_t h, uint16_t* bitmap);
};

#endif