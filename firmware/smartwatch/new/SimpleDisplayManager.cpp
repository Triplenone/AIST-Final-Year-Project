#include "SimpleDisplayManager.h"
#include "pin_config.h"
#include "DataTransmitter.h"
#include "FallDetection.h"
#include "AudioManager.h"      // 如果需要音频
#include "MyNetworkManager.h"  // 如果需要网络
#include <SD_MMC.h>
#include <TJpg_Decoder.h>

#define HOME_REFRESH_INTERVAL 10000
#define NAV_REFRESH_INTERVAL 2000
#define HEALTH_REFRESH_INTERVAL 10000

extern DataTransmitter* data_transmitter;
extern FallDetection* fall_detector;

SimpleDisplayManager* SimpleDisplayManager::instance = nullptr;

bool SimpleDisplayManager::jpeg_output(int16_t x, int16_t y, uint16_t w, uint16_t h, uint16_t* bitmap) {
    if (instance && instance->gfx) {
        instance->gfx->draw16bitRGBBitmap(x, y, bitmap, w, h);
        return true;
    }
    return false;
}

SimpleDisplayManager::SimpleDisplayManager(Arduino_GFX* display) : gfx(display) {
    instance = this;
    fullMapBuffer = nullptr;  // 新增
    map_loaded = false;        // 新增
    isLoading = false;         // 新增
    touch = nullptr;
    touch_enabled = false;
    is_touching = false;
    touch_swipe_detected = false;
    needRedraw = true;
    screenOn = true;
    lastActivityTime = millis();

    // 初始化刷新控制变量
    lastPageRenderTime = 0;
    lastDataUpdateTime = 0;
    lastBatteryLevel = -1;
    lastHour = -1;
    lastMinute = -1;
    lastSecond = -1;
    lastHeartRate = -1;
    lastSpO2 = -1;
    lastSOSState = false;
    lastFallState = false;
    lastNavRefreshTime = 0;
    lastBlinkTime = 0;
    blinkState = false;
    alarmTriggerTime = 0;
    alarmReportPending = false;
    alarmDisplayActive = false;
}

bool SimpleDisplayManager::init() {
    Wire.begin(IIC_SDA, IIC_SCL);
    Serial.println("初始化显示管理器...");
    
    if (spiMutex && xSemaphoreTake(spiMutex, pdMS_TO_TICKS(1000)) == pdTRUE) {
        gfx->fillScreen(RGB565_BLACK);
        gfx->setCursor(10, 10);
        gfx->setTextColor(RGB565_WHITE);
        gfx->print("Loading...");
        xSemaphoreGive(spiMutex);
    }
    
    Serial.println("显示管理器初始化完成");
    return true;
}

// ========== 地图相关函数 ==========
bool SimpleDisplayManager::initMap(const char* filename) {
    Serial.printf("加载地图: %s\n", filename);
    
    // 显示加载开始
    if (spiMutex && xSemaphoreTake(spiMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        gfx->fillScreen(RGB565_BLACK);
        gfx->setCursor(20, 100);
        gfx->setTextSize(2);
        gfx->setTextColor(RGB565_WHITE);
        gfx->print("Loading map...");
        xSemaphoreGive(spiMutex);
    }
    
    // 检查文件是否存在
    if (!SD_MMC.exists(filename)) {
        Serial.println("❌ 地图文件不存在");
        return false;
    }
    
    // 打开 JPG 文件
    File jpgFile = SD_MMC.open(filename, FILE_READ);
    if (!jpgFile) {
        Serial.println("❌ 无法打开地图文件");
        return false;
    }
    
    // 获取文件大小
    size_t fileSize = jpgFile.size();
    Serial.printf("地图文件大小: %d bytes\n", fileSize);
    
    // 分配内存缓冲（600x800 的地图需要 960KB）
    size_t mapSize = MAP_PIXEL_WIDTH * MAP_PIXEL_HEIGHT * 2;
    Serial.printf("需要缓冲: %d KB\n", mapSize / 1024);
    
    if (psramFound()) {
        fullMapBuffer = (uint16_t*)ps_malloc(mapSize);
        Serial.println("使用 PSRAM 分配地图缓冲");
    } else {
        fullMapBuffer = (uint16_t*)malloc(mapSize);
        Serial.println("使用内部 RAM 分配地图缓冲");
    }
    
    if (!fullMapBuffer) {
        Serial.println("❌ 地图缓冲分配失败");
        jpgFile.close();
        return false;
    }
    
    // 清空缓冲
    memset(fullMapBuffer, 0, mapSize);
    
    // 配置 JPEG 解码
    TJpgDec.setJpgScale(1);
    TJpgDec.setSwapBytes(true);
    TJpgDec.setCallback(jpeg_output_callback);
    
    // ===== 修复：读取完整文件到缓冲区 =====
    // 分配 JPG 文件缓冲区
    uint8_t* jpgBuffer = (uint8_t*)malloc(fileSize);
    if (!jpgBuffer) {
        Serial.println("❌ JPG 缓冲分配失败");
        free(fullMapBuffer);
        fullMapBuffer = nullptr;
        jpgFile.close();
        return false;
    }
    
    // 读取文件并显示进度
    Serial.print("读取文件: ");
    size_t bytesRead = 0;
    while (jpgFile.available()) {
        size_t chunk = jpgFile.read(jpgBuffer + bytesRead, 1024);
        bytesRead += chunk;
        
        int progress = (int)((float)bytesRead / fileSize * 100);
        if (progress % 10 == 0 && progress > 0) {
            Serial.print(".");
        }
        if (progress % 20 == 0 && progress > 0) {
            Serial.printf(" %d%%", progress);
        }
        
        // 更新屏幕进度
        if (spiMutex && xSemaphoreTake(spiMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
            gfx->fillRect(20, 140, 200, 20, RGB565_BLACK);
            gfx->setCursor(20, 140);
            gfx->setTextSize(2);
            gfx->setTextColor(RGB565_GREEN);
            gfx->printf("%d%%", progress);
            
            // 绘制进度条
            int barWidth = (progress * 180) / 100;
            gfx->fillRect(20, 170, barWidth, 10, RGB565_GREEN);
            gfx->drawRect(20, 170, 180, 10, RGB565_WHITE);
            xSemaphoreGive(spiMutex);
        }
    }
    Serial.println(" 100%");
    
    jpgFile.close();
    
    // 显示解码中
    if (spiMutex && xSemaphoreTake(spiMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        gfx->fillRect(20, 140, 200, 40, RGB565_BLACK);
        gfx->setCursor(20, 140);
        gfx->setTextColor(RGB565_YELLOW);
        gfx->print("Decoding...");
        xSemaphoreGive(spiMutex);
    }
    
    // 解码 JPG 到 fullMapBuffer
    TJpgDec.drawJpg(0, 0, jpgBuffer, fileSize);
    
    free(jpgBuffer);
    
    map_loaded = true;
    Serial.println("✅ 地图加载成功");
    needRedraw = true;
    
    // 显示完成
    if (spiMutex && xSemaphoreTake(spiMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        gfx->fillRect(20, 140, 200, 40, RGB565_BLACK);
        gfx->setCursor(20, 140);
        gfx->setTextColor(RGB565_GREEN);
        gfx->print("Done!");
        delay(500);
        xSemaphoreGive(spiMutex);
    }
    
    return true;
}

// 绘制当前位置标记
void SimpleDisplayManager::drawPositions() {
    if (!fullMapBuffer || !map_loaded) return;
    
    // 将实际坐标转换为屏幕坐标
    int center_pixel_x = (int)(current_x / MAP_REAL_WIDTH * MAP_PIXEL_WIDTH);
    int center_pixel_y = (int)(current_y / MAP_REAL_HEIGHT * MAP_PIXEL_HEIGHT);
    
    int start_x = center_pixel_x - SCREEN_WIDTH / 2;
    int start_y = center_pixel_y - SCREEN_HEIGHT / 2;
    
    start_x = constrain(start_x, 0, MAP_PIXEL_WIDTH - SCREEN_WIDTH);
    start_y = constrain(start_y, 0, MAP_PIXEL_HEIGHT - SCREEN_HEIGHT);
    
    int screen_x = (int)(current_x / MAP_REAL_WIDTH * MAP_PIXEL_WIDTH) - start_x;
    int screen_y = (int)(current_y / MAP_REAL_HEIGHT * MAP_PIXEL_HEIGHT) - start_y;
    
    if (screen_x >= 0 && screen_x < SCREEN_WIDTH && screen_y >= 0 && screen_y < SCREEN_HEIGHT) {
        if (spiMutex && xSemaphoreTake(spiMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
            // 绘制红色圆点
            gfx->fillCircle(screen_x, screen_y, 8, RGB565_RED);
            gfx->drawCircle(screen_x, screen_y, 8, RGB565_WHITE);
            xSemaphoreGive(spiMutex);
        }
    }
}

// JPEG 解码回调
bool SimpleDisplayManager::jpeg_output_callback(int16_t x, int16_t y, uint16_t w, uint16_t h, uint16_t* bitmap) {
    if (instance && instance->fullMapBuffer) {
        // 将解码的数据写入地图缓冲
        for (int i = 0; i < h; i++) {
            int dstY = y + i;
            if (dstY >= MAP_PIXEL_HEIGHT) continue;
            uint32_t dstOffset = dstY * MAP_PIXEL_WIDTH + x;
            uint32_t srcOffset = i * w;
            memcpy(&instance->fullMapBuffer[dstOffset], &bitmap[srcOffset], w * 2);
        }
    }
    return true;
}

void SimpleDisplayManager::initTouch() {
    touch = new FT6146(FT6146_I2C_ADDR, TP_INT);
    if (touch->begin(Wire)) {
        touch_enabled = true;
        Serial.println("触摸功能已启用");
    } else {
        touch_enabled = false;
        Serial.println("触摸功能不可用");
    }
}

void SimpleDisplayManager::update() {
    // 声明外部变量
    extern DataTransmitter* data_transmitter;
    extern FallDetection* fall_detector;

    unsigned long now = millis();
    
    updateTouch();
    updateScreenTimeout();
    
    if (!screenOn) return;
    
    // ===== 1. 处理延迟上报 =====
    if (alarmReportPending) {
        if (now - alarmTriggerTime >= 8000) {
            // 5秒已过，执行上报
            alarmReportPending = false;
            Serial.println("[报警] 5秒已过，执行上报");
            
            if (sos_emergency_mode) {
                // 上报 SOS
                if (data_transmitter) {
                    data_transmitter->setSOSActive(true, "auto");
                }
            } else if (fallAlertActive) {
                // 上报跌倒
                if (data_transmitter && fall_detector) {
                    FallEvent event = fall_detector->getFallEvent();
                    data_transmitter->transmitFallAlert(event);
                }
            }
        }
    }
    
    // ===== 2. 紧急事件显示（立即显示）=====
    if (sos_emergency_mode || fallAlertActive) {
        // 每秒闪烁
        if (now - lastBlinkTime >= 500) {
            blinkState = !blinkState;
            lastBlinkTime = now;
            
            if (spiMutex && xSemaphoreTake(spiMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
                if (sos_emergency_mode) {
                    drawSOSPage();
                } else if (fallAlertActive) {
                    drawFallAlertPage();
                }
                drawSideButtons();
                xSemaphoreGive(spiMutex);
            }
        }
        needRedraw = false;
        return;
    }
    
    // ===== 正常页面刷新逻辑 =====
    // 更新状态变化记录
    lastSOSState = sos_emergency_mode;
    lastFallState = fallAlertActive;
    
    // ===== 2. 页面切换或强制重绘 - 高优先级 =====
    if (needRedraw) {
        if (spiMutex && xSemaphoreTake(spiMutex, pdMS_TO_TICKS(100)) == pdTRUE) {

            // 1. 先清除整个屏幕
            gfx->fillScreen(RGB565_BLACK);

            switch (pageManager.getCurrentPage()) {
                case PAGE_HOME:
                    drawHomePage();
                    break;
                case PAGE_NAV:
                    drawNavPage();
                    break;
                case PAGE_HEALTH:
                    drawHealthPage();
                    break;
            }
            xSemaphoreGive(spiMutex);
            
            lastPageRenderTime = now;
            needRedraw = false;
            Serial.println("[刷新] 页面切换/强制重绘");
        }
        return;
    }
    
    // ===== 3. 定时刷新逻辑 =====
    ScreenPage currentPage = pageManager.getCurrentPage();
    
    bool needRefresh = false;
    unsigned long refreshInterval = HOME_REFRESH_INTERVAL;  // 默认值
    
    switch (currentPage) {
        case PAGE_HOME:
            refreshInterval = HOME_REFRESH_INTERVAL;
            if (hour != lastHour || minute != lastMinute || second != lastSecond) {
                needRefresh = true;
                lastHour = hour;
                lastMinute = minute;
                lastSecond = second;
                Serial.println("[刷新] 时间变化，刷新首页");
            }
            if (battery_level != lastBatteryLevel) {
                needRefresh = true;
                lastBatteryLevel = battery_level;
                Serial.printf("[刷新] 电量变化: %d%%, 刷新首页\n", battery_level);
            }
            break;
            
        case PAGE_NAV:           
            // 导航页：位置变化 或 间隔2秒
            {
                bool timeToRefresh = (now - lastNavRefreshTime >= NAV_REFRESH_INTERVAL);  // 2秒到了

                if (timeToRefresh) {
                    needRefresh = true;
                    lastNavRefreshTime = now;
                }
            }
            break;
            
        case PAGE_HEALTH:       
            refreshInterval = HEALTH_REFRESH_INTERVAL;
            if (heartRate != lastHeartRate || spo2 != lastSpO2) {
                needRefresh = true;
                lastHeartRate = heartRate;
                lastSpO2 = spo2;
                Serial.printf("[刷新] 健康数据变化: HR=%d, SpO2=%d%%, 刷新健康页\n", 
                         heartRate, spo2);
            }
            break;
    }
    
    // 检查时间间隔是否需要强制刷新
    if (!needRefresh && (now - lastPageRenderTime >= refreshInterval)) {
        needRefresh = true;
        Serial.printf("[刷新] 定时刷新页面 %d (间隔 %lu ms)\n", currentPage, refreshInterval);
    }
    
    // 如果需要刷新，则重绘
    if (needRefresh) {
        if (spiMutex && xSemaphoreTake(spiMutex, pdMS_TO_TICKS(100)) == pdTRUE) {

            // 1. 先清除整个屏幕
            gfx->fillScreen(RGB565_BLACK);
            
            switch (currentPage) {
                case PAGE_HOME:
                    drawHomePage();
                    break;
                case PAGE_NAV:
                    drawNavPage();
                    break;
                case PAGE_HEALTH:
                    drawHealthPage();
                    break;
            }
            xSemaphoreGive(spiMutex);
            
            lastPageRenderTime = now;
            needRedraw = false;
        }
    }
    
    lastActivityTime = now;
}

void SimpleDisplayManager::drawStatusBar() {
    const int TOP_PADDING = 30;
    const int SIDE_PADDING = 10;
    
    gfx->fillRect(SIDE_PADDING, 0, SCREEN_WIDTH - SIDE_PADDING * 2, 30, RGB565_BLACK);
    drawWiFiIcon(SIDE_PADDING + 10, TOP_PADDING);
    
    char time_str[10];
    snprintf(time_str, sizeof(time_str), "%02d:%02d", hour, minute);
    gfx->setCursor(SCREEN_WIDTH - 90 - SIDE_PADDING, TOP_PADDING);
    gfx->setTextColor(RGB565_WHITE);
    gfx->setTextSize(2);
    gfx->print(time_str);
    
    drawBatteryIcon(SCREEN_WIDTH - 30 - SIDE_PADDING, TOP_PADDING);
}

void SimpleDisplayManager::drawWiFiIcon(int x, int y) {
    if (!wifi_connected) {
        gfx->drawLine(x, y+10, x+15, y+10, RGB565_RED);
        return;
    }
    gfx->fillCircle(x + 8, y + 10, 2, RGB565_WHITE);
    for (int i = 0; i < 3; i++) {
        gfx->drawCircle(x + 8, y + 10, 5 + i * 4, RGB565_WHITE);
    }
}

void SimpleDisplayManager::drawBatteryIcon(int x, int y) {
    gfx->drawRect(x, y, 25, 12, RGB565_WHITE);
    gfx->fillRect(x + 25, y + 3, 3, 6, RGB565_WHITE);
    
    int fillWidth = (battery_level * 23) / 100;
    uint16_t color = RGB565_GREEN;
    if (battery_level < 20) color = RGB565_RED;
    else if (battery_level < 50) color = RGB565_YELLOW;
    gfx->fillRect(x + 1, y + 1, fillWidth, 10, color);
}

void SimpleDisplayManager::drawHomePage() {
    char timeStr[20];
    char dateStr[20];
    snprintf(timeStr, sizeof(timeStr), "%02d:%02d", hour, minute);
    snprintf(dateStr, sizeof(dateStr), "%02d/%02d", day, month);
    
    gfx->setTextSize(4);
    gfx->setCursor(40, 80);
    gfx->setTextColor(RGB565_WHITE);
    gfx->print("Elderly");
    
    gfx->setTextSize(4);
    gfx->setCursor(65, 120);
    gfx->setTextColor(RGB565_WHITE);
    gfx->print("Homes");

    gfx->setTextSize(4);
    gfx->setCursor(65, 180);
    gfx->setTextColor(RGB565_WHITE);
    gfx->print(timeStr);
    
    gfx->setTextSize(3);
    gfx->setCursor(80, 240);
    gfx->print(dateStr);
    
    drawStatusBar();
    drawSideButtons();

}

void SimpleDisplayManager::drawNavPage() {
    if (!map_loaded || !fullMapBuffer) {
        gfx->fillScreen(RGB565_BLACK);
        gfx->setCursor(20, 100);
        gfx->setTextSize(2);
        gfx->setTextColor(RGB565_WHITE);
        gfx->print("Loading map...");
        drawStatusBar();
        drawSideButtons();
        return;
    }
    
    // ========== 跟随模式：以当前位置为中心显示地图 ==========
    
    // 1. 计算当前位置对应的像素坐标
    int current_pixel_x = (int)(current_x / MAP_REAL_WIDTH * MAP_PIXEL_WIDTH);
    int current_pixel_y = (int)(current_y / MAP_REAL_HEIGHT * MAP_PIXEL_HEIGHT);
    
    // 2. 计算视口起始像素（屏幕中心对准当前位置）
    int start_x = current_pixel_x - SCREEN_WIDTH / 2;
    int start_y = current_pixel_y - SCREEN_HEIGHT / 2;
    
    // 3. 边界限制（不超出地图范围）
    start_x = constrain(start_x, 0, MAP_PIXEL_WIDTH - SCREEN_WIDTH);
    start_y = constrain(start_y, 0, MAP_PIXEL_HEIGHT - SCREEN_HEIGHT);
    
    // 4. 绘制地图（从计算出的位置开始）
    for (int y = 0; y < SCREEN_HEIGHT; y++) {
        int mapY = start_y + y;
        if (mapY >= MAP_PIXEL_HEIGHT) break;
        uint32_t srcIndex = mapY * MAP_PIXEL_WIDTH + start_x;
        gfx->draw16bitRGBBitmap(0, y, &fullMapBuffer[srcIndex], SCREEN_WIDTH, 1);
    }
    
    // 5. 绘制当前位置标记（屏幕中心）
    int screen_center_x = SCREEN_WIDTH / 2;
    int screen_center_y = SCREEN_HEIGHT / 2;
    
    // 外圈白色，内圈红色
    gfx->fillCircle(screen_center_x, screen_center_y, 10, RGB565_RED);
    gfx->fillCircle(screen_center_x, screen_center_y, 6, RGB565_WHITE);
    gfx->fillCircle(screen_center_x, screen_center_y, 3, RGB565_RED);
    
    // 6. 绘制状态栏和按钮
    drawStatusBar();
    drawSideButtons();
}

void SimpleDisplayManager::drawHealthPage() {
    int yStart = 60;
    int lineHeight = 50;
    
    gfx->setTextSize(2);
    gfx->setTextColor(RGB565_WHITE);
    
    gfx->setCursor(30, yStart);
    gfx->printf("HR: %d bpm", heartRate);
    
    gfx->setCursor(30, yStart + lineHeight);
    gfx->printf("BP: %d/%d", bloodPressureHigh, bloodPressureLow);
    
    gfx->setCursor(30, yStart + lineHeight * 2);
    gfx->printf("SPO2: %d%%", spo2);
    
    gfx->setCursor(30, yStart + lineHeight * 3);
    gfx->printf("SLEEP: %d%%", sleepQuality);
    
    drawStatusBar();
    drawSideButtons();

}

void SimpleDisplayManager::drawSideButtons() {
    int rightX = SCREEN_WIDTH - 20;
    
    gfx->fillCircle(rightX, 90, 10, RGB565_RED);
    gfx->setCursor(rightX - 9, 87);
    gfx->setTextSize(1);
    gfx->setTextColor(RGB565_WHITE);
    gfx->print("SOS");
    
    // gfx->fillCircle(rightX, 230, 10, show_nav ? RGB565_GREEN : 0x3186);
    // gfx->setCursor(rightX - 9, 227);
    // gfx->print("NAV");
}

void SimpleDisplayManager::drawSOSPage() {
    // SOS 紧急页面
    static bool blink = false;
    static unsigned long lastBlinkTime = 0;
    
    unsigned long now = millis();
    if (now - lastBlinkTime > 500) {
        blink = !blink;
        lastBlinkTime = now;
    }
    
    if (blink) {
        gfx->fillScreen(RGB565_RED);
        gfx->setCursor(SCREEN_WIDTH/2 - 40, SCREEN_HEIGHT/2 - 30);
        gfx->setTextSize(4);
        gfx->setTextColor(RGB565_WHITE);
        gfx->print("SOS");
    } else {
        gfx->fillScreen(RGB565_BLACK);
        gfx->setCursor(SCREEN_WIDTH/2 - 40, SCREEN_HEIGHT/2);
        gfx->setTextSize(4);
        gfx->setTextColor(RGB565_RED);
        gfx->print("HELP");
    }
}

void SimpleDisplayManager::drawFallAlertPage() {
    if (!fallAlertActive) return;
    
    static bool blink = false;
    static unsigned long lastBlinkTime = 0;
    
    if (millis() - lastBlinkTime > 500) {
        blink = !blink;
        lastBlinkTime = millis();
    }

    if (blink) {
        gfx->fillScreen(RGB565_RED);
        gfx->setCursor(SCREEN_WIDTH/2 - 40, SCREEN_HEIGHT/2 - 30);
        gfx->setTextSize(4);
        gfx->setTextColor(RGB565_WHITE);
        gfx->print("FALL");
    } else {
        gfx->fillScreen(RGB565_BLACK);
        gfx->setCursor(SCREEN_WIDTH/2 - 40, SCREEN_HEIGHT/2);
        gfx->setTextSize(4);
        gfx->setTextColor(RGB565_RED);
        gfx->print("HELP");
    }
    
    if (millis() - fallAlertStartTime > 300000) {
        fallAlertActive = false;
    }
}

void SimpleDisplayManager::updateTouch() {
    if (!touch_enabled) return;
    
    uint16_t raw_x, raw_y;
    int16_t screen_x, screen_y;
    
    if (touch->readTouch(raw_x, raw_y)) {
        touch->mapToScreen(raw_x, raw_y, screen_x, screen_y, SCREEN_WIDTH, SCREEN_HEIGHT);
        
        if (!is_touching) {
            handleTouchPress(screen_x, screen_y);
        } else {
            handleTouchMove(screen_x, screen_y);
        }
    } else {
        if (is_touching) {
            handleTouchRelease(screen_x, screen_y);
        }
    }
}

void SimpleDisplayManager::handleTouchPress(int x, int y) {
    is_touching = true;
    touch_start_x = x;
    touch_start_y = y;
    touch_start_time = millis();
    touch_swipe_detected = false;
    wakeScreen();
}

void SimpleDisplayManager::handleTouchMove(int x, int y) {
    if (touch_swipe_detected) return;
    
    int dx = x - touch_start_x;
    int dy = y - touch_start_y;
    
    if (millis() - touch_start_time < SWIPE_TIMEOUT) {
        if (abs(dx) > SWIPE_THRESHOLD_X && abs(dx) > abs(dy)) {
            touch_swipe_detected = true;
            if (dx > 0) prevPage();
            else nextPage();
        }
    }
}

void SimpleDisplayManager::handleTouchRelease(int x, int y) {
    if (!touch_swipe_detected) {
        int dx = x - touch_start_x;
        int dy = y - touch_start_y;
        if (abs(dx) < 20 && abs(dy) < 20) {
            handleTap(x, y);
        }
    }
    is_touching = false;
}

void SimpleDisplayManager::handleTap(int x, int y) {
    int rightX = SCREEN_WIDTH - 40;
    
    if (x >= rightX - 20 && x <= rightX + 20 && y >= 85 && y <= 115) {
        sos_emergency_mode = !sos_emergency_mode;
        if (sos_emergency_mode) sos_start_time = millis();
        needRedraw = true;
        return;
    }
    
    if (x >= rightX - 20 && x <= rightX + 20 && y >= 145 && y <= 175) {
        show_nav = !show_nav;
        needRedraw = true;
        return;
    }
    
    if (!screenOn) wakeScreen();
}

void SimpleDisplayManager::updateScreenTimeout() {
    if (screenOn && millis() - lastActivityTime > SCREEN_TIMEOUT) {
        screenOn = false;
        if (spiMutex && xSemaphoreTake(spiMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
            gfx->fillScreen(RGB565_BLACK);
            xSemaphoreGive(spiMutex);
        }
    }
}

void SimpleDisplayManager::setTime(uint8_t h, uint8_t m, uint8_t s) {
    hour = h; minute = m; second = s;
    needRedraw = true;
}

void SimpleDisplayManager::setDate(uint16_t y, uint8_t mon, uint8_t d) {
    year = y; month = mon; day = d;
    needRedraw = true;
}

void SimpleDisplayManager::setStatus(const char* status) {
    strncpy(status_str, status, sizeof(status_str)-1);
    needRedraw = true;
}

void SimpleDisplayManager::setCurrentPosition(float x, float y) {
    current_x = constrain(x, 0, MAP_REAL_WIDTH);
    current_y = constrain(y, 0, MAP_REAL_HEIGHT);
    needRedraw = true;
}

void SimpleDisplayManager::showSOS(bool active) {
    if (active) {
        // 立即显示 SOS 画面
        sos_emergency_mode = true;
        alarmDisplayActive = true;
        alarmTriggerTime = millis();
        alarmReportPending = true;  // 等待上报
        lastBlinkTime = 0;
        blinkState = false;
        Serial.println("[SOS] 触发，立即显示画面，5秒后上报");
    } else {
        // 取消 SOS
        sos_emergency_mode = false;
        alarmDisplayActive = false;
        alarmReportPending = false;
        Serial.println("[SOS] 已取消");
    }
}

void SimpleDisplayManager::showFallAlert(bool active) {
    if (active) {
        // 立即显示跌倒画面
        fallAlertActive = true;
        alarmDisplayActive = true;
        alarmTriggerTime = millis();
        alarmReportPending = true;  // 等待上报
        lastBlinkTime = 0;
        blinkState = false;
        Serial.println("[FALL] 触发，立即显示画面，5秒后上报");
    } else {
        // 取消跌倒
        fallAlertActive = false;
        alarmDisplayActive = false;
        alarmReportPending = false;
        Serial.println("[FALL] 已取消");
    }
}

void SimpleDisplayManager::setTargetPosition(float x, float y) {
    target_x = constrain(x, 0, MAP_REAL_WIDTH);
    target_y = constrain(y, 0, MAP_REAL_HEIGHT);
    needRedraw = true;
}

void SimpleDisplayManager::setTargetPosition(float x, float y, const char* name) {
    target_x = constrain(x, 0, MAP_REAL_WIDTH);
    target_y = constrain(y, 0, MAP_REAL_HEIGHT);
    if (name) strncpy(target_name, name, sizeof(target_name)-1);
    needRedraw = true;
}

void SimpleDisplayManager::setWiFiStatus(bool connected, int rssi) {
    wifi_connected = connected;
    wifi_rssi = rssi;
    needRedraw = true;
}

void SimpleDisplayManager::setBatteryLevel(int level) {
    battery_level = constrain(level, 0, 100);
    needRedraw = true;
}

void SimpleDisplayManager::updateHealthData(int hr, int bph, int bpl, int spo, int sleep) {
    heartRate = hr;
    bloodPressureHigh = bph;
    bloodPressureLow = bpl;
    spo2 = spo;
    sleepQuality = sleep;
    needRedraw = true;
}

void SimpleDisplayManager::nextPage() {
    pageManager.nextPage();
    wakeScreen();
    needRedraw = true;
}

void SimpleDisplayManager::prevPage() {
    pageManager.prevPage();
    wakeScreen();
    needRedraw = true;
}

void SimpleDisplayManager::switchToHomePage() {
    pageManager.setPage(PAGE_HOME);
    wakeScreen();
    needRedraw = true;
}

void SimpleDisplayManager::switchToNavPage() {
    pageManager.setPage(PAGE_NAV);
    wakeScreen();
    needRedraw = true;
}

void SimpleDisplayManager::switchToHealthPage() {
    pageManager.setPage(PAGE_HEALTH);
    wakeScreen();
    needRedraw = true;
}

ScreenPage SimpleDisplayManager::getCurrentPage() {
    return pageManager.getCurrentPage();
}

void SimpleDisplayManager::wakeScreen() {
    if (!screenOn) {
        screenOn = true;
        lastActivityTime = millis();
        needRedraw = true;
    }

}

String SimpleDisplayManager::getWeekday() {
    const char* weekdays[] = {"Sunday", "Monday", "February", "Wednesday", "Thursday", "Friday", "Saturday"};
    return weekdays[0];
}