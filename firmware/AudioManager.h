// AudioManager.h
#ifndef AUDIO_MANAGER_H
#define AUDIO_MANAGER_H

#include <Arduino.h>
#include "Config.h"
#include <SD_MMC.h>
#include <driver/i2s.h>
#include "es8311.h"

// I2S 引脚配置
#define I2S_BCLK 18
#define I2S_LRCLK 13
#define I2S_DOUT 12
#define I2S_MCLK 21
#define PA_ENABLE 39

// 音频设置
#define SAMPLE_RATE 44100
#define BITS_PER_SAMPLE 16
#define CHANNELS 2
#define BUFFER_SIZE 1024

// 前向声明
class ES8311;

class AudioManager {
private:
    bool audio_initialized;
    uint8_t volume;
    ES8311* es8311;
    
    // 内部播放函数
    bool playWAVFile(const char* filename);
    void playWord(const char* word);
    void playNumber(int num);
    void playLetter(char letter);
    void playDistance(int meters);
    void playDirection(const char* direction, int distance);
    
public:
    AudioManager();
    bool init();
    void update();
    
    // 基本音频播放
    void playAlert();
    void playTone(uint16_t frequency, uint16_t duration);
    void playSineWave(uint16_t frequency, uint32_t duration);
    
    // 智能 TTS（自动组合）
    void playTTS(const String& text);
    void playTTS(const char* text);
    
    // 导航专用
    void playNavigation(const char* instruction, int distance);
    void playGate(const char* gate);
    
    // 文件播放
    bool playFileFromSD(const char* filename);
    
    // SOS 警报
    bool playSOSAlert();
    
    // 控制
    void setVolume(uint8_t vol);
    void stop();
    
    // 文件管理
    bool listAudioFiles();
    bool fileExists(const char* filename);
    
    // I2S 初始化
    void initI2S();
};

#endif