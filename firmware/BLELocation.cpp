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
float BLELocation::calculateLocationConfidence(const Location& loc) {
    float confidence = 0.25f;

    if (loc.quality == "high") {
        confidence += 0.35f;
    } else if (loc.quality == "medium") {
        confidence += 0.20f;
    }

    confidence += min(loc.beacon_count, 6) * 0.05f;

    if (loc.accuracy <= 1.5f) {
        confidence += 0.15f;
    } else if (loc.accuracy <= 3.0f) {
        confidence += 0.10f;
    }

    return constrain(confidence, 0.15f, 1.0f);
}

Location BLELocation::stabilizeLocation(Location loc) {
    if (loc.beacon_count <= 0) {
        return loc;
    }

    loc.raw_x = loc.x;
    loc.raw_y = loc.y;
    loc.timestamp = millis();

    const float confidence = calculateLocationConfidence(loc);
    if (last_location.beacon_count <= 0 || last_location.timestamp == 0) {
        smoother.reset();
        smoother.addPoint(loc.x, loc.y, confidence);
        loc.speed = 0.0f;
        loc.heading = 0.0f;
        return loc;
    }

    float dx = loc.x - last_location.x;
    float dy = loc.y - last_location.y;
    float distance = sqrt(dx * dx + dy * dy);
    float elapsedSec = (loc.timestamp > last_location.timestamp)
        ? (loc.timestamp - last_location.timestamp) / 1000.0f
        : 1.0f;
    elapsedSec = max(elapsedSec, 1.0f);

    const float maxStep = constrain(0.8f + elapsedSec * 0.15f, 1.2f, 1.8f);
    if (distance > maxStep && distance > 0.01f) {
        float ratio = maxStep / distance;
        loc.x = last_location.x + dx * ratio;
        loc.y = last_location.y + dy * ratio;
        loc.x = constrain(loc.x, 0, MAP_REAL_WIDTH);
        loc.y = constrain(loc.y, 0, MAP_REAL_HEIGHT);
        if (loc.quality == "high") {
            loc.quality = "medium";
        }
        loc.accuracy = max(loc.accuracy, 3.0f);
        Serial.printf("[BLE] location jump clamped: raw=(%.2f,%.2f) last=(%.2f,%.2f) stable=(%.2f,%.2f) step=%.2f\n",
                      loc.raw_x, loc.raw_y, last_location.x, last_location.y,
                      loc.x, loc.y, distance);
    }

    smoother.addPoint(loc.x, loc.y, confidence);
    float smoothX = loc.x;
    float smoothY = loc.y;
    if (smoother.getSmoothedPosition(smoothX, smoothY)) {
        loc.x = constrain(smoothX, 0, MAP_REAL_WIDTH);
        loc.y = constrain(smoothY, 0, MAP_REAL_HEIGHT);
    }

    float stableDx = loc.x - last_location.x;
    float stableDy = loc.y - last_location.y;
    loc.speed = sqrt(stableDx * stableDx + stableDy * stableDy) / elapsedSec;
    loc.heading = (fabs(stableDx) > 0.01f || fabs(stableDy) > 0.01f)
        ? atan2(stableDy, stableDx) * 180.0f / PI
        : last_location.heading;

    return loc;
}

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
    smoother.setMaxJump(2.0);
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
    // 配置扫描参数
    pBLEScan->setActiveScan(true);
    pBLEScan->setInterval(100);   // 扫描间隔 100ms
    pBLEScan->setWindow(99);      // 扫描窗口 99ms

    setupBeacons();
    
    BLE_DEBUG_PRINT("=== BLELocation 初始化完成 ===\n");
}

void BLELocation::setupBeacons() {
    BLE_DEBUG_PRINT("\n=== 配置信标 ===\n");
    
    // 航站楼信标配置（增加重复的beacons提高定位精度）
    // MAC 地址统一使用小写（BLE 扫描返回的是小写）
    // 格式: {"MAC地址", X坐标, Y坐标, 参考RSSI, 最后RSSI, 最后时间, 距离, 置信度}
    beacons[0] = {"20:a7:16:60:f7:c4", 7.6, 14.6, -65, -100, 0, 0, 0};   // Check-in
    beacons[1] = {"20:a7:16:60:eb:73", 7.6, 14.6, -65, -100, 0, 0, 0};   // Check-in
    beacons[2] = {"20:a7:16:60:f7:ca", 6.2, 4.0, -65, -100, 0, 0, 0};    // Customer Services
    beacons[3] = {"20:a7:16:5e:ef:24", 6.6, 10.4, -65, -100, 0, 0, 0};   // Security Check
    beacons[4] = {"20:a7:16:61:02:3f", 1.6, 2.2, -65, -100, 0, 0, 0};    // Toilet
    beacons[5] = {"20:a7:16:61:09:40", 4.4, 1.8, -65, -100, 0, 0, 0};    // Gate 11
    beacons[6] = {"20:a7:16:60:fb:ff", 4.4, 1.8, -65, -100, 0, 0, 0};    // Gate 11
    beacons[7] = {"20:a7:16:5e:bc:32", 8.0, 1.8, -65, -100, 0, 0, 0};    // Gate 10
    beacons[8] = {"20:a7:16:60:f3:d9", 8.0, 1.8, -65, -100, 0, 0, 0};    // Gate 10
    beacons[9] = {"20:a7:16:61:02:2a", 1.6, 2.2, -65, -100, 0, 0, 0};    // Toilet
    beacons[10] = {"20:a7:16:61:02:03", 6.6, 10.4, -65, -100, 0, 0, 0};  // Security Check
    beacons[11] = {"20:a7:16:61:02:42", 6.2, 4.0, -65, -100, 0, 0, 0};   // Customer Services

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
    Serial.println("[BLE] scan start: duration=2s");
    pBLEScan->start(2, false);
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
    BLE_DEBUG_PRINT("[BLE] scan result: devices=%d\n", count);
    Serial.printf("\n📡 扫描到 %d 个BLE设备\n", count);
    
    for (int i = 0; i < count; i++) {
        BLEAdvertisedDevice device = results->getDevice(i);
        String address = device.getAddress().toString().c_str();
        address.toLowerCase();
        int rssi = device.getRSSI();
        
        // 检查是否匹配任何一个信标
        bool matched = false;
        for (int j = 0; j < beacon_count; j++) {
            if (address.equals(beacons[j].uuid)) {
                Serial.printf("        ✅ 匹配信标%d: %s\n", j, beacons[j].uuid.c_str());
                BLE_DEBUG_PRINT("[BLE] target matched: index=%d mac=%s rssi=%d\n",
                                j, beacons[j].uuid.c_str(), rssi);
                matched = true;
                
                // 更新信标信息
                beacons[j].last_rssi = rssi;
                beacons[j].last_seen = millis();
                beacons[j].distance = rssiToDistance(rssi, beacons[j].rssi_ref);
                beacons[j].confidence = calculateConfidence(rssi, beacons[j].distance);
                
                Serial.printf("           距离=%.2fm, 置信度=%.2f\n", 
                             beacons[j].distance, beacons[j].confidence);
                
                BLE_DEBUG_PRINT("[BLE] target data: mac=%s distance=%.2fm confidence=%.2f x=%.1f y=%.1f\n",
                                beacons[j].uuid.c_str(), beacons[j].distance,
                                beacons[j].confidence, beacons[j].x, beacons[j].y);
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
    // 1. 限制 RSSI 范围
    if (rssi > -30) rssi = -30;
    if (rssi < -100) rssi = -100;
    
    // 2. 动态路径损耗指数（根据信号强度调整）
    float n;
    if (rssi > -60) {
        n = 2.0;   // 近距离，衰减慢
    } else if (rssi > -75) {
        n = 2.5;   // 中距离
    } else {
        n = 3.5;   // 远距离，衰减快
    }
    
    // 3. 计算距离
    float distance = pow(10, (rssi_ref - rssi) / (10 * n));
    
    // 4. RSSI 修正
    if (rssi > -60) {
        distance *= 0.9;   // 近距离修正
    } else if (rssi < -85) {
        distance = min(distance, 12.0f);  // 限制最大距离
    }
    
    // 5. 限制范围
    if (distance < 0.3) distance = 0.3;
    if (distance > 20.0) distance = 20.0;
    
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
    Location loc;
    loc.x = last_location.x;
    loc.y = last_location.y;
    loc.accuracy = 100.0;
    loc.quality = "none";
    loc.beacon_count = 0;

    const unsigned long now = millis();
    const unsigned long recentWindowMs = 15000;
    std::vector<Beacon> usable_beacons;

    for (const auto& beacon : scanned_beacons) {
        if (beacon.last_seen != 0 && now - beacon.last_seen <= recentWindowMs) {
            usable_beacons.push_back(beacon);
        }
    }

    for (int i = 0; i < beacon_count; i++) {
        if (beacons[i].last_seen == 0 || now - beacons[i].last_seen > recentWindowMs) {
            continue;
        }

        bool alreadyAdded = false;
        for (const auto& beacon : usable_beacons) {
            if (beacon.uuid == beacons[i].uuid) {
                alreadyAdded = true;
                break;
            }
        }

        if (!alreadyAdded) {
            usable_beacons.push_back(beacons[i]);
        }
    }

    Serial.printf("[BLE] location candidates: current=%d usable_recent=%d\n",
                  scanned_beacons.size(), usable_beacons.size());

    // 安全检查
    if (usable_beacons.empty()) {
        Serial.println("trilateration: scanned_beacons 为空");
        return loc;
    }    
    if (usable_beacons.size() < 1) {
        Serial.printf("[BLE] location skipped: need targets, have %d\n", usable_beacons.size());
        return loc;
    }
    scanned_beacons = usable_beacons;

    float weightedX = 0.0f;
    float weightedY = 0.0f;
    float totalWeight = 0.0f;
    int strongestIndex = 0;
    int secondStrongestRssi = -120;

    for (int i = 0; i < (int)usable_beacons.size(); i++) {
        const Beacon& beacon = usable_beacons[i];
        if (beacon.last_rssi > usable_beacons[strongestIndex].last_rssi) {
            secondStrongestRssi = usable_beacons[strongestIndex].last_rssi;
            strongestIndex = i;
        } else if (i != strongestIndex && beacon.last_rssi > secondStrongestRssi) {
            secondStrongestRssi = beacon.last_rssi;
        }

        unsigned long age = (now > beacon.last_seen) ? (now - beacon.last_seen) : 0;
        float ageWeight = 1.0f - ((float)age / (float)recentWindowMs);
        ageWeight = constrain(ageWeight, 0.2f, 1.0f);
        float signalWeight = pow(10.0f, ((float)beacon.last_rssi + 100.0f) / 20.0f);
        float distanceWeight = 1.0f / (0.25f + beacon.distance * beacon.distance);
        float weight = beacon.confidence * ageWeight * signalWeight * distanceWeight;

        weightedX += beacon.x * weight;
        weightedY += beacon.y * weight;
        totalWeight += weight;
    }

    if (totalWeight <= 0.0f) {
        Serial.println("[BLE] location skipped: invalid beacon weights");
        return loc;
    }

    loc.x = weightedX / totalWeight;
    loc.y = weightedY / totalWeight;

    const Beacon& strongest = usable_beacons[strongestIndex];
    int rssiLead = strongest.last_rssi - secondStrongestRssi;
    float snapRatio = 0.0f;
    if (strongest.last_rssi >= -60 || (strongest.last_rssi >= -70 && rssiLead >= 10)) {
        snapRatio = 0.75f;
    } else if (strongest.last_rssi >= -75 || rssiLead >= 8) {
        snapRatio = 0.45f;
    }

    if (snapRatio > 0.0f) {
        loc.x = loc.x * (1.0f - snapRatio) + strongest.x * snapRatio;
        loc.y = loc.y * (1.0f - snapRatio) + strongest.y * snapRatio;
    }

    loc.x = constrain(loc.x, 0, MAP_REAL_WIDTH);
    loc.y = constrain(loc.y, 0, MAP_REAL_HEIGHT);
    loc.beacon_count = usable_beacons.size();

    if (strongest.last_rssi >= -65 && loc.beacon_count >= 3) {
        loc.accuracy = 1.5f;
        loc.quality = "high";
    } else if (loc.beacon_count >= 4) {
        loc.accuracy = 3.0f;
        loc.quality = "medium";
    } else {
        loc.accuracy = 5.0f;
        loc.quality = "medium";
    }

    Serial.printf("[BLE] weighted location: x=%.2f y=%.2f beacons=%d strongest=%s rssi=%d snap=%.2f\n",
                  loc.x, loc.y, loc.beacon_count, strongest.uuid.c_str(),
                  strongest.last_rssi, snapRatio);
    return loc;
    
    // 取前三个最强的信标
    Beacon b1 = usable_beacons[0];
    Beacon b2 = usable_beacons[1];
    Beacon b3 = usable_beacons[2];
    
    // 三边定位公式
    float A = 2 * (b2.x - b1.x);
    float B = 2 * (b2.y - b1.y);
    float C = pow(b1.distance, 2) - pow(b2.distance, 2) - pow(b1.x, 2) + pow(b2.x, 2) - pow(b1.y, 2) + pow(b2.y, 2);
    
    float D = 2 * (b3.x - b2.x);
    float E = 2 * (b3.y - b2.y);
    float F = pow(b2.distance, 2) - pow(b3.distance, 2) - pow(b2.x, 2) + pow(b3.x, 2) - pow(b2.y, 2) + pow(b3.y, 2);
    
    // 解方程组
    float det = A * E - B * D;
    if (fabs(det) < 0.0001f) {
        Serial.println("[BLE] location skipped: beacon geometry is degenerate");
        return loc;
    }
    
    loc.x = (C * E - B * F) / det;
    loc.y = (A * F - C * D) / det;
    
    // 边界限制
    loc.x = constrain(loc.x, 0, MAP_REAL_WIDTH);
    loc.y = constrain(loc.y, 0, MAP_REAL_HEIGHT);
    
    // 验证结果
    float err1 = fabs(sqrt(pow(loc.x - b1.x, 2) + pow(loc.y - b1.y, 2)) - b1.distance);
    float err2 = fabs(sqrt(pow(loc.x - b2.x, 2) + pow(loc.y - b2.y, 2)) - b2.distance);
    float err3 = fabs(sqrt(pow(loc.x - b3.x, 2) + pow(loc.y - b3.y, 2)) - b3.distance);
    
    if (err1 < 2.0 && err2 < 2.0 && err3 < 2.0) {
        loc.accuracy = 2.0;
        loc.quality = "high";
    } else {
        loc.accuracy = 5.0;
        loc.quality = "medium";
    }
    
    loc.beacon_count = 3;
    
    return loc;
}

Location BLELocation::getLocation() {
    Serial.println("\n========== getLocation 调用 ==========");
    
    if (!pBLEScan) {
        Serial.println("❌ pBLEScan 为空！");
        return last_location;
    }
    
    // 获取扫描结果
    BLEScanResults* foundDevices = pBLEScan->getResults();
    int totalDevices = foundDevices->getCount();
    Serial.printf("getResults() 返回 %d 个设备\n", totalDevices);
    
    if (totalDevices == 0) {
        Serial.println("⚠️ 没有扫描到任何设备");
        pBLEScan->clearResults();
        Location loc = trilateration();
        if (loc.beacon_count > 0) {
            last_location = stabilizeLocation(loc);
            Serial.printf("[BLE] location updated from recent beacons: x=%.2f y=%.2f accuracy=%.1f quality=%s beacons=%d\n",
                          last_location.x, last_location.y, last_location.accuracy,
                          last_location.quality.c_str(), last_location.beacon_count);
        }
        return last_location;
    }
    
    // 处理扫描结果
    processScanResults(foundDevices);
    pBLEScan->clearResults();
    
    if (scanned_beacons.empty()) {
        Location loc = trilateration();
        if (loc.beacon_count > 0) {
            last_location = stabilizeLocation(loc);
            Serial.printf("[BLE] location updated from recent beacons: x=%.2f y=%.2f accuracy=%.1f quality=%s beacons=%d\n",
                          last_location.x, last_location.y, last_location.accuracy,
                          last_location.quality.c_str(), last_location.beacon_count);
        }
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
        last_location = stabilizeLocation(loc);
        Serial.printf("[BLE] location updated: x=%.2f y=%.2f accuracy=%.1f quality=%s beacons=%d\n",
                      last_location.x, last_location.y, last_location.accuracy,
                      last_location.quality.c_str(), last_location.beacon_count);
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


// Active FlyCare airport beacon labels.
String BLELocation::getBeaconName(int index) {
    switch(index) {
        case 0: return "Check-in";
        case 1: return "Check-in";
        case 2: return "Customer Services";
        case 3: return "Security Check";
        case 4: return "Toilet";
        case 5: return "Gate 11";
        case 6: return "Gate 11";
        case 7: return "Gate 10";
        case 8: return "Gate 10";
        case 9: return "Toilet";
        case 10: return "Security Check";
        case 11: return "Customer Services";
        default: return "Unknown";
    }
}

float BLELocation::calculateDistance(float target_x, float target_y) {
    Location loc = getLocation();
    float dx = target_x - loc.x, dy = target_y - loc.y;
    return sqrt(dx*dx + dy*dy)*0.5; //实际距离是内部坐标的一半
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
