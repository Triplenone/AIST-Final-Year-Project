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

// 调试开关
#define BLE_DEBUG_ENABLED 1

#if BLE_DEBUG_ENABLED
#define BLE_DEBUG_PRINT(...) Serial.printf(__VA_ARGS__)
#else
#define BLE_DEBUG_PRINT(...)
#endif

// 信标结构
struct Beacon {
    String uuid;
    float x, y;
    float rssi_ref;
    int last_rssi;
    unsigned long last_seen;
    float distance;
    float confidence;
};

// 位置结果
struct Location {
    float x, y;
    float raw_x, raw_y;
    float accuracy;
    String quality;
    int beacon_count;
    unsigned long timestamp;
    float speed;
    float heading;
};

// 位置平滑器
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
    float max_speed;
    float max_jump;
    float min_confidence;
    
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
    bool getSmoothedPosition(float& x, float& y);
};

// 自定义扫描回调类（用于调试）
class DebugScanCallback : public BLEAdvertisedDeviceCallbacks {
public:
    void onResult(BLEAdvertisedDevice advertisedDevice) override;
};

class BLELocation {
private:
    BLEScan* pBLEScan;
    Beacon beacons[BEACON_COUNT];
    int beacon_count;
    Location last_location;
    unsigned long last_scan_time;
    std::vector<Beacon> scanned_beacons;
    PositionSmoother smoother;
    
    static const unsigned long BEACON_TIMEOUT = 10000;
    
    // 统计信息
    unsigned long total_scans = 0;
    unsigned long successful_locations = 0;
    
public:
    BLELocation();
    void init();
    void startScan();
    void stopScan();
    Location getLocation();
    const std::vector<Beacon>& getScannedBeacons() const { return scanned_beacons; }
    String getBeaconName(int index);
    float calculateDistance(float target_x, float target_y);
    String getDirectionToTarget(float target_x, float target_y);
    float rssiToDistance(int rssi, float rssi_ref);
    float calculateConfidence(int rssi, float distance);
    void printBeaconInfo();
    int getBeaconCount() { return scanned_beacons.size(); }
    void setSmootherParams(size_t history_size, float max_speed, float max_jump);
    void resetSmoother() { smoother.reset(); }
    void printStatistics();
    void updateBeaconRSSI(String mac, int rssi);
    void setScanHandle(BLEScan* scan) { pBLEScan = scan; }


    
private:
    void processScanResults(BLEScanResults* results);
    Location trilateration();
    void setupBeacons();
    float calculateWeight(float distance, float confidence);
};

#endif