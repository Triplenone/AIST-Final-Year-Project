// pin_config.h - 统一命名
#pragma once

#define XPOWERS_CHIP_AXP2101

#define LCD_SDIO0 4
#define LCD_SDIO1 5
#define LCD_SDIO2 6
#define LCD_SDIO3 7
#define LCD_SCLK 11
#define LCD_CS 12
#define LCD_RESET 8
#define LCD_WIDTH 410
#define LCD_HEIGHT 502

// TOUCH
#define IIC_SDA 15
#define IIC_SCL 14
#define TP_INT 38
#define TP_RESET 9

// SD卡引脚配置 - 统一使用 SDMMC 前缀
#define SDMMC_CLK 2    // SD卡时钟
#define SDMMC_CMD 1    // SD卡命令
#define SDMMC_DATA 3   // SD卡数据（注意：这里应该是DATA0，对于1线模式）

// 按钮引脚
#define BOOT_BUTTON_PIN 0
#define PWR_BUTTON_PIN 10

// 音频引脚（如果有）
#define SPEAKER_PIN 25