#include "SimpleDisplayManager.h"
#include "NavigationManager.h"
#include "pin_config.h"
#include "DataTransmitter.h"
#if ENABLE_FALL_DETECTION
#include "FallDetection.h"
#endif
#include "AudioManager.h"
#include "MyNetworkManager.h"
#include "VibrationManager.h"
#include "FlightInfoManager.h"
#include "SmartNavigationPlanner.h"
#include <SD_MMC.h>
#include <TJpg_Decoder.h>

extern DataTransmitter* data_transmitter;
#if ENABLE_FALL_DETECTION
extern FallDetection* fall_detector;
#endif
extern BLELocation* ble_location;

SimpleDisplayManager* SimpleDisplayManager::instance = nullptr;

static String formatGateLabel(const String& gate) {
    String normalized = gate;
    normalized.trim();
    normalized.toUpperCase();

    if (normalized == "10" || normalized == "A10" || normalized == "GATE10" || normalized == "GATE 10") {
        return "Gate 10";
    }
    if (normalized == "11" || normalized == "A11" || normalized == "GATE11" || normalized == "GATE 11") {
        return "Gate 11";
    }
    return gate;
}

static int textWidthPx(const String& text, int textSize) {
    return text.length() * 6 * textSize;
}

static String ellipsizeText(String text, int maxWidth, int textSize) {
    text.trim();
    int charWidth = 6 * textSize;
    if (charWidth <= 0 || textWidthPx(text, textSize) <= maxWidth) return text;

    int maxChars = maxWidth / charWidth;
    if (maxChars <= 0) return "";
    if (maxChars <= 3) return text.substring(0, maxChars);
    return text.substring(0, maxChars - 3) + "...";
}

static int fittingTextSize(const String& text, int maxWidth, int preferredSize, int minSize = 1) {
    for (int size = preferredSize; size >= minSize; size--) {
        if (textWidthPx(text, size) <= maxWidth) return size;
    }
    return minSize;
}

static void drawFittedText(Arduino_GFX* gfx, int x, int y, const String& text,
                           int maxWidth, uint16_t color, int preferredSize, int minSize = 1) {
    int textSize = fittingTextSize(text, maxWidth, preferredSize, minSize);
    gfx->setTextSize(textSize);
    gfx->setTextColor(color);
    gfx->setCursor(x, y);
    gfx->print(ellipsizeText(text, maxWidth, textSize));
}

static void drawCenteredFittedText(Arduino_GFX* gfx, int x, int y, int width,
                                   const String& text, uint16_t color,
                                   int preferredSize, int minSize = 1) {
    int textSize = fittingTextSize(text, width, preferredSize, minSize);
    String fitted = ellipsizeText(text, width, textSize);
    int textX = x + max(0, (width - textWidthPx(fitted, textSize)) / 2);
    gfx->setTextSize(textSize);
    gfx->setTextColor(color);
    gfx->setCursor(textX, y);
    gfx->print(fitted);
}

static String compactPlaceLabel(const String& label) {
    String key = SmartNavigationPlanner::normalizeKey(label);
    if (key == "CUSTOMERSERVICES") return "Customer Svc";
    if (key == "SECURITY") return "Security";
    if (key == "CUSTOMS") return "Immigration";
    if (key == "GATE10") return "Gate 10";
    if (key == "GATE11") return "Gate 11";
    if (key == "CHECKIN") return "Check-in";
    if (key == "TOILET") return "Toilet";
    String cleaned = label;
    cleaned.trim();
    return cleaned.length() > 0 ? cleaned : "Destination";
}

static String compactStepAction(const String& instruction) {
    String value = instruction;
    value.trim();
    value.toLowerCase();
    if (value == "go_straight" || value == "go straight") return "Straight";
    if (value == "turn_left" || value == "turn left") return "Left";
    if (value == "turn_right" || value == "turn right") return "Right";
    if (value == "arrive") return "Arrive";
    if (value == "go to") return "Go";
    return instruction.length() > 0 ? instruction : "Next";
}

static void drawStepIcon(Arduino_GFX* gfx, int x, int y, int index, const String& action, bool active) {
    uint16_t dotColor = active ? 0x001F : 0x2104;
    gfx->fillCircle(x, y, active ? 9 : 7, dotColor);
    gfx->setTextSize(1);
    gfx->setTextColor(RGB565_WHITE);
    gfx->setCursor(x - 3, y - 4);
    gfx->print(String(index));

    int arrowX = x + 24;
    uint16_t arrowColor = active ? 0x07E0 : 0x528A;
    if (action == "Left") {
        gfx->fillTriangle(arrowX + 5, y - 7, arrowX + 5, y + 7, arrowX - 7, y, arrowColor);
    } else if (action == "Right") {
        gfx->fillTriangle(arrowX - 5, y - 7, arrowX - 5, y + 7, arrowX + 7, y, arrowColor);
    } else if (action == "Arrive") {
        gfx->fillCircle(arrowX, y, 6, arrowColor);
        gfx->fillCircle(arrowX, y, 2, RGB565_BLACK);
    } else {
        gfx->fillTriangle(arrowX - 7, y + 5, arrowX + 7, y + 5, arrowX, y - 7, arrowColor);
    }
}

static int drawWrappedText(Arduino_GFX* gfx, int x, int y, int maxWidth,
                           const String& text, uint16_t color, int textSize,
                           int lineHeight, int maxLines) {
    String remaining = text;
    remaining.replace('\n', ' ');
    remaining.trim();
    int maxChars = max(1, maxWidth / (6 * textSize));
    int lines = 0;
    gfx->setTextSize(textSize);
    gfx->setTextColor(color);

    while (remaining.length() > 0 && lines < maxLines) {
        int take = min(maxChars, (int)remaining.length());
        String line = remaining.substring(0, take);
        if (take < (int)remaining.length()) {
            int breakAt = line.lastIndexOf(' ');
            if (breakAt >= 5) {
                line = line.substring(0, breakAt);
                take = breakAt + 1;
            }
        }
        line.trim();
        if (lines == maxLines - 1 && take < (int)remaining.length()) {
            line = ellipsizeText(line + "...", maxWidth, textSize);
        }
        gfx->setCursor(x, y + lines * lineHeight);
        gfx->print(line);
        remaining = remaining.substring(take);
        remaining.trim();
        lines++;
    }
    return lines;
}

// 静态 JPEG 回调函数
bool SimpleDisplayManager::jpegCallback(int16_t x, int16_t y, uint16_t w, uint16_t h, uint16_t* bitmap) {
    SimpleDisplayManager* self = instance;
    if (self && self->fullMapBuffer) {
        for (int i = 0; i < h; i++) {
            int dstY = y + i;
            if (dstY >= MAP_PIXEL_HEIGHT) continue;
            uint32_t dstOffset = dstY * MAP_PIXEL_WIDTH + x;
            memcpy(&self->fullMapBuffer[dstOffset], &bitmap[i * w], w * 2);
        }
    }
    return true;
}

// ================ BMP 加载函数 ================
bool SimpleDisplayManager::loadBMP(const char* filename) {
    Serial.printf("加载 BMP: %s\n", filename);
    
    if (!SD_MMC.exists(filename)) {
        Serial.printf("❌ 文件不存在: %s\n", filename);
        return false;
    }
    
    File bmpFile = SD_MMC.open(filename, FILE_READ);
    if (!bmpFile) {
        Serial.println("❌ 无法打开文件");
        return false;
    }
    
    // 读取 BMP 头
    uint8_t header[54];
    if (bmpFile.read(header, 54) != 54) {
        Serial.println("❌ 读取 BMP 头失败");
        bmpFile.close();
        return false;
    }
    
    // 检查 BMP 标识
    if (header[0] != 'B' || header[1] != 'M') {
        Serial.println("❌ 不是有效的 BMP 文件");
        bmpFile.close();
        return false;
    }
    
    int bmpWidth = *(int*)&header[18];
    int bmpHeight = *(int*)&header[22];
    int bitsPerPixel = *(short*)&header[28];
    int dataOffset = *(int*)&header[10];
    
    Serial.printf("BMP 信息: %dx%d, %d位\n", bmpWidth, bmpHeight, bitsPerPixel);
    
    if (bmpWidth != MAP_PIXEL_WIDTH || bmpHeight != MAP_PIXEL_HEIGHT) {
        Serial.printf("❌ 尺寸不匹配: 需要 %dx%d\n", MAP_PIXEL_WIDTH, MAP_PIXEL_HEIGHT);
        bmpFile.close();
        return false;
    }
    
    // 分配内存
    size_t mapSize = MAP_PIXEL_WIDTH * MAP_PIXEL_HEIGHT * 2;
    if (psramFound()) {
        fullMapBuffer = (uint16_t*)ps_malloc(mapSize);
        Serial.println("使用 PSRAM 分配");
    } else {
        fullMapBuffer = (uint16_t*)malloc(mapSize);
        Serial.println("使用内部 RAM 分配");
    }
    
    if (!fullMapBuffer) {
        Serial.println("❌ 内存分配失败");
        bmpFile.close();
        return false;
    }
    
    // 读取像素数据
    int rowSize = ((bmpWidth * bitsPerPixel / 8) + 3) & ~3;
    bmpFile.seek(dataOffset);
    
    for (int y = 0; y < MAP_PIXEL_HEIGHT; y++) {
        int bmpY = MAP_PIXEL_HEIGHT - 1 - y;
        uint8_t* rowBuffer = (uint8_t*)malloc(rowSize);
        if (!rowBuffer) {
            free(fullMapBuffer);
            fullMapBuffer = nullptr;
            bmpFile.close();
            return false;
        }
        
        bmpFile.seek(dataOffset + bmpY * rowSize);
        bmpFile.read(rowBuffer, rowSize);
        
        for (int x = 0; x < MAP_PIXEL_WIDTH; x++) {
            uint8_t b = rowBuffer[x * 3 + 0];
            uint8_t g = rowBuffer[x * 3 + 1];
            uint8_t r = rowBuffer[x * 3 + 2];
            uint16_t rgb565 = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
            fullMapBuffer[y * MAP_PIXEL_WIDTH + x] = rgb565;
        }
        
        free(rowBuffer);
        
        if ((y + 1) % 100 == 0) {
            Serial.printf("加载进度: %d/%d\n", y + 1, MAP_PIXEL_HEIGHT);
        }
    }
    
    bmpFile.close();
    digitalWrite(43, HIGH);
    map_loaded = true;
    Serial.println("✅ BMP 加载完成");
    return true;
}

// ================ initMap 函数 ================
bool SimpleDisplayManager::initMap(const char* filename) {
    String fn = filename;
    fn.toLowerCase();

    pinMode(43, OUTPUT);      // 设置 GPIO43 为输出模式
    digitalWrite(43, LOW);   // 输出低电平，使能 SD 卡供电
    delay(100);

    if (fn.endsWith(".bmp")) {
        return loadBMP(filename);
    }
    Serial.printf("[Map] unsupported map format: %s\n", filename);
    return false;
}

// ================ 构造函数 ================
SimpleDisplayManager::SimpleDisplayManager(Arduino_GFX* display) : gfx(display) {
    instance = this;
    fullMapBuffer = nullptr;
    screenBuffer = nullptr;
    imu = nullptr;
    vibration = nullptr;
    map_loaded = false;
    isLoading = false;
    needRedraw = true;
    screenOn = true;
    lastActivityTime = millis();
    wristRaised = false;
    lastAccelZ = 0;
    flightInfo.valid = false;
    flightInfo.delay_minutes = 0;
    flight_info_visible = true;
    
    // 初始化刷新控制变量
    lastPageRenderTime = 0;
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

// ================ init 函数 ================
bool SimpleDisplayManager::init() {
    Serial.println("初始化显示管理器...");
    
    size_t screenSize = SCREEN_WIDTH * SCREEN_HEIGHT * 2;
    if (psramFound()) {
        screenBuffer = (uint16_t*)ps_malloc(screenSize);
        Serial.println("使用 PSRAM 分配屏幕缓冲");
    } else {
        screenBuffer = (uint16_t*)malloc(screenSize);
        Serial.println("使用内部 RAM 分配屏幕缓冲");
    }
    
    if (!screenBuffer) {
        Serial.println("❌ 屏幕缓冲分配失败");
        return false;
    }
    
    memset(screenBuffer, 0, screenSize);
    
    if (spiMutex && xSemaphoreTake(spiMutex, pdMS_TO_TICKS(1000)) == pdTRUE) {
        gfx->fillScreen(RGB565_BLACK);
        gfx->setCursor(10, 10);
        gfx->setTextColor(RGB565_WHITE);
        gfx->print("Display Ready");
        xSemaphoreGive(spiMutex);
    }
    
    Serial.println("✅ 显示管理器初始化完成");
    return true;
}

// ================ update 函数 ================
void SimpleDisplayManager::update() {
    extern DataTransmitter* data_transmitter;
#if ENABLE_FALL_DETECTION
    extern FallDetection* fall_detector;
#endif
    
    unsigned long now = millis();
    
    // 实时更新时间
    static unsigned long lastTimeUpdate = 0;
    if (now - lastTimeUpdate >= 1000) {
        struct tm timeinfo;
        if (getLocalTime(&timeinfo)) {
            hour = timeinfo.tm_hour;
            minute = timeinfo.tm_min;
        }
        lastTimeUpdate = now;
    }
    
    // 1. 抬手检测
    checkWristRaise();
    updateScreenTimeout();
    
    // 2. 紧急报警
    if (sos_emergency_mode || (ENABLE_FALL_DETECTION && fallAlertActive)) {
        handleEmergencyDisplay();
        
        if (alarmReportPending) {
            unsigned long elapsed = now - alarmTriggerTime;
            if (elapsed >= ALARM_REPORT_DELAY) {
                alarmReportPending = false;
                Serial.println("[报警] 15秒已到，执行上报");
                
                if (sos_emergency_mode && data_transmitter) {
                    data_transmitter->setSOSActive(true, "Button");
#if ENABLE_FALL_DETECTION
                } else if (fallAlertActive && data_transmitter && fall_detector) {
                    FallEvent event = fall_detector->getFallEvent();
                    data_transmitter->transmitFallAlert(event);
#endif
                }
            }
        }
        lastActivityTime = now;
        return;
    }
    
    // 3. BLE 扫描
    if (now - lastBLEScan >= BLE_SCAN_INTERVAL || bleScanNeeded) {
        if (ble_location) {
            Location loc = ble_location->getLocation();
            if (loc.beacon_count > 0) {
                current_x = loc.x;
                current_y = loc.y;
            }
        }
        lastBLEScan = now;
        bleScanNeeded = false;
    }
    
    // 4. 数据上传
    if (now - lastUpload >= UPLOAD_INTERVAL || uploadNeeded) {
        // DataTransmitter owns periodic telemetry on the Network task.
        lastUpload = now;
        uploadNeeded = false;
    }
    
    if (!screenOn) return;
    
    // 如果有弹窗，优先显示弹窗
    if (popupActive) {
        unsigned long autoCloseMs = (currentPopupType == POPUP_ARRIVAL) ? POPUP_ARRIVAL_AUTO_CLOSE_MS : POPUP_AUTO_CLOSE_MS;
        if (millis() - popupStartTime >= autoCloseMs) {
            bool wasArrival = (currentPopupType == POPUP_ARRIVAL);
            hidePopup();
            if (wasArrival) {
                pageManager.setPage(PAGE_NAV);
                needRedraw = true;
            }
            return;
        }
        if (popupNeedsRedraw && spiMutex && xSemaphoreTake(spiMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
            drawPopup();
            xSemaphoreGive(spiMutex);
            popupNeedsRedraw = false;
        }
        return;  // 弹窗时不需要更新其他页面
    }

    if (destinationPickerActive) {
        if (updateDestinationPickerAutoConfirm()) {
            return;
        }
        if (needRedraw && spiMutex && xSemaphoreTake(spiMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
            drawDestinationPicker();
            xSemaphoreGive(spiMutex);
            needRedraw = false;
        }
        return;
    }

    // 5. 画面更新
    // 6. 页面显示刷新
    ScreenPage currentPage = pageManager.getCurrentPage();
    unsigned long refreshInterval = HOME_DISPLAY_INTERVAL;
    
    switch (currentPage) {
        case PAGE_HOME: refreshInterval = HOME_DISPLAY_INTERVAL; break;
        case PAGE_NAV: refreshInterval = NAV_DISPLAY_INTERVAL; break;
        case PAGE_FLIGHT: refreshInterval = FLIGHT_DISPLAY_INTERVAL; break;
        default: break;
    }
    
    bool needRefresh = needRedraw;
    
    switch (currentPage) {
        case PAGE_HOME:
            if (hour != lastHour || minute != lastMinute) {
                needRefresh = true;
                lastHour = hour; lastMinute = minute;
            }
            break;
        case PAGE_NAV:
            if (fabs(current_x - lastNavX) >= 0.15f ||
                fabs(current_y - lastNavY) >= 0.15f) {
                needRefresh = true;
                lastNavX = current_x;
                lastNavY = current_y;
            }
            break;
        case PAGE_FLIGHT:
            break;
        default: break;
    }
    
    if (!needRefresh && currentPage != PAGE_NAV && (now - lastPageRenderTime >= refreshInterval)) {
        needRefresh = true;
    }
    
    if (needRefresh) {
        if (spiMutex && xSemaphoreTake(spiMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
            switch (currentPage) {
                case PAGE_HOME: drawHomePage(); break;
                case PAGE_NAV: drawNavPage(); break;
                case PAGE_FLIGHT: drawFlightPage(); break;
                default: break;
            }
            xSemaphoreGive(spiMutex);
            lastPageRenderTime = now;
            needRedraw = false;
        }
    }
    
    lastActivityTime = now;
}

// ================ drawNavPage 函数 ================
void SimpleDisplayManager::drawNavPage() {
    Serial.println("\n========== drawNavPage 被调用 ==========");
    
    extern NavigationManager* navManager;
    bool hasActiveNav = (navManager && navManager->isActive());
    
    Serial.printf("hasActiveNav: %d\n", hasActiveNav);
    
    if (navManager) {
        const NavDisplayInfo& info = navManager->getDisplayInfo();
        Serial.printf("stepCount: %d, currentDistance: %.1f\n", info.stepCount, info.currentDistance);
        Serial.printf("targetGate: %s\n", info.targetGate.c_str());
    }

    if (!map_loaded || !fullMapBuffer) {
        gfx->fillScreen(RGB565_BLACK);
        gfx->setCursor(20, 100);
        gfx->setTextSize(2);
        gfx->setTextColor(RGB565_WHITE);
        gfx->print("Map not ready");
        drawSideButtons();
        return;
    }
    
    if (!hasActiveNav) {
        // ========== 无导航：显示全屏地图 ==========
        gfx->fillScreen(RGB565_BLACK);
        
        // 全屏地图
        int mapHeight = SCREEN_HEIGHT;
        int mapY = 0;
        
        // 计算地图视口（玩家居中）
        int playerPixelX = (int)(current_x / MAP_REAL_WIDTH * MAP_PIXEL_WIDTH);
        int playerPixelY = (int)(current_y / MAP_REAL_HEIGHT * MAP_PIXEL_HEIGHT);
        
        int startX = playerPixelX - SCREEN_WIDTH / 2;
        int startY = playerPixelY - mapHeight / 2;
        
        startX = constrain(startX, 0, MAP_PIXEL_WIDTH - SCREEN_WIDTH);
        startY = constrain(startY, 0, MAP_PIXEL_HEIGHT - mapHeight);
        
        // 复制地图数据
        for (int y = 0; y < mapHeight; y++) {
            int mapYcoord = startY + y;
            if (mapYcoord >= MAP_PIXEL_HEIGHT) break;
            uint32_t srcIndex = mapYcoord * MAP_PIXEL_WIDTH + startX;
            uint32_t dstIndex = y * SCREEN_WIDTH;
            memcpy(&screenBuffer[dstIndex], &fullMapBuffer[srcIndex], SCREEN_WIDTH * 2);
        }
        
        // 绘制玩家标记
        int playerX = playerPixelX - startX;
        int playerY = playerPixelY - startY;
        playerX = constrain(playerX, 10, SCREEN_WIDTH - 10);
        playerY = constrain(playerY, 10, mapHeight - 10);
                
        // 显示地图
        gfx->draw16bitRGBBitmap(0, mapY, screenBuffer, SCREEN_WIDTH, mapHeight);
        
        // 显示提示文字
        gfx->fillRect(SCREEN_WIDTH/2 - 80, SCREEN_HEIGHT - 30, 160, 20, 0x0000);
        gfx->setCursor(SCREEN_WIDTH/2 - 60, SCREEN_HEIGHT - 25);
        gfx->setTextSize(1);
        gfx->setTextColor(0x528A);
        gfx->print("No active navigation");

        drawPlayerMarker(playerX, playerY);

    } else {
        // ========== 有导航：50%地图 + 50%导航信息 ==========
        const NavDisplayInfo& navInfo = navManager->getDisplayInfo();
        
        int mapHeight = SCREEN_HEIGHT / 2;
        int mapY = 0;
        
        // 计算地图视口
        int startX, startY, playerX, playerY;
        if (navInfo.active && navInfo.currentDistance > 0) {
            calculateMapViewByDirection(startX, startY, playerX, playerY, mapHeight, navInfo);
        } else {
            calculateMapViewCentered(startX, startY, playerX, playerY, mapHeight);
        }
        
        // 复制地图数据
        for (int y = 0; y < mapHeight; y++) {
            int mapYcoord = startY + y;
            if (mapYcoord >= MAP_PIXEL_HEIGHT) break;
            uint32_t srcIndex = mapYcoord * MAP_PIXEL_WIDTH + startX;
            uint32_t dstIndex = y * SCREEN_WIDTH;
            memcpy(&screenBuffer[dstIndex], &fullMapBuffer[srcIndex], SCREEN_WIDTH * 2);
        }
        
        gfx->draw16bitRGBBitmap(0, mapY, screenBuffer, SCREEN_WIDTH, mapHeight);
        gfx->drawRect(0, mapY, SCREEN_WIDTH, mapHeight, RGB565_WHITE);

        // ========== ⭐ 关键：绘制导航路径 ==========
        drawNavigationPath(startX, startY, playerX, playerY, mapY, mapHeight);
        
        // 绘制玩家标记
        drawPlayerMarker(playerX, playerY);
        
        // 绘制目标标记
        int targetPixelX = (int)(navInfo.targetX / MAP_REAL_WIDTH * MAP_PIXEL_WIDTH);
        int targetPixelY = (int)(navInfo.targetY / MAP_REAL_HEIGHT * MAP_PIXEL_HEIGHT);
        int targetScreenX = targetPixelX - startX;
        int targetScreenY = targetPixelY - startY;
        
        if (targetScreenX >= 0 && targetScreenX < SCREEN_WIDTH && 
            targetScreenY >= 0 && targetScreenY < mapHeight) {
            drawTargetMarker(targetScreenX, targetScreenY, navInfo.targetGate);
        }
        
        // 下半部分：导航信息
        int infoY = mapHeight;
        int infoHeight = SCREEN_HEIGHT - mapHeight;
        
        gfx->fillRect(0, infoY, SCREEN_WIDTH, infoHeight, RGB565_BLACK);
        gfx->drawLine(0, infoY, SCREEN_WIDTH, infoY, 0x3186);
        
        // 显示登机口
        drawGateDisplay(navInfo.targetGate, navInfo.currentDistance);
        
        // 显示导航指引
        drawNavigationGuides(navInfo);
        
        // 显示进度条
        drawProgressBar(infoY + infoHeight - 20, navInfo.pathProgress);
    }
    
    drawSideButtons();
}

void SimpleDisplayManager::calculateMapViewByDirection(int& startX, int& startY, 
                                                        int& playerX, int& playerY,
                                                        int mapHeight,
                                                        const NavDisplayInfo& navInfo) {
    int playerPixelX = (int)(current_x / MAP_REAL_WIDTH * MAP_PIXEL_WIDTH);
    int playerPixelY = (int)(current_y / MAP_REAL_HEIGHT * MAP_PIXEL_HEIGHT);
    
    String dir = navInfo.currentDirection;
    
    // 根据导航方向决定玩家在地图上的位置
    if (dir == "北" || dir == "东北" || dir == "西北") {
        // 朝北方向：玩家放在底部
        playerX = SCREEN_WIDTH / 2;
        playerY = mapHeight - 25;
        startX = playerPixelX - SCREEN_WIDTH / 2;
        startY = playerPixelY - (mapHeight - 35);
    } 
    else if (dir == "南" || dir == "东南" || dir == "西南") {
        // 朝南方向：玩家放在顶部
        playerX = SCREEN_WIDTH / 2;
        playerY = 25;
        startX = playerPixelX - SCREEN_WIDTH / 2;
        startY = playerPixelY - 35;
    }
    else {
        // 其他方向：玩家放在中央
        playerX = SCREEN_WIDTH / 2;
        playerY = mapHeight / 2;
        startX = playerPixelX - SCREEN_WIDTH / 2;
        startY = playerPixelY - mapHeight / 2;
    }
    
    // 边界限制
    startX = constrain(startX, 0, MAP_PIXEL_WIDTH - SCREEN_WIDTH);
    startY = constrain(startY, 0, MAP_PIXEL_HEIGHT - mapHeight);
    
    // 重新计算玩家位置
    playerX = playerPixelX - startX;
    playerY = playerPixelY - startY;
    playerX = constrain(playerX, 10, SCREEN_WIDTH - 10);
    playerY = constrain(playerY, 10, mapHeight - 10);
}

void SimpleDisplayManager::drawNavigationGuides(const NavDisplayInfo& navInfo) {
    const int panelTop = SCREEN_HEIGHT / 2;
    const int leftX = 8;
    const int leftY = panelTop + 8;
    const int leftW = 136;
    const int leftH = 116;

    gfx->fillRoundRect(leftX, leftY, leftW, leftH, 8, 0x0841);
    gfx->drawRoundRect(leftX, leftY, leftW, leftH, 8, 0x3186);

    if (navInfo.stepCount <= 0) {
        drawFittedText(gfx, leftX + 10, leftY + 18, "Route ready", leftW - 20, RGB565_WHITE, 2, 1);
        drawFittedText(gfx, leftX + 10, leftY + 46, compactPlaceLabel(navInfo.targetGate), leftW - 20, 0x07FF, 1, 1);
        return;
    }

    for (int i = 0; i < navInfo.stepCount && i < 3; i++) {
        const NavStep& step = navInfo.steps[i];
        bool active = (i == 0);
        int rowY = leftY + 16 + i * 34;
        String action = compactStepAction(step.instruction);
        String target = compactPlaceLabel(step.targetPoint.length() > 0 ? step.targetPoint : navInfo.targetGate);
        String distanceText = String((int)round(step.distance)) + "m";

        drawStepIcon(gfx, leftX + 15, rowY + 7, i + 1, action, active);

        if (active) {
            int actionSize = action.length() <= 6 ? 2 : 1;
            drawFittedText(gfx, leftX + 42, rowY - 3, action, 58, RGB565_WHITE, actionSize, 1);
            drawFittedText(gfx, leftX + 102, rowY + 1, distanceText, 28, 0x07FF, 1, 1);
            drawFittedText(gfx, leftX + 42, rowY + 18, target, 86, 0x528A, 1, 1);
        } else {
            drawFittedText(gfx, leftX + 42, rowY, action, 56, RGB565_WHITE, 1, 1);
            drawFittedText(gfx, leftX + 102, rowY, distanceText, 28, 0x07FF, 1, 1);
            drawFittedText(gfx, leftX + 42, rowY + 13, target, 86, 0x528A, 1, 1);
        }
    }
}

void SimpleDisplayManager::drawDestinationPicker() {
    drawNavPage();
    gfx->fillRoundRect(10, 30, SCREEN_WIDTH - 20, SCREEN_HEIGHT - 58, 8, RGB565_BLACK);
    gfx->drawRoundRect(10, 30, SCREEN_WIDTH - 20, SCREEN_HEIGHT - 58, 8, RGB565_YELLOW);

    gfx->setTextColor(RGB565_WHITE);
    gfx->setTextSize(2);
    gfx->setCursor(14, 16);
    gfx->setCursor(20, 42);
    gfx->print("Choose destination");

    const int top = 66;
    const int itemHeight = 31;
    const int gap = 4;
    int count = SmartNavigationPlanner::destinationCount();

    for (int i = 0; i < count; i++) {
        const SmartDestination& destination = SmartNavigationPlanner::destinationAt(i);
        int y = top + i * (itemHeight + gap);
        bool selected = (i == selectedDestinationIndex);
        uint16_t border = selected ? RGB565_YELLOW : 0x3186;
        uint16_t fill = selected ? 0x2945 : 0x0000;
        uint16_t zoneColor = destination.zone == NAV_ZONE_PUBLIC ? 0x07FF : 0xFBE0;

        gfx->fillRoundRect(18, y, SCREEN_WIDTH - 36, itemHeight, 6, fill);
        gfx->drawRoundRect(18, y, SCREEN_WIDTH - 36, itemHeight, 6, border);
        String displayLabel = destination.label;
        if (displayLabel == "Customer Services") displayLabel = "Customer Svc";
        drawFittedText(gfx, 28, y + 6, displayLabel, SCREEN_WIDTH - 56, RGB565_WHITE, 2, 1);
        gfx->setCursor(28, y + 21);
        gfx->setTextSize(1);
        gfx->setTextColor(zoneColor);
        gfx->print(SmartNavigationPlanner::zoneName(destination.zone));
    }

    gfx->setTextSize(1);
    gfx->setTextColor(0x528A);
    gfx->setCursor(20, SCREEN_HEIGHT - 36);
    gfx->print("SOS: next destination");
    gfx->setCursor(20, SCREEN_HEIGHT - 24);
    gfx->print("Idle 5s: confirm  PWR: cancel");
}

void SimpleDisplayManager::drawGateDisplay(const String& gate, float distance) {
    String gateLabel = SmartNavigationPlanner::normalizeLabel(gate);
    String gateKey = SmartNavigationPlanner::normalizeKey(gate);
    String label = compactPlaceLabel(gateLabel);
    const int infoY = SCREEN_HEIGHT / 2;
    const int cardX = SCREEN_WIDTH - 86;
    const int cardY = infoY + 8;
    const int cardW = 78;
    const int cardH = 122;

    gfx->fillRoundRect(cardX, cardY, cardW, cardH, 8, 0x0000);
    gfx->drawRoundRect(cardX, cardY, cardW, cardH, 8, 0x07E0);

    drawCenteredFittedText(gfx, cardX + 4, cardY + 10, cardW - 8, "DEST", 0x07E0, 1, 1);

    if (gateKey == "GATE10" || gateKey == "GATE11") {
        String gateNo = gateKey == "GATE10" ? "10" : "11";
        drawCenteredFittedText(gfx, cardX + 4, cardY + 38, cardW - 8, "Gate", RGB565_WHITE, 1, 1);
        drawCenteredFittedText(gfx, cardX + 4, cardY + 55, cardW - 8, gateNo, RGB565_WHITE, 3, 2);
    } else if (gateKey == "CUSTOMERSERVICES") {
        drawCenteredFittedText(gfx, cardX + 4, cardY + 38, cardW - 8, "Customer", RGB565_WHITE, 1, 1);
        drawCenteredFittedText(gfx, cardX + 4, cardY + 56, cardW - 8, "Svc", RGB565_WHITE, 2, 1);
    } else if (gateKey == "SECURITY") {
        drawCenteredFittedText(gfx, cardX + 4, cardY + 38, cardW - 8, "Security", RGB565_WHITE, 1, 1);
        drawCenteredFittedText(gfx, cardX + 4, cardY + 56, cardW - 8, "Check", RGB565_WHITE, 2, 1);
    } else if (gateKey == "CHECKIN") {
        drawCenteredFittedText(gfx, cardX + 4, cardY + 38, cardW - 8, "Check", RGB565_WHITE, 2, 1);
        drawCenteredFittedText(gfx, cardX + 4, cardY + 62, cardW - 8, "In", RGB565_WHITE, 2, 1);
    } else if (label == "Immigration") {
        drawCenteredFittedText(gfx, cardX + 4, cardY + 48, cardW - 8, "Immigr.", RGB565_WHITE, 2, 1);
    } else {
        drawCenteredFittedText(gfx, cardX + 3, cardY + 52, cardW - 6, label, RGB565_WHITE, 2, 1);
    }

    String distanceText = String((int)round(distance)) + " m";
    int distanceSize = fittingTextSize(distanceText, cardW - 14, 2, 1);
    uint16_t distanceColor = distance < 1.0f ? 0x07E0 : RGB565_RED;
    gfx->setTextSize(distanceSize);
    gfx->setTextColor(distanceColor);
    gfx->setCursor(cardX + max(0, (cardW - textWidthPx(distanceText, distanceSize)) / 2), cardY + 92);
    gfx->print(distanceText);
}

void SimpleDisplayManager::drawProgressBar(int y, float progress) {
    int barWidth = SCREEN_WIDTH - 40;
    int barX = 20;
    int fillWidth = barWidth * progress;
    
    gfx->drawRect(barX, y, barWidth, 6, 0x3186);
    if (fillWidth > 0) {
        gfx->fillRect(barX + 1, y + 1, fillWidth - 2, 4, 0x07E0);
    }
}

// ================ 其他绘制函数 ================
void SimpleDisplayManager::drawHomePage() {
    // 清屏
    gfx->fillScreen(RGB565_BLACK);
    
    int centerX = SCREEN_WIDTH / 2;
    int centerY = SCREEN_HEIGHT / 2;
    
    // 获取月份缩写
    const char* monthNames[] = {"JAN", "FEB", "MAR", "APR", "MAY", "JUN", 
                                "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"};
    
    // 获取星期缩写
    const char* weekNames[] = {"SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"};
    
    // 格式化日期: "20 APR"
    char dateStr[20];
    snprintf(dateStr, sizeof(dateStr), "%d %s", day, monthNames[month - 1]);
    
    // 格式化星期: "MON"
    String weekStr = getWeekday().c_str();
    
    // 显示日期（更大字号）
    gfx->setCursor(centerX - 50, centerY - 80);
    gfx->setTextSize(3);
    gfx->setTextColor(RGB565_WHITE);
    gfx->print(dateStr);
    
    // 显示星期（较小字号，放在日期下面）
    gfx->setCursor(centerX - 20, centerY - 40);
    gfx->setTextSize(2);
    gfx->setTextColor(0x07FF);  // 青色
    gfx->print(weekStr);
    
    // 多彩刻度颜色
    uint16_t colors[] = {
        0xF800,  // 红色 - 12点
        0x07E0,  // 绿色 - 1点
        0x001F,  // 蓝色 - 2点
        0xFFE0,  // 黄色 - 3点
        0xF81F,  // 粉色 - 4点
        0x07FF,  // 青色 - 5点
        0xFC00,  // 橙色 - 6点
        0x7E0F,  // 紫色 - 7点
        0xFD20,  // 橙色黄 - 8点
        0xDFF0,  // 浅绿 - 9点
        0xFD80,  // 橙红 - 10点
        0x87E0   // 黄绿 - 11点
    };
    
    // 数字和刻度放在屏幕四周
    const char* nums[] = {"12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"};
    
    // 屏幕边缘距离
    int marginX = 15;
    int marginY = 30;
    
    // 12个位置（满屏分布）适配 240x320
    int positions[12][2] = {
        {centerX - 5, marginY},                               // 12点
        {centerX + 65, marginY},                              // 1点
        {SCREEN_WIDTH - marginX, centerY - 65},               // 2点
        {SCREEN_WIDTH - marginX, centerY},                    // 3点
        {SCREEN_WIDTH - marginX, centerY + 65},               // 4点
        {centerX + 65, SCREEN_HEIGHT - marginY},              // 5点
        {centerX, SCREEN_HEIGHT - marginY},                   // 6点
        {centerX - 65, SCREEN_HEIGHT - marginY},              // 7点
        {marginX, centerY + 65},                              // 8点
        {marginX, centerY},                                   // 9点
        {marginX - 5, centerY - 65},                          // 10点
        {centerX - 65, marginY}                               // 11点
    };
    
    for (int i = 0; i < 12; i++) {
        int x = positions[i][0];
        int y = positions[i][1];
        
        // 绘制数字
        gfx->setCursor(x - 8, y - 8);
        gfx->setTextSize(3);
        gfx->setTextColor(colors[i]);
        gfx->print(nums[i]);
    }
    
    // ========== 时针（加粗）==========
    float hourAngle = (hour % 12) * 30 + minute * 0.5 - 90;
    float radHour = hourAngle * PI / 180;
    
    int hourLength = 55;
    int hourWidth = 10;
    
    int hourTipX = centerX + hourLength * cos(radHour);
    int hourTipY = centerY + hourLength * sin(radHour);
    int hourLeftX = centerX + hourWidth * cos(radHour + PI/2);
    int hourLeftY = centerY + hourWidth * sin(radHour + PI/2);
    int hourRightX = centerX + hourWidth * cos(radHour - PI/2);
    int hourRightY = centerY + hourWidth * sin(radHour - PI/2);
    
    gfx->fillTriangle(hourTipX, hourTipY, hourLeftX, hourLeftY, hourRightX, hourRightY, 0xFD80);
    gfx->fillTriangle(centerX, centerY, hourLeftX, hourLeftY, hourRightX, hourRightY, 0xFD80);
    
    // ========== 分针（加粗）==========
    float minuteAngle = minute * 6 - 90;
    float radMinute = minuteAngle * PI / 180;
    
    int minuteLength = 80;
    int minuteWidth = 7;
    
    int minuteTipX = centerX + minuteLength * cos(radMinute);
    int minuteTipY = centerY + minuteLength * sin(radMinute);
    int minuteLeftX = centerX + minuteWidth * cos(radMinute + PI/2);
    int minuteLeftY = centerY + minuteWidth * sin(radMinute + PI/2);
    int minuteRightX = centerX + minuteWidth * cos(radMinute - PI/2);
    int minuteRightY = centerY + minuteWidth * sin(radMinute - PI/2);
    
    gfx->fillTriangle(minuteTipX, minuteTipY, minuteLeftX, minuteLeftY, minuteRightX, minuteRightY, 0xCE79);
    gfx->fillTriangle(centerX, centerY, minuteLeftX, minuteLeftY, minuteRightX, minuteRightY, 0xCE79);
    
    // 中心圆点
    gfx->fillCircle(centerX, centerY, 7, RGB565_WHITE);
    gfx->fillCircle(centerX, centerY, 4, 0x0000);

    String clockDeviceLabel = CLOCK_DEVICE_LABEL;
    clockDeviceLabel.trim();
    if (clockDeviceLabel.length() > 0) {
        drawCenteredFittedText(gfx, centerX - 46, SCREEN_HEIGHT - 58, 92,
                               clockDeviceLabel, RGB565_YELLOW, 1, 1);
    }
    
    // 不绘制状态栏和侧边按钮
    // drawStatusBar();
    // drawSideButtons();
}

void SimpleDisplayManager::drawFlightPage() {
    gfx->fillScreen(RGB565_BLACK);
    
    int centerX = SCREEN_WIDTH / 2;
    int yOffset = 60;
    
    if (!flightInfo.valid) {
        gfx->setCursor(centerX - 80, SCREEN_HEIGHT / 2 - 20);
        gfx->setTextSize(2);
        gfx->setTextColor(RGB565_WHITE);
        gfx->print("No Flight Info");
        
        gfx->setCursor(centerX - 75, SCREEN_HEIGHT / 2 + 10);
        gfx->setTextSize(1);
        gfx->setTextColor(0x528A);
        gfx->print("Waiting for server data...");
        
        drawStatusBar();
        drawSideButtons();
        return;
    }
    
    {
        String flightDisplay = flightInfo.flight_number;
        if (flightInfo.airline.length() > 0) {
            flightDisplay = flightInfo.airline + " " + flightInfo.flight_number;
        }

        drawCenteredFittedText(gfx, 8, 42, SCREEN_WIDTH - 16,
                               flightDisplay, RGB565_WHITE, 2, 1);

        const int topY = 82;
        const int leftX = 12;
        const int rightX = 144;
        const int leftW = 118;
        const int rightW = 84;

        drawFittedText(gfx, leftX, topY, "DESTINATION", leftW, 0x528A, 1, 1);
        drawFittedText(gfx, leftX, topY + 18, compactPlaceLabel(flightInfo.destination), leftW, 0x07FF, 2, 1);

        drawFittedText(gfx, rightX, topY, "GATE", rightW, 0x528A, 1, 1);
        uint16_t gateColor = flightInfo.gate_changed ? RGB565_YELLOW : RGB565_WHITE;
        drawFittedText(gfx, rightX, topY + 18, formatGateLabel(flightInfo.boarding_gate), rightW, gateColor, 2, 1);

        gfx->drawLine(14, 132, SCREEN_WIDTH - 14, 132, 0x3186);

        drawFittedText(gfx, leftX, 142, "SCHEDULED", leftW, 0x528A, 1, 1);
        drawFittedText(gfx, leftX, 158, flightInfo.scheduled_departure, leftW, RGB565_WHITE, 2, 1);

        String estimated = flightInfo.estimated_departure.length() > 0
            ? flightInfo.estimated_departure
            : "--:--";
        drawFittedText(gfx, rightX, 142, "ESTIMATED", rightW, 0x528A, 1, 1);
        drawFittedText(gfx, rightX, 158, estimated, rightW, RGB565_YELLOW, 2, 1);

        drawFittedText(gfx, leftX, 190, "BOARDING", leftW, 0x528A, 1, 1);
        drawFittedText(gfx, leftX, 206, flightInfo.boarding_time, leftW, 0x07E0, 2, 1);

        drawFlightStatusBadge();

        if (flightInfo.delay_minutes > 0) {
            const int panelX = 8;
            const int panelY = 236;
            const int panelW = SCREEN_WIDTH - 16;
            const int panelH = 54;
            gfx->fillRoundRect(panelX, panelY, panelW, panelH, 8, RGB565_YELLOW);
            gfx->drawRoundRect(panelX, panelY, panelW, panelH, 8, 0xC600);

            String delayLine = "DELAYED " + String(flightInfo.delay_minutes) + "m";
            drawFittedText(gfx, panelX + 10, panelY + 7, delayLine, panelW - 20, RGB565_BLACK, 2, 1);
            if (flightInfo.delay_reason.length() > 0) {
                drawWrappedText(gfx, panelX + 10, panelY + 30, panelW - 20,
                                flightInfo.delay_reason, RGB565_BLACK, 1, 10, 2);
            }
        }

        drawStatusBar();
        drawSideButtons();
        return;
    }
}

void SimpleDisplayManager::drawFlightStatusBadge() {
    int badgeX = SCREEN_WIDTH - 115;
    int badgeY = 200;
    int badgeWidth = 106;
    int badgeHeight = 30;
    
    uint16_t bgColor;
    const char* statusText;
    
    String status = flightInfo.status;
    status.toLowerCase();
    
    if (status == "boarding") {
        bgColor = 0x07E0;  // 绿色
        statusText = "BOARDING";
    } else if (status == "delayed") {
        bgColor = RGB565_YELLOW;
        statusText = "DELAYED";
    } else if (status == "cancelled") {
        bgColor = RGB565_RED;
        statusText = "CANCELLED";
    } else if (status == "scheduled") {
        bgColor = 0x07E0;
        statusText = "SCHEDULED";
    } else if (status == "final call") {
        bgColor = RGB565_RED;
        statusText = "FINAL CALL";
    } else {
        bgColor = 0x528A;  // 灰色
        statusText = "PENDING";
    }
    
    // 绘制圆角矩形
    gfx->fillRoundRect(badgeX, badgeY, badgeWidth, badgeHeight, 5, bgColor);
    
    drawCenteredFittedText(gfx, badgeX + 4, badgeY + 7, badgeWidth - 8,
                           String(statusText), RGB565_BLACK, 2, 1);
}

// 添加航班信息设置方法
void SimpleDisplayManager::setFlightInfo(const String& flightNo, const String& airline,
                                          const String& destination, const String& gate,
                                          const String& boardingTime, int delayMinutes,
                                          const String& status, const String& terminal,
                                          const String& scheduledDeparture,
                                          const String& estimatedDeparture,
                                          const String& delayReason) {
    flightInfo.flight_number = flightNo;
    flightInfo.airline = airline;
    flightInfo.destination = destination;
    flightInfo.boarding_gate = gate;
    flightInfo.boarding_time = boardingTime;
    flightInfo.delay_minutes = delayMinutes;
    flightInfo.status = status;
    flightInfo.terminal = terminal;
    flightInfo.scheduled_departure = scheduledDeparture;
    flightInfo.estimated_departure = estimatedDeparture;
    flightInfo.delay_reason = delayReason;
    flightInfo.valid = true;
    flightInfo.last_update = millis();
    
    Serial.printf("[航班] 信息已更新: %s %s\n", airline.c_str(), flightNo.c_str());
    needRedraw = true;
}

void SimpleDisplayManager::setFlightInfoSimple(const String& flightNo, const String& airline,
                                                const String& destination, const String& gate,
                                                const String& time, int delay) {
    setFlightInfo(flightNo, airline, destination, gate, time, delay,
                  "", "", "", "", "");
}

void SimpleDisplayManager::updateFlightDelay(int minutes, const String& reason) {
    flightInfo.delay_minutes = minutes;
    flightInfo.delay_reason = reason;
    flightInfo.last_update = millis();
    needRedraw = true;
}

void SimpleDisplayManager::updateFlightGate(const String& newGate, const String& oldGate) {
    flightInfo.previous_gate = flightInfo.boarding_gate;
    flightInfo.boarding_gate = newGate;
    flightInfo.gate_changed = true;
    flightInfo.last_update = millis();
    needRedraw = true;
}

void SimpleDisplayManager::clearFlightInfo() {
    flightInfo.valid = false;
    flightInfo.flight_number = "";
    flightInfo.airline = "";
    flightInfo.destination = "";
    flightInfo.boarding_gate = "";
    flightInfo.boarding_time = "";
    flightInfo.status = "";
    flightInfo.delay_minutes = 0;
    flightInfo.delay_reason = "";
    flightInfo.terminal = "";
    flightInfo.scheduled_departure = "";
    flightInfo.estimated_departure = "";
    needRedraw = true;
}

void SimpleDisplayManager::drawStatusBar() {
    const int TOP_Y = 8, SIDE_PADDING = 10;
    gfx->fillRect(SIDE_PADDING, 0, SCREEN_WIDTH - SIDE_PADDING * 2, 34, RGB565_BLACK);
    drawWiFiIcon(SIDE_PADDING + 10, TOP_Y);
    
    char time_str[10];
    snprintf(time_str, sizeof(time_str), "%02d:%02d", hour, minute);
    gfx->setCursor(SCREEN_WIDTH - 90 - SIDE_PADDING, TOP_Y);
    gfx->setTextColor(RGB565_WHITE);
    gfx->setTextSize(2);
    gfx->print(time_str);
    drawBatteryIcon(SCREEN_WIDTH - 30 - SIDE_PADDING, TOP_Y + 2);
}

void SimpleDisplayManager::drawWiFiIcon(int x, int y) {
    if (!wifi_connected) {
        // WiFi 断开：画一个带叉的图标
        gfx->drawLine(x, y, x + 20, y + 15, RGB565_RED);
        gfx->drawLine(x + 20, y, x, y + 15, RGB565_RED);
        return;
    }
    
    // 根据信号强度确定显示多少条弧线
    int bars;
    if (wifi_rssi > -45) bars = 4;
    else if (wifi_rssi > -55) bars = 3;
    else if (wifi_rssi > -65) bars = 2;
    else if (wifi_rssi > -75) bars = 1;
    else bars = 0;
    
    // 中心点
    int cx = x + 12;
    int cy = y + 12;
    
    // 如果没有信号
    if (bars == 0) {
        gfx->drawCircle(cx, cy, 8, RGB565_WHITE);
        gfx->drawLine(cx - 6, cy - 6, cx + 6, cy + 6, RGB565_WHITE);
        gfx->drawLine(cx + 6, cy - 6, cx - 6, cy + 6, RGB565_WHITE);
        return;
    }
    
    // 绘制扇形（弧线朝上，角度从 240 到 300 度）
    // 最外层弧线（4格信号）
    gfx->drawArc(cx, cy, 16, 16, 235, 305, bars >= 4 ? RGB565_WHITE : 0x528A);
    
    // 第二层弧线（3格信号）
    gfx->drawArc(cx, cy, 12, 12, 240, 300, bars >= 3 ? RGB565_WHITE : 0x528A);
    
    // 第三层弧线（2格信号）
    gfx->drawArc(cx, cy, 8, 8, 245, 295, bars >= 2 ? RGB565_WHITE : 0x528A);
    
    // 最内层弧线（1格信号）
    gfx->drawArc(cx, cy, 4, 4, 250, 290, bars >= 1 ? RGB565_WHITE : 0x528A);
    
    // 中心圆点
    gfx->fillCircle(cx, cy, 1, RGB565_WHITE);
}

void SimpleDisplayManager::drawBatteryIcon(int x, int y) {
    gfx->drawRect(x, y, 25, 12, RGB565_WHITE);
    gfx->fillRect(x + 25, y + 3, 3, 6, RGB565_WHITE);
    int fillWidth = (battery_level * 23) / 100;
    uint16_t color = battery_level < 20 ? RGB565_RED : (battery_level < 50 ? RGB565_YELLOW : RGB565_GREEN);
    gfx->fillRect(x + 1, y + 1, fillWidth, 10, color);
}

void SimpleDisplayManager::drawSideButtons() {
    int rightX = SCREEN_WIDTH - 15;  // 按钮右边缘位置
    
    // ========== SOS 水滴按钮（尾巴朝右）==========
    int centerX = rightX - 12;   // 水滴中心 X
    int centerY = 90;            // 水滴中心 Y
    int radius = 12;             // 圆的半径
    
    // 1. 绘制圆形部分
    gfx->fillCircle(centerX, centerY, radius, RGB565_RED);
    
    // 2. 绘制朝右的三角形尾巴
    int tailX = centerX + radius;        // 尾巴起点 X（圆的右侧）
    int tailY1 = centerY - radius / 2;   // 尾巴上点
    int tailY2 = centerY + radius / 2;   // 尾巴下点
    int tailTip = centerX + radius + 6;  // 尾巴尖 X（更右边）
    
    gfx->fillTriangle(tailX, tailY1, tailX, tailY2, tailTip, centerY, RGB565_RED);
    
    // 3. 绘制 SOS 文字（在圆形中心偏左）
    gfx->setCursor(centerX - 6, centerY - 4);
    gfx->setTextSize(1);
    gfx->setTextColor(RGB565_WHITE);
    gfx->print("SOS");
}

void SimpleDisplayManager::drawSOSPage() {
    static bool blink = false;
    static unsigned long lastBlink = 0;
    unsigned long now = millis();
    if (now - lastBlink > 500) {
        blink = !blink;
        lastBlink = now;
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
    static bool blink = false;
    static unsigned long lastBlink = 0;
    unsigned long now = millis();
    if (now - lastBlink > 500) {
        blink = !blink;
        lastBlink = now;
    }
    if (blink) {
        gfx->fillScreen(RGB565_RED);
        gfx->setCursor(SCREEN_WIDTH/2 - 50, SCREEN_HEIGHT/2 - 30);
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
}

// ================ 设置函数 ================
void SimpleDisplayManager::openDestinationPicker() {
    int count = SmartNavigationPlanner::destinationCount();
    if (count <= 0) {
        destinationPickerActive = false;
        Serial.println("[NAV] destination picker unavailable: no destinations");
        return;
    }

    destinationPickerActive = true;
    destinationPickerIntentSeen = false;
    destinationPickerLastActivity = 0;
    if (selectedDestinationIndex < 0 ||
        selectedDestinationIndex >= count) {
        selectedDestinationIndex = 0;
    }
    switchToNavPage();
    needRedraw = true;
}

void SimpleDisplayManager::cancelDestinationPicker() {
    if (!destinationPickerActive) return;
    destinationPickerActive = false;
    destinationPickerIntentSeen = false;
    destinationPickerLastActivity = 0;
    switchToNavPage();
    needRedraw = true;
    Serial.println("[NAV] destination picker canceled");
}

void SimpleDisplayManager::cycleNavigationDestination() {
    moveNavigationDestinationSelection(1);
}

void SimpleDisplayManager::noteDestinationPickerActivity() {
    destinationPickerIntentSeen = true;
    destinationPickerLastActivity = millis();
}

bool SimpleDisplayManager::updateDestinationPickerAutoConfirm() {
    if (!destinationPickerActive || !destinationPickerIntentSeen) {
        return false;
    }

    unsigned long now = millis();
    if (now - destinationPickerLastActivity < DESTINATION_PICKER_AUTO_CONFIRM_MS) {
        return false;
    }

    Serial.println("[NAV] auto confirm destination after SOS idle");
    if (confirmNavigationSelection()) {
        Serial.println("[NAVTEST] picker auto-confirmed");
        return true;
    }

    destinationPickerIntentSeen = false;
    destinationPickerLastActivity = now;
    Serial.println("[NAVTEST] picker auto-confirm failed");
    return false;
}

void SimpleDisplayManager::moveNavigationDestinationSelection(int delta) {
    int count = SmartNavigationPlanner::destinationCount();
    if (count <= 0) return;

    if (selectedDestinationIndex < 0 ||
        selectedDestinationIndex >= count) {
        selectedDestinationIndex = 0;
    }

    if (!destinationPickerActive) {
        destinationPickerActive = true;
        switchToNavPage();
        needRedraw = true;
        const SmartDestination& destination =
            SmartNavigationPlanner::destinationAt(selectedDestinationIndex);
        Serial.printf("[NAV] destination picker opened: %s (%s)\n",
                      destination.label,
                      SmartNavigationPlanner::zoneName(destination.zone));
        return;
    }

    selectedDestinationIndex = (selectedDestinationIndex + delta) % count;
    if (selectedDestinationIndex < 0) selectedDestinationIndex += count;
    noteDestinationPickerActivity();
    switchToNavPage();
    needRedraw = true;

    const SmartDestination& destination =
        SmartNavigationPlanner::destinationAt(selectedDestinationIndex);
    Serial.printf("[NAV] highlighted destination: %s (%s)\n",
                  destination.label,
                  SmartNavigationPlanner::zoneName(destination.zone));
}

bool SimpleDisplayManager::confirmNavigationSelection() {
    return selectNavigationDestinationByIndex(selectedDestinationIndex);
}

bool SimpleDisplayManager::selectNavigationDestinationByIndex(int index, bool fromFlightInfo) {
    int count = SmartNavigationPlanner::destinationCount();
    if (count <= 0) return false;
    selectedDestinationIndex = index % count;
    if (selectedDestinationIndex < 0) selectedDestinationIndex += count;
    const SmartDestination& destination =
        SmartNavigationPlanner::destinationAt(selectedDestinationIndex);

    bool ok = setSmartNavigationDestination(String(destination.key), fromFlightInfo);
    if (ok) {
        destinationPickerActive = false;
        destinationPickerIntentSeen = false;
        destinationPickerLastActivity = 0;
        switchToNavPage();
    }
    return ok;
}

bool SimpleDisplayManager::setSmartNavigationDestination(const String& destinationKey, bool fromFlightInfo) {
    const SmartDestination* destination =
        SmartNavigationPlanner::findDestination(destinationKey);
    if (!destination) {
        Serial.printf("[NAV] unknown destination: %s\n", destinationKey.c_str());
        return false;
    }

    for (int i = 0; i < SmartNavigationPlanner::destinationCount(); i++) {
        if (String(SmartNavigationPlanner::destinationAt(i).key) == destination->key) {
            selectedDestinationIndex = i;
            break;
        }
    }

    std::vector<SmartRoutePoint> route;
    SmartNavigationPlanner::buildRoute(current_x, current_y, *destination, route);

    std::vector<Waypoint> displayPath;
    std::vector<NavWaypoint> navPath;
    for (const SmartRoutePoint& point : route) {
        displayPath.push_back({point.x, point.y, String(point.name)});
        navPath.push_back({point.x, point.y, String(point.name), String(point.action)});
    }

    setTargetGate(String(destination->key), destination->x, destination->y);
    setDestination(destination->x, destination->y,
                   String(destination->label), String(destination->key));
    setNavigationPath(displayPath);

    extern NavigationManager* navManager;
    if (navManager) {
        navManager->setTarget(destination->x, destination->y, String(destination->key));
        navManager->setPath(navPath);
        navManager->updatePosition(current_x, current_y);
    }

    if (data_transmitter) {
        data_transmitter->setTargetPosition(destination->x, destination->y,
                                           String(destination->label));
        data_transmitter->setNavigationActive(true);
        data_transmitter->transmitStatusSummary();
        Serial.println("[NAV] telemetry publish requested after destination selection");
    }

    activeArrivalKey = String(destination->key);
    activeArrivalLabel = String(destination->label);
    activeNavigationFromFlight = fromFlightInfo;
    arrivalPopupShown = false;
    arrivalPopupTarget = "";
    destinationPickerActive = false;
    destinationPickerIntentSeen = false;
    destinationPickerLastActivity = 0;
    needRedraw = true;

    Serial.printf("[NAV] selected destination: %s (%s) @ %.1f,%.1f route=%d flight=%d\n",
                  destination->label,
                  destination->key,
                  destination->x,
                  destination->y,
                  route.size(),
                  fromFlightInfo ? 1 : 0);
    for (size_t i = 0; i < route.size(); i++) {
        Serial.printf("  Route %d: %s @ %.1f,%.1f action=%s\n",
                      (int)i + 1,
                      route[i].name,
                      route[i].x,
                      route[i].y,
                      route[i].action);
    }
    return true;
}

void SimpleDisplayManager::printNavigationDestinations() {
    SmartNavigationPlanner::printDestinations(Serial);
}

void SimpleDisplayManager::setTime(uint8_t h, uint8_t m, uint8_t s) {
    bool minuteChanged = (hour != h || minute != m);
    hour = h; minute = m; second = s;
    if (minuteChanged) needRedraw = true;
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
    float new_x = constrain(x, 0, MAP_REAL_WIDTH);
    float new_y = constrain(y, 0, MAP_REAL_HEIGHT);
    bool moved = (fabs(new_x - current_x) >= 0.15f || fabs(new_y - current_y) >= 0.15f);
    current_x = new_x;
    current_y = new_y;

    extern NavigationManager* navManager;
    if (navManager) {
        navManager->updatePosition(current_x, current_y);
        const NavDisplayInfo& navInfo = navManager->getDisplayInfo();
        String targetKey = SmartNavigationPlanner::normalizeKey(navInfo.targetGate);
        String expectedKey = activeArrivalKey.length() > 0 ? activeArrivalKey : targetKey;
        String targetLabel = activeArrivalLabel.length() > 0
            ? activeArrivalLabel
            : SmartNavigationPlanner::normalizeLabel(navInfo.targetGate);
        bool routeArrived = navManager->isActive() &&
                            targetKey == expectedKey &&
                            navInfo.currentDistance <= 0.5f;
        bool directArrivalTargetArmed = activeArrivalKey.length() > 0;
        float directArrivalDistance = sqrt(pow(current_x - target_x, 2) + pow(current_y - target_y, 2));
#if ENABLE_FLIGHT_ARRIVAL_TARGET
        bool directArrived = !navManager->isActive() &&
                             directArrivalTargetArmed &&
                             directArrivalDistance <= FLIGHT_ARRIVAL_RADIUS_METERS;
#else
        bool directArrived = false;
#endif
        bool arrived = routeArrived || directArrived;

        if (arrived && (!arrivalPopupShown || arrivalPopupTarget != expectedKey)) {
            arrivalPopupShown = true;
            arrivalPopupTarget = expectedKey;
            String popupMessage = "You've arrived at " + targetLabel;
            String spokenMessage = "You have arrived at " + targetLabel + ".";
            navigationPath.clear();
            hasNavigationPath = false;
            activeNavigationFromFlight = false;
            activeArrivalKey = "";
            activeArrivalLabel = "";
            navManager->clear();
            if (data_transmitter) {
                data_transmitter->setNavigationActive(false);
            }
#if ENABLE_FLIGHT_ROUTE_NAVIGATION
            pageManager.setPage(PAGE_NAV);
#else
            pageManager.setPage(PAGE_HOME);
#endif
            showPopup(POPUP_ARRIVAL, "Arrived", popupMessage);
            if (audioCommandQueue) {
                AudioCommand tts_cmd;
                tts_cmd.command = AudioCommand::AUDIO_PLAY_TTS;
                snprintf(tts_cmd.text, sizeof(tts_cmd.text), "%s", spokenMessage.c_str());
                xQueueSend(audioCommandQueue, &tts_cmd, 0);
            }
            Serial.printf("[NAV] arrival popup shown: %s\n", popupMessage.c_str());
            Serial.printf("[NAV] arrival route cleared: %s\n", targetLabel.c_str());
        }
    }

    if (moved) needRedraw = true;
}

void SimpleDisplayManager::showSOS(bool active) {
    if (active) {
        sos_emergency_mode = true;
        alarmDisplayActive = true;
        alarmTriggerTime = millis();
        alarmReportPending = true;
        
        // 立即显示
        needRedraw = true;
        
        // 振动报警（10次长振，每次500ms，间隔500ms）
        if (vibration) {
            vibration->pattern(10, 500);
        }
        
        // 播放 SOS 声音
        if (audioCommandQueue) {
            AudioCommand audio_cmd;
            audio_cmd.command = AudioCommand::AUDIO_PLAY_ALERT;
            strcpy(audio_cmd.text, "/sos.wav");
            xQueueSend(audioCommandQueue, &audio_cmd, 0);
        }
        Serial.println("[SOS] 触发，振动+声音+闪屏，15秒后上报");
    } else {
        sos_emergency_mode = false;
        alarmDisplayActive = false;
        alarmReportPending = false;
        needRedraw = true;
        if (data_transmitter) {
            data_transmitter->setSOSActive(false, "Display");
        }
        
        // 停止声音
        if (audioCommandQueue) {
            AudioCommand audio_cmd;
            audio_cmd.command = AudioCommand::AUDIO_STOP;
            xQueueSend(audioCommandQueue, &audio_cmd, 0);
        }
        Serial.println("[SOS] 已取消");
    }
}

void SimpleDisplayManager::showFallAlert(bool active) {
#if !ENABLE_FALL_DETECTION
    (void)active;
    fallAlertActive = false;
    alarmDisplayActive = sos_emergency_mode;
    alarmReportPending = false;
    needRedraw = true;
    Serial.println("[FallDetection] display alert ignored because feature is disabled");
    return;
#endif
    if (active) {
        fallAlertActive = true;
        alarmDisplayActive = true;
        alarmTriggerTime = millis();
        alarmReportPending = true;
        
        needRedraw = true;
        
        // 振动报警（10次长振）
        if (vibration) {
            vibration->pattern(15, 500);
        }
        
        // 播放跌倒报警声音
        if (audioCommandQueue) {
            AudioCommand audio_cmd;
            audio_cmd.command = AudioCommand::AUDIO_PLAY_ALERT;
            strcpy(audio_cmd.text, "/alerts/fall.mp3");
            xQueueSend(audioCommandQueue, &audio_cmd, 0);
        }
        
        Serial.println("[FALL] 触发，振动+声音+闪屏，15秒后上报");
    } else {
        fallAlertActive = false;
        alarmDisplayActive = false;
        alarmReportPending = false;
        needRedraw = true;
        
        if (audioCommandQueue) {
            AudioCommand audio_cmd;
            audio_cmd.command = AudioCommand::AUDIO_STOP;
            xQueueSend(audioCommandQueue, &audio_cmd, 0);
        }
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
    bool changed = (wifi_connected != connected || abs(wifi_rssi - rssi) >= 5);
    wifi_connected = connected;
    wifi_rssi = rssi;
    if (changed) needRedraw = true;
}

void SimpleDisplayManager::setBatteryLevel(int level) {
    int newLevel = constrain(level, 0, 100);
    if (battery_level != newLevel) {
        battery_level = newLevel;
        needRedraw = true;
    }
}

// void SimpleDisplayManager::updateHealthData(int hr, int bph, int bpl, int spo, int sleep) {
//     heartRate = hr;
//     bloodPressureHigh = bph;
//     bloodPressureLow = bpl;
//     spo2 = spo;
//     sleepQuality = sleep;
//     needRedraw = true;
// }

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

void SimpleDisplayManager::switchToFlightPage() {
    pageManager.setPage(PAGE_FLIGHT);
    wakeScreen();
    needRedraw = true;
}

ScreenPage SimpleDisplayManager::getCurrentPage() {
    return pageManager.getCurrentPage();
}

String SimpleDisplayManager::getWeekday() {
    int y = year;
    int m = month;
    int d = day;
    
    if (m < 3) {
        m += 12;
        y -= 1;
    }
    
    int c = y / 100;
    int k = y % 100;
    int h = (d + 13*(m+1)/5 + k + k/4 + c/4 + 5*c) % 7;
    
    const char* weekdays[] = {"SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"};
    return weekdays[h];
}

// 抬手检测
void SimpleDisplayManager::checkWristRaise() {
    if (!imu || !screenOn) return;
    
    IMUData data = imu->getData();
    float accelZ = data.accel_z;
    float accelMagnitude = sqrt(data.accel_x * data.accel_x + 
                                 data.accel_y * data.accel_y + 
                                 accelZ * accelZ);
    
    // 检测抬手动作：Z轴变化 + 手腕角度
    float deltaZ = abs(accelZ - lastAccelZ);
    bool isRaised = (deltaZ > WRIST_RAISE_THRESHOLD && accelMagnitude > 0.8 && accelMagnitude < 1.2);
    
    if (isRaised && !screenOn) {
        wakeScreen();
        vibrateShort();
    }
    
    lastAccelZ = accelZ;
}

// 熄屏超时
void SimpleDisplayManager::updateScreenTimeout() {
    if (screenOn && millis() - lastActivityTime > SCREEN_TIMEOUT_MS) {
        sleepScreen();
        Serial.println("[显示] 熄屏");
    }
}

void SimpleDisplayManager::vibrateShort() {
    if (vibration) {
        vibration->shortVib();
    }
}

void SimpleDisplayManager::handleEmergencyDisplay() {
    unsigned long now = millis();
    if (!needRedraw && now - lastBlinkTime < 500) return;
    if (now - lastBlinkTime >= 500) {
        lastBlinkTime = now;
        blinkState = !blinkState;
    }

    // 紧急显示处理（SOS/FALL 闪烁）
    if (spiMutex && xSemaphoreTake(spiMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        if (sos_emergency_mode) {
            drawSOSPage();
        } else if (fallAlertActive) {
            drawFallAlertPage();
        }
        drawSideButtons();
        xSemaphoreGive(spiMutex);
        needRedraw = false;
    }
}

void SimpleDisplayManager::drawPositions() {
    // 绘制当前位置标记
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

void SimpleDisplayManager::setBacklight(bool on) {
    #ifdef TFT_BL
        digitalWrite(TFT_BL, on ? HIGH : LOW);
    #endif
    screenOn = on;
    if (on) {
        needRedraw = true;  // 亮屏时刷新画面
    }
}

void SimpleDisplayManager::sleepScreen() {
    if (!screenOn) return;
    setBacklight(false);
    Serial.println("[显示] 关闭背光（省电模式）");
}

void SimpleDisplayManager::wakeScreen() {
    if (screenOn) return;
    setBacklight(true);
    lastActivityTime = millis();
    Serial.println("[显示] 打开背光");
}

bool SimpleDisplayManager::isNearDestination() {
    float dx = current_x - target_x;
    float dy = current_y - target_y;
    float distance = sqrt(dx*dx + dy*dy);
    return distance < 5.0;  // 5米内算靠近目的地
}

void SimpleDisplayManager::updateNavigationInfo(const String& instruction, float distance, const String& direction) {
    currentNavInstruction = instruction;
    currentNavDistance = distance;
    currentNavDirection = direction;
    lastNavUpdate = millis();
    needRedraw = true;
}

void SimpleDisplayManager::setTargetGate(const String& gate, float x, float y) {
    // target_name 是 char[30]，需要转换
    String label = SmartNavigationPlanner::normalizeLabel(gate);
    strncpy(target_name, label.c_str(), sizeof(target_name) - 1);
    target_name[sizeof(target_name) - 1] = '\0';
    target_x = x;
    target_y = y;
    arrivalPopupShown = false;
    arrivalPopupTarget = "";
    activeArrivalKey = SmartNavigationPlanner::normalizeKey(gate);
    activeArrivalLabel = label;
    needRedraw = true;
    
    Serial.printf("登机口已设置: %s @ (%.1f, %.1f)\n", target_name, x, y);
}

void SimpleDisplayManager::checkArrivalAtCurrentPosition() {
    setCurrentPosition(current_x, current_y);
}

void SimpleDisplayManager::drawNavigationPanel(int x, int y, int width, int height) {
    // 绘制半透明背景
    gfx->fillRoundRect(x, y, width, height, 8, 0x0000);
    gfx->drawRoundRect(x, y, width, height, 8, 0x3186);
    
    int textY = y + 10;
    
    // 导航图标（箭头）
    int arrowX = x + 15;
    int arrowY = y + height / 2;
    
    // 根据方向绘制箭头
    if (currentNavDirection == "left") {
        gfx->fillTriangle(arrowX + 10, arrowY - 8, arrowX + 10, arrowY + 8, arrowX, arrowY, 0x07E0);
    } else if (currentNavDirection == "right") {
        gfx->fillTriangle(arrowX, arrowY - 8, arrowX, arrowY + 8, arrowX + 10, arrowY, 0x07E0);
    } else if (currentNavDirection == "forward") {
        gfx->fillTriangle(arrowX - 8, arrowY + 5, arrowX + 8, arrowY + 5, arrowX, arrowY - 5, 0x07E0);
    } else if (currentNavDirection == "back") {
        gfx->fillTriangle(arrowX - 8, arrowY - 5, arrowX + 8, arrowY - 5, arrowX, arrowY + 5, 0x07E0);
    } else {
        // 直行箭头
        gfx->fillTriangle(arrowX - 5, arrowY, arrowX + 5, arrowY, arrowX, arrowY - 8, 0x07E0);
    }
    
    // 导航文字
    gfx->setCursor(x + 45, textY);
    gfx->setTextSize(1);
    gfx->setTextColor(0x07FF);
    gfx->print("NEXT:");
    
    gfx->setCursor(x + 45, textY + 18);
    gfx->setTextSize(2);
    gfx->setTextColor(RGB565_WHITE);
    
    // 截取过长的指令
    String displayInst = currentNavInstruction;
    if (displayInst.length() > 12) {
        displayInst = displayInst.substring(0, 10) + "..";
    }
    gfx->print(displayInst);
    
    // 距离
    gfx->setCursor(x + 45, textY + 45);
    gfx->setTextSize(1);
    gfx->setTextColor(0x528A);
    gfx->printf("DIST: %.0fm", currentNavDistance);
}

void SimpleDisplayManager::drawGateInfo(int x, int y, int width, int height) {
    // 登机口信息面板 - 放大显示
    gfx->fillRoundRect(x, y, width, height, 10, 0x0000);
    gfx->drawRoundRect(x, y, width, height, 10, 0x07E0);
    
    int centerX = x + width / 2;
    
    // "GATE" 标签
    gfx->setCursor(centerX - 20, y + 12);
    gfx->setTextSize(1);
    gfx->setTextColor(0x07E0);
    gfx->print("GATE");
    
    // 登机口号码（大字体）
    gfx->setCursor(centerX - 35, y + 35);
    gfx->setTextSize(4);
    gfx->setTextColor(RGB565_WHITE);
    gfx->print(target_name);
    
    // 距离提示
    float dx = current_x - target_x;
    float dy = current_y - target_y;
    float distance = sqrt(dx*dx + dy*dy);
    
    gfx->setCursor(centerX - 30, y + height - 20);
    gfx->setTextSize(1);
    gfx->setTextColor(0x528A);
    gfx->printf("%.0fm away", distance);
}

void SimpleDisplayManager::setNavigationPath(const std::vector<Waypoint>& path) {
    navigationPath = path;
    hasNavigationPath = (path.size() > 0);
    needRedraw = true;
    
    Serial.printf("导航路径已设置，包含 %d 个路径点\n", path.size());
    for (size_t i = 0; i < path.size(); i++) {
        Serial.printf("  点%d: (%.1f, %.1f) %s\n", i, path[i].x, path[i].y, path[i].name.c_str());
    }
}

void SimpleDisplayManager::setDestination(float x, float y, const String& name, const String& gate) {
    destination.x = x;
    destination.y = y;
    destination.name = name;
    destination.gate = gate;
    needRedraw = true;
    
    Serial.printf("目的地已设置: %s (%s) @ (%.1f, %.1f)\n", 
                  name.c_str(), gate.c_str(), x, y);
}

void SimpleDisplayManager::clearNavigationPath() {
    navigationPath.clear();
    hasNavigationPath = false;
    activeNavigationFromFlight = false;
    activeArrivalKey = "";
    activeArrivalLabel = "";
    arrivalPopupShown = false;
    arrivalPopupTarget = "";
    needRedraw = true;
}

// SimpleDisplayManager.cpp - 修复后的 drawNavigationPath
void SimpleDisplayManager::drawNavigationPath(int startX, int startY, 
                                               int playerX, int playerY,
                                               int mapY, int mapHeight) {
    extern NavigationManager* navManager;
    if (!navManager || !navManager->isActive()) return;
    
    // 获取路径点 - 需要在 NavigationManager 中添加 getWaypoints 方法
    // 暂时使用全局路径点
    
    // 这里需要从 navManager 获取路径点
    //const std::vector<NavWaypoint>& waypoints = navManager->getWaypoints();
    
    // 测试路径点（与 TESTFLIGHT 一致）
    const std::vector<NavWaypoint>& waypoints = navManager->getWaypoints();
    if (waypoints.empty()) return;
    
    std::vector<std::pair<int, int>> screenPoints;
    
    // 添加当前位置作为起点
    screenPoints.push_back({playerX, playerY});
    
    // 添加路径点
    for (const auto& waypoint : waypoints) {
        int pixelX = (int)(waypoint.x / MAP_REAL_WIDTH * MAP_PIXEL_WIDTH);
        int pixelY = (int)(waypoint.y / MAP_REAL_HEIGHT * MAP_PIXEL_HEIGHT);
        int screenX = pixelX - startX;
        int screenY = pixelY - startY;
        
        if (screenX >= 0 && screenX < SCREEN_WIDTH && 
            screenY >= mapY && screenY < mapY + mapHeight) {
            screenPoints.push_back({screenX, screenY});
        }
    }
    
    // 绘制折线
    for (size_t i = 0; i < screenPoints.size() - 1; i++) {
        int x1 = screenPoints[i].first;
        int y1 = screenPoints[i].second;
        int x2 = screenPoints[i+1].first;
        int y2 = screenPoints[i+1].second;
        
        drawLineWithArrow(x1, y1, x2, y2, 0x07FF);  // 青色路径
    }
    
    // 在路径点上绘制标记（除了起点）
    for (size_t i = 1; i < screenPoints.size(); i++) {
        drawWaypointMarker(screenPoints[i].first, screenPoints[i].second, i);
    }
}

void SimpleDisplayManager::drawLineWithArrow(int x1, int y1, int x2, int y2, uint16_t color) {
    // 绘制粗线
    int dx = abs(x2 - x1);
    int dy = abs(y2 - y1);
    int sx = (x1 < x2) ? 1 : -1;
    int sy = (y1 < y2) ? 1 : -1;
    int err = dx - dy;
    
    int cx = x1, cy = y1;
    int lineThickness = 3;
    
    // 存储线段上的点用于箭头
    std::vector<std::pair<int, int>> linePoints;
    
    while (true) {
        // 绘制粗线点
        for (int i = -lineThickness/2; i <= lineThickness/2; i++) {
            for (int j = -lineThickness/2; j <= lineThickness/2; j++) {
                if (cx + i >= 0 && cx + i < SCREEN_WIDTH && 
                    cy + j >= 0 && cy + j < SCREEN_HEIGHT) {
                    gfx->drawPixel(cx + i, cy + j, color);
                }
            }
        }
        
        linePoints.push_back({cx, cy});
        
        if (cx == x2 && cy == y2) break;
        
        int e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            cx += sx;
        }
        if (e2 < dx) {
            err += dx;
            cy += sy;
        }
    }
    
    // 在终点绘制箭头
    if (linePoints.size() >= 3) {
        int lastX = linePoints[linePoints.size() - 1].first;
        int lastY = linePoints[linePoints.size() - 1].second;
        int prevX = linePoints[linePoints.size() - 2].first;
        int prevY = linePoints[linePoints.size() - 2].second;
        
        // 计算方向
        float angle = atan2(lastY - prevY, lastX - prevX);
        float arrowAngle = 30 * PI / 180;
        
        int arrowLen = 12;
        int xArrow1 = lastX - arrowLen * cos(angle - arrowAngle);
        int yArrow1 = lastY - arrowLen * sin(angle - arrowAngle);
        int xArrow2 = lastX - arrowLen * cos(angle + arrowAngle);
        int yArrow2 = lastY - arrowLen * sin(angle + arrowAngle);
        
        // 绘制箭头
        gfx->drawLine(lastX, lastY, xArrow1, yArrow1, color);
        gfx->drawLine(lastX, lastY, xArrow2, yArrow2, color);
        gfx->fillTriangle(lastX, lastY, xArrow1, yArrow1, xArrow2, yArrow2, color);
    }
}

void SimpleDisplayManager::drawDestinationMarker(int x, int y) {
    // 绘制目的地标记（带旗子效果）
    
    // 旗杆
    for (int i = 0; i < 15; i++) {
        gfx->drawPixel(x, y - i, RGB565_WHITE);
    }
    
    // 旗子
    for (int i = 0; i < 12; i++) {
        gfx->drawPixel(x + i, y - 12, RGB565_RED);
        gfx->drawPixel(x + i, y - 11, RGB565_RED);
    }
    gfx->drawPixel(x + 11, y - 10, RGB565_RED);
    
    // 目的地名称
    gfx->setCursor(x - 10, y - 25);
    gfx->setTextSize(1);
    gfx->setTextColor(RGB565_WHITE);
    gfx->print(destination.name);
    
    // 登机口（更大字体）
    gfx->setCursor(x - 8, y - 38);
    gfx->setTextSize(2);
    gfx->setTextColor(0x07E0);
    gfx->print(destination.gate);
}

void SimpleDisplayManager::calculateMapViewCentered(int& startX, int& startY, 
                                                     int& playerX, int& playerY,
                                                     int mapHeight) {
    int playerPixelX = (int)(current_x / MAP_REAL_WIDTH * MAP_PIXEL_WIDTH);
    int playerPixelY = (int)(current_y / MAP_REAL_HEIGHT * MAP_PIXEL_HEIGHT);
    
    playerX = SCREEN_WIDTH / 2;
    playerY = mapHeight / 2;
    startX = playerPixelX - SCREEN_WIDTH / 2;
    startY = playerPixelY - mapHeight / 2;
    
    startX = constrain(startX, 0, MAP_PIXEL_WIDTH - SCREEN_WIDTH);
    startY = constrain(startY, 0, MAP_PIXEL_HEIGHT - mapHeight);
    
    playerX = playerPixelX - startX;
    playerY = playerPixelY - startY;
    playerX = constrain(playerX, 10, SCREEN_WIDTH - 10);
    playerY = constrain(playerY, 10, mapHeight - 10);
}

void SimpleDisplayManager::drawPlayerMarker(int x, int y) {
    gfx->drawCircle(x, y, 10, RGB565_WHITE);
    gfx->fillCircle(x, y, 7, 0x001F);
    gfx->fillCircle(x, y, 3, RGB565_WHITE);
}

void SimpleDisplayManager::drawTargetMarker(int x, int y, const String& gate) {
    for (int i = 0; i < 12; i++) {
        gfx->drawPixel(x, y - i, RGB565_WHITE);
    }
    for (int i = 0; i < 10; i++) {
        gfx->drawPixel(x + i, y - 10, RGB565_GREEN);
        gfx->drawPixel(x + i, y - 9, RGB565_GREEN);
    }
}

void SimpleDisplayManager::showPopup(PopupType type, const String& title, const String& message) {
    popupActive = true;
    currentPopupType = type;
    popupTitle = title;
    popupMessage = message;
    popupStartTime = millis();
    popupNeedsRedraw = true;
    
    // 立即刷新显示
    needRedraw = true;
    
    // 振动提醒
    vibrateShort();
    
    // 根据类型选择颜色和图标
    uint16_t color;
    switch (type) {
        case POPUP_FLIGHT_DELAY:
            color = RGB565_YELLOW;
            Serial.printf("[弹窗] 航班延误: %s\n", message.c_str());
            break;
        case POPUP_GATE_CHANGE:
            color = 0x001F;  // 蓝色
            Serial.printf("[弹窗] 登机口变更: %s\n", message.c_str());
            break;
        case POPUP_BOARDING:
            color = 0x07E0;  // 绿色
            Serial.printf("[弹窗] 登机提醒: %s\n", message.c_str());
            break;
        case POPUP_FLIGHT_CANCELLED:
            color = RGB565_RED;
            Serial.printf("[弹窗] 航班取消: %s\n", message.c_str());
            break;
        case POPUP_ARRIVAL:
            color = 0x07E0;
            Serial.printf("[Popup] arrival: %s\n", message.c_str());
            break;
        default:
            color = 0x001F;
            break;
    }
    
    unsigned long timeoutMs = (type == POPUP_ARRIVAL) ? POPUP_ARRIVAL_AUTO_CLOSE_MS : POPUP_AUTO_CLOSE_MS;
    Serial.printf("[弹窗] 显示: %s - %s (%lu秒后自动关闭)\n",
                  title.c_str(), message.c_str(), timeoutMs / 1000);
}

void SimpleDisplayManager::hidePopup() {
    popupActive = false;
    popupNeedsRedraw = false;
    needRedraw = true;
    Serial.println("[弹窗] 已关闭");
}

void SimpleDisplayManager::confirmPopup() {
    if (popupActive) {
        Serial.println("[弹窗] 用户确认");
        hidePopup();
    }
}

void SimpleDisplayManager::drawPopup() {
    if (!popupActive) return;
    
    // 检查是否超时
    unsigned long autoCloseMs = (currentPopupType == POPUP_ARRIVAL) ? POPUP_ARRIVAL_AUTO_CLOSE_MS : POPUP_AUTO_CLOSE_MS;
    if (millis() - popupStartTime >= autoCloseMs) {
        bool wasArrival = (currentPopupType == POPUP_ARRIVAL);
        hidePopup();
        if (wasArrival) {
            pageManager.setPage(PAGE_NAV);
            needRedraw = true;
        }
        return;
    }
    
    // 弹窗尺寸和位置
    bool prominentPopup = (currentPopupType == POPUP_GATE_CHANGE ||
                           currentPopupType == POPUP_ARRIVAL ||
                           currentPopupType == POPUP_BOARDING ||
                           currentPopupType == POPUP_FLIGHT_DELAY ||
                           currentPopupType == POPUP_FLIGHT_CANCELLED);
    bool arrivalPopup = (currentPopupType == POPUP_ARRIVAL);
    bool gateChangePopup = (currentPopupType == POPUP_GATE_CHANGE);
    int popupWidth = SCREEN_WIDTH - (arrivalPopup ? 16 : 20);
    int popupHeight = arrivalPopup ? 188 : (gateChangePopup ? 156 : (prominentPopup ? 176 : 132));
    int popupX = (SCREEN_WIDTH - popupWidth) / 2;
    int popupY = (SCREEN_HEIGHT - popupHeight) / 2;
    
    // 根据类型选择颜色
    uint16_t borderColor;
    uint16_t bgColor = 0x0000;  // 黑色背景
    switch (currentPopupType) {
        case POPUP_FLIGHT_DELAY:
            borderColor = RGB565_YELLOW;
            break;
        case POPUP_GATE_CHANGE:
            borderColor = 0x001F;  // 蓝色
            break;
        case POPUP_BOARDING:
            borderColor = 0x07E0;  // 绿色
            break;
        case POPUP_FLIGHT_CANCELLED:
            borderColor = RGB565_RED;
            break;
        case POPUP_ARRIVAL:
            borderColor = 0x07E0;
            break;
        default:
            borderColor = 0x001F;
            break;
    }
    
    // 绘制半透明背景遮罩
    gfx->fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, RGB565_BLACK);
    
    // 绘制弹窗背景
    gfx->fillRoundRect(popupX, popupY, popupWidth, popupHeight, 10, bgColor);
    gfx->drawRoundRect(popupX, popupY, popupWidth, popupHeight, 10, borderColor);
    
    // 绘制顶部颜色条
    gfx->fillRoundRect(popupX, popupY, popupWidth, 8, 8, borderColor);
    gfx->fillRect(popupX, popupY + 4, popupWidth, 4, borderColor);
    
    // 绘制标题
    if (arrivalPopup) {
        String destination = popupMessage;
        destination.replace("You've arrived at ", "");
        destination.replace("You have arrived at ", "");
        destination.replace("Arrived at ", "");
        destination.trim();
        if (destination.length() == 0) {
            destination = "Destination";
        }

        gfx->setCursor(popupX + 18, popupY + 28);
        gfx->setTextSize(3);
        gfx->setTextColor(RGB565_WHITE);
        gfx->print("ARRIVED");

        gfx->drawLine(popupX + 18, popupY + 68, popupX + popupWidth - 18, popupY + 68, borderColor);

        int destinationTextSize = destination.length() > 11 ? 2 : 4;
        gfx->setCursor(popupX + 18, popupY + 88);
        gfx->setTextSize(destinationTextSize);
        gfx->setTextColor(borderColor);
        gfx->print(destination);

        gfx->setCursor(popupX + 18, popupY + 138);
        gfx->setTextSize(2);
        gfx->setTextColor(RGB565_WHITE);
        gfx->print("Route complete");

        gfx->setCursor(popupX + 18, popupY + popupHeight - 28);
        gfx->setTextSize(1);
        gfx->setTextColor(0x528A);
        gfx->print("Returning to map");
        return;
    }

    if (gateChangePopup) {
        String gate = popupMessage;
        gate.replace("Gate Change", "");
        gate.replace("gate change", "");
        gate.replace("GATE CHANGE", "");
        gate.replace("Gate", "");
        gate.replace("gate", "");
        gate.replace("GATE", "");
        gate.replace("to", "");
        gate.replace("TO", "");
        gate.trim();
        if (gate.length() == 0) {
            gate = popupMessage;
        }

        gfx->setCursor(popupX + 14, popupY + 24);
        gfx->setTextSize(2);
        gfx->setTextColor(RGB565_WHITE);
        gfx->print("GATE");

        gfx->setCursor(popupX + 14, popupY + 50);
        gfx->setTextSize(2);
        gfx->setTextColor(RGB565_WHITE);
        gfx->print("CHANGE");

        gfx->drawLine(popupX + 14, popupY + 78, popupX + popupWidth - 14, popupY + 78, borderColor);

        gfx->setCursor(popupX + 18, popupY + 94);
        gfx->setTextSize(3);
        gfx->setTextColor(borderColor);
        gfx->print("TO ");
        gfx->setTextSize(gate.length() > 3 ? 3 : 4);
        gfx->print(gate);

        gfx->setCursor(popupX + 16, popupY + popupHeight - 24);
        gfx->setTextSize(1);
        gfx->setTextColor(0x528A);
        gfx->print("Auto close");
        return;
    }

    gfx->setCursor(popupX + 15, popupY + 22);
    gfx->setTextSize(currentPopupType == POPUP_GATE_CHANGE ? 3 : 2);
    gfx->setTextColor(borderColor);
    gfx->print(popupTitle);
    
    // 绘制消息内容（支持多行）
    gfx->setTextSize(1);
    gfx->setTextColor(RGB565_WHITE);
    
    // 消息分行显示
    int messageTextSize = prominentPopup ? 2 : 1;
    int lineHeight = prominentPopup ? 25 : 18;
    int maxCharsPerLine = prominentPopup ? 17 : 27;
    int maxLines = prominentPopup ? 4 : 4;
    if (currentPopupType == POPUP_GATE_CHANGE) {
        messageTextSize = 3;
        lineHeight = 34;
        maxCharsPerLine = 10;
        maxLines = 2;
    }
    gfx->setTextSize(messageTextSize);

    String msg = popupMessage;
    msg.replace('\n', ' ');
    msg.trim();
    int lineCount = 0;
    
    while (msg.length() > 0 && lineCount < maxLines) {
        int lineEnd = maxCharsPerLine;
        if (lineEnd > msg.length()) lineEnd = msg.length();
        
        String line = msg.substring(0, lineEnd);
        if (lineEnd < msg.length()) {
            int breakAt = line.lastIndexOf(' ');
            if (breakAt >= 6) {
                line = line.substring(0, breakAt);
                lineEnd = breakAt + 1;
            }
        }
        line.trim();
        gfx->setCursor(popupX + 15, popupY + 58 + lineCount * lineHeight);
        gfx->print(line);
        
        msg = msg.substring(lineEnd);
        msg.trim();
        lineCount++;
    }
    
    // 绘制倒计时进度条
    // 底部提示文字
    gfx->setCursor(popupX + 15, popupY + popupHeight - 35);
    gfx->setTextSize(1);
    gfx->setTextColor(0x528A);
    gfx->print("Auto close");
}


void SimpleDisplayManager::drawWaypointMarker(int x, int y, int index) {
    // 只在地图区域内绘制
    if (y < 0 || y >= SCREEN_HEIGHT / 2) return;
    
    int radius = 5;
    
    // 外圈白色
    gfx->drawCircle(x, y, radius, RGB565_WHITE);
    // 内圈蓝色
    gfx->fillCircle(x, y, radius - 1, 0x001F);
    
    // 显示序号
    char numStr[3];
    snprintf(numStr, sizeof(numStr), "%d", index);
    gfx->setCursor(x - 3, y - 4);
    gfx->setTextSize(1);
    gfx->setTextColor(RGB565_WHITE);
    gfx->print(numStr);
}
