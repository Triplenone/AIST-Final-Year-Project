// Types.h - 通用类型定义
#ifndef TYPES_H
#define TYPES_H

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>

// 心率数据类型
struct HeartRateData {
    int bpm;                    // 心率 (次/分钟)
    float confidence;            // 置信度 0-1
    unsigned long timestamp;     // 时间戳
    bool valid;                  // 数据是否有效
};

// 血氧数据类型
struct SpO2Data {
    int percentage;              // 血氧饱和度 (%)
    float confidence;            // 置信度 0-1
    unsigned long timestamp;     // 时间戳
    bool valid;                  // 数据是否有效
};

// 音频命令结构
struct AudioCommand {
    enum AudioCommandType {
        AUDIO_PLAY_ALERT,
        AUDIO_PLAY_TTS,
        AUDIO_PLAY_NAVIGATION,
        AUDIO_SET_VOLUME,
        AUDIO_STOP
    } command;
    char text[100];
    uint8_t volume;
};

// 显示命令结构
struct DisplayCommand {
    enum DisplayCommandType {
        DISPLAY_SET_STATUS,
        DISPLAY_SET_TIME,
        DISPLAY_SET_DATE,
        DISPLAY_SHOW_SOS,
        DISPLAY_SHOW_NAVIGATION
    } command;
    char text[50];
    uint8_t value1, value2, value3;
    bool bool_param;
};

// 声明外部队列
extern QueueHandle_t audioCommandQueue;
extern QueueHandle_t displayCommandQueue;

#endif