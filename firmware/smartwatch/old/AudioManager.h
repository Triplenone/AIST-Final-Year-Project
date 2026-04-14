// AudioManager.h - 修复后的版本
#ifndef AUDIO_MANAGER_H
#define AUDIO_MANAGER_H

#include <Arduino.h>
#include "Config.h"
#include <SD_MMC.h>
#include <esp32-hal-ledc.h>  // 添加这个头文件

class AudioManager {
private:
    bool audio_initialized;
    uint8_t volume;
    
public:
    AudioManager();
    bool init();
    void update();
    void playAlert();
    void playTTS(const String& text);
    void playNavigation(const String& direction, float distance);
    void playTone(uint16_t frequency, uint16_t duration);
    void setVolume(uint8_t vol);
    void stop();
    // 添加播放文件函数
    bool playSOSAlert() {
        Serial.println("音频: 播放SOS报警音乐");
        return playFileFromSD("/alerts/sos.mp3");
    }
    
    // 添加SD卡音频支持
    bool playFileFromSD(const char* filename);
    bool listAudioFiles();
    bool fileExists(const char* filename);
};

// ================ 构造函数 ================
AudioManager::AudioManager() 
    : audio_initialized(false), volume(AUDIO_VOLUME_DEFAULT) {}

// ================ init函数 ================
bool AudioManager::init() {
    Serial.println("音频管理器初始化...");
    
    // 初始化SD卡（如果还没初始化）
    if (!SD_MMC.begin("/sdcard", true)) {
        Serial.println("音频: SD卡初始化失败");
        // 继续执行，可能没有音频文件
    }
    
    audio_initialized = true;
    Serial.println("音频管理器初始化完成（简化版本）");
    return true;
}

// ================ update函数 ================
void AudioManager::update() {
    // 简化版本：不做实际音频处理
    // 在实际应用中，这里会处理音频播放状态
    static unsigned long last_update = 0;
    if (millis() - last_update > 1000) {
        last_update = millis();
        // 定期检查音频状态
    }
}

// ================ playAlert函数 ================
void AudioManager::playAlert() {
    Serial.println("音频: 播放警报声");
    
    // 简化版本：播放3次蜂鸣声
    for (int i = 0; i < 3; i++) {
        playTone(1000, 200);  // 1kHz, 200ms
        delay(300);
        playTone(800, 200);   // 800Hz, 200ms
        delay(300);
    }
}

// ================ playTTS函数 ================
void AudioManager::playTTS(const String& text) {
    Serial.printf("音频TTS: %s\n", text.c_str());
    
    // 简化版本：用蜂鸣声模拟
    playTone(500, 100);
    delay(50);
    playTone(600, 100);
    delay(50);
    playTone(700, 100);
}

// ================ playNavigation函数 ================
void AudioManager::playNavigation(const String& direction, float distance) {
    String message = "向" + direction + "方向走" + String(distance, 0) + "米";
    Serial.printf("音频导航: %s\n", message.c_str());
    playTTS(message);
}

// ================ playTone函数 ================
void AudioManager::playTone(uint16_t frequency, uint16_t duration) {
    Serial.printf("音频: 播放音调 %dHz, %dms\n", frequency, duration);
    
    #ifdef SPEAKER_PIN
        if (SPEAKER_PIN >= 0) {
            // 新版 LEDC API
            ledcAttach(SPEAKER_PIN, frequency, 8);  // 直接附加引脚和频率
            delay(duration);
            ledcDetach(SPEAKER_PIN);                 // 分离引脚
        }
    #endif
}

// ================ setVolume函数 ================
void AudioManager::setVolume(uint8_t vol) {
    volume = constrain(vol, 0, 100);
    Serial.printf("音频: 设置音量 %d%%\n", volume);
}

// ================ stop函数 ================
void AudioManager::stop() {
    Serial.println("音频: 停止播放");
}

// ================ playFileFromSD函数 ================
bool AudioManager::playFileFromSD(const char* filename) {
    Serial.printf("音频: 尝试播放文件 %s\n", filename);
    
    if (!SD_MMC.begin("/sdcard", true)) {
        Serial.println("SD卡未初始化");
        return false;
    }
    
    if (!SD_MMC.exists(filename)) {
        Serial.printf("文件不存在: %s\n", filename);
        return false;
    }
    
    File file = SD_MMC.open(filename);
    if (!file) {
        Serial.println("无法打开文件");
        return false;
    }
    
    Serial.printf("开始播放: %s, 大小: %d bytes\n", filename, file.size());
    
    // 这里需要实际的音频解码和播放代码
    // 如果没有硬件音频解码器，先用蜂鸣器模拟
    for (int i = 0; i < 3; i++) {
        playTone(1000, 200);
        delay(200);
        playTone(800, 200);
        delay(200);
    }
    
    file.close();
    return true;
}

// ================ listAudioFiles函数 ================
bool AudioManager::listAudioFiles() {
    Serial.println("音频文件列表:");
    
    if (!SD_MMC.begin("/sdcard", true)) {
        Serial.println("SD卡未初始化");
        return false;
    }
    
    File root = SD_MMC.open("/");
    if (!root) {
        Serial.println("无法打开根目录");
        return false;
    }
    
    bool found_files = false;
    File file = root.openNextFile();
    while (file) {
        String filename = file.name();
        filename.toLowerCase();
        
        if (filename.endsWith(".mp3") || filename.endsWith(".wav") || 
            filename.endsWith(".ogg") || filename.endsWith(".flac")) {
            Serial.printf("  %s (%d bytes)\n", file.name(), file.size());
            found_files = true;
        }
        file = root.openNextFile();
    }
    
    root.close();
    
    if (!found_files) {
        Serial.println("未找到音频文件");
    }
    
    return found_files;
}

// ================ fileExists函数 ================
bool AudioManager::fileExists(const char* filename) {
    if (!SD_MMC.begin("/sdcard", true)) {
        return false;
    }
    
    return SD_MMC.exists(filename);
}

#endif