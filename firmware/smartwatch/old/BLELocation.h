#ifndef BLE_LOCATION_H
#define BLE_LOCATION_H

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include <math.h>
#include <vector>
#include <deque>
#include "Config.h"

// 信标结构
struct Beacon {
    String uuid;           // MAC地址
    float x, y;            // 坐标位置
    float rssi_ref;        // 参考RSSI (1米处)
    int last_rssi;         // 上次RSSI
    unsigned long last_seen; // 上次看到的时间
    float distance;        // 计算出的距离
    float confidence;      // 置信度 (0-1)
};

// 位置结果
struct Location {
    float x, y;            // 坐标
    float raw_x, raw_y;    // 原始坐标（未平滑）
    float accuracy;        // 精度 (米)
    String quality;        // 定位质量
    int beacon_count;      // 使用的信标数
    unsigned long timestamp; // 时间戳
    float speed;           // 移动速度 (米/秒)
    float heading;         // 移动方向 (度)
};

// ============ 位置平滑器类 ============
class PositionSmoother {
private:
    struct HistoryPoint {
        float x, y;
        float confidence;
        unsigned long timestamp;
    };
    
    std::deque<HistoryPoint> history;
    size_t max_history_size;
    float last_valid_x;
    float last_valid_y;
    unsigned long last_valid_time;
    
    // 滤波参数
    float max_speed;        // 最大允许速度 (米/秒)
    float max_jump;         // 最大允许跳变 (米)
    float min_confidence;    // 最小置信度
    
public:
    PositionSmoother(size_t history_size = 8);
    
    void addPoint(float x, float y, float confidence);
    float getWeightedAverageX();
    float getWeightedAverageY();
    bool isOutlier(float x, float y, float confidence);
    float calculateSpeed();
    float calculateHeading();
    void reset();
    void setMaxSpeed(float speed) { max_speed = speed; }
    void setMaxJump(float jump) { max_jump = jump; }
    void setMinConfidence(float conf) { min_confidence = conf; }
    
    // 获取最新平滑位置
    bool getSmoothedPosition(float& x, float& y);
};

class BLELocation {
private:
    BLEScan* pBLEScan;
    Beacon beacons[BEACON_COUNT];
    int beacon_count;
    Location last_location;
    unsigned long last_scan_time;
    
    // 扫描结果缓存
    std::vector<Beacon> scanned_beacons;
    
    // ===== 位置平滑器 =====
    PositionSmoother smoother;

    // 添加信标保持时间
    static const unsigned long BEACON_TIMEOUT = 10000;  // 10秒超时
    
public:
    BLELocation();
    void init();
    void startScan();
    void stopScan();
    Location getLocation();
    
    // 获取扫描到的信标列表
    const std::vector<Beacon>& getScannedBeacons() const { 
        return scanned_beacons; 
    }
    
    // 获取信标名称
    String getBeaconName(int index);
    
    // 工具函数
    float calculateDistance(float target_x, float target_y);
    String getDirectionToTarget(float target_x, float target_y);
    float rssiToDistance(int rssi, float rssi_ref);
    float calculateConfidence(int rssi, float distance);
    
    // 调试函数
    void printBeaconInfo();
    int getBeaconCount() { return scanned_beacons.size(); }
    
    // 平滑器配置
    void setSmootherParams(size_t history_size, float max_speed, float max_jump);
    void resetSmoother() { smoother.reset(); }
    
private:
    void processScanResults(BLEScanResults* results);
    Location trilateration();
    void setupBeacons();
    float calculateWeight(float distance, float confidence);
};

#endif