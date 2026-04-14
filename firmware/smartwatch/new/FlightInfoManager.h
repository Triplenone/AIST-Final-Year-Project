#ifndef FLIGHT_INFO_MANAGER_H
#define FLIGHT_INFO_MANAGER_H

#include <Arduino.h>
#include "DataTransmitter.h"  // 添加这个

// 声明外部队列和display
extern QueueHandle_t displayCommandQueue;
extern QueueHandle_t audioCommandQueue;
class SimpleDisplayManager;  // 前向声明
extern SimpleDisplayManager* display;  // 声明外部display变量

struct FlightInfo {
    String flight_number;
    String airline;
    String destination;
    String scheduled_departure;
    String estimated_departure;
    String boarding_time;
    String boarding_gate;
    String status;
    int delay_minutes;
    String delay_reason;
    bool gate_changed;
    String previous_gate;
    String terminal;
    
    bool valid;
    unsigned long last_update;
};

class FlightInfoManager {
private:
    FlightInfo current_flight;
    bool flight_info_received;
    unsigned long last_display_time;
    unsigned long display_interval;
    
    unsigned long last_update_time;  // 上次更新时间
    const unsigned long UPDATE_COOLDOWN = 3000;  // 30秒冷却时间
public:
    FlightInfoManager();
    
    bool parseFlightInfo(const String& json);
    void updateDisplay();
    FlightInfo getFlightInfo() { return current_flight; }
    bool hasFlightInfo() { return flight_info_received; }
    void checkForAlerts(const String& json);
    
private:
    void displayFlightInfo();
    void speakAlert(const String& message);
};

#endif