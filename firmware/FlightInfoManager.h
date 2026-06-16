#ifndef FLIGHT_INFO_MANAGER_H
#define FLIGHT_INFO_MANAGER_H

#include <Arduino.h>
#include "DataTransmitter.h"  // 添加这个

// 声明外部队列和display
extern QueueHandle_t displayCommandQueue;
extern QueueHandle_t audioCommandQueue;
class SimpleDisplayManager;
extern SimpleDisplayManager* display;
class NavigationManager;
extern NavigationManager* navManager;
extern DataTransmitter* data_transmitter;

struct FlightInfo {
    // 基本信息
    String flight_number;
    String airline;
    String destination;
    
    // 时间信息
    String scheduled_departure;
    String estimated_departure;
    String boarding_time;
    
    // 位置信息
    String boarding_gate;
    String terminal;
    String checkin_counter;
    
    // 状态信息
    String status;
    int delay_minutes;
    String delay_reason;
    bool gate_changed;
    String previous_gate;
    
    // 元数据
    bool valid;
    unsigned long last_update;
};

class FlightInfoManager {
private:
    FlightInfo current_flight;
    bool flight_info_received;
    unsigned long last_display_time;
    unsigned long display_interval;
    
    unsigned long last_update_time;
    const unsigned long UPDATE_COOLDOWN = 3000;
    bool has_last_payload_hash;
    uint32_t last_payload_hash;
public:
    FlightInfoManager();
    
    bool parseFlightInfo(const String& json);
    void updateDisplay();
    FlightInfo getFlightInfo() { return current_flight; }
    bool hasFlightInfo() { return flight_info_received; }
    void checkForAlerts(const String& json);
    void clearFlightInfo();
    
private:
    bool getGateCoordinates(const String& gate, float& x, float& y);
    void displayFlightInfo();
    void playAlertSound(const char* filename);
    void speakAlert(const String& message);
    void notifyGateChange();
    void notifyDelay();
    void notifyBoarding();      // 新增：登机提醒
    void notifyFinalCall();     // 新增：最后登机提醒
    void notifyCancelled();     // 新增：航班取消
    void notifyOnTime();        // 新增：航班准点
};

#endif
