// OnlineTTS.h
#ifndef ONLINE_TTS_H
#define ONLINE_TTS_H

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "AudioGeneratorMP3.h"
#include "AudioOutputI2S.h"

class OnlineTTS {
private:
    AudioOutputI2S* audioOutput;
    AudioGeneratorMP3* mp3;
    bool playing;
    String lastText;
    
public:
    OnlineTTS() : audioOutput(nullptr), mp3(nullptr), playing(false) {}
    
    bool begin() {
        audioOutput = new AudioOutputI2S();
        audioOutput->SetPinout(BCLKPIN, WSPIN, DOPIN);
        audioOutput->SetGain(0.8);
        mp3 = new AudioGeneratorMP3();
        return true;
    }
    
    void speak(const String& text) {
        if (playing) stop();
        
        lastText = text;
        String url = "https://api.voicemaker.in/tts?text=" + urlEncode(text) + "&lang=zh-CN";
        
        // 使用本地 TTS 服务器（需要自己搭建）
        // 或者使用免费的 TTS API
        String localUrl = "http://192.168.1.100:5000/tts?text=" + urlEncode(text);
        
        HTTPClient http;
        http.begin(localUrl);
        int code = http.GET();
        
        if (code == 200) {
            // 获取音频流并播放
            // ... 实现流式播放
        }
        
        http.end();
    }
    
    void stop() {
        if (mp3 && mp3->isRunning()) {
            mp3->stop();
        }
        playing = false;
    }
    
    bool isPlaying() { return playing; }
    
private:
    String urlEncode(const String& str) {
        String encoded = "";
        for (int i = 0; i < str.length(); i++) {
            char c = str[i];
            if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
                encoded += c;
            } else if (c == ' ') {
                encoded += "%20";
            } else {
                char hex[4];
                snprintf(hex, sizeof(hex), "%%%02X", c);
                encoded += hex;
            }
        }
        return encoded;
    }
};

#endif