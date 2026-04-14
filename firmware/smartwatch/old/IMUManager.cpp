#include "IMUManager.h"
#include <Wire.h>
#include <SD_MMC.h>
#include "pin_config.h"

// ================ 构造函数 ================
IMUManager::IMUManager() : imu_initialized(false) {
    current_data.reset();
    // 初始化校准数组
    for (int i = 0; i < 6; i++) {
        calibration_offset[i] = 0;
    }
}

// ================ init函数 ================
bool IMUManager::init() {
    Serial.println("\n=== IMU 初始化开始 ===");
    
    SD_MMC.setPins(SDMMC_CLK, SDMMC_CMD, SDMMC_DATA);
    
    // 使用厂家库初始化 IMU
    Serial.println("尝试连接 QMI8658...");
    
    // 注意：begin 函数的参数顺序
    if (!qmi.begin(Wire, 0x6B, IIC_SDA, IIC_SCL)) {  // 直接使用地址 0x6B
        Serial.println("❌ 未找到 QMI8658，使用模拟数据");
        imu_initialized = false;
        return false;
    }
    
    Serial.println("✅ QMI8658 连接成功！");
    
    // 配置加速度计：±4G, 1000Hz, LPF模式0
    qmi.configAccelerometer(
        SensorQMI8658::ACC_RANGE_4G,
        SensorQMI8658::ACC_ODR_1000Hz,
        SensorQMI8658::LPF_MODE_0
    );
    
    // ===== 重要：配置并启用陀螺仪 =====
    Serial.println("配置陀螺仪...");
    qmi.configGyroscope(
        SensorQMI8658::GYR_RANGE_512DPS,  // ±512°/s 量程
        SensorQMI8658::GYR_ODR_896_8Hz,   // 896.8Hz 采样率
        SensorQMI8658::LPF_MODE_0          // LPF模式
    );

    
    // 使能加速度计
    qmi.enableAccelerometer();
    
    // ===== 使能陀螺仪 =====
    qmi.enableGyroscope();
    
    // 校准
    calibrate();
    
    imu_initialized = true;
    Serial.println("✅ IMU 初始化完成\n");
    return true;
}

// ================ update函数 ================
void IMUManager::update() {
    if (imu_initialized) {
        current_data.data_ready = readIMU();
    } else {
        // 模拟数据
        current_data.data_ready = true;
        unsigned long time = millis();
        float t = time / 1000.0;
        
        current_data.accel_x = sin(t * 0.5) * 0.05;
        current_data.accel_y = cos(t * 0.7) * 0.05;
        current_data.accel_z = 1.0 + sin(t * 0.3) * 0.02;
        
        current_data.gyro_x = 0.1 * sin(t * 0.3);
        current_data.gyro_y = 0.1 * cos(t * 0.4);
        current_data.gyro_z = 0.05 * sin(t * 0.2);
        
        current_data.temperature = 25.0 + sin(t * 0.1) * 2.0;
        
        current_data.pitch = atan2(-current_data.accel_x, 
                                  sqrt(current_data.accel_y * current_data.accel_y + 
                                       current_data.accel_z * current_data.accel_z)) * 180 / PI;
        current_data.roll = atan2(current_data.accel_y, current_data.accel_z) * 180 / PI;
    }
}

// ================ readIMU函数 ================
bool IMUManager::readIMU() {
    if (!imu_initialized) return false;
    
    static int readCount = 0;
    readCount++;
    
    if (!qmi.getDataReady()) return false;
    
    float ax, ay, az;
    float gx, gy, gz;
    
    if (qmi.getAccelerometer(ax, ay, az)) {
        // 翻转 Z 轴符号（因为传感器装反了）
        az = -az;
        // 如果需要，也可以翻转 X 和 Y
        // ax = -ax;
        // ay = -ay;
        
        // 应用校准偏移
        current_data.accel_x = ax - calibration_offset[0];
        current_data.accel_y = ay - calibration_offset[1];
        current_data.accel_z = az - calibration_offset[2];
        
        // 计算姿态
        current_data.pitch = atan2(-current_data.accel_x, 
                                  sqrt(current_data.accel_y * current_data.accel_y + 
                                       current_data.accel_z * current_data.accel_z)) * 180 / PI;
        current_data.roll = atan2(current_data.accel_y, current_data.accel_z) * 180 / PI;
    }
    
    if (qmi.getGyroscope(gx, gy, gz)) {
        // 陀螺仪也需要对应翻转
        current_data.gyro_x = gx - calibration_offset[3];
        current_data.gyro_y = gy - calibration_offset[4];
        current_data.gyro_z = gz - calibration_offset[5];
    }
    
    if (readCount % 500 == 0) {
        Serial.printf("IMU: accel(%.3f,%.3f,%.3f) gyro(%.3f,%.3f,%.3f) pitch=%.1f roll=%.1f\n",
                     current_data.accel_x, current_data.accel_y, current_data.accel_z,
                     current_data.gyro_x, current_data.gyro_y, current_data.gyro_z,
                     current_data.pitch, current_data.roll);
    }
    
    return true;
}

// ================ getAccelerationMagnitude函数 ================
float IMUManager::getAccelerationMagnitude() {
    return sqrt(current_data.accel_x * current_data.accel_x +
                current_data.accel_y * current_data.accel_y +
                current_data.accel_z * current_data.accel_z);
}

// ================ getGyroMagnitude函数 ================
float IMUManager::getGyroMagnitude() {
    return sqrt(current_data.gyro_x * current_data.gyro_x +
                current_data.gyro_y * current_data.gyro_y +
                current_data.gyro_z * current_data.gyro_z);
}

// ================ calibrate函数 ================
void IMUManager::calibrate() {
    Serial.println("\n=== IMU校准开始 ===");
    Serial.println("请保持设备静止...");
    
    float sum_accel[3] = {0};
    float sum_gyro[3] = {0};
    int samples = 100;
    int validSamples = 0;
    
    for (int i = 0; i < samples; i++) {
        if (readIMU()) {
            sum_accel[0] += current_data.accel_x;
            sum_accel[1] += current_data.accel_y;
            sum_accel[2] += current_data.accel_z;
            
            // 陀螺仪校准 - 静止时应为0
            sum_gyro[0] += current_data.gyro_x;
            sum_gyro[1] += current_data.gyro_y;
            sum_gyro[2] += current_data.gyro_z;
            
            validSamples++;
        }
        delay(10);
        
        if (i % 20 == 0) {
            Serial.printf("校准进度: %d/%d\n", i, samples);
        }
    }
    
    if (validSamples > 0) {
        // 加速度校准
        calibration_offset[0] = sum_accel[0] / validSamples;
        calibration_offset[1] = sum_accel[1] / validSamples;
        calibration_offset[2] = (sum_accel[2] / validSamples) - 1.0; // 减去重力
        
        // 陀螺仪校准 - 静止时平均偏移
        calibration_offset[3] = sum_gyro[0] / validSamples;
        calibration_offset[4] = sum_gyro[1] / validSamples;
        calibration_offset[5] = sum_gyro[2] / validSamples;
        
        Serial.println("\n✅ 校准完成！");
        Serial.printf("加速度偏移: X=%.3f, Y=%.3f, Z=%.3f\n",
                     calibration_offset[0], calibration_offset[1], calibration_offset[2]);
        Serial.printf("陀螺仪偏移: X=%.3f, Y=%.3f, Z=%.3f\n",
                     calibration_offset[3], calibration_offset[4], calibration_offset[5]);
        
        // 验证校准
        Serial.println("验证校准结果（读取5次数据）：");
        for (int i = 0; i < 5; i++) {
            readIMU();
            Serial.printf("  accel(%.3f,%.3f,%.3f) gyro(%.3f,%.3f,%.3f)\n",
                         current_data.accel_x, current_data.accel_y, current_data.accel_z,
                         current_data.gyro_x, current_data.gyro_y, current_data.gyro_z);
            delay(50);
        }
    } else {
        Serial.println("❌ 校准失败 - 没有读取到有效数据");
    }
    
    Serial.println("=== IMU校准结束 ===\n");
}