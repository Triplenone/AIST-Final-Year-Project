// VibrationManager.h
#ifndef VIBRATION_MANAGER_H
#define VIBRATION_MANAGER_H

#include <Arduino.h>
#include "Config.h"

class VibrationManager {
private:
    int pin;
    bool initialized;
    
public:
    VibrationManager(int pin = VIB_MOTOR_PIN) : pin(pin), initialized(false) {}
    
    void init() {
        if (pin > 0) {
            pinMode(pin, OUTPUT);
            digitalWrite(pin, LOW);
            initialized = true;
            Serial.println("振动电机初始化完成");
        }
    }
    
    void vibrate(int durationMs) {
        if (!initialized || pin <= 0) return;
        digitalWrite(pin, HIGH);
        delay(durationMs);
        digitalWrite(pin, LOW);
    }
    
    void shortVib() { vibrate(VIB_SHORT_MS); }
    void longVib() { vibrate(VIB_LONG_MS); }
    
    void pattern(int count, int duration) {
        for (int i = 0; i < count; i++) {
            vibrate(duration);
            delay(100);
        }
    }

    void stop() {
        if (initialized && pin > 0) {
            digitalWrite(pin, LOW);
        }
    }
};

#endif