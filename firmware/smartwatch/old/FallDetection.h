#ifndef FALL_DETECTION_H
#define FALL_DETECTION_H

#include "IMUManager.h"
#include "Config.h"

enum FallState {
    STATE_NORMAL = 0,
    STATE_FREEFALL,
    STATE_IMPACT,
    STATE_STATIC,
    STATE_FALL_CONFIRMED
};

struct FallEvent {
    FallState state;
    String description;
    float confidence;
    bool is_fall_confirmed;
    float impact_force;
    String direction;
    unsigned long fall_time;
};

class FallDetection {
private:
    IMUManager* imu;
    FallState currentState;          // 注意：这里是currentState，不是current_state
    FallState previousState;         // 注意：这里是previousState，不是previous_state
    unsigned long stateStartTime;    // 注意：这里是stateStartTime，不是state_start_time
    float maxImpact;                 // 注意：这里是maxImpact，不是max_impact
    float preFallOrientation[3];
    
public:
    FallDetection(IMUManager* imu_manager);
    void update();
    FallEvent getFallEvent();
    bool isFallDetected() const { return currentState == STATE_FALL_CONFIRMED; }
    void reset();
    
private:
    void checkTransition();
    bool checkFreeFall();
    bool checkImpact();
    bool checkStatic();
    bool checkOrientation();
    String getFallDirection();
};

#endif