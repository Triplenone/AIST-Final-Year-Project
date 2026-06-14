#ifndef VOICE_MESSAGE_MANAGER_H
#define VOICE_MESSAGE_MANAGER_H

#include <Arduino.h>
#include <SD_MMC.h>
#include <vector>
#include "DataTransmitter.h"  // 添加这个

// 声明外部变量
extern MyNetworkManager* network;
extern QueueHandle_t displayCommandQueue;
extern QueueHandle_t audioCommandQueue;

struct VoiceMessage {
    String message_id;
    String sender;
    String recipient;
    String format;
    int duration;
    int size;
    String url;
    String text_preview;
    unsigned long timestamp;
    bool is_played;
    bool is_incoming;
};

class VoiceMessageManager {
private:
    std::vector<VoiceMessage> messages;
    bool recording_active;
    unsigned long recording_start_time;
    String current_recording_file;
    int unread_count;
    
    // 消息存储路径
    const char* MESSAGE_DIR = "/messages/";
    
public:
    VoiceMessageManager();
    
    bool init();
    bool parseIncomingMessage(const String& json);
    bool startRecording();
    bool stopRecordingAndSend();
    bool isRecording() { return recording_active; }  // 添加这个函数
    void playMessage(const String& message_id);
    void markAsRead(const String& message_id);
    int getUnreadCount() { return unread_count; }
    void checkForNewMessages();
    
private:
    bool saveAudioToSD(const uint8_t* data, size_t len, const String& filename);
    bool sendVoiceMessage(const String& filename, int duration);
    void notifyNewMessage(const VoiceMessage& msg);
    void downloadAndPlayMessage(const String& url, const String& message_id);
};

#endif