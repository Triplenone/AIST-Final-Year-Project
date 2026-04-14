#include "BLELocation.h"
#include "Config.h"

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
    
    float totalWeight = 0;
    float sumX = 0;
    unsigned long now = millis();
    
    for (const auto& point : history) {
        // 时间权重：越新的点权重越大
        float age = (now - point.timestamp) / 1000.0;
        float timeWeight = exp(-age);  // 指数衰减
        
        float weight = point.confidence * timeWeight;
        sumX += point.x * weight;
        totalWeight += weight;
    }
    
    return (totalWeight > 0) ? sumX / totalWeight : last_valid_x;
}

float PositionSmoother::getWeightedAverageY() {
    if (history.empty()) return last_valid_y;
    
    float totalWeight = 0;
    float sumY = 0;
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
    
    float dx = x - avgX;
    float dy = y - avgY;
    float distance = sqrt(dx*dx + dy*dy);
    
    // 检查是否跳变过大
    if (distance > max_jump) return true;
    
    // 检查速度是否过快
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
    
    float dx = newest.x - oldest.x;
    float dy = newest.y - oldest.y;
    float distance = sqrt(dx*dx + dy*dy);
    float timeDiff = (newest.timestamp - oldest.timestamp) / 1000.0;
    
    return (timeDiff > 0) ? distance / timeDiff : 0;
}

float PositionSmoother::calculateHeading() {
    if (history.size() < 2) return 0;
    
    const auto& newest = history.back();
    const auto& oldest = history.front();
    
    float dx = newest.x - oldest.x;
    float dy = newest.y - oldest.y;
    
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
    last_valid_x = 0;
    last_valid_y = 0;
    last_valid_time = 0;
}

// ================ BLELocation 实现 ================

// ============ BLELocation 实现 ============
BLELocation::BLELocation() : beacon_count(0), last_scan_time(0), smoother(8) {
    pBLEScan = nullptr;
    
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
    
    last_location.x = 2.0;      // 起始点 (2,2)
    last_location.y = 2.0;
    last_location.raw_x = 2.0;
    last_location.raw_y = 2.0;
    last_location.accuracy = 10.0;
    last_location.quality = "unknown";
    last_location.beacon_count = 0;
    last_location.timestamp = 0;
    last_location.speed = 0;
    last_location.heading = 0;
    
    BLEDevice::init(DEVICE_ID);
    pBLEScan = BLEDevice::getScan();
    pBLEScan->setActiveScan(true);
    pBLEScan->setInterval(100);
    pBLEScan->setWindow(99);

    // ===== 添加这些优化参数 =====
    pBLEScan->setDuplicateFilter(false);      // 关闭重复过滤，获取所有广播包
    
    // 配置平滑器
    smoother.setMaxSpeed(2.5);
    smoother.setMaxJump(4.0);
    smoother.setMinConfidence(0.15);
}

void BLELocation::setSmootherParams(size_t history_size, float max_speed, float max_jump) {
    smoother = PositionSmoother(history_size);
    smoother.setMaxSpeed(max_speed);
    smoother.setMaxJump(max_jump);
}

// ================ 初始化 ================
void BLELocation::init() {
    setupBeacons();
    Serial.println("BLE定位系统初始化完成");
}

// ================ 配置信标 ================
void BLELocation::setupBeacons() {
    Serial.println("\n=== 配置信标 ===");
    
    beacons[0] = {"20:A7:16:60:F7:C4", 3.0, 14.0, -65, -100, 0};
    beacons[1] = {"20:A7:16:60:F7:CA", 4.0, 9.0, -65, -100, 0};
    beacons[2] = {"20:A7:16:5E:EF:24", 9.0, 6.0, -65, -100, 0};
    beacons[3] = {"20:A7:16:61:02:3F", 6.0, 1.5, -65, -100, 0};
    beacons[4] = {"F0:6B:EF:1D:7E:71", 0.0, 0.0, -65, -100, 0};
    beacons[5] = {"E1:33:B7:89:78:3E", 12.0, 16.0, -65, -100, 0};
    
    beacon_count = BEACON_COUNT;
    
    for (int i = 0; i < beacon_count; i++) {
        Serial.printf("  信标%d: %s @ (%.1f,%.1f) refRSSI=%d\n", 
                     i, beacons[i].uuid.c_str(), 
                     beacons[i].x, beacons[i].y,
                     beacons[i].rssi_ref);
    }
}

// ================ 获取信标名称 ================
String BLELocation::getBeaconName(int index) {
    switch(index) {
        case 0: return "Check-in Counter";
        case 1: return "Security Check";
        case 2: return "Toilet";
        case 3: return "Boarding Gate";
        default: return "Unknown";
    }
}

// ================ RSSI转距离 ================
float BLELocation::rssiToDistance(int rssi, float rssi_ref) {
    // 路径损耗指数（室内取3.0）
    float n = 3.0;
    
    // 限制RSSI范围
    if (rssi > -30) rssi = -30;
    if (rssi < -100) rssi = -100;
    
    // 计算距离
    float distance = pow(10, (rssi_ref - rssi) / (10 * n));
    
    // RSSI修正
    if (rssi > -60) {
        distance *= 0.8;  // 近距离更精确
    } else if (rssi < -85) {
        distance = min(distance, 15.0f);  // 限制最大距离
    }
    
    // 限制范围
    if (distance < 0.3) distance = 0.3;
    if (distance > 30.0) distance = 30.0;
    
    return distance;
}

// ================ 计算置信度 ================
float BLELocation::calculateConfidence(int rssi, float distance) {
    float confidence = 0.5;
    
    // RSSI 越强，置信度越高
    if (rssi > -60) confidence += 0.3;
    else if (rssi > -70) confidence += 0.2;
    else if (rssi > -80) confidence += 0.1;
    
    // 距离越近，置信度越高
    if (distance < 2.0) confidence += 0.2;
    else if (distance < 5.0) confidence += 0.1;
    
    return constrain(confidence, 0.1, 1.0);
}

// ================ 计算权重 ================
float BLELocation::calculateWeight(float distance, float confidence) {
    // 距离权重 + 置信度权重
    float distWeight = 1.0 / (distance * distance + 1.0);
    return distWeight * confidence;
}

// ================ 开始扫描 ================
void BLELocation::startScan() {
    pBLEScan->start(0, nullptr, false);
    last_scan_time = millis();
}

// ================ 停止扫描 ================
void BLELocation::stopScan() {
    pBLEScan->stop();
}

// ================ 处理扫描结果 ================
void BLELocation::processScanResults(BLEScanResults* results) {
    if (!results) return;
    
    scanned_beacons.clear();
    
    int count = results->getCount();
    Serial.printf("\n📡 扫描到 %d 个BLE设备\n", count);
    
    // 创建一个临时map来存储每个信标的最佳RSSI
    std::map<String, std::pair<int, int>> bestRSSI;  // MAC -> (RSSI, 索引)
    
    // 第一遍：找出每个信标的最强RSSI
    for (int i = 0; i < count; i++) {
        BLEAdvertisedDevice device = results->getDevice(i);
        String address = device.getAddress().toString().c_str();
        int rssi = device.getRSSI();
        
        for (int j = 0; j < beacon_count; j++) {
            if (address.equalsIgnoreCase(beacons[j].uuid)) {
                auto it = bestRSSI.find(address);
                if (it == bestRSSI.end() || rssi > it->second.first) {
                    bestRSSI[address] = std::make_pair(rssi, j);
                }
                break;
            }
        }
    }
    
    // 第二遍：使用最佳RSSI更新信标
    Serial.printf("找到 %d 个目标信标\n", bestRSSI.size());
    
    for (const auto& pair : bestRSSI) {
        int j = pair.second.second;
        int rssi = pair.second.first;
        
        // 更新信标信息
        beacons[j].last_rssi = rssi;
        beacons[j].last_seen = millis();
        beacons[j].distance = rssiToDistance(rssi, beacons[j].rssi_ref);
        beacons[j].confidence = calculateConfidence(rssi, beacons[j].distance);
        
        // 添加到扫描列表
        scanned_beacons.push_back(beacons[j]);
        
        Serial.printf("  ✅ 信标%d: %s RSSI=%d 距离=%.1fm 置信度=%.2f\n", 
                     j, beacons[j].uuid.c_str(), rssi, 
                     beacons[j].distance, beacons[j].confidence);
    }
    
    Serial.printf("  找到 %d 个目标信标\n", scanned_beacons.size());
}

// ================ 三边定位 ================
Location BLELocation::trilateration() {
    // 正确初始化所有成员
    Location loc;
    loc.x = 0;
    loc.y = 0;
    loc.raw_x = 0;
    loc.raw_y = 0;
    loc.accuracy = 100.0;
    loc.quality = "none";
    loc.beacon_count = 0;
    loc.timestamp = millis() / 1000;
    loc.speed = 0;
    loc.heading = 0;
    
   if (scanned_beacons.empty()) {
        return loc;  // 返回全0，表示无效
    }
    
    // ===== 新增：至少需要3个信标才定位 =====
    if (scanned_beacons.size() < 3) {
        Serial.printf("⚠️ 信标不足: 只有 %d 个，需要至少3个，保持原位置\n", scanned_beacons.size());
        return loc;  // 返回全0，保持原位置
    }
    
    float sumWeight = 0, sumX = 0, sumY = 0;
    int validBeacons = 0;
    float minDistance = 100.0;
    float totalConfidence = 0;
    
    // 找出最小距离
    for (const auto& beacon : scanned_beacons) {
        if (beacon.distance < minDistance) {
            minDistance = beacon.distance;
        }
    }
    
    // 计算加权位置
    for (const auto& beacon : scanned_beacons) {
        float weight = 1.0 / (beacon.distance * beacon.distance + 1.0);
        
        // 最近的信标权重加倍
        if (beacon.distance == minDistance && minDistance < 5.0) {
            weight *= 2.0;
        }
        
        sumX += beacon.x * weight;
        sumY += beacon.y * weight;
        sumWeight += weight;
        validBeacons++;
        totalConfidence += beacon.confidence;
    }
    
    if (validBeacons >= 3 && sumWeight > 0) {
        loc.raw_x = sumX / sumWeight;
        loc.raw_y = sumY / sumWeight;
        
        // 应用平滑
        float avgConfidence = totalConfidence / validBeacons;
        smoother.addPoint(loc.raw_x, loc.raw_y, avgConfidence);
        smoother.getSmoothedPosition(loc.x, loc.y);
        
        // 根据信标数量确定精度和质量
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
        
        // 如果最近的信标很近，提高精度
        if (minDistance < 2.0) {
            loc.accuracy = 1.0;
            loc.quality = "very_high";
        }
        
        loc.beacon_count = validBeacons;
        
        // 计算速度
        static float last_x = loc.x, last_y = loc.y;
        static unsigned long last_time = loc.timestamp;
        
        float dx = loc.x - last_x;
        float dy = loc.y - last_y;
        float dt = loc.timestamp - last_time;
        
        if (dt > 0) {
            loc.speed = sqrt(dx*dx + dy*dy) / dt;
            loc.heading = atan2(dy, dx) * 180 / PI;
        }
        
        last_x = loc.x;
        last_y = loc.y;
        last_time = loc.timestamp;
    }
    
    return loc;
}

// ================ 获取位置 ================
Location BLELocation::getLocation() {
    BLEScanResults* foundDevices = pBLEScan->getResults();
    
    if (foundDevices) {
        processScanResults(foundDevices);
    }
    
    pBLEScan->clearResults();
    
    // 如果没有扫描到信标，检查上次的信标是否还在超时时间内
    if (scanned_beacons.empty()) {
        Serial.println("⚠️ 本次没有扫描到信标，检查缓存...");
        
        // 检查上次的信标是否还在有效期内
        unsigned long now = millis();
        for (int i = 0; i < beacon_count; i++) {
            if (now - beacons[i].last_seen < BEACON_TIMEOUT) {
                // 信标还在有效期内，使用缓存的数据
                scanned_beacons.push_back(beacons[i]);
                Serial.printf("  使用缓存的信标%d: 距离=%.1fm\n", 
                             i, beacons[i].distance);
            }
        }
    }
    
    // 如果仍然没有信标，返回上次位置
    if (scanned_beacons.empty()) {
        Serial.println("⚠️ 没有有效信标，使用上次位置");
        return last_location;
    }
    
    // 有信标，计算新位置
    Location loc = trilateration();
    
    // 只有当新位置有效时才更新
    if (loc.x != 0 || loc.y != 0) {
        last_location = loc;
        Serial.printf("✅ 位置已更新: (%.2f, %.2f) 信标=%d\n", 
                     loc.x, loc.y, loc.beacon_count);
    } else {
        Serial.println("⚠️ 定位失败，保持上次位置");
    }
    
    return last_location;
}

// ================ 计算到目标的距离 ================
float BLELocation::calculateDistance(float target_x, float target_y) {
    Location loc = getLocation();
    float dx = target_x - loc.x;
    float dy = target_y - loc.y;
    return sqrt(dx*dx + dy*dy);
}

// ================ 获取到目标的方向 ================
String BLELocation::getDirectionToTarget(float target_x, float target_y) {
    Location loc = getLocation();
    
    float dx = target_x - loc.x;
    float dy = target_y - loc.y;
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

// ================ 打印信标信息 ================
void BLELocation::printBeaconInfo() {
    Serial.println("\n=== 信标状态 ===");
    for (const auto& beacon : scanned_beacons) {
        Serial.printf("  %s: 距离=%.1fm RSSI=%d 置信度=%.2f\n",
                     beacon.uuid.c_str(),
                     beacon.distance,
                     beacon.last_rssi,
                     beacon.confidence);
    }
}