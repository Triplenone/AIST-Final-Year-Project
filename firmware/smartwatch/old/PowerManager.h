#ifndef POWER_MANAGER_H
#define POWER_MANAGER_H

#include <Arduino.h>

class PowerManager {
private:
    bool is_charging;
    bool is_discharging;
    float battery_voltage;
    int battery_percent;
    float chip_temperature;
    
public:
    PowerManager();
    bool init();
    void update();
    float getBatteryVoltage() { return battery_voltage; }
    int getBatteryPercent() { return battery_percent; }
    bool isCharging() { return is_charging; }
    bool isDischarging() { return is_discharging; }
    float getTemperature() { return chip_temperature; }
    void setBrightness(uint8_t level);
    void sleep();
    void wakeup();
    
private:
    void updateBatteryStatus();
};

#endif