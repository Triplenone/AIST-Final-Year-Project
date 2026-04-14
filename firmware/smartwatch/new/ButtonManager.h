#ifndef BUTTON_MANAGER_H
#define BUTTON_MANAGER_H

#include <Arduino.h>
#include "Config.h"

// 移除枚举定义，使用主文件中定义的ButtonEventData
// 只保留类定义

class ButtonManager {
private:
    // PWR按钮状态
    int pwr_button_state;
    unsigned long pwr_press_start;
    unsigned long pwr_press_end;
    unsigned long pwr_last_click_time;
    int pwr_click_count;
    
    // BOOT按钮状态
    int boot_button_state;
    unsigned long boot_press_start;
    bool sos_active;
    
    // 事件标志
    bool pwr_single_click_detected;
    bool pwr_double_click_detected;
    bool boot_sos_activated;
    bool boot_sos_cleared;
    
public:
    ButtonManager();
    void init();
    void update();  // 改为update模式
    
    // 修改返回类型为int，表示事件类型
    int getEvent();  // 0=无事件, 1=PWR单击, 2=PWR双击, 3=BOOT SOS激活, 4=BOOT SOS清除
    
    bool isSOSActive() { return sos_active; }
    void clearSOS() { sos_active = false; }
    
private:
    void checkPWRButton();
    void checkBootButton();
    void resetEvents();
};

// ================ 构造函数 ================
ButtonManager::ButtonManager() 
    : pwr_button_state(HIGH),
      pwr_press_start(0),
      pwr_press_end(0),
      pwr_last_click_time(0),
      pwr_click_count(0),
      boot_button_state(HIGH),
      boot_press_start(0),
      sos_active(false),
      pwr_single_click_detected(false),
      pwr_double_click_detected(false),
      boot_sos_activated(false),
      boot_sos_cleared(false) {}

// ================ init函数 ================
void ButtonManager::init() {
    pinMode(PWR_BUTTON_PIN, INPUT_PULLUP);
    pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
    resetEvents();
}

// ================ update函数 ================
void ButtonManager::update() {
    resetEvents();
    checkPWRButton();
    checkBootButton();
}

// ================ getEvent函数 ================
int ButtonManager::getEvent() {
    if (boot_sos_activated) return 3;  // BOOT_SOS_ACTIVATED
    if (boot_sos_cleared) return 4;    // BOOT_SOS_CLEARED
    if (pwr_double_click_detected) return 2;  // PWR_DOUBLE_CLICK
    if (pwr_single_click_detected) return 1;  // PWR_SINGLE_CLICK
    return 0;  // NO_EVENT
}

// ================ resetEvents函数 ================
void ButtonManager::resetEvents() {
    pwr_single_click_detected = false;
    pwr_double_click_detected = false;
    boot_sos_activated = false;
    boot_sos_cleared = false;
}

// ================ checkPWRButton函数 ================
void ButtonManager::checkPWRButton() {
    // PWR按钮：高电平为按下（GPIO10）
    int current_state = digitalRead(PWR_BUTTON_PIN);
    
    if (current_state == HIGH && pwr_button_state == LOW) {
        // 按钮按下
        pwr_press_start = millis();
    } 
    else if (current_state == LOW && pwr_button_state == HIGH) {
        // 按钮释放
        pwr_press_end = millis();
        unsigned long press_duration = pwr_press_end - pwr_press_start;
        
        if (press_duration >= 20 && press_duration < 500) { // 有效点击
            pwr_click_count++;
            
            if (pwr_click_count == 1) {
                pwr_last_click_time = millis();
            } 
            else if (pwr_click_count == 2) {
                unsigned long click_interval = millis() - pwr_last_click_time;
                if (click_interval < 500) { // 双击间隔小于500ms
                    pwr_double_click_detected = true;
                    pwr_click_count = 0;
                    Serial.println("PWR按钮双击 - 开关导航");
                } else {
                    // 超时，当作两次单击
                    pwr_single_click_detected = true;
                    pwr_click_count = 1;
                    pwr_last_click_time = millis();
                    Serial.println("PWR按钮单击 - 开关屏幕");
                }
            }
        }
    }
    
    // 检查单击超时
    if (pwr_click_count == 1 && (millis() - pwr_last_click_time) > 500) {
        pwr_single_click_detected = true;
        pwr_click_count = 0;
        Serial.println("PWR按钮单击 - 开关屏幕");
    }
    
    pwr_button_state = current_state;
}

// ================ checkBootButton函数 ================
void ButtonManager::checkBootButton() {
    // BOOT按钮：低电平为按下（GPIO0）
    int current_state = digitalRead(BOOT_BUTTON_PIN);
    
    if (current_state == LOW && boot_button_state == HIGH) {
        // 按钮按下
        boot_press_start = millis();
    } 
    else if (current_state == HIGH && boot_button_state == LOW) {
        // 按钮释放
        unsigned long press_duration = millis() - boot_press_start;
        
        if (press_duration >= SOS_HOLD_TIME) { // 长按3秒
            if (!sos_active) {
                sos_active = true;
                boot_sos_activated = true;
                Serial.println("BOOT按钮长按3秒 - SOS激活!");
            } else {
                sos_active = false;
                boot_sos_cleared = true;
                Serial.println("BOOT按钮长按3秒 - SOS清除!");
            }
        }
        // 短按不处理
    }
    
    boot_button_state = current_state;
}

#endif