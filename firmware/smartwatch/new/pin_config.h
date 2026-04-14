// pin_config.h - 新硬件 S3A3 配置
#pragma once

// ========== 电源管理 ==========
#define XPOWERS_CHIP_AXP2101

// ========== 显示屏 ST7789V (SPI接口) ==========
#define TFT_SCLK 7      // SPI时钟
#define TFT_MOSI 5      // SPI数据
#define TFT_CS 8        // 片选
#define TFT_DC 6        // 数据/命令
#define TFT_RST 4       // 复位
#define TFT_BL 14       // 背光
#define TFT_WIDTH 240
#define TFT_HEIGHT 280

// ========== 触摸屏 FT6146 ==========
#define TP_RST 7        // 触摸复位 (注意与LCD_SCLK共用？需要确认)
#define TP_INT 46       // 触摸中断
#define IIC_SDA 1       // I2C数据 (与IMU/电量计共用)
#define IIC_SCL 2       // I2C时钟

// ========== IMU QMI8658C (I2C接口) ==========
// 使用与触摸相同的I2C引脚 IIC_SDA/IIC_SCL
#define IMU_ADDR 0x6B   // QMI8658 I2C地址

// ========== 音频 ES8311 (I2S接口) ==========
#define I2S_BCLK 18     // 位时钟
#define I2S_WS 13       // 字时钟
#define I2S_DO 12       // 数据输出
#define I2S_DI 17       // 数据输入
#define I2S_MCLK 21     // 主时钟
#define PA_EN 39        // 音频功放使能

// ========== 电量计 MAX17048G (I2C接口) ==========
// 使用与触摸相同的I2C引脚
#define FUEL_GAUGE_ADDR 0x36

// ========== 电池电压检测 ==========
#define BAT_ADC_PIN 3   // ADC引脚

// ========== 按钮 ==========
#define BOOT_BUTTON_PIN 0   // SOS按钮（上键）- 低电平有效
#define PWR_BUTTON_PIN 45   // PWR按钮（下键）- 高电平有效

// ========== 其他 ==========
#define SPEAKER_PIN -1      // 使用I2S音频，不需要单独PWM引脚
#define VIB_PWM 9           // 振动马达PWM（可选）

// ========== SD卡（可选）==========
#define SDMMC_CLK 47
#define SDMMC_CMD 38
#define SDMMC_DATA 48