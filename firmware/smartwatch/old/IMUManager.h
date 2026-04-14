#ifndef IMU_MANAGER_H
#define IMU_MANAGER_H

#include <Wire.h>
#include <SD_MMC.h>
#include "pin_config.h"
#include "SensorQMI8658.hpp"  // 添加厂家的库

struct IMUData {
    float accel_x = 0, accel_y = 0, accel_z = 0;
    float gyro_x = 0, gyro_y = 0, gyro_z = 0;
    float pitch = 0, roll = 0;
    float temperature = 25.0;
    bool data_ready = false;
    
    void reset() {
        accel_x = accel_y = accel_z = 0;
        gyro_x = gyro_y = gyro_z = 0;
        pitch = roll = 0;
        temperature = 25.0;
        data_ready = false;
    }
};

class IMUManager {
private:
    IMUData current_data;
    bool imu_initialized;
    SensorQMI8658 qmi;  // 厂家的 IMU 对象
    
    // ===== 添加 calibration_offset 数组 =====
    float calibration_offset[6];  // [0-2]加速度偏移, [3-5]陀螺仪偏移（预留）
    
public:
    IMUManager();
    bool init();
    void update();
    IMUData getData() { return current_data; }
    float getAccelerationMagnitude();
    float getGyroMagnitude();
    void calibrate();  // 校准功能保留
    
    // 便捷函数
    float getAccelX() { return current_data.accel_x; }
    float getAccelY() { return current_data.accel_y; }
    float getAccelZ() { return current_data.accel_z; }
    float getGyroX() { return current_data.gyro_x; }
    float getGyroY() { return current_data.gyro_y; }
    float getGyroZ() { return current_data.gyro_z; }
    float getTemperature() { return current_data.temperature; }
    
private:
    bool readIMU();  // 现在用厂家的库实现
};

#endif