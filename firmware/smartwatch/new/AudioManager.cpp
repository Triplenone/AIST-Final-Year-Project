// AudioManager.cpp
#include "AudioManager.h"

AudioManager::AudioManager() 
    : audio_initialized(false), volume(AUDIO_VOLUME_DEFAULT) {}

bool AudioManager::init() {
    Serial.println("音频管理器初始化...");
    
    if (!SD_MMC.begin("/sdcard", true)) {
        Serial.println("音频: SD卡初始化失败");
    }
    
    audio_initialized = true;
    Serial.println("音频管理器初始化完成");
    return true;
}

void AudioManager::update() {
    static unsigned long last_update = 0;
    if (millis() - last_update > 1000) {
        last_update = millis();
    }
}

void AudioManager::playAlert() {
    Serial.println("音频: 播放警报声");
    for (int i = 0; i < 3; i++) {
        playTone(1000, 200);
        delay(300);
        playTone(800, 200);
        delay(300);
    }
}

void AudioManager::playTTS(const String& text) {
    Serial.printf("音频TTS: %s\n", text.c_str());
    playTone(500, 100);
    delay(50);
    playTone(600, 100);
    delay(50);
    playTone(700, 100);
}

void AudioManager::playNavigation(const String& direction, float distance) {
    String message = "向" + direction + "方向走" + String(distance, 0) + "米";
    Serial.printf("音频导航: %s\n", message.c_str());
    playTTS(message);
}

void AudioManager::playTone(uint16_t frequency, uint16_t duration) {
    Serial.printf("音频: 播放音调 %dHz, %dms\n", frequency, duration);
    
    #ifdef SPEAKER_PIN
        if (SPEAKER_PIN >= 0) {
            ledcAttach(SPEAKER_PIN, frequency, 8);
            delay(duration);
            ledcDetach(SPEAKER_PIN);
        }
    #endif
}

void AudioManager::setVolume(uint8_t vol) {
    volume = constrain(vol, 0, 100);
    Serial.printf("音频: 设置音量 %d%%\n", volume);
}

void AudioManager::stop() {
    Serial.println("音频: 停止播放");
}

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
    
    // 用蜂鸣器模拟
    for (int i = 0; i < 3; i++) {
        playTone(1000, 200);
        delay(200);
        playTone(800, 200);
        delay(200);
    }
    
    file.close();
    return true;
}

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

bool AudioManager::fileExists(const char* filename) {
    if (!SD_MMC.begin("/sdcard", true)) {
        return false;
    }
    return SD_MMC.exists(filename);
}