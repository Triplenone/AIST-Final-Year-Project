// VoiceMessageManager.cpp
#include "VoiceMessageManager.h"
#include <ArduinoJson.h>

VoiceMessageManager::VoiceMessageManager() 
    : recording_active(false), unread_count(0) {}

bool VoiceMessageManager::init() {
    if (!SD_MMC.begin("/sdcard", true)) {
        Serial.println("SD卡初始化失败");
        return false;
    }
    
    if (!SD_MMC.exists(MESSAGE_DIR)) {
        SD_MMC.mkdir(MESSAGE_DIR);
    }
    
    Serial.println("语音留言管理器初始化完成");
    return true;
}

bool VoiceMessageManager::parseIncomingMessage(const String& json) {
    DynamicJsonDocument doc(2048);
    DeserializationError error = deserializeJson(doc, json);
    
    if (error) return false;
    
    if (doc.containsKey("voice_message")) {
        JsonObject voice = doc["voice_message"];
        
        VoiceMessage msg;
        msg.message_id = voice["message_id"] | "";
        msg.sender = voice["sender"] | "";
        msg.duration = voice["duration"] | 0;
        msg.url = voice["url"] | "";
        msg.text_preview = voice["text_preview"] | "";
        msg.timestamp = millis();
        msg.is_played = false;
        msg.is_incoming = true;
        
        messages.push_back(msg);
        unread_count++;
        
        notifyNewMessage(msg);
        
        if (msg.url.length() > 0) {
            downloadAndPlayMessage(msg.url, msg.message_id);
        }
        
        return true;
    }
    
    return false;
}

bool VoiceMessageManager::startRecording() {
    if (recording_active) return false;
    
    char filename[64];
    snprintf(filename, sizeof(filename), "%smsg_%lu.wav", 
             MESSAGE_DIR, millis());
    current_recording_file = String(filename);
    
    recording_active = true;
    recording_start_time = millis();
    
    DisplayCommand display_cmd;
    display_cmd.command = DisplayCommand::DISPLAY_SET_STATUS;
    snprintf(display_cmd.text, sizeof(display_cmd.text), "Recording...");
    if (displayCommandQueue) {
        xQueueSend(displayCommandQueue, &display_cmd, 0);
    }
    
    return true;
}

bool VoiceMessageManager::stopRecordingAndSend() {
    if (!recording_active) return false;
    
    recording_active = false;
    int duration = (millis() - recording_start_time) / 1000;
    
    bool success = sendVoiceMessage(current_recording_file, duration);
    
    if (success) {
        DisplayCommand display_cmd;
        display_cmd.command = DisplayCommand::DISPLAY_SET_STATUS;
        snprintf(display_cmd.text, sizeof(display_cmd.text), "Voice sent");
        if (displayCommandQueue) {
            xQueueSend(displayCommandQueue, &display_cmd, 0);
        }
    }
    
    return success;
}

bool VoiceMessageManager::sendVoiceMessage(const String& filename, int duration) {
    // 这里实现发送语音留言到服务器的逻辑
    Serial.printf("发送语音留言: %s, 时长 %d秒\n", filename.c_str(), duration);
    return true;
}

void VoiceMessageManager::playMessage(const String& message_id) {
    for (auto& msg : messages) {
        if (msg.message_id == message_id) {
            Serial.printf("播放留言: 来自 %s, 时长 %d秒\n", 
                         msg.sender.c_str(), msg.duration);
            msg.is_played = true;
            if (unread_count > 0) unread_count--;
            break;
        }
    }
}

void VoiceMessageManager::markAsRead(const String& message_id) {
    for (auto& msg : messages) {
        if (msg.message_id == message_id && !msg.is_played) {
            msg.is_played = true;
            if (unread_count > 0) unread_count--;
            break;
        }
    }
}

void VoiceMessageManager::notifyNewMessage(const VoiceMessage& msg) {
    Serial.printf("新留言: 来自 %s, 时长 %d秒\n", 
                 msg.sender.c_str(), msg.duration);
    
    AudioCommand audio_cmd;
    audio_cmd.command = AudioCommand::AUDIO_PLAY_TTS;
    snprintf(audio_cmd.text, sizeof(audio_cmd.text), 
             "Voice message from %s", msg.sender.c_str());
    if (audioCommandQueue) {
        xQueueSend(audioCommandQueue, &audio_cmd, 0);
    }
    
    DisplayCommand display_cmd;
    display_cmd.command = DisplayCommand::DISPLAY_SET_STATUS;
    snprintf(display_cmd.text, sizeof(display_cmd.text), 
             "✉️ New voice message");
    if (displayCommandQueue) {
        xQueueSend(displayCommandQueue, &display_cmd, 0);
    }
}

void VoiceMessageManager::downloadAndPlayMessage(const String& url, const String& message_id) {
    Serial.printf("下载语音留言: %s\n", url.c_str());
    playMessage(message_id);
}

void VoiceMessageManager::checkForNewMessages() {
    // 定期检查新消息的逻辑
}