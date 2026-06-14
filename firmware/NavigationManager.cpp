// NavigationManager.cpp
#include "NavigationManager.h"
#include <ArduinoJson.h>
#include <math.h>

NavigationManager::NavigationManager() 
    : hasPath(false), currentWaypointIndex(0), currentX(0), currentY(0) {
    displayInfo.active = false;
    displayInfo.stepCount = 0;
    displayInfo.pathProgress = 0;
    displayInfo.currentDistance = 0;
    displayInfo.currentBearing = 0;
}

bool NavigationManager::parseNavigationPlan(const String& json) {
    DynamicJsonDocument doc(4096);
    DeserializationError error = deserializeJson(doc, json);
    
    if (error) {
        Serial.printf("[导航] JSON解析失败: %s\n", error.c_str());
        return false;
    }
    
    // 检查导航数据格式
    if (doc.containsKey("navigation")) {
        JsonObject nav = doc["navigation"];
        
        // 解析目标
        if (nav.containsKey("target")) {
            JsonObject target = nav["target"];
            float x = target["x"] | 0.0;
            float y = target["y"] | 0.0;
            String gate = target["name"] | "";
            
            setTarget(x, y, gate);
        }
        
        // 解析路径点
        if (nav.containsKey("waypoints")) {
            JsonArray waypointsArray = nav["waypoints"];
            std::vector<NavWaypoint> path;
            
            for (JsonObject wp : waypointsArray) {
                NavWaypoint point;
                point.x = wp["x"] | 0.0;
                point.y = wp["y"] | 0.0;
                point.name = wp["name"] | "";
                point.action = wp["action"] | "";
                path.push_back(point);
            }
            
            if (path.size() > 0) {
                setPath(path);
            }
        }
        
        Serial.println("[导航] 导航计划已更新");
        return true;
    }
    
    return false;
}

void NavigationManager::setTarget(float x, float y, const String& gate) {
    displayInfo.targetX = x;
    displayInfo.targetY = y;
    displayInfo.targetGate = gate;
    displayInfo.active = true;
    
    waypoints.clear();
    NavWaypoint wp;
    wp.x = x;
    wp.y = y;
    wp.name = gate;
    wp.action = "arrive";
    waypoints.push_back(wp);
    
    hasPath = true;
    currentWaypointIndex = 0;
    
    updatePosition(currentX, currentY);
    
    Serial.printf("[导航] 设置目标: %s @ (%.1f, %.1f)\n", gate.c_str(), x, y);
}

void NavigationManager::setPath(const std::vector<NavWaypoint>& path) {
    waypoints = path;
    hasPath = true;
    currentWaypointIndex = 0;
    displayInfo.active = true;
    
    if (waypoints.size() > 0) {
        displayInfo.targetX = waypoints.back().x;
        displayInfo.targetY = waypoints.back().y;
    }
    // ⭐ 关键：生成导航步骤
    generateSteps();
    
    // 更新位置
    updatePosition(currentX, currentY);
    
    Serial.printf("[导航] 设置路径，包含 %d 个路径点\n", path.size());
}

void NavigationManager::updatePosition(float x, float y) {
    currentX = x;
    currentY = y;
    
    if (!displayInfo.active) return;
    
    // 检查是否到达当前路径点
    if (hasPath && currentWaypointIndex < (int)waypoints.size()) {
        float distToWp = calculateDistance(currentX, currentY, 
                                            waypoints[currentWaypointIndex].x,
                                            waypoints[currentWaypointIndex].y);
        if (distToWp < 0.5) {
            Serial.printf("[导航] 到达路径点 %d: %s\n", 
                         currentWaypointIndex, 
                         waypoints[currentWaypointIndex].name.c_str());
            currentWaypointIndex++;
            generateSteps();
        }
    }
    
    // 更新显示信息
    displayInfo.currentDistance = calculateDistance(currentX, currentY,
                                                     displayInfo.targetX,
                                                     displayInfo.targetY);
    
    displayInfo.currentBearing = calculateBearing(currentX, currentY,
                                                   displayInfo.targetX,
                                                   displayInfo.targetY);
    
    displayInfo.currentDirection = bearingToDirection(displayInfo.currentBearing);
    
    // 计算路径进度
    if (hasPath && waypoints.size() > 0) {
        float totalDist = 0;
        float traveledDist = 0;
        
        for (size_t i = 0; i < waypoints.size() - 1; i++) {
            totalDist += calculateDistance(waypoints[i].x, waypoints[i].y,
                                           waypoints[i+1].x, waypoints[i+1].y);
        }
        
        if (currentWaypointIndex > 0) {
            for (int i = 0; i < currentWaypointIndex; i++) {
                if (i < (int)waypoints.size() - 1) {
                    traveledDist += calculateDistance(waypoints[i].x, waypoints[i].y,
                                                       waypoints[i+1].x, waypoints[i+1].y);
                }
            }
        }
        
        if (currentWaypointIndex < (int)waypoints.size()) {
            traveledDist += calculateDistance(currentX, currentY,
                                               waypoints[currentWaypointIndex].x,
                                               waypoints[currentWaypointIndex].y);
        }
        
        if (totalDist > 0) {
            displayInfo.pathProgress = traveledDist / totalDist;
            if (displayInfo.pathProgress > 1) displayInfo.pathProgress = 1;
        }
    }
}

void NavigationManager::generateSteps() {
    displayInfo.stepCount = 0;
    
    if (!hasPath || currentWaypointIndex >= (int)waypoints.size()) {
        if (displayInfo.currentDistance < 1) {
            displayInfo.steps[0].instruction = "arrive";
            displayInfo.steps[0].distance = displayInfo.currentDistance;
            displayInfo.steps[0].direction = "arrive";
            displayInfo.steps[0].targetPoint = displayInfo.targetGate;
            displayInfo.stepCount = 1;
        }
        return;
    }
    
    int stepIdx = 0;
    int wpIdx = currentWaypointIndex;
    
    while (stepIdx < 3 && wpIdx < (int)waypoints.size()) {
        NavStep step;
        step.stepId = stepIdx + 1;
        
        float dx = waypoints[wpIdx].x - currentX;
        float dy = waypoints[wpIdx].y - currentY;
        float dist = sqrt(dx*dx + dy*dy)*0.2;
        float bearing = atan2(dy, dx) * 180 / PI;
        if (bearing < 0) bearing += 360;
        
        step.distance = dist;
        step.direction = bearingToDirection(bearing);
        
        if (waypoints[wpIdx].action == "turn_left") {
            step.instruction = "turn left";
        } else if (waypoints[wpIdx].action == "turn_right") {
            step.instruction = "turn right";
        } else if (waypoints[wpIdx].action == "go_straight") {
            step.instruction = "go straight";
        } else if (waypoints[wpIdx].action == "arrive") {
            step.instruction = "arrive";
        } else {
            step.instruction = "go to";
        }
        
        step.targetPoint = waypoints[wpIdx].name;
        displayInfo.steps[stepIdx] = step;
        stepIdx++;
        wpIdx++;
        
        if (wpIdx == (int)waypoints.size()) break;
    }
    
    displayInfo.stepCount = stepIdx;
    
    // 调试输出
    for (int i = 0; i < displayInfo.stepCount; i++) {
        Serial.printf("[导航步骤] %d. %s %.0f米 -> %s\n", 
                     i+1,
                     displayInfo.steps[i].instruction.c_str(),
                     displayInfo.steps[i].distance,
                     displayInfo.steps[i].targetPoint.c_str());
    }
}

float NavigationManager::calculateDistance(float x1, float y1, float x2, float y2) {
    float dx = x2 - x1;
    float dy = y2 - y1;
    return sqrt(dx*dx + dy*dy)*0.2; //实际距离：像素距离 = 0.2
}

float NavigationManager::calculateBearing(float fromX, float fromY, float toX, float toY) {
    float dx = toX - fromX;
    float dy = toY - fromY;
    float bearing = atan2(dy, dx) * 180 / PI;
    if (bearing < 0) bearing += 360;
    return bearing;
}

String NavigationManager::bearingToDirection(float bearing) {
    if (bearing >= 337.5 || bearing < 22.5) return "东";
    else if (bearing >= 22.5 && bearing < 67.5) return "东北";
    else if (bearing >= 67.5 && bearing < 112.5) return "北";
    else if (bearing >= 112.5 && bearing < 157.5) return "西北";
    else if (bearing >= 157.5 && bearing < 202.5) return "西";
    else if (bearing >= 202.5 && bearing < 247.5) return "西南";
    else if (bearing >= 247.5 && bearing < 292.5) return "南";
    else return "东南";
}

void NavigationManager::clear() {
    displayInfo.active = false;
    hasPath = false;
    waypoints.clear();
    displayInfo.stepCount = 0;
    Serial.println("[导航] 已清除");
}

void NavigationManager::replanPath() {
    Serial.println("[导航] 重新规划路径");
}
