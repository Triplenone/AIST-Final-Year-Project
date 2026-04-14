// AudioManager.h - 简化版本，删除 ES8311 和重复定义
#ifndef AUDIO_MANAGER_H
#define AUDIO_MANAGER_H

#include <Arduino.h>
#include "Config.h"
#include <SD_MMC.h>

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
    bool playSOSAlert() {
        Serial.println("音频: 播放SOS报警音乐");
        return playFileFromSD("/alerts/sos.mp3");
    }
    bool playFileFromSD(const char* filename);
    bool listAudioFiles();
    bool fileExists(const char* filename);
};

#endif