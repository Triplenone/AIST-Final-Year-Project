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

    bool setDateTime(uint16_t year, uint8_t month, uint8_t day,
                     uint8_t hour, uint8_t minute, uint8_t second) {
        if (!isDateTimeValid(year, month, day, hour, minute, second)) {
            return false;
        }

        Wire.beginTransmission(i2c_addr);
        Wire.write(0x02);                    // VL_seconds
        Wire.write(decToBcd(second) & 0x7F); // clear voltage-low bit
        Wire.write(decToBcd(minute));
        Wire.write(decToBcd(hour));
        Wire.write(decToBcd(day));
        Wire.write(decToBcd(calculateWeekday(year, month, day)));
        Wire.write(decToBcd(month) & 0x1F);
        Wire.write(decToBcd(year % 100));
        return Wire.endTransmission() == 0;
    }

    bool getDateTime(uint16_t &year, uint8_t &month, uint8_t &day,
                     uint8_t &hour, uint8_t &minute, uint8_t &second) {
        Wire.beginTransmission(i2c_addr);
        Wire.write(0x02);
        if (Wire.endTransmission(false) != 0) {
            return false;
        }

        if (Wire.requestFrom(i2c_addr, (uint8_t)7) != 7) {
            return false;
        }

        uint8_t rawSecond = Wire.read();
        second = bcdToDec(rawSecond & 0x7F);
        minute = bcdToDec(Wire.read() & 0x7F);
        hour = bcdToDec(Wire.read() & 0x3F);
        day = bcdToDec(Wire.read() & 0x3F);
        Wire.read(); // weekday
        month = bcdToDec(Wire.read() & 0x1F);
        year = bcdToDec(Wire.read()) + 2000;

        if (rawSecond & 0x80) {
            return false;
        }
        return isDateTimeValid(year, month, day, hour, minute, second);
    }

    uint8_t getHour() {
        uint16_t year; uint8_t month, day, hour, minute, second;
        if (!getDateTime(year, month, day, hour, minute, second)) return 0;
        return hour;
    }

    uint8_t getMinute() {
        uint16_t year; uint8_t month, day, hour, minute, second;
        if (!getDateTime(year, month, day, hour, minute, second)) return 0;
        return minute;
    }

    uint8_t getDay() {
        uint16_t year; uint8_t month, day, hour, minute, second;
        if (!getDateTime(year, month, day, hour, minute, second)) return 0;
        return day;
    }

    uint8_t getMonth() {
        uint16_t year; uint8_t month, day, hour, minute, second;
        if (!getDateTime(year, month, day, hour, minute, second)) return 0;
        return month;
    }

    uint16_t getYear() {
        uint16_t year; uint8_t month, day, hour, minute, second;
        if (!getDateTime(year, month, day, hour, minute, second)) return 0;
        return year;
    }

private:
    uint8_t decToBcd(uint8_t val) {
        return ((val / 10 * 16) + (val % 10));
    }

    uint8_t bcdToDec(uint8_t val) {
        return ((val / 16 * 10) + (val % 16));
    }

    bool isDateTimeValid(uint16_t year, uint8_t month, uint8_t day,
                         uint8_t hour, uint8_t minute, uint8_t second) {
        if (year < 2024 || year > 2099) return false;
        if (month < 1 || month > 12) return false;
        if (day < 1 || day > 31) return false;
        if (hour > 23 || minute > 59 || second > 59) return false;
        return true;
    }

    uint8_t calculateWeekday(uint16_t year, uint8_t month, uint8_t day) {
        if (month < 3) {
            month += 12;
            year--;
        }
        uint16_t k = year % 100;
        uint16_t j = year / 100;
        uint8_t h = (day + ((13 * (month + 1)) / 5) + k + (k / 4) + (j / 4) + (5 * j)) % 7;
        return (h + 6) % 7; // 0=Sunday
    }
};

#endif
