// FT6146.h
#ifndef FT6146_H
#define FT6146_H

#include <Arduino.h>
#include <Wire.h>

#define FT6146_I2C_ADDR 0x38
#define FT6146_STATUS_REG 0x00
#define FT6146_TOUCH1_XH 0x03
#define FT6146_TOUCH1_XL 0x04
#define FT6146_TOUCH1_YH 0x05
#define FT6146_TOUCH1_YL 0x06
#define FT6146_GESTURE_ID 0x01

class FT6146 {
private:
    uint8_t i2c_addr;
    int intr_pin;
    bool touched;
    uint16_t touch_x, touch_y;
    uint8_t gesture;
    unsigned long last_touch_time;
    
public:
    FT6146(uint8_t addr = FT6146_I2C_ADDR, int intr = -1) {
        i2c_addr = addr;
        intr_pin = intr;
        touched = false;
        touch_x = 0;
        touch_y = 0;
        gesture = 0;
        last_touch_time = 0;
    }
    
    bool begin(TwoWire &wire = Wire) {
        wire.beginTransmission(i2c_addr);
        if (wire.endTransmission() != 0) {
            Serial.println("❌ FT6146 未找到");
            return false;
        }
        
        if (intr_pin >= 0) {
            pinMode(intr_pin, INPUT_PULLUP);
        }
        
        Serial.println("✅ FT6146 触摸初始化成功");
        return true;
    }
    
    bool isTouched() {
        if (intr_pin >= 0) {
            return digitalRead(intr_pin) == LOW;
        }
        
        Wire.beginTransmission(i2c_addr);
        Wire.write(FT6146_STATUS_REG);
        Wire.endTransmission();
        Wire.requestFrom(i2c_addr, (uint8_t)1);
        if (Wire.available()) {
            uint8_t status = Wire.read();
            return (status & 0x0F) > 0;
        }
        return false;
    }
    
    bool readTouch(uint16_t &x, uint16_t &y) {
        if (!isTouched()) return false;
        
        Wire.beginTransmission(i2c_addr);
        Wire.write(FT6146_TOUCH1_XH);
        Wire.endTransmission();
        Wire.requestFrom(i2c_addr, (uint8_t)6);
        
        if (Wire.available() >= 6) {
            uint8_t xh = Wire.read();
            uint8_t xl = Wire.read();
            uint8_t yh = Wire.read();
            uint8_t yl = Wire.read();
            
            touch_x = ((xh & 0x0F) << 8) | xl;
            touch_y = ((yh & 0x0F) << 8) | yl;
            
            x = touch_x;
            y = touch_y;
            last_touch_time = millis();
            
            // 读取手势
            Wire.beginTransmission(i2c_addr);
            Wire.write(FT6146_GESTURE_ID);
            Wire.endTransmission();
            Wire.requestFrom(i2c_addr, (uint8_t)1);
            if (Wire.available()) {
                gesture = Wire.read();
            }
            
            return true;
        }
        
        return false;
    }
    
    uint8_t getGesture() { return gesture; }
    
    // 校准屏幕映射
    void mapToScreen(uint16_t touch_x, uint16_t touch_y, 
                     int16_t &screen_x, int16_t &screen_y,
                     int screen_width, int screen_height) {
        // 根据实际触摸范围调整这些值
        // 使用 Serial.print 查看原始触摸范围后调整
        int x_min = 150, x_max = 3850;
        int y_min = 150, y_max = 3850;
        
        screen_x = map(touch_x, x_min, x_max, 0, screen_width - 1);
        screen_y = map(touch_y, y_min, y_max, 0, screen_height - 1);
        
        screen_x = constrain(screen_x, 0, screen_width - 1);
        screen_y = constrain(screen_y, 0, screen_height - 1);
    }
    
    unsigned long getLastTouchTime() { return last_touch_time; }
};

#endif