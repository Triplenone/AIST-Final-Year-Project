#include "FallDetection.h"
#include "Config.h"
#include "SimpleDisplayManager.h"

// 前向声明（不包含完整头文件）
class SimpleDisplayManager;
class AudioManager;
class DataTransmitter;

// 声明外部变量（使用 void* 避免类型问题）
extern SimpleDisplayManager* display;
extern void* audio;  // 使用 void* 避免类型检查
extern void* data_transmitter;


// ================ 构造函数实现 ================
FallDetection::FallDetection(IMUManager* imu_manager) 
    : imu(imu_manager), currentState(STATE_NORMAL), previousState(STATE_NORMAL) {
    stateStartTime = millis();
    maxImpact = 0;
}

// ================ update函数实现 ================
void FallDetection::update() {
    checkTransition();
}

// ================ getFallEvent函数实现 ================
FallEvent FallDetection::getFallEvent() {
    FallEvent event;
    event.state = currentState;
    event.is_fall_confirmed = (currentState == STATE_FALL_CONFIRMED);
    event.confidence = 0.0;
    event.impact_force = maxImpact;
    event.direction = getFallDirection();
    event.fall_time = stateStartTime;
    
    switch(currentState) {
        case STATE_NORMAL:
            event.description = "正常";
            break;
        case STATE_FREEFALL:
            event.description = "自由落体";
            event.confidence = 0.3;
            break;
        case STATE_IMPACT:
            event.description = "冲击";
            event.confidence = 0.6;
            break;
        case STATE_STATIC:
            event.description = "跌倒后静止";
            event.confidence = 0.8;
            break;
        case STATE_FALL_CONFIRMED:
            event.description = "确认跌倒";
            event.confidence = 0.9;
            break;
    }
    
    return event;
}

// ================ reset函数实现 ================
void FallDetection::reset() {
    currentState = STATE_NORMAL;
    previousState = STATE_NORMAL;
    maxImpact = 0;
}

// ================ checkTransition函数实现 ================
void FallDetection::checkTransition() {
    bool state_changed = false;
    
    switch(currentState) {
        case STATE_NORMAL:
            if (checkFreeFall()) {
                currentState = STATE_FREEFALL;
                stateStartTime = millis();
                IMUData data = imu->getData();
                preFallOrientation[0] = data.pitch;
                preFallOrientation[1] = data.roll;
            }
            break;
            
        case STATE_FREEFALL:
            if (checkImpact()) {
                currentState = STATE_IMPACT;
                stateStartTime = millis();
            } else if (millis() - stateStartTime > 5000) {
                currentState = STATE_NORMAL;
            }
            break;
            
        case STATE_IMPACT:
            if (checkStatic()) {
                currentState = STATE_STATIC;
                stateStartTime = millis();
            }
            break;
            
        case STATE_STATIC:
            if (checkOrientation()) {
                currentState = STATE_FALL_CONFIRMED;
                stateStartTime = millis();
            } else if (millis() - stateStartTime > 10000) {
                currentState = STATE_NORMAL;
                reset();
            }
            break;
            
        case STATE_FALL_CONFIRMED:
            if (millis() - stateStartTime > 30000) {
                currentState = STATE_NORMAL;
                reset();
            }
            break;
    }
    
    if (currentState != previousState) {
        previousState = currentState;
        Serial.printf("状态变化: %d -> %d\n", previousState, currentState);
    }

    if (currentState == STATE_FALL_CONFIRMED && previousState != STATE_FALL_CONFIRMED) {
        Serial.println("[跌倒] 跌倒确认！");
        
        // 显示跌倒报警
        if (display) {
            display->showFallAlert(true);
        }
        
        // // 播放报警声
        // if (audio) {
        //     audio->playAlert();
        // }
        
        // // 上传跌倒警报
        // if (data_transmitter) {
        //     FallEvent event = getFallEvent();
        //     data_transmitter->transmitFallAlert(event);
        // }
    }
}

// ================ checkFreeFall函数实现 ================
bool FallDetection::checkFreeFall() {
    float accel_mag = imu->getAccelerationMagnitude();
    return accel_mag < FREEFALL_THRESHOLD;
}

// ================ checkImpact函数实现 ================
bool FallDetection::checkImpact() {
    float accel_mag = imu->getAccelerationMagnitude();
    
    if (accel_mag > maxImpact) {
        maxImpact = accel_mag;
    }
    
    return accel_mag > IMPACT_THRESHOLD;
}

// ================ checkStatic函数实现 ================
bool FallDetection::checkStatic() {
    float accel_mag = imu->getAccelerationMagnitude();
    float gyro_mag = imu->getGyroMagnitude();
    
    return (accel_mag < LOW_ACC_THRESHOLD && gyro_mag < LOW_GYRO_THRESHOLD);
}

// ================ checkOrientation函数实现 ================
bool FallDetection::checkOrientation() {
    IMUData data = imu->getData();
    
    float pitch_change = abs(data.pitch - preFallOrientation[0]);
    float roll_change = abs(data.roll - preFallOrientation[1]);
    
    return (pitch_change > ORIENTATION_THRESHOLD || 
            roll_change > ORIENTATION_THRESHOLD);
}

// ================ getFallDirection函数实现 ================
String FallDetection::getFallDirection() {
    IMUData data = imu->getData();
    
    if (abs(data.pitch) > abs(data.roll)) {
        return (data.pitch > 0) ? "forward" : "backward";
    } else {
        return (data.roll > 0) ? "left" : "right";
    }
}