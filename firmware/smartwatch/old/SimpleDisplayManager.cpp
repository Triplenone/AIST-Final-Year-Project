// SimpleDisplayManager.cpp - 完整版本
#include "SimpleDisplayManager.h"
#include "pin_config.h"
#include <cstring>     // 添加这个 for strncpy, strlen
#include <cstdio>      // 添加这个 for snprintf
#include <cstdint>     // 添加这个 for uint8_t, uint16_t
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

// 声明外部互斥锁
extern SemaphoreHandle_t spiMutex;

// 静态成员初始化
SimpleDisplayManager* SimpleDisplayManager::instance = nullptr;

// JPEG解码回调
bool SimpleDisplayManager::jpeg_output(int16_t x, int16_t y, uint16_t w, uint16_t h, uint16_t* bitmap) {
    if (instance && instance->gfx) {
        if (x + w <= instance->gfx->width() && y + h <= instance->gfx->height()) {
            instance->gfx->draw16bitRGBBitmap(x, y, bitmap, w, h);
            return true;
        }
    }
    return false;
}

// ================ 构造函数 ================
SimpleDisplayManager::SimpleDisplayManager(Arduino_GFX* display) : gfx(display) {
    instance = this;
    fullMapBuffer = nullptr;
    screenBuffer = nullptr;
    map_loaded = false;
    needRedraw = true;
    isLoading = false;
    follow_mode = true;
    show_legend = false;
    flight_info.has_info = false;
    flight_info_visible = true;  // 默认显示

    // 初始化新成员
    wifi_connected = false;
    battery_level = 100;
    wifi_rssi = 0;
    sos_emergency_mode = false;
    sos_start_time = 0;
    
    // 初始化目标名称
    strcpy(target_name, "Boarding Gate");
    
    // 设置默认位置
    current_x = 3.0;
    current_y = 14.0;
    target_x = 6.0;
    target_y = 2.0;
    view_center_x = 6.0;
    view_center_y = 8.0;
    last_current_x = -1;
    last_current_y = -1;
    
    // 地图边界
    map_min_x = 0.0;
    map_max_x = 12.0;
    map_min_y = 0.0;
    map_max_y = 16.0;
    
    // 地图尺寸
    map_img_width = 600;
    map_img_height = 800;
    view_width = 12.0;
    view_height = 16.0;
    
    updateMapScale();
}
void SimpleDisplayManager::drawFlightInfo() {
    if (!flight_info_visible) return;
    
    int y_start = 35;
    int height = 60;
    int width = gfx->width() - 20;
    int x_start = 10;
    
    // 黑色背景
    gfx->fillRect(x_start, y_start, width, height, 0x0000);
    gfx->drawRect(x_start, y_start, width, height, 0xFFFF);
    
    // 设置字号为2
    gfx->setTextSize(2);
    gfx->setTextColor(0xFFFF);
    
    // 第一行：航班号 + 目的地 + 登机口
    gfx->setCursor(x_start + 10, y_start + 5);
    gfx->print("    ");
    gfx->print(flight_info.flight_no.c_str());
    gfx->print(" ");
    gfx->print(flight_info.destination.c_str());
    gfx->print(" Gate ");
    gfx->print(flight_info.gate.c_str());
    
    // 第二行：登机时间 + 延误信息
    gfx->setCursor(x_start + 10, y_start + 35);
    gfx->print("Boarding: ");
    gfx->print(flight_info.boarding_time.c_str());
    
    if (flight_info.delay_minutes > 0) {
        gfx->print(" Delayed ");
        gfx->print(flight_info.delay_minutes);
        gfx->print(" min");
    }
    
    Serial.println("[显示] 绘制完整航班信息");
    Serial.printf("  %s %s Gate %s %s +%dmin\n",
                 flight_info.flight_no.c_str(),
                 flight_info.destination.c_str(),
                 flight_info.gate.c_str(),
                 flight_info.boarding_time.c_str(),
                 flight_info.delay_minutes);
}

// ================ 更新地图缩放 ================
void SimpleDisplayManager::updateMapScale() {
    if (gfx) {
        map_scale_x = (float)gfx->width() / view_width;
        map_scale_y = (float)gfx->height() / view_height;
    }
}

// ================ init函数 ================
bool SimpleDisplayManager::init() {
    Wire.begin(IIC_SDA, IIC_SCL);
    
    Serial.println("初始化SD卡和显示管理器...");
    
    SD_MMC.setPins(SDMMC_CLK, SDMMC_CMD, SDMMC_DATA);
    
    if (!SD_MMC.begin("/sdcard", true)) {
        Serial.println("SD卡初始化失败");
        return false;
    }
    
    Serial.println("SD卡初始化成功");
    
    // 列出SD卡文件
    File root = SD_MMC.open("/");
    File file = root.openNextFile();
    while (file) {
        Serial.printf("  %s (%d bytes)\n", file.name(), file.size());
        file = root.openNextFile();
    }
    root.close();
    
    // 配置JPEG解码器
    TJpgDec.setJpgScale(1);
    TJpgDec.setSwapBytes(true);
    TJpgDec.setCallback(jpeg_output);
    
    // 分配屏幕缓冲
    size_t screenSize = gfx->width() * gfx->height() * 2;
    Serial.printf("屏幕尺寸: %dx%d, 需要缓冲: %d KB\n", 
                  gfx->width(), gfx->height(), screenSize / 1024);
    
    if (psramFound()) {
        screenBuffer = (uint16_t*)ps_malloc(screenSize);
        Serial.println("使用PSRAM分配屏幕缓冲");
    } else {
        screenBuffer = (uint16_t*)malloc(screenSize);
        Serial.println("使用内部RAM分配屏幕缓冲");
    }
    
    if (!screenBuffer) {
        Serial.println("屏幕缓冲分配失败");
        return false;
    }
    
    Serial.printf("屏幕缓冲分配成功: %p\n", screenBuffer);
    
    // 清屏
    if (spiMutex && xSemaphoreTake(spiMutex, pdMS_TO_TICKS(1000)) == pdTRUE) {
        gfx->fillScreen(RGB565_BLACK);
        gfx->setCursor(10, 10);
        gfx->setTextColor(RGB565_WHITE);
        gfx->print("Display OK");
        xSemaphoreGive(spiMutex);
    }
    
    Serial.println("✅ 显示管理器初始化完成");
    return true;
}

// SimpleDisplayManager.cpp 中修改 mapToPixelX 和 mapToPixelY

int SimpleDisplayManager::mapToPixelX(float map_x) {
    // 实际坐标 X 直接对应 BMP 像素 X
    // 例如：x=3 -> 3*50 = 150
    return (int)(map_x * 50);
}

int SimpleDisplayManager::mapToPixelY(float map_y) {
    // 实际坐标 Y 直接对应 BMP 像素 Y
    // 例如：y=14 -> 14*50 = 700
    return (int)(map_y * 50);
}

// ================ 地图坐标转屏幕坐标 ================
void SimpleDisplayManager::mapToScreen(float map_x, float map_y, int& screen_x, int& screen_y) {
    float rel_x = map_x - (view_center_x - view_width/2);
    float rel_y = map_y - (view_center_y - view_height/2);
    
    screen_x = (int)(rel_x * map_scale_x);
    screen_y = (int)(rel_y * map_scale_y);
    
    if (screen_x < 0 || screen_x >= gfx->width() || 
        screen_y < 0 || screen_y >= gfx->height()) {
        screen_x = -1;
        screen_y = -1;
    }
}

// ================ 开始加载地图 ================
bool SimpleDisplayManager::startLoadingMap(const char* filename) {
    Serial.printf("尝试加载地图: %s\n", filename);
    
    if (!SD_MMC.exists(filename)) {
        Serial.println("地图文件不存在");
        return false;
    }
    
    // 先获取文件大小和信息
    File bmpFile = SD_MMC.open(filename, FILE_READ);
    if (!bmpFile) {
        Serial.println("无法打开地图文件");
        return false;
    }
    
    uint8_t header[54];
    if (bmpFile.read(header, 54) != 54) {
        Serial.println("无法读取BMP头");
        bmpFile.close();
        return false;
    }
    
    map_img_width = *(uint32_t*)&header[18];
    map_img_height = *(uint32_t*)&header[22];
    uint16_t bitsPerPixel = *(uint16_t*)&header[28];
    
    Serial.printf("BMP尺寸: %dx%d, %d位\n", map_img_width, map_img_height, bitsPerPixel);
    bmpFile.close();
    
    // 计算完整地图所需内存
    size_t mapSize = map_img_width * map_img_height * 2;
    Serial.printf("需要内存: %d KB (%.2f MB)\n", mapSize / 1024, mapSize / 1024.0 / 1024.0);
    
    // 分配PSRAM
    if (psramFound()) {
        fullMapBuffer = (uint16_t*)ps_malloc(mapSize);
        Serial.println("使用PSRAM分配");
    } else {
        fullMapBuffer = (uint16_t*)malloc(mapSize);
        Serial.println("使用内部RAM分配");
    }
    
    if (!fullMapBuffer) {
        Serial.println("内存分配失败！");
        return false;
    }
    
    // 设置为加载状态
    isLoading = true;
    map_loaded = false;
    loadStartTime = millis();
    
    Serial.printf("地图加载启动，缓冲区: %p\n", fullMapBuffer);
    return true;
}

// ================ 处理加载过程 ================
void SimpleDisplayManager::processLoading() {
    if (!isLoading || !fullMapBuffer) return;
    
    static File bmpFile;
    static int currentY = 0;
    static uint32_t dataOffset = 0;
    static uint32_t rowSize = 0;
    static uint8_t* rowBuffer = nullptr;
    static int bitsPerPixel = 0;
    static int imgWidth = 0, imgHeight = 0;
    
    // 第一次调用，打开文件
    if (currentY == 0) {
        bmpFile = SD_MMC.open("/Boarding_Hall01.bmp", FILE_READ);
        if (!bmpFile) {
            Serial.println("无法打开地图文件");
            isLoading = false;
            return;
        }
        
        // 读取BMP头
        uint8_t header[54];
        if (bmpFile.read(header, 54) != 54) {
            Serial.println("无法读取BMP头");
            bmpFile.close();
            isLoading = false;
            return;
        }
        
        dataOffset = *(uint32_t*)&header[10];
        imgWidth = *(uint32_t*)&header[18];
        imgHeight = *(uint32_t*)&header[22];
        bitsPerPixel = *(uint16_t*)&header[28];
        
        Serial.printf("BMP信息: %dx%d, %d位, 数据偏移=%d\n", 
                     imgWidth, imgHeight, bitsPerPixel, dataOffset);
        
        // 更新全局变量
        map_img_width = imgWidth;
        map_img_height = imgHeight;
        
        // 计算行大小（根据位深度）
        int rowBytes;
        if (bitsPerPixel == 1) {
            // 单色图：每像素1位，每行字节数 = (宽度 + 31) / 32 * 4
            rowBytes = ((imgWidth + 31) / 32) * 4;
        } else {
            // 彩色图：每像素 bytesPerPixel 字节，4字节对齐
            rowBytes = imgWidth * (bitsPerPixel / 8);
            rowBytes = ((rowBytes + 3) / 4) * 4;
        }
        rowSize = rowBytes;
        
        Serial.printf("每行字节: %d\n", rowSize);
        
        // 分配行缓冲
        rowBuffer = (uint8_t*)malloc(rowSize);
        if (!rowBuffer) {
            Serial.println("行缓冲分配失败");
            bmpFile.close();
            isLoading = false;
            return;
        }
        
        Serial.println("开始加载地图...");
    }
    
    // 每次处理10行
    const int BATCH_SIZE = 10;
    int batchEnd = min(currentY + BATCH_SIZE, imgHeight);
    
    for (int y = currentY; y < batchEnd; y++) {
        // BMP文件是从底部到顶部存储的
        int bmpY = imgHeight - 1 - y;
        
        // 定位到该行数据
        uint32_t filePos = dataOffset + bmpY * rowSize;
        if (!bmpFile.seek(filePos)) {
            Serial.printf("定位行 %d 失败, 位置=%u\n", y, filePos);
            continue;
        }
        
        // 读取一行数据
        size_t bytesRead = bmpFile.read(rowBuffer, rowSize);
        if (bytesRead != rowSize) {
            Serial.printf("读取行 %d 失败: 读取 %d 字节, 期望 %d 字节\n", 
                         y, bytesRead, rowSize);
            continue;
        }
        
        // 转换为RGB565并存储到fullMapBuffer
        uint32_t fbIndex = y * imgWidth;
        
        if (bitsPerPixel == 1) {
            // 单色图处理
            for (int x = 0; x < imgWidth; x++) {
                int bytePos = x / 8;
                int bitPos = 7 - (x % 8);  // BMP中高位在左
                
                if (bytePos < rowSize) {
                    uint8_t byte = rowBuffer[bytePos];
                    bool isWhite = (byte >> bitPos) & 0x01;
                    
                    // 安全检查：确保索引不越界
                    if (fbIndex + x < (uint32_t)(imgWidth * imgHeight)) {
                        // 白色：0xFFFF, 黑色：0x0000
                        fullMapBuffer[fbIndex + x] = isWhite ? 0xFFFF : 0x0000;
                    }
                }
            }
        } else {
            // 彩色图处理（保留）
            for (int x = 0; x < imgWidth; x++) {
                if (x * 3 + 2 < rowSize) {
                    uint8_t *p = rowBuffer + x * 3;
                    uint8_t b = p[0];
                    uint8_t g = p[1];
                    uint8_t r = p[2];
                    
                    uint16_t rgb565 = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
                    
                    if (fbIndex + x < (uint32_t)(imgWidth * imgHeight)) {
                        fullMapBuffer[fbIndex + x] = rgb565;
                    }
                }
            }
        }
    }
    
    currentY = batchEnd;
    
    // 打印进度
    if (currentY % 50 == 0 || currentY >= imgHeight) {
        Serial.printf("加载进度: %d/%d (%.1f%%)\n", 
                     currentY, imgHeight, (float)currentY / imgHeight * 100);
    }
    
    // 加载完成
    if (currentY >= imgHeight) {
        free(rowBuffer);
        bmpFile.close();
        
        map_loaded = true;
        isLoading = false;
        needRedraw = true;
        
        unsigned long elapsed = millis() - loadStartTime;
        Serial.printf("✅ 地图加载完成，耗时: %d ms\n", elapsed);
        
        // 立即更新视口
        updateViewport();
    }
}

// ================ 更新视口 ================
bool SimpleDisplayManager::updateViewport() {
    if (!map_loaded || !fullMapBuffer || !screenBuffer) {
        return false;
    }
    
    // 计算当前位置对应的像素坐标
    int centerPixelX = mapToPixelX(view_center_x);
    int centerPixelY = mapToPixelY(view_center_y);
    
    // 计算视口在完整地图上的起始像素
    int startX = centerPixelX - gfx->width() / 2;
    int startY = centerPixelY - gfx->height() / 2;
    
    // 边界检查
    startX = constrain(startX, 0, map_img_width - gfx->width());
    startY = constrain(startY, 0, map_img_height - gfx->height());
    
    // 从完整地图复制到屏幕缓冲
    for (int y = 0; y < gfx->height(); y++) {
        int mapY = startY + y;
        if (mapY >= map_img_height) break;
        
        uint32_t srcIndex = mapY * map_img_width + startX;
        uint32_t dstIndex = y * gfx->width();
        
        memcpy(&screenBuffer[dstIndex], &fullMapBuffer[srcIndex], gfx->width() * 2);
    }
    
    needRedraw = true;
    return true;
}

// ================ 显示屏幕缓冲 ================
void SimpleDisplayManager::drawScreen() {
    if (!screenBuffer || !needRedraw) return;
    
    if (spiMutex == NULL) return;
    
    if (xSemaphoreTake(spiMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        gfx->draw16bitRGBBitmap(0, 0, screenBuffer, gfx->width(), gfx->height());
        xSemaphoreGive(spiMutex);
        needRedraw = false;
    }
}

// ================ update函数 ================
void SimpleDisplayManager::update() {
    unsigned long now = millis();
    static unsigned long lastDebugPrint = 0;
    
    // 每秒打印一次SOS状态
    if (now - lastDebugPrint > 1000) {
        lastDebugPrint = now;
        if (sos_emergency_mode) {
            Serial.printf("[显示] SOS模式激活中，持续时长: %lu秒\n", 
                         (now - sos_start_time) / 1000);
        }
    }
    
    // SOS模式：全屏显示SOS
    if (sos_emergency_mode) {
        static bool blink = false;
        static unsigned long last_blink = 0;
        static int blinkCount = 0;
        
        if (now - last_blink > 500) {
            blink = !blink;
            last_blink = now;
            blinkCount++;
            Serial.printf("[显示] SOS闪烁 #%d, state=%d\n", blinkCount, blink);
        }
        
        if (spiMutex) {
            if (xSemaphoreTake(spiMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
                if (blink) {
                    Serial.println("[显示] 绘制红色SOS");
                    gfx->fillScreen(0xF800);  // 红色背景
                    
                    // 计算文字位置（居中）
                    int textWidth = 120;  // 估算的SOS文字宽度
                    int textX = (gfx->width() - textWidth) / 2;
                    int textY = gfx->height() / 2 - 50;
                    
                    gfx->setCursor(textX, textY);
                    gfx->setTextColor(0xFFFF);
                    gfx->setTextSize(8);
                    gfx->print("SOS");
                    
                    // 显示EMERGENCY小字
                    gfx->setCursor(textX + 20, textY + 80);
                    gfx->setTextSize(2);
                    gfx->print("EMERGENCY");
                    
                    Serial.printf("  绘制位置: (%d, %d)\n", textX, textY);
                } else {
                    Serial.println("[显示] 黑屏");
                    gfx->fillScreen(0x0000);
                }
                xSemaphoreGive(spiMutex);
            } else {
                Serial.println("[显示] 无法获取SPI互斥锁");
            }
        } else {
            Serial.println("[显示] spiMutex为空！");
        }
        
        // SOS显示3分钟后自动退出
        if (now - sos_start_time > 180000) {
            Serial.println("[显示] SOS超时，自动退出");
            sos_emergency_mode = false;
        }
        return;
    }
    
    // 正常显示模式
    static unsigned long lastStatusPrint = 0;
    
    // 打印加载状态
    if (now - lastStatusPrint > 5000) {
        lastStatusPrint = now;
        Serial.printf("显示状态: isLoading=%d, map_loaded=%d\n", 
                     isLoading, map_loaded);
    }
    
    // 处理地图加载
    if (isLoading) {
        processLoading();
        return;
    }
    
    // 如果地图还没加载好，不进行任何显示操作
    if (!map_loaded || !fullMapBuffer) {
        static bool waitingPrinted = false;
        if (!waitingPrinted) {
            Serial.println("等待地图加载...");
            waitingPrinted = true;
        }
        return;
    }

    // 如果地图刚加载完成，立即显示
    static bool firstDisplay = false;
    if (map_loaded && !firstDisplay) {
        firstDisplay = true;
        Serial.println("地图加载完成，首次显示");
        updateViewport();
        drawScreen();
    }
    
    // 跟随模式
    if (follow_mode) {
        view_center_x = current_x;
        view_center_y = current_y;
    }
    
    // 如果位置变化，更新视口
    if (abs(current_x - last_current_x) > 0.1 || 
        abs(current_y - last_current_y) > 0.1) {
        
        if (map_loaded) {
            updateViewport();
        }
        
        last_current_x = current_x;
        last_current_y = current_y;
    }
    
    if (!map_loaded || !fullMapBuffer) return;
    
    // 绘制地图
    if (needRedraw) drawScreen();
    
    // 绘制UI元素（按顺序）
    drawPositions();           // 地图上的位置标记
    drawStatusBar();           // 顶部状态栏
    drawFlightInfo();          // 航班信息（常驻）
    if (show_nav) {            // 导航栏（双击PWR切换）
        drawNavigationDirection();
    }
    if (show_legend) drawLegend();  // 图例
    
    taskYIELD();
}

void SimpleDisplayManager::drawStatusBar() {
    if (spiMutex == NULL) return;
    if (xSemaphoreTake(spiMutex, pdMS_TO_TICKS(50)) != pdTRUE) return;
    
    const int TOP_PADDING = 15;      // 顶部边距
    const int SIDE_PADDING = 10;     // 左右边距（为圆角留出空间）
    
    // 绘制状态栏背景（半透明黑条）- 现在从 SIDE_PADDING 开始，到 SIDE_PADDING 结束
    gfx->fillRect(SIDE_PADDING, 0, gfx->width() - SIDE_PADDING * 2, 30, 0x0000);
    
    // 左上角：WiFi图标（向右移动 SIDE_PADDING）
    drawWiFiIcon(SIDE_PADDING + 50, TOP_PADDING);
    
    // 右上角：时间和电量（向左移动 SIDE_PADDING）
    char time_str[10];
    snprintf(time_str, sizeof(time_str), "%02d:%02d", hour, minute);
    gfx->setCursor(gfx->width() - 140 - SIDE_PADDING, TOP_PADDING);
    gfx->setTextColor(0xFFFF);
    gfx->setTextSize(2);
    gfx->print(time_str);
    
    // 电量图标（向左移动 SIDE_PADDING）
    drawBatteryIcon(gfx->width() - 80 - SIDE_PADDING, TOP_PADDING);
    
    xSemaphoreGive(spiMutex);
}

void SimpleDisplayManager::drawWiFiIcon(int x, int y) {
    // 确保图标不超出左边界
    if (x < 20) x = 20;
    
    if (!wifi_connected) {
        // 画一个带叉的WiFi图标
        gfx->drawLine(x, y+10, x+15, y+10, 0xF800);
        return;
    }
    
    // 根据信号强度画不同数量的弧线
    int bars = 0;
    if (wifi_rssi > -50) bars = 4;
    else if (wifi_rssi > -60) bars = 3;
    else if (wifi_rssi > -70) bars = 2;
    else if (wifi_rssi > -80) bars = 1;
    
    for (int i = 0; i < bars; i++) {
        int radius = 5 + i * 4;
        gfx->drawCircle(x + 8, y + 10, radius, 0xFFFF);
    }
    // 画圆点
    gfx->fillCircle(x + 8, y + 10, 2, 0xFFFF);
}

void SimpleDisplayManager::drawBatteryIcon(int x, int y) {
    // 确保图标不超出右边界
    if (x + 28 > gfx->width() - 20) {
        x = gfx->width() - 48;
    }
    
    // 电池外框
    gfx->drawRect(x, y, 25, 12, 0xFFFF);
    gfx->fillRect(x + 25, y + 3, 3, 6, 0xFFFF);  // 电池头
    
    // 电量填充
    int fillWidth = (battery_level * 23) / 100;
    uint16_t color = 0x07E0;  // 绿色
    if (battery_level < 20) color = 0xF800;  // 红色低电量
    else if (battery_level < 50) color = 0xFFE0;  // 黄色
    
    gfx->fillRect(x + 1, y + 1, fillWidth, 10, color);
}

void SimpleDisplayManager::drawNavigationDirection() {
    if (!show_nav) return;  // 导航由双击PWR控制
    
    int center_x = gfx->width() / 2;
    int center_y = gfx->height() - 50;  // 放在底部
    
    // 确保导航栏不超出左右边界
    int nav_width = 200;
    int nav_left = center_x - nav_width/2;
    if (nav_left < 30) nav_left = 30;
    if (nav_left + nav_width > gfx->width() - 30) {
        nav_left = gfx->width() - nav_width - 30;
    }
    
    if (spiMutex == NULL) return;
    if (xSemaphoreTake(spiMutex, pdMS_TO_TICKS(50)) != pdTRUE) return;
    
    // 绘制导航背景（考虑圆角）
    gfx->fillRect(nav_left, center_y - 25, nav_width, 50, 0x2104);
    gfx->drawRect(nav_left, center_y - 25, nav_width, 50, 0xFFFF);
    
    // 计算方向
    float dx = target_x - current_x;
    float dy = target_y - current_y;
    float distance = sqrt(dx*dx + dy*dy);
    
    // 方向箭头
    if (distance > 0.5) {
        float angle = atan2(dy, dx);
        
        // 画箭头
        int arrow_x = nav_left + 60;
        int arrow_y = center_y;
        
        // 箭头线
        gfx->drawLine(arrow_x, arrow_y, 
                     arrow_x + (int)(30 * cos(angle)), 
                     arrow_y + (int)(30 * sin(angle)), 
                     0x07E0);
        
        // 箭头三角形
        int tip_x = arrow_x + (int)(30 * cos(angle));
        int tip_y = arrow_y + (int)(30 * sin(angle));
        
        float angle_left = angle + 0.5;
        float angle_right = angle - 0.5;
        
        gfx->fillTriangle(
            tip_x, tip_y,
            tip_x - (int)(10 * cos(angle_left)), tip_y - (int)(10 * sin(angle_left)),
            tip_x - (int)(10 * cos(angle_right)), tip_y - (int)(10 * sin(angle_right)),
            0x07E0
        );
    }
    
    // 显示距离
    char dist_str[20];
    snprintf(dist_str, sizeof(dist_str), "%.0f m", distance);
    
    gfx->setCursor(nav_left + 120, center_y - 10);
    gfx->setTextColor(0xFFFF);
    gfx->setTextSize(2);
    gfx->print(dist_str);
    
    // 显示目标名称
    gfx->setCursor(nav_left + 20, center_y - 40);
    gfx->setTextColor(0x07E0);
    gfx->setTextSize(1);
    gfx->print(target_name);
    
    xSemaphoreGive(spiMutex);
}

// ================ 视口控制函数 ================
void SimpleDisplayManager::setViewCenter(float x, float y) {
    view_center_x = constrain(x, map_min_x + view_width/2, map_max_x - view_width/2);
    view_center_y = constrain(y, map_min_y + view_height/2, map_max_y - view_height/2);
    updateViewport();
}

void SimpleDisplayManager::setViewSize(float width, float height) {
    view_width = constrain(width, 5.0, map_max_x - map_min_x);
    view_height = constrain(height, 5.0, map_max_y - map_min_y);
    updateMapScale();
    updateViewport();
}

void SimpleDisplayManager::setMapBounds(float min_x, float max_x, float min_y, float max_y) {
    map_min_x = min_x;
    map_max_x = max_x;
    map_min_y = min_y;
    map_max_y = max_y;
}

void SimpleDisplayManager::setMapImageSize(int width, int height) {
    map_img_width = width;
    map_img_height = height;
}

// ================ 位置函数 ================
void SimpleDisplayManager::setCurrentPosition(float x, float y) {
    current_x = constrain(x, map_min_x, map_max_x);
    current_y = constrain(y, map_min_y, map_max_y);
}

void SimpleDisplayManager::setTargetPosition(float x, float y, const char* name) {
    target_x = constrain(x, map_min_x, map_max_x);
    target_y = constrain(y, map_min_y, map_max_y);
    if (name) {
        strncpy(target_name, name, sizeof(target_name)-1);
        target_name[sizeof(target_name)-1] = '\0';
    }
}

void SimpleDisplayManager::clear() {
    if (spiMutex != NULL && xSemaphoreTake(spiMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        gfx->fillScreen(0x0000);
        xSemaphoreGive(spiMutex);
    }
}

// ================ 时间函数 ================
void SimpleDisplayManager::setTime(uint8_t h, uint8_t m, uint8_t s) {
    hour = h; minute = m; second = s;
}

void SimpleDisplayManager::setDate(uint16_t y, uint8_t mon, uint8_t d) {
    year = y; month = mon; day = d;
}

void SimpleDisplayManager::setStatus(const char* status) {
    strncpy(status_str, status, sizeof(status_str)-1);
    status_str[sizeof(status_str)-1] = '\0';
}

void SimpleDisplayManager::showNavigation(const char* direction, float distance) {
    snprintf(nav_str, sizeof(nav_str), "%s %.1fm", direction, distance);
    show_nav = true;
    nav_timeout = millis() + 5000;
}

// 在 SimpleDisplayManager.cpp 中
void SimpleDisplayManager::showSOS(bool active) {
    Serial.printf("[显示] showSOS(%d) 被调用\n", active);
    Serial.printf("  - 当前sos_emergency_mode = %d\n", sos_emergency_mode);
    Serial.printf("  - display指针 = %p\n", gfx);
    Serial.printf("  - spiMutex = %p\n", spiMutex);
    
    sos_emergency_mode = active;
    if (active) {
        sos_start_time = millis();
        Serial.printf("  - SOS激活，开始时间: %lu\n", sos_start_time);
    } else {
        sos_emergency_mode = false;
        Serial.println("  - SOS解除");
        needRedraw = true;
    }
}

// ================ 绘制函数 ================
void SimpleDisplayManager::drawText(int x, int y, const char* text, uint16_t color, int size) {
    if (spiMutex == NULL) return;
    
    if (xSemaphoreTake(spiMutex, pdMS_TO_TICKS(100)) != pdTRUE) return;
    
    gfx->setCursor(x, y);
    gfx->setTextColor(color);
    gfx->setTextSize(size);
    gfx->print(text);
    
    xSemaphoreGive(spiMutex);
}

// void SimpleDisplayManager::drawTime() {
//     char time_str[10];
//     snprintf(time_str, sizeof(time_str), "%02d:%02d", hour, minute);
//     drawText(10, 10, time_str, 0xFFFF, 3);
// }

// void SimpleDisplayManager::drawDate() {
//     char date_str[20];
//     snprintf(date_str, sizeof(date_str), "%04d-%02d-%02d", year, month, day);
//     drawText(10, 50, date_str, 0xFFFF, 2);
// }

// void SimpleDisplayManager::drawStatus() {
//     if (strlen(status_str) > 0) {
//         drawText(200, 10, status_str, 0x07E0, 1);
//     }
// }

void SimpleDisplayManager::drawPositions() {
    int cur_x, cur_y, tar_x, tar_y;
    
    mapToScreen(current_x, current_y, cur_x, cur_y);
    mapToScreen(target_x, target_y, tar_x, tar_y);
    
    static unsigned long lastDebug = 0;
    if (millis() - lastDebug > 10000) {
        Serial.printf("[显示转换] 当前 (%.1f,%.1f) -> 屏幕 (%d,%d)\n", 
                     current_x, current_y, cur_x, cur_y);
        Serial.printf("[显示转换] 目标 (%.1f,%.1f) -> 屏幕 (%d,%d)\n", 
                     target_x, target_y, tar_x, tar_y);
        lastDebug = millis();
    }
    
    if (spiMutex == NULL) return;
    
    if (xSemaphoreTake(spiMutex, pdMS_TO_TICKS(10)) != pdTRUE) return;
    
    // 绘制当前位置
    if (cur_x >= 0 && cur_y >= 0) {
        gfx->fillCircle(cur_x, cur_y, 8, 0xF800);
        gfx->drawCircle(cur_x, cur_y, 8, 0xFFFF);
        gfx->setCursor(cur_x - 15, cur_y - 25);
        gfx->setTextColor(0xFFFF);
        gfx->setTextSize(1);
        gfx->print("You");
    }
    
    // 绘制目标位置
    if (tar_x >= 0 && tar_y >= 0) {
        gfx->fillCircle(tar_x, tar_y, 8, 0x07E0);
        gfx->drawCircle(tar_x, tar_y, 8, 0xFFFF);
        gfx->setCursor(tar_x - 15, tar_y - 25);
        gfx->setTextColor(0x07E0);
        gfx->setTextSize(1);
        gfx->print(target_name);
    }
    
    xSemaphoreGive(spiMutex);
}

void SimpleDisplayManager::drawLegend() {
    int start_x = 10;
    int start_y = gfx->height() - 120;
    
    if (spiMutex == NULL) return;
    
    if (xSemaphoreTake(spiMutex, pdMS_TO_TICKS(100)) != pdTRUE) return;
    
    gfx->fillRect(start_x - 5, start_y - 5, 150, 110, 0x3186);
    gfx->setCursor(start_x, start_y);
    gfx->setTextColor(0xFFFF);
    gfx->setTextSize(1);
    gfx->print("=== Legend ===");
    
    const char* zones[] = {"Gate (6,14)", "Security (4,7)", "Check-in (3,2)", 
                           "Toilet (9,10)", "Current", "Target"};
    uint16_t colors[] = {0xF800, 0x07FF, 0x07E0, 0x07E0, 0xF800, 0x07E0};
    
    for (int i = 0; i < 6; i++) {
        int y = start_y + 20 + i * 20;
        
        if (i < 4) {
            gfx->fillRect(start_x, y, 10, 10, colors[i]);
        } else {
            gfx->fillCircle(start_x + 5, y + 5, 5, colors[i]);
        }
        
        gfx->drawRect(start_x, y, 10, 10, 0xFFFF);
        gfx->setCursor(start_x + 15, y);
        gfx->setTextColor(0xFFFF);
        gfx->setTextSize(1);
        gfx->print(zones[i]);
    }
    
    xSemaphoreGive(spiMutex);
}