// PowerManager.cpp
#include "PowerManager.h"
#include "pin_config.h"

// ================ 构造函数 ================
PowerManager::PowerManager() 
    : is_charging(false),
      is_discharging(false),
      battery_voltage(0),
      battery_percent(0),
      chip_temperature(0),
      gauge_available(false) {}

// ================ init函数 ================
bool PowerManager::init() {
    Serial.println("电源管理初始化...");
    
    // 初始化 I2C（如果还没初始化）
    Wire.begin(IIC_SDA, IIC_SCL);
    
    // 初始化 MAX17048 电量计
    if (fuelGauge.begin()) {
        gauge_available = true;
        Serial.println("✅ MAX17048 电量计初始化成功");
        
        // 使用 getICversion() 而不是 getVersion()
        uint16_t version = fuelGauge.getICversion();
        Serial.printf("  版本: 0x%04X\n", version);
    } else {
        gauge_available = false;
        Serial.println("⚠️ MAX17048 电量计未找到，使用 ADC 模拟");
    }
    
    Serial.println("电源管理初始化完成");
    return true;
}

// ================ update函数 ================
void PowerManager::update() {
    updateBatteryStatus();
}

// ================ updateBatteryStatus函数 ================
void PowerManager::updateBatteryStatus() {
    static unsigned long lastPrint = 0;
    unsigned long now = millis();

    if (gauge_available) {
        // 使用 MAX17048 读取真实电池数据
        battery_voltage = fuelGauge.cellVoltage();
        battery_percent = fuelGauge.cellPercent();
        
        // MAX17048 不直接提供充电状态，需要通过电压变化判断
        static float last_voltage = battery_voltage;
        if (battery_voltage > last_voltage + 0.01) {
            is_charging = true;
            is_discharging = false;
        } else if (battery_voltage < last_voltage - 0.01) {
            is_charging = false;
            is_discharging = true;
        }
        last_voltage = battery_voltage;
        
    } else {
        // 备用方案：使用 ADC 读取
        #ifdef BAT_ADC_PIN
            int adcValue = analogRead(BAT_ADC_PIN);
            battery_voltage = (adcValue / 4095.0) * 3.3 * 2;
        #else
            // 模拟数据
            static float simulated_voltage = 3.8;
            simulated_voltage += (random(-10, 10) / 1000.0);
            if (simulated_voltage < 3.3) simulated_voltage = 3.3;
            if (simulated_voltage > 4.2) simulated_voltage = 4.2;
            battery_voltage = simulated_voltage;
        #endif
        
        float min_voltage = 3.3;
        float max_voltage = 4.2;
        battery_percent = constrain(
            (int)((battery_voltage - min_voltage) / (max_voltage - min_voltage) * 100),
            0, 100);
    }
    
    // 限制电量范围
    battery_percent = constrain(battery_percent, 0, 100);
    
    // 每60秒打印一次（调试用）
        if (now - lastPrint > 60000) {
            lastPrint = now;
            // 使用单次打印而不是多次
            Serial.printf("电池: %.3fV, %d%%, %s\n", 
                         battery_voltage, battery_percent,
                         is_charging ? "充电中" : "放电中");
        }
}

// PowerManager.cpp - 修改 setBrightness 函数
void PowerManager::setBrightness(uint8_t level) {
    #ifdef LCD_BL
        // 使用旧版 LEDC API（ESP32-S3 2.0.17 支持）
        ledcSetup(1, 5000, 8);
        ledcAttachPin(LCD_BL, 1);
        ledcWrite(1, map(level, 0, 100, 0, 255));
    #endif
    Serial.printf("电源管理: 设置亮度 %d%%\n", level);
}

// ================ sleep函数 ================
void PowerManager::sleep() {
    Serial.println("进入睡眠模式");
    // TODO: 实现实际睡眠逻辑
}

// ================ wakeup函数 ================
void PowerManager::wakeup() {
    Serial.println("唤醒");
    // TODO: 实现实际唤醒逻辑
}