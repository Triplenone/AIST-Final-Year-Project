#include "BLELocation.h"
#include "Config.h"

// ================ 全局调试计数器 ================
static int debug_scan_count = 0;
static int debug_beacon_match_count = 0;

// ================ 调试回调函数实现 ================
void DebugScanCallback::onResult(BLEAdvertisedDevice advertisedDevice) {
    String address = advertisedDevice.getAddress().toString().c_str();
    int rssi = advertisedDevice.getRSSI();
    
    BLE_DEBUG_PRINT("[BLE回调] 设备: %s, RSSI: %d", address.c_str(), rssi);
    
    if (advertisedDevice.haveName()) {
        BLE_DEBUG_PRINT(", 名称: %s", advertisedDevice.getName().c_str());
    }
    if (advertisedDevice.haveManufacturerData()) {
        BLE_DEBUG_PRINT(", 厂商数据长度: %d", advertisedDevice.getManufacturerData().length());
    }
    if (advertisedDevice.haveServiceUUID()) {
        BLE_DEBUG_PRINT(", 服务UUID: %s", advertisedDevice.getServiceUUID().toString().c_str());
    }
    BLE_DEBUG_PRINT("\n");
}

// ================ PositionSmoother 实现 ================
PositionSmoother::PositionSmoother(size_t history_size) 
    : max_history_size(history_size), 
      last_valid_x(0), last_valid_y(0), last_valid_time(0),
      max_speed(3.0), max_jump(5.0), min_confidence(0.2) {}

void PositionSmoother::addPoint(float x, float y, float confidence) {
    HistoryPoint point = {x, y, confidence, millis()};
    history.push_back(point);
    if (history.size() > max_history_size) {
        history.pop_front();
    }
}

float PositionSmoother::getWeightedAverageX() {
    if (history.empty()) return last_valid_x;
    float totalWeight = 0, sumX = 0;
    unsigned long now = millis();
    for (const auto& point : history) {
        float age = (now - point.timestamp) / 1000.0;
        float timeWeight = exp(-age);
        float weight = point.confidence * timeWeight;
        sumX += point.x * weight;
        totalWeight += weight;
    }
    return (totalWeight > 0) ? sumX / totalWeight : last_valid_x;
}

float PositionSmoother::getWeightedAverageY() {
    if (history.empty()) return last_valid_y;
    float totalWeight = 0, sumY = 0;
    unsigned long now = millis();
    for (const auto& point : history) {
        float age = (now - point.timestamp) / 1000.0;
        float timeWeight = exp(-age);
        float weight = point.confidence * timeWeight;
        sumY += point.y * weight;
        totalWeight += weight;
    }
    return (totalWeight > 0) ? sumY / totalWeight : last_valid_y;
}

bool PositionSmoother::isOutlier(float x, float y, float confidence) {
    if (history.empty()) return false;
    if (confidence < min_confidence) return true;
    float avgX = getWeightedAverageX();
    float avgY = getWeightedAverageY();
    float dx = x - avgX, dy = y - avgY;
    float distance = sqrt(dx*dx + dy*dy);
    if (distance > max_jump) return true;
    if (!history.empty()) {
        unsigned long now = millis();
        float timeDiff = (now - history.back().timestamp) / 1000.0;
        if (timeDiff > 0) {
            float speed = distance / timeDiff;
            if (speed > max_speed) return true;
        }
    }
    return false;
}

float PositionSmoother::calculateSpeed() {
    if (history.size() < 2) return 0;
    const auto& newest = history.back();
    const auto& oldest = history.front();
    float dx = newest.x - oldest.x, dy = newest.y - oldest.y;
    float distance = sqrt(dx*dx + dy*dy);
    float timeDiff = (newest.timestamp - oldest.timestamp) / 1000.0;
    return (timeDiff > 0) ? distance / timeDiff : 0;
}

float PositionSmoother::calculateHeading() {
    if (history.size() < 2) return 0;
    const auto& newest = history.back();
    const auto& oldest = history.front();
    float dx = newest.x - oldest.x, dy = newest.y - oldest.y;
    return atan2(dy, dx) * 180 / PI;
}

bool PositionSmoother::getSmoothedPosition(float& x, float& y) {
    if (history.empty()) return false;
    x = getWeightedAverageX();
    y = getWeightedAverageY();
    last_valid_x = x;
    last_valid_y = y;
    last_valid_time = millis();
    return true;
}

void PositionSmoother::reset() {
    history.clear();
    last_valid_x = last_valid_y = 0;
    last_valid_time = 0;
}

// ================ BLELocation 实现 ================
BLELocation::BLELocation() : beacon_count(0), last_scan_time(0), smoother(8) {
    // 不再在这里初始化 pBLEScan，因为已经在 initBLE() 中初始化了
    // pBLEScan 使用全局变量
    
    for (int i = 0; i < BEACON_COUNT; i++) {
        beacons[i].uuid = "";
        beacons[i].x = 0;
        beacons[i].y = 0;
        beacons[i].rssi_ref = -65;
        beacons[i].last_rssi = -100;
        beacons[i].last_seen = 0;
        beacons[i].distance = 0;
        beacons[i].confidence = 0;
    }
    
    last_location.x = 2.0;
    last_location.y = 2.0;
    last_location.raw_x = 2.0;
    last_location.raw_y = 2.0;
    last_location.accuracy = 10.0;
    last_location.quality = "unknown";
    last_location.beacon_count = 0;
    last_location.timestamp = 0;
    last_location.speed = 0;
    last_location.heading = 0;
    
    smoother.setMaxSpeed(2.5);
    smoother.setMaxJump(4.0);
    smoother.setMinConfidence(0.15);
    
    BLE_DEBUG_PRINT("BLELocation 构造函数完成\n");
}

void BLELocation::setSmootherParams(size_t history_size, float max_speed, float max_jump) {
    smoother = PositionSmoother(history_size);
    smoother.setMaxSpeed(max_speed);
    smoother.setMaxJump(max_jump);
    BLE_DEBUG_PRINT("平滑器参数已设置: history=%d, max_speed=%.1f, max_jump=%.1f\n", 
                    history_size, max_speed, max_jump);
}

void BLELocation::init() {
    BLE_DEBUG_PRINT("\n=== BLELocation 初始化开始 ===\n");
    
    // 不再重新初始化 BLEDevice，已经在 initBLE() 中完成
    
    // 获取全局的 pBLEScan
    extern BLEScan* pBLEScan;
    if (!pBLEScan) {
        BLE_DEBUG_PRINT("❌ pBLEScan 为空！请先调用 initBLE()\n");
        return;
    }
    
    setupBeacons();
    
    BLE_DEBUG_PRINT("=== BLELocation 初始化完成 ===\n");
}

void BLELocation::setupBeacons() {
    BLE_DEBUG_PRINT("\n=== 配置信标 ===\n");
    
    // 航站楼信标配置（先不用）
    // MAC 地址统一使用小写（BLE 扫描返回的是小写）
    // 格式: {"MAC地址", X坐标, Y坐标, 参考RSSI, 最后RSSI, 最后时间, 距离, 置信度}
    // beacons[0] = {"20:a7:16:60:f7:c4", 3.0, 14.0, -65, -100, 0, 0, 0};
    // beacons[1] = {"20:a7:16:60:f7:ca", 4.0, 9.0, -65, -100, 0, 0, 0};
    // beacons[2] = {"20:a7:16:5e:ef:24", 9.0, 6.0, -65, -100, 0, 0, 0};
    // beacons[3] = {"20:a7:16:61:02:3f", 6.0, 1.5, -65, -100, 0, 0, 0};
    // beacons[4] = {"20:a7:16:61:09:40", 0.0, 0.0, -65, -100, 0, 0, 0};
    // beacons[5] = {"20:a7:16:5e:bc:32", 12.0, 16.0, -65, -100, 0, 0, 0};

    // 老人院信标配置
    // MAC 地址统一使用小写（BLE 扫描返回的是小写）
    // 格式: {"MAC地址", X坐标, Y坐标, 参考RSSI, 最后RSSI, 最后时间, 距离, 置信度}
    beacons[0] = {"20:a7:16:60:f7:c4", 0.0, 4.0, -65, -100, 0, 0, 0};   // Front desk 前台
    beacons[1] = {"20:a7:16:60:f7:ca", 6.0, 0.0, -65, -100, 0, 0, 0};   // Activity room 活动室
    beacons[2] = {"20:a7:16:5e:ef:24", 11.0, 1.0, -65, -100, 0, 0, 0};  // Rehabilitation room 康复室
    beacons[3] = {"20:a7:16:61:02:3f", 11.0, 11.0, -65, -100, 0, 0, 0}; // Toilet 卫生间
    beacons[4] = {"20:a7:16:61:09:40", 1.0, 11.0, -65, -100, 0, 0, 0};  // Door 门口
    beacons[5] = {"20:a7:16:5e:bc:32", 6.0, 16.0, -65, -100, 0, 0, 0};   // Bedroom 卧室
    
    beacon_count = BEACON_COUNT;
    
    for (int i = 0; i < beacon_count; i++) {
        BLE_DEBUG_PRINT("  信标%d: %s @ (%.1f,%.1f) refRSSI=%d\n", 
                       i, beacons[i].uuid.c_str(), 
                       beacons[i].x, beacons[i].y,
                       beacons[i].rssi_ref);
    }
}

void BLELocation::startScan() {
    if (!pBLEScan) {
        BLE_DEBUG_PRINT("❌ startScan: pBLEScan 为空！\n");
        return;
    }
    pBLEScan->start(0, nullptr, false);
    last_scan_time = millis();
    BLE_DEBUG_PRINT("扫描已启动 (非阻塞模式)\n");
}

void BLELocation::stopScan() {
    if (!pBLEScan) {
        BLE_DEBUG_PRINT("❌ stopScan: pBLEScan 为空！\n");
        return;
    }
    pBLEScan->stop();
    BLE_DEBUG_PRINT("扫描已停止\n");
}

void BLELocation::processScanResults(BLEScanResults* results) {
    if (!results) return;
    
    scanned_beacons.clear();
    
    int count = results->getCount();
    Serial.printf("\n📡 扫描到 %d 个BLE设备\n", count);
    
    // 打印配置的信标列表用于对比
    Serial.println("配置的信标列表:");
    for (int j = 0; j < beacon_count; j++) {
        Serial.printf("  [%d] %s\n", j, beacons[j].uuid.c_str());
    }
    
    for (int i = 0; i < count; i++) {
        BLEAdvertisedDevice device = results->getDevice(i);
        String address = device.getAddress().toString().c_str();
        address.toLowerCase();
        int rssi = device.getRSSI();
        
        Serial.printf("  扫描到: MAC=%s, RSSI=%d", address.c_str(), rssi);
        if (device.haveName()) {
            Serial.printf(", 名称=%s", device.getName().c_str());
        }
        Serial.println();
        
        // 检查是否匹配任何一个信标
        bool matched = false;
        for (int j = 0; j < beacon_count; j++) {
            if (address.equals(beacons[j].uuid)) {
                Serial.printf("        ✅ 匹配信标%d: %s\n", j, beacons[j].uuid.c_str());
                matched = true;
                
                // 更新信标信息
                beacons[j].last_rssi = rssi;
                beacons[j].last_seen = millis();
                beacons[j].distance = rssiToDistance(rssi, beacons[j].rssi_ref);
                beacons[j].confidence = calculateConfidence(rssi, beacons[j].distance);
                
                Serial.printf("           距离=%.2fm, 置信度=%.2f\n", 
                             beacons[j].distance, beacons[j].confidence);
                
                scanned_beacons.push_back(beacons[j]);
                break;
            }
        }
        
        if (!matched) {
            Serial.println("        ❌ 未匹配任何配置的信标");
        }
    }
    
    Serial.printf("找到 %d 个目标信标\n", scanned_beacons.size());
}

float BLELocation::rssiToDistance(int rssi, float rssi_ref) {
    float n = 3.0;
    if (rssi > -30) rssi = -30;
    if (rssi < -100) rssi = -100;
    float distance = pow(10, (rssi_ref - rssi) / (10 * n));
    if (rssi > -60) distance *= 0.8;
    else if (rssi < -85) distance = min(distance, 15.0f);
    if (distance < 0.3) distance = 0.3;
    if (distance > 30.0) distance = 30.0;
    return distance;
}

float BLELocation::calculateConfidence(int rssi, float distance) {
    float confidence = 0.5;
    if (rssi > -60) confidence += 0.3;
    else if (rssi > -70) confidence += 0.2;
    else if (rssi > -80) confidence += 0.1;
    if (distance < 2.0) confidence += 0.2;
    else if (distance < 5.0) confidence += 0.1;
    return constrain(confidence, 0.1, 1.0);
}

float BLELocation::calculateWeight(float distance, float confidence) {
    float distWeight = 1.0 / (distance * distance + 1.0);
    return distWeight * confidence;
}

Location BLELocation::trilateration() {
    Serial.println("\n--- trilateration 开始 ---");
    
    Location loc;
    loc.x = 0; loc.y = 0; loc.raw_x = 0; loc.raw_y = 0;
    loc.accuracy = 100.0; loc.quality = "none";
    loc.beacon_count = 0; loc.timestamp = millis() / 1000;
    loc.speed = 0; loc.heading = 0;
    
    Serial.printf("scanned_beacons 大小: %d\n", scanned_beacons.size());
    
    if (scanned_beacons.empty()) {
        Serial.println("❌ scanned_beacons 为空");
        return loc;
    }
    
    if (scanned_beacons.size() < 3) {
        Serial.printf("⚠️ 信标不足: 只有 %d 个，需要至少3个\n", scanned_beacons.size());
        return loc;
    }
    
    float sumWeight = 0, sumX = 0, sumY = 0;
    int validBeacons = 0;
    float minDistance = 100.0;
    float totalConfidence = 0;
    
    // 打印每个信标的信息
    for (const auto& beacon : scanned_beacons) {
        Serial.printf("  信标: %s, 位置=(%.1f,%.1f), 距离=%.2f, RSSI=%d\n",
                     beacon.uuid.c_str(), beacon.x, beacon.y, 
                     beacon.distance, beacon.last_rssi);
        
        if (beacon.distance < minDistance) {
            minDistance = beacon.distance;
        }
    }
    
    Serial.printf("最小距离: %.2f\n", minDistance);
    
    for (const auto& beacon : scanned_beacons) {
        float weight = 1.0 / (beacon.distance * beacon.distance + 1.0);
        if (beacon.distance == minDistance && minDistance < 5.0) {
            weight *= 2.0;
            Serial.println("  最近信标权重加倍");
        }
        
        sumX += beacon.x * weight;
        sumY += beacon.y * weight;
        sumWeight += weight;
        validBeacons++;
        totalConfidence += beacon.confidence;
    }
    
    Serial.printf("validBeacons=%d, sumWeight=%.3f\n", validBeacons, sumWeight);
    
    if (validBeacons >= 3 && sumWeight > 0) {
        loc.raw_x = sumX / sumWeight;
        loc.raw_y = sumY / sumWeight;
        
        float avgConfidence = totalConfidence / validBeacons;
        smoother.addPoint(loc.raw_x, loc.raw_y, avgConfidence);
        smoother.getSmoothedPosition(loc.x, loc.y);
        
        if (validBeacons >= 3) {
            loc.accuracy = 3.0;
            loc.quality = "high";
        } else if (validBeacons == 2) {
            loc.accuracy = 5.0;
            loc.quality = "medium";
        } else {
            loc.accuracy = 8.0;
            loc.quality = "low";
        }
        
        if (minDistance < 2.0) {
            loc.accuracy = 1.0;
            loc.quality = "very_high";
        }
        
        loc.beacon_count = validBeacons;
        
        static float last_x = loc.x, last_y = loc.y;
        static unsigned long last_time = loc.timestamp;
        float dx = loc.x - last_x, dy = loc.y - last_y;
        float dt = loc.timestamp - last_time;
        if (dt > 0) {
            loc.speed = sqrt(dx*dx + dy*dy) / dt;
            loc.heading = atan2(dy, dx) * 180 / PI;
        }
        last_x = loc.x; last_y = loc.y; last_time = loc.timestamp;
        
        Serial.printf("✅ 定位结果: (%.2f, %.2f) 精度=%.1f 质量=%s\n",
                     loc.x, loc.y, loc.accuracy, loc.quality.c_str());
    } else {
        Serial.println("❌ 定位失败");
    }
    
    return loc;
}

Location BLELocation::getLocation() {
    Serial.println("\n========== getLocation 调用 ==========");
    
    if (!pBLEScan) {
        Serial.println("❌ pBLEScan 为空！");
        return last_location;
    }
    
    // 获取扫描结果
    BLEScanResults foundDevices = pBLEScan->getResults();
    int totalDevices = foundDevices.getCount();
    Serial.printf("getResults() 返回 %d 个设备\n", totalDevices);
    
    if (totalDevices == 0) {
        Serial.println("⚠️ 没有扫描到任何设备");
        pBLEScan->clearResults();
        return last_location;
    }
    
    // 处理扫描结果
    processScanResults(&foundDevices);
    pBLEScan->clearResults();
    
    if (scanned_beacons.empty()) {
        Serial.println("⚠️ 没有匹配到目标信标");
        return last_location;
    }
    
    // 打印匹配到的信标
    Serial.printf("匹配到 %d 个信标:\n", scanned_beacons.size());
    for (const auto& beacon : scanned_beacons) {
        Serial.printf("  - %s @ (%.1f,%.1f) 距离=%.2fm\n", 
                     beacon.uuid.c_str(), beacon.x, beacon.y, beacon.distance);
    }
    
    // 计算位置
    Location loc = trilateration();
    Serial.printf("定位结果: (%.2f, %.2f), 精度=%.1f, 信标数=%d\n", 
                 loc.x, loc.y, loc.accuracy, loc.beacon_count);
    
    if (loc.beacon_count > 0) {
        last_location = loc;
    }
    
    return last_location;
}

void BLELocation::printBeaconInfo() {
    BLE_DEBUG_PRINT("\n=== 信标状态 ===\n");
    for (const auto& beacon : scanned_beacons) {
        BLE_DEBUG_PRINT("  %s: 距离=%.1fm RSSI=%d 置信度=%.2f\n",
                       beacon.uuid.c_str(),
                       beacon.distance,
                       beacon.last_rssi,
                       beacon.confidence);
    }
}

void BLELocation::printStatistics() {
    BLE_DEBUG_PRINT("\n=== BLE 统计信息 ===\n");
    BLE_DEBUG_PRINT("总扫描次数: %lu\n", total_scans);
    BLE_DEBUG_PRINT("成功定位次数: %lu\n", successful_locations);
    BLE_DEBUG_PRINT("成功率: %.1f%%\n", 
                   total_scans > 0 ? (float)successful_locations / total_scans * 100 : 0);
    BLE_DEBUG_PRINT("信标匹配次数: %d\n", debug_beacon_match_count);
}


//航站楼beacon先不用
// String BLELocation::getBeaconName(int index) {
//     switch(index) {
//         case 0: return "Check-in Counter";
//         case 1: return "Security Check";
//         case 2: return "Toilet";
//         case 3: return "Boarding Gate";
//         default: return "Unknown";
//     }
// }

//启用老人院beacon
String BLELocation::getBeaconName(int index) {
    switch(index) {
        case 0: return "Front Desk 前台";
        case 1: return "Activity Room 活动室";
        case 2: return "Rehabilitation Room 康复室";
        case 3: return "Toilet 卫生间";
        case 4: return "Door 门口";
        case 5: return "Bedroom 卧室";
        default: return "Unknown";
    }
}

float BLELocation::calculateDistance(float target_x, float target_y) {
    Location loc = getLocation();
    float dx = target_x - loc.x, dy = target_y - loc.y;
    return sqrt(dx*dx + dy*dy);
}

String BLELocation::getDirectionToTarget(float target_x, float target_y) {
    Location loc = getLocation();
    float dx = target_x - loc.x, dy = target_y - loc.y;
    float angle = atan2(dy, dx) * 180 / PI;
    if (angle < 0) angle += 360;
    
    if (angle >= 337.5 || angle < 22.5) return "E";
    else if (angle >= 22.5 && angle < 67.5) return "NE";
    else if (angle >= 67.5 && angle < 112.5) return "N";
    else if (angle >= 112.5 && angle < 157.5) return "NW";
    else if (angle >= 157.5 && angle < 202.5) return "W";
    else if (angle >= 202.5 && angle < 247.5) return "SW";
    else if (angle >= 247.5 && angle < 292.5) return "S";
    else return "SE";
}
void BLELocation::updateBeaconRSSI(String mac, int rssi) {
    mac.toLowerCase();
    
    for (int i = 0; i < beacon_count; i++) {
        if (mac.equals(beacons[i].uuid)) {
            beacons[i].last_rssi = rssi;
            beacons[i].last_seen = millis();
            beacons[i].distance = rssiToDistance(rssi, beacons[i].rssi_ref);
            beacons[i].confidence = calculateConfidence(rssi, beacons[i].distance);
            
            Serial.printf("  更新信标%d: %s, 距离=%.2fm\n", i, mac.c_str(), beacons[i].distance);
            break;
        }
    }
}