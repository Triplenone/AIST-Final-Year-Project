// VibrationManager.h
#ifndef VIBRATION_MANAGER_H
#define VIBRATION_MANAGER_H

#include <Arduino.h>
#include "Config.h"

class VibrationManager {
private:
    int pin;
    bool initialized;
    bool patternActive;
    bool motorOn;
    int remainingPulses;
    int pulseDurationMs;
    unsigned long phaseStartedAtMs;

    void setMotor(bool on) {
        if (!initialized || pin <= 0) return;
        digitalWrite(pin, on ? HIGH : LOW);
        motorOn = on;
        phaseStartedAtMs = millis();
    }

public:
    VibrationManager(int pin = VIB_MOTOR_PIN)
        : pin(pin),
          initialized(false),
          patternActive(false),
          motorOn(false),
          remainingPulses(0),
          pulseDurationMs(0),
          phaseStartedAtMs(0) {}

    void init() {
        if (pin > 0) {
            pinMode(pin, OUTPUT);
            digitalWrite(pin, LOW);
            initialized = true;
            patternActive = false;
            motorOn = false;
            remainingPulses = 0;
            pulseDurationMs = 0;
            phaseStartedAtMs = millis();
            Serial.println("[VIB] initialized");
        }
    }

    void vibrate(int durationMs) {
        if (!initialized || pin <= 0) return;
        pattern(1, durationMs);
    }

    void shortVib() { vibrate(VIB_SHORT_MS); }
    void longVib() { vibrate(VIB_LONG_MS); }

    void pattern(int count, int duration) {
        if (!initialized || pin <= 0 || count <= 0 || duration <= 0) return;
        patternActive = true;
        remainingPulses = count;
        pulseDurationMs = duration;
        setMotor(true);
    }

    void update() {
        if (!patternActive || !initialized || pin <= 0) return;

        const unsigned long now = millis();
        if (motorOn) {
            if (now - phaseStartedAtMs >= static_cast<unsigned long>(pulseDurationMs)) {
                setMotor(false);
                remainingPulses--;
                if (remainingPulses <= 0) {
                    patternActive = false;
                }
            }
            return;
        }

        if (remainingPulses > 0 && now - phaseStartedAtMs >= 100) {
            setMotor(true);
        }
    }

    void stop() {
        if (initialized && pin > 0) {
            patternActive = false;
            remainingPulses = 0;
            pulseDurationMs = 0;
            setMotor(false);
        }
    }
};

#endif
