// HeartRateManager.h
#ifndef HEART_RATE_MANAGER_H
#define HEART_RATE_MANAGER_H

#include <Arduino.h>
#include <Wire.h>
#include <limits.h>
#include "Config.h"
#include "MAX30105.h"
#include "heartRate.h"

class HeartRateManager {
private:
    MAX30105 particleSensor;
    bool initialized;
    
    // 心率计算变量
    static const int RATE_SIZE = 10;
    float rates[RATE_SIZE];
    int rateSpot;
    long lastBeat;
    float beatsPerMinute;
    float beatAvg;
    
    // 血氧计算变量（采用 RMS 比值法）
    float irRMS;
    float redRMS;
    int samplesRecorded;
    int pulsesDetected;
    float currentSpO2;
    long lastIRValue;
    long lastRedValue;
    bool lastSafeCheckOk;
    unsigned long lastSampleMillis;
    volatile bool diagnosticsActive;
    uint8_t currentLedBrightness;
    static const int SPO2_RESET_INTERVAL = 5;  // 每5次脉搏复位一次

    void resetMeasurements() {
        lastBeat = 0;
        beatsPerMinute = 0;
        beatAvg = 0;
        currentSpO2 = 0;
        samplesRecorded = 0;
        irRMS = 0;
        redRMS = 0;
        pulsesDetected = 0;

        for (int i = 0; i < RATE_SIZE; i++) rates[i] = 0;
        rateSpot = 0;
    }

    void processSample(long irValue, long redValue) {
        lastIRValue = irValue;
        lastRedValue = redValue;
        lastSafeCheckOk = true;
        lastSampleMillis = millis();

        // 检查是否有手指
        if (irValue > HR_CONTACT_THRESHOLD) {
            
            // ========== 心率检测 ==========
            if (checkForBeat(irValue)) {
                long delta = millis() - lastBeat;
                lastBeat = millis();

                if (delta > 300 && delta < 2000) {
                    beatsPerMinute = 60000.0 / delta;

                    if (beatsPerMinute > 40 && beatsPerMinute < 200) {
                        rates[rateSpot] = beatsPerMinute;
                        rateSpot = (rateSpot + 1) % RATE_SIZE;

                        float sum = 0;
                        int count = 0;
                        for (int i = 0; i < RATE_SIZE; i++) {
                            if (rates[i] > 0) {
                                sum += rates[i];
                                count++;
                            }
                        }
                        if (count > 0) {
                            beatAvg = sum / count;
                        }

                        calculateSpO2OnPulse();
                        pulsesDetected++;
                    }
                }
            }
            
            // ========== 累积 RMS 用于血氧 ==========
            if (redValue > 0 && irValue > 0) {
                static float irDC = 0, redDC = 0;
                irDC = irDC * 0.95 + irValue * 0.05;
                redDC = redDC * 0.95 + redValue * 0.05;
                
                float irAC = irValue - irDC;
                float redAC = redValue - redDC;
                
                irRMS += irAC * irAC;
                redRMS += redAC * redAC;
                samplesRecorded++;
            }
            
        } else {
            // 无手指时重置
            if (lastBeat != 0 || beatAvg != 0 || currentSpO2 != 0 || samplesRecorded != 0 || pulsesDetected != 0) {
                resetMeasurements();
            }
        }
        
        // 调试打印
        static unsigned long lastPrint = 0;
        if (millis() - lastPrint > 10000) {
            if (irValue < HR_CONTACT_THRESHOLD) {
                Serial.printf("IR: %ld - 请放手指\n", irValue);
            }
            lastPrint = millis();
        }
    }
    
public:
    HeartRateManager() : initialized(false), rateSpot(0), lastBeat(0), 
                         beatsPerMinute(0), beatAvg(0), 
                         irRMS(0), redRMS(0), samplesRecorded(0), 
                         pulsesDetected(0), currentSpO2(0),
                         lastIRValue(0), lastRedValue(0),
                         lastSafeCheckOk(false), lastSampleMillis(0),
                         diagnosticsActive(false),
                         currentLedBrightness(HR_LED_BRIGHTNESS) {
        for (int i = 0; i < RATE_SIZE; i++) rates[i] = 0;
    }
    
    bool init() {
        Serial.println("初始化 MAX30102 心率/血氧传感器...");
        
        if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
            Serial.println("❌ MAX30102 未找到");
            initialized = false;
            return false;
        }
        
        // 优化配置：采样率 400Hz，脉冲宽度 411us，ADC 范围 4096
        byte sampleAverage = HR_SAMPLE_AVERAGE;
        byte ledMode = 2;               // 红 + 红外
        int sampleRate = HR_SAMPLE_RATE;
        int pulseWidth = HR_PULSE_WIDTH;
        int adcRange = HR_ADC_RANGE;
        
        particleSensor.setup(currentLedBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
        particleSensor.setPulseAmplitudeGreen(0);
        particleSensor.enableDIETEMPRDY();  // 启用温度传感器（可选）
        
        Serial.println("✅ MAX30102 初始化成功");
        initialized = true;
        return true;
    }
    
    void update() {
        if (!initialized || diagnosticsActive) return;

        particleSensor.check();

        bool sawSample = false;
        while (particleSensor.available() > 0) {
            long redValue = particleSensor.getFIFORed();
            long irValue = particleSensor.getFIFOIR();
            particleSensor.nextSample();
            processSample(irValue, redValue);
            sawSample = true;
        }

        if (!sawSample) {
            lastSafeCheckOk = false;
        }
    }
    
    // 在每次脉搏时计算血氧（RMS 比值法）
    void calculateSpO2OnPulse() {
        if (samplesRecorded < 10) return;  // 数据不足
        
        float irRMSVal = sqrt(irRMS / samplesRecorded);
        float redRMSVal = sqrt(redRMS / samplesRecorded);
        
        if (irRMSVal > 0) {
            float ratio = redRMSVal / irRMSVal;
            // 标准 SpO₂ 校准曲线：SpO₂ = 110 - 25 * R（经验公式）
            float spo2Calc = 110.0 - 25.0 * ratio;
            currentSpO2 = constrain(spo2Calc, 70.0, 100.0);
        }
        
        // 定期复位 RMS 累加器（避免数值溢出）
        if (pulsesDetected % SPO2_RESET_INTERVAL == 0) {
            irRMS = 0;
            redRMS = 0;
            samplesRecorded = 0;
        }
    }
    
    int getHeartRate() { 
        return (int)beatAvg; 
    }
    
    int getSpO2() { 
        return (int)currentSpO2; 
    }
    
    float getConfidence() { 
        // 简单置信度：基于是否有有效心率 + 信号强度
        return (beatAvg > 0 && beatAvg < 200) ? 0.85 : 0.0;
    }

    float getSpO2Confidence() {
        return (pulsesDetected > 0 && currentSpO2 >= 70 && currentSpO2 <= 100) ? 0.75 : 0.0;
    }

    uint8_t getLedBrightness() const {
        return currentLedBrightness;
    }

    bool setLedBrightness(uint8_t brightness) {
        if (!initialized) return false;

        diagnosticsActive = true;
        currentLedBrightness = brightness;
        particleSensor.setPulseAmplitudeRed(brightness);
        particleSensor.setPulseAmplitudeIR(brightness);
        particleSensor.setPulseAmplitudeGreen(0);
        particleSensor.clearFIFO();
        resetMeasurements();
        diagnosticsActive = false;

        Serial.printf("[HRLED] brightness=0x%02X (%u)\n", currentLedBrightness, currentLedBrightness);
        return true;
    }
    
    bool isConnected() {
        return initialized && hasRecentSample() && lastIRValue > HR_CONTACT_THRESHOLD;
    }
    
    void printData() {
        if (initialized) {
            long ir = lastIRValue;
            if (ir > HR_CONTACT_THRESHOLD) {
                Serial.printf("❤️ 心率: %.0f bpm | 💨 血氧: %.0f%% | 置信度: %.2f\n", 
                             beatAvg, currentSpO2, getConfidence());
            } else {
                Serial.printf("⚠️ IR: %ld - 无手指接触\n", ir);
            }
        }
    }
    
    // 获取原始 IR 值（用于调试）
    long getIRValue() {
        return lastIRValue;
    }

    long getLastIRValue() const {
        return lastIRValue;
    }

    long getLastRedValue() const {
        return lastRedValue;
    }

    bool hasRecentSample() const {
        return lastSafeCheckOk && lastSampleMillis > 0 && (millis() - lastSampleMillis < 5000);
    }

    void printDiagnostics() {
        if (!initialized) {
            Serial.println("[HRDEBUG] MAX30102 not initialized");
            return;
        }

        Serial.printf("[HRDEBUG] safeCheck=%s recent=%s led=0x%02X ir=%ld red=%ld threshold=%ld bpm=%.1f avg=%.1f spo2=%.1f confidence=%.2f samples=%d pulses=%d\n",
                      lastSafeCheckOk ? "ok" : "waiting",
                      hasRecentSample() ? "yes" : "no",
                      currentLedBrightness,
                      lastIRValue,
                      lastRedValue,
                      (long)HR_CONTACT_THRESHOLD,
                      beatsPerMinute,
                      beatAvg,
                      currentSpO2,
                      getConfidence(),
                      samplesRecorded,
                      pulsesDetected);

        if (lastIRValue <= HR_CONTACT_THRESHOLD) {
            Serial.println("[HRDEBUG] IR is below finger/contact threshold. Tighten watch, cover sensor, keep wrist still.");
        } else if (beatAvg <= 0) {
            Serial.println("[HRDEBUG] Contact is detected, but no stable pulse window yet. Hold still for 20-30 seconds.");
        } else {
            Serial.println("[HRDEBUG] Heart-rate signal is valid.");
        }
    }

    void printSensorHealth() {
        if (!initialized) {
            Serial.println("[HRSENSOR] MAX30102 not initialized");
            return;
        }

        diagnosticsActive = true;
        delay(20);
        const uint8_t partId = particleSensor.readPartID();
        const uint8_t revisionId = particleSensor.getRevisionID();
        const float tempC = particleSensor.readTemperature();
        diagnosticsActive = false;

        Serial.printf("[HRSENSOR] part_id=0x%02X expected=0x15 revision=0x%02X temp_c=%.2f led=0x%02X recent=%s ir=%ld red=%ld threshold=%ld contact=%s\n",
                      partId,
                      revisionId,
                      tempC,
                      currentLedBrightness,
                      hasRecentSample() ? "yes" : "no",
                      lastIRValue,
                      lastRedValue,
                      (long)HR_CONTACT_THRESHOLD,
                      lastIRValue > HR_CONTACT_THRESHOLD ? "yes" : "no");

        if (partId != 0x15) {
            Serial.println("[HRSENSOR] Unexpected part ID. Check I2C wiring, address, power, or sensor module type.");
        } else if (lastIRValue <= HR_CONTACT_THRESHOLD) {
            Serial.println("[HRSENSOR] I2C identity is valid, but optical contact is not established.");
        } else {
            Serial.println("[HRSENSOR] I2C identity and optical contact are both present.");
        }
    }

    void printRawWindow(unsigned long durationMs = 10000) {
        if (!initialized) {
            Serial.println("[HRCAL] MAX30102 not initialized");
            return;
        }

        diagnosticsActive = true;
        delay(50);
        particleSensor.clearFIFO();

        long minIR = LONG_MAX;
        long maxIR = 0;
        long minRed = LONG_MAX;
        long maxRed = 0;
        double sumIR = 0;
        double sumRed = 0;
        int samples = 0;
        int contactSamples = 0;
        int saturatedSamples = 0;
        const long saturationLevel = 250000L;
        unsigned long start = millis();

        while (millis() - start < durationMs) {
            particleSensor.check();
            bool drained = false;

            while (particleSensor.available() > 0) {
                long red = particleSensor.getFIFORed();
                long ir = particleSensor.getFIFOIR();
                particleSensor.nextSample();
                lastIRValue = ir;
                lastRedValue = red;
                lastSafeCheckOk = true;
                lastSampleMillis = millis();
                drained = true;

                minIR = min(minIR, ir);
                maxIR = max(maxIR, ir);
                minRed = min(minRed, red);
                maxRed = max(maxRed, red);
                sumIR += ir;
                sumRed += red;
                samples++;
                if (ir > HR_CONTACT_THRESHOLD) {
                    contactSamples++;
                }
                if (ir >= saturationLevel || red >= saturationLevel) {
                    saturatedSamples++;
                }
            }

            if (!drained) {
                delay(5);
            }
            yield();
        }

        if (samples == 0) {
            Serial.println("[HRCAL] no samples collected");
            diagnosticsActive = false;
            return;
        }

        float avgIR = sumIR / samples;
        float avgRed = sumRed / samples;
        float contactPct = (100.0f * contactSamples) / samples;
        float saturationPct = (100.0f * saturatedSamples) / samples;
        Serial.printf("[HRCAL] window_ms=%lu led=0x%02X samples=%d threshold=%ld ir_min=%ld ir_avg=%.1f ir_max=%ld red_min=%ld red_avg=%.1f red_max=%ld contact_samples=%d contact_pct=%.1f saturated_samples=%d saturated_pct=%.1f\n",
                      durationMs,
                      currentLedBrightness,
                      samples,
                      (long)HR_CONTACT_THRESHOLD,
                      minIR,
                      avgIR,
                      maxIR,
                      minRed,
                      avgRed,
                      maxRed,
                      contactSamples,
                      contactPct,
                      saturatedSamples,
                      saturationPct);

        if (maxIR <= HR_CONTACT_THRESHOLD) {
            Serial.println("[HRCAL] IR never crossed contact threshold. Check strap tightness, sensor window, wrist placement, and MAX30102 LED visibility.");
        } else if (saturatedSamples > samples / 4) {
            Serial.println("[HRCAL] Signal is saturated. Lower HR_LED_BRIGHTNESS or improve sensor placement before trusting BPM.");
        } else if (contactSamples < samples / 2) {
            Serial.println("[HRCAL] Contact is intermittent. Hold still and improve sensor pressure before trusting BPM.");
        } else {
            Serial.println("[HRCAL] Contact level is sufficient; wait for stable pulse samples or inspect beat detection.");
        }
        diagnosticsActive = false;
    }

    void printLedSweep(unsigned long windowMs = 4000) {
        if (!initialized) {
            Serial.println("[HRSWEEP] MAX30102 not initialized");
            return;
        }

        const uint8_t originalBrightness = currentLedBrightness;
        const uint8_t levels[] = {0x1F, 0x3F, 0x7F, 0xFF};
        const int levelCount = sizeof(levels) / sizeof(levels[0]);

        Serial.printf("[HRSWEEP] start levels=%d window_ms=%lu threshold=%ld original=0x%02X\n",
                      levelCount,
                      windowMs,
                      (long)HR_CONTACT_THRESHOLD,
                      originalBrightness);

        for (int i = 0; i < levelCount; i++) {
            setLedBrightness(levels[i]);
            delay(250);
            printRawWindow(windowMs);
            yield();
        }

        setLedBrightness(originalBrightness);
        Serial.printf("[HRSWEEP] restored=0x%02X\n", originalBrightness);
    }
};

#endif
