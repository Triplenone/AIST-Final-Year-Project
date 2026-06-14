// NavigationManager.h
#ifndef NAVIGATION_MANAGER_H
#define NAVIGATION_MANAGER_H

#include <Arduino.h>
#include <vector>
#include "Config.h"

// 导航步骤结构
struct NavStep {
    int stepId;
    String instruction;
    float distance;
    String direction;
    String targetPoint;
};

// 导航路径点
struct NavWaypoint {
    float x, y;
    String name;
    String action;
};

// 导航显示信息
struct NavDisplayInfo {
    bool active;
    float targetX, targetY;
    String targetGate;
    float currentDistance;
    float currentBearing;
    String currentDirection;
    NavStep steps[3];
    int stepCount;
    float pathProgress;
};

class NavigationManager {
private:
    NavDisplayInfo displayInfo;
    std::vector<NavWaypoint> waypoints;
    bool hasPath;
    int currentWaypointIndex;
    float currentX, currentY;
    
    float calculateDistance(float x1, float y1, float x2, float y2);
    float calculateBearing(float fromX, float fromY, float toX, float toY);
    String bearingToDirection(float bearing);
    void generateSteps();
    
public:
    NavigationManager();

    const std::vector<NavWaypoint>& getWaypoints() const { return waypoints; }
    
    // 设置导航目标
    void setTarget(float x, float y, const String& gate);
    void setPath(const std::vector<NavWaypoint>& path);
    
    // 解析 MQTT 下发的导航计划
    bool parseNavigationPlan(const String& json);
    
    // 更新当前位置
    void updatePosition(float x, float y);
    
    // 获取显示信息
    const NavDisplayInfo& getDisplayInfo() { return displayInfo; }
    
    // 状态查询
    bool isActive() { return displayInfo.active; }
    bool isArrived() { return displayInfo.currentDistance < 0.5; }
    float getDistanceToTarget() { return displayInfo.currentDistance; }
    
    // 清除导航
    void clear();
    void replanPath();
};

#endif