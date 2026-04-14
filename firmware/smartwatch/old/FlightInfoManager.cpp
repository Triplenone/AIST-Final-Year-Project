// FlightInfoManager.cpp 开头添加
#include "FlightInfoManager.h"
#include "SimpleDisplayManager.h"  // 添加这个头文件
#include <ArduinoJson.h>

FlightInfoManager::FlightInfoManager() 
    : flight_info_received(false), last_display_time(0), display_interval(30000),
      last_update_time(0) {  // 初始化上次更新时间为0
    current_flight.valid = false;
}

bool FlightInfoManager::parseFlightInfo(const String& json) {
    DynamicJsonDocument doc(2048);
    DeserializationError error = deserializeJson(doc, json);
    
    if (error) {
        Serial.printf("航班信息解析失败: %s\n", error.c_str());
        return false;
    }
    
    if (doc.containsKey("flight_info")) {
        JsonObject flight = doc["flight_info"];
        
        current_flight.flight_number = flight["flight_number"] | "CA1234";
        current_flight.airline = flight["airline"] | "";
        current_flight.destination = flight["destination"] | "Beijing";
        current_flight.boarding_time = flight["boarding_time"] | "14:30";
        current_flight.boarding_gate = flight["boarding_gate"] | "A12";
        current_flight.delay_minutes = flight["delay_minutes"] | 0;
        
        current_flight.valid = true;
        flight_info_received = true;
        current_flight.last_update = millis();
        
        // ===== 核心：控制刷新率 =====
        unsigned long now = millis();
        if (now - last_update_time > UPDATE_COOLDOWN) {
            if (display) {
                display->setFlightInfo(
                    current_flight.flight_number.c_str(),
                    current_flight.destination.c_str(),
                    current_flight.boarding_gate.c_str(),
                    current_flight.boarding_time.c_str(),
                    current_flight.delay_minutes
                );
                Serial.println("✅ 航班信息已更新到显示器");
                last_update_time = now;  // 记录这次更新时间
            }
        } else {
            Serial.println("⏳ 航班信息更新太频繁，已忽略");
        }
        
        return true;
    }
    
    return false;
}

void FlightInfoManager::updateDisplay() {
    if (!flight_info_received) return;
    
    unsigned long now = millis();
    if (now - last_display_time > display_interval) {
        displayFlightInfo();
        last_display_time = now;
    }
}

void FlightInfoManager::displayFlightInfo() {
    DisplayCommand display_cmd;
    display_cmd.command = DisplayCommand::DISPLAY_SET_STATUS;
    
    String status = "Flight: " + current_flight.flight_number + " ";
    status += current_flight.destination + " Gate: ";
    status += current_flight.boarding_gate;
    
    if (current_flight.delay_minutes > 0) {
        status += " Delay " + String(current_flight.delay_minutes) + "min";
    }
    
    snprintf(display_cmd.text, sizeof(display_cmd.text), "%s", status.c_str());
    
    if (displayCommandQueue) {
        xQueueSend(displayCommandQueue, &display_cmd, 0);
    }
}

void FlightInfoManager::speakAlert(const String& message) {
    AudioCommand audio_cmd;
    audio_cmd.command = AudioCommand::AUDIO_PLAY_TTS;
    snprintf(audio_cmd.text, sizeof(audio_cmd.text), "%s", message.c_str());
    
    if (audioCommandQueue) {
        xQueueSend(audioCommandQueue, &audio_cmd, 0);
    }
}

void FlightInfoManager::checkForAlerts(const String& json) {
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, json);
    
    if (error) return;
    
    if (doc.containsKey("alerts")) {
        JsonArray alerts = doc["alerts"];
        for (JsonObject alert : alerts) {
            String type = alert["type"] | "";
            String message = alert["message"] | "";
            
            if (type == "gate_change") {
                speakAlert(message);
            }
        }
    }
}