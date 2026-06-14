#ifndef SIMPLE_RTC_H
#define SIMPLE_RTC_H

#include <Wire.h>

class SimpleRTC {
private:
    uint8_t i2c_addr;
    
public:
    SimpleRTC(uint8_t addr = 0x51) : i2c_addr(addr) {}
    
    bool begin(TwoWire &wire = Wire, int sda = -1, int scl = -1) {
        if (sda >= 0 && scl >= 0) {
            wire.begin(sda, scl);
        } else {
            wire.begin();
        }
        
        wire.beginTransmission(i2c_addr);
        return wire.endTransmission() == 0;
    }
    
    void setDateTime(uint16_t year, uint8_t month, uint8_t day, 
                     uint8_t hour, uint8_t minute, uint8_t second) {
        Wire.beginTransmission(i2c_addr);
        Wire.write(0x02); // 控制寄存器
        Wire.write(decToBcd(second));
        Wire.write(decToBcd(minute));
        Wire.write(decToBcd(hour));
        Wire.write(decToBcd(day));
        Wire.write(decToBcd(month));
        Wire.write(decToBcd(year % 100));
        Wire.endTransmission();
    }
    
    void getDateTime(uint16_t &year, uint8_t &month, uint8_t &day,
                     uint8_t &hour, uint8_t &minute, uint8_t &second) {
        Wire.beginTransmission(i2c_addr);
        Wire.write(0x02);
        Wire.endTransmission();
        Wire.requestFrom(i2c_addr, 7);
        
        second = bcdToDec(Wire.read() & 0x7F);
        minute = bcdToDec(Wire.read() & 0x7F);
        hour = bcdToDec(Wire.read() & 0x3F);
        day = bcdToDec(Wire.read() & 0x3F);
        month = bcdToDec(Wire.read() & 0x1F);
        year = bcdToDec(Wire.read()) + 2000;
    }
    
    uint8_t getHour() {
        uint16_t year; uint8_t month, day, hour, minute, second;
        getDateTime(year, month, day, hour, minute, second);
        return hour;
    }
    
    uint8_t getMinute() {
        uint16_t year; uint8_t month, day, hour, minute, second;
        getDateTime(year, month, day, hour, minute, second);
        return minute;
    }
    
    uint8_t getDay() {
        uint16_t year; uint8_t month, day, hour, minute, second;
        getDateTime(year, month, day, hour, minute, second);
        return day;
    }
    
    uint8_t getMonth() {
        uint16_t year; uint8_t month, day, hour, minute, second;
        getDateTime(year, month, day, hour, minute, second);
        return month;
    }
    
    uint16_t getYear() {
        uint16_t year; uint8_t month, day, hour, minute, second;
        getDateTime(year, month, day, hour, minute, second);
        return year;
    }
    
private:
    uint8_t decToBcd(uint8_t val) {
        return ((val / 10 * 16) + (val % 10));
    }
    
    uint8_t bcdToDec(uint8_t val) {
        return ((val / 16 * 10) + (val % 16));
    }
};

#endif