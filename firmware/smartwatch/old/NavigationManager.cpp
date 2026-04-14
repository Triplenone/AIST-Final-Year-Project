// NavigationManager.cpp
#include "NavigationManager.h"
#include <ArduinoJson.h>

NavigationManager::NavigationManager() 
    : navigation_active(false), current_step(0), 
      last_voice_prompt(0), voice_prompt_interval(10000),
      current_x(0), current_y(0) {
    current_plan.valid = false;
}

bool NavigationManager::parseNavigationPlan(const String& json) {
    DynamicJsonDocument doc(4096);
    DeserializationError error = deserializeJson(doc, json);
    
    if (error) {
        Serial.printf("导航计划解析失败: %s\n", error.c_str());
        return false;
    }
    
    // 解析导航数据
    if (doc.containsKey("navigation")) {
        JsonObject nav = doc["navigation"];
        
        current_plan.plan_id = nav["plan_id"] | "";
        current_plan.status = nav["status"] | "";
        
        // 解析目标
        JsonObject target = nav["target"];
        current_plan.destination_name = target["name"] | "";
        current_plan.dest_x = target["x"] | 0.0;
        current_plan.dest_y = target["y"] | 0.0;
        current_plan.gate_number = target["gate_number"] | "";
        current_plan.flight_number = target["flight_number"] | "";
        current_plan.boarding_time = target["boarding_time"] | "";
        
        // 解析路径点
        current_plan.waypoints.clear();
        if (nav.containsKey("waypoints")) {
            JsonArray waypoints = nav["waypoints"];
            for (JsonObject wp : waypoints) {
                Waypoint point;
                point.name = wp["name"] | "";
                point.x = wp["x"] | 0.0;
                point.y = wp["y"] | 0.0;
                point.description = wp["description"] | "";
                current_plan.waypoints.push_back(point);
            }
        }
        
        // 解析指令
        current_plan.instructions.clear();
        if (nav.containsKey("instructions")) {
            JsonArray instructions = nav["instructions"];
            for (JsonObject inst : instructions) {
                NavigationInstruction instruction;
                instruction.step = inst["step"] | 0;
                instruction.text = inst["text"] | "";
                instruction.distance = inst["distance"] | 0;
                instruction.direction = inst["direction"] | "";
                current_plan.instructions.push_back(instruction);
            }
        }
        
        current_plan.total_distance = nav["total_distance"] | 0;
        current_plan.estimated_time = nav["estimated_time"] | 0;
        current_plan.valid = true;
        navigation_active = true;
        current_step = 0;
        
        Serial.println("导航计划已更新");
        return true;
    }
    
    return false;
}

void NavigationManager::updateNavigation(float x, float y) {
    if (!navigation_active) return;
    
    current_x = x;
    current_y = y;
    
    // 检查是否到达航点
    checkWaypointReached();
    
    // 定期语音提示
    unsigned long now = millis();
    if (now - last_voice_prompt > voice_prompt_interval) {
        NavigationInstruction inst = getCurrentInstruction();
        speakInstruction(inst);
        last_voice_prompt = now;
    }
}

NavigationInstruction NavigationManager::getCurrentInstruction() {
    NavigationInstruction inst;
    if (current_plan.instructions.size() > current_step) {
        inst = current_plan.instructions[current_step];
    } else {
        inst.text = "Continue to destination";
        inst.distance = getDistanceToDestination();
    }
    return inst;
}

float NavigationManager::getDistanceToDestination() {
    float dx = current_plan.dest_x - current_x;
    float dy = current_plan.dest_y - current_y;
    return sqrt(dx*dx + dy*dy);
}

void NavigationManager::speakInstruction(const NavigationInstruction& inst) {
    String message = inst.text;
    if (inst.distance > 0) {
        message += ", " + String(inst.distance, 0) + " meters";
    }
    
    // 发送到音频任务
    AudioCommand audio_cmd;
    audio_cmd.command = AudioCommand::AUDIO_PLAY_TTS;
    snprintf(audio_cmd.text, sizeof(audio_cmd.text), "%s", message.c_str());
    if (audioCommandQueue) {
        xQueueSend(audioCommandQueue, &audio_cmd, 0);
    }
}

void NavigationManager::checkWaypointReached() {
    // 检查是否到达当前航点
    if (current_plan.waypoints.size() > 0 && current_step < current_plan.waypoints.size()) {
        Waypoint wp = current_plan.waypoints[current_step];
        float dx = wp.x - current_x;
        float dy = wp.y - current_y;
        float distance = sqrt(dx*dx + dy*dy);
        
        if (distance < 1.0) {  // 1米内算到达
            current_step++;
            // 播报到达提示
            String msg = "Arrived at " + wp.name;
            AudioCommand audio_cmd;
            audio_cmd.command = AudioCommand::AUDIO_PLAY_TTS;
            snprintf(audio_cmd.text, sizeof(audio_cmd.text), "%s", msg.c_str());
            if (audioCommandQueue) {
                xQueueSend(audioCommandQueue, &audio_cmd, 0);
            }
        }
    }
}

void NavigationManager::cancelNavigation() {
    navigation_active = false;
    current_plan.valid = false;
}