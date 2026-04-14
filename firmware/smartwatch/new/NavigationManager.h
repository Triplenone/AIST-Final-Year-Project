#ifndef NAVIGATION_MANAGER_H
#define NAVIGATION_MANAGER_H

#include <Arduino.h>
#include <vector>
#include "DataTransmitter.h"  // 添加这个来获取 AudioCommand 定义

// 声明外部队列
extern QueueHandle_t audioCommandQueue;

struct Waypoint {
    String name;
    float x, y;
    String description;
};

struct NavigationInstruction {
    int step;
    String text;
    float distance;
    String direction;
};

struct NavigationPlan {
    String plan_id;
    String status;
    String destination_name;
    float dest_x, dest_y;
    String gate_number;
    String boarding_time;
    String flight_number;
    std::vector<Waypoint> waypoints;
    std::vector<NavigationInstruction> instructions;
    float total_distance;
    int estimated_time;
    bool valid;
};

class NavigationManager {
private:
    NavigationPlan current_plan;
    bool navigation_active;
    int current_step;
    unsigned long last_voice_prompt;
    unsigned long voice_prompt_interval;
    float current_x;  // 添加成员变量
    float current_y;
    
public:
    NavigationManager();
    
    bool parseNavigationPlan(const String& json);
    void updateNavigation(float x, float y);  // 修改参数
    NavigationInstruction getCurrentInstruction();
    float getDistanceToDestination();
    String getNextAction();
    void cancelNavigation();
    bool isActive() { return navigation_active; }
    
private:
    void checkWaypointReached();
    void speakInstruction(const NavigationInstruction& inst);
    int findNextWaypoint();
};

#endif