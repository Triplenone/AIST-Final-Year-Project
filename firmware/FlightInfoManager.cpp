// FlightInfoManager.cpp 开头添加
#include "FlightInfoManager.h"
#include "SimpleDisplayManager.h"  // 添加这个头文件
#include <ArduinoJson.h>
#include "NavigationManager.h"
#include "SmartNavigationPlanner.h"

static String formatFlightGateLabel(const String& gate) {
    String normalized = gate;
    normalized.trim();
    normalized.toUpperCase();

    if (normalized == "10" || normalized == "A10" || normalized == "GATE10" || normalized == "GATE 10") {
        return "Gate 10";
    }
    if (normalized == "11" || normalized == "A11" || normalized == "GATE11" || normalized == "GATE 11") {
        return "Gate 11";
    }
    return gate;
}

static String formatGateChangeDestination(const String& gate) {
    String normalized = formatFlightGateLabel(gate);
    normalized.trim();
    normalized.toUpperCase();
    normalized.replace("GATE CHANGE", "");
    normalized.replace("CHANGE", "");
    normalized.replace(" TO ", " ");
    if (normalized.startsWith("TO ")) {
        normalized = normalized.substring(3);
    }
    normalized.replace("GATE", "");
    normalized.trim();
    return normalized.length() > 0 ? normalized : gate;
}

static String normalizedFlightField(JsonObject flight, const char* key);

static String normalizeFlightStatusValue(String value) {
    value.trim();
    value.toLowerCase();
    value.replace("_", " ");
    value.replace("-", " ");
    while (value.indexOf("  ") >= 0) {
        value.replace("  ", " ");
    }
    if (value == "canceled") {
        return "cancelled";
    }
    if (value == "ontime") {
        return "on time";
    }
    return value;
}

static bool isLegacyDemoFlight(JsonObject flight) {
    String flightNumber = normalizedFlightField(flight, "flight_number");
    flightNumber.trim();
    flightNumber.toUpperCase();

    String airline = normalizedFlightField(flight, "airline");
    airline.trim();
    airline.toUpperCase();

    String destination = normalizedFlightField(flight, "destination");
    destination.trim();
    destination.toUpperCase();

    return flightNumber == "CA1234" || airline == "AIR CHINA" || destination == "BEIJING";
}

static bool isProtectedDemoFlight(const FlightInfo& flight) {
    String flightNumber = flight.flight_number;
    flightNumber.trim();
    flightNumber.toUpperCase();
    return flight.valid && flightNumber == "CX910";
}

static uint32_t hashFlightPayload(const String& payload) {
    uint32_t hash = 2166136261UL;
    for (size_t i = 0; i < payload.length(); i++) {
        hash ^= (uint8_t)payload[i];
        hash *= 16777619UL;
    }
    return hash;
}

static String normalizedFlightField(JsonObject flight, const char* key) {
    String value = flight[key] | "";
    value.trim();
    return value;
}

static String normalizedFlightBool(JsonObject flight, const char* key) {
    bool value = flight[key] | false;
    return value ? "1" : "0";
}

static String buildFlightSignature(JsonObject flight) {
    String signature;
    signature.reserve(256);
    signature += normalizedFlightField(flight, "flight_number");
    signature += "|";
    signature += normalizedFlightField(flight, "airline");
    signature += "|";
    signature += normalizedFlightField(flight, "destination");
    signature += "|";
    signature += normalizedFlightField(flight, "scheduled_departure");
    signature += "|";
    signature += normalizedFlightField(flight, "estimated_departure");
    signature += "|";
    signature += normalizedFlightField(flight, "boarding_time");
    signature += "|";
    signature += formatFlightGateLabel(normalizedFlightField(flight, "boarding_gate"));
    signature += "|";
    signature += normalizedFlightField(flight, "terminal");
    signature += "|";
    signature += normalizedFlightField(flight, "checkin_counter");
    signature += "|";
    signature += normalizeFlightStatusValue(normalizedFlightField(flight, "status"));
    signature += "|";
    signature += String((int)(flight["delay_minutes"] | 0));
    signature += "|";
    signature += normalizedFlightField(flight, "delay_reason");
    signature += "|";
    signature += normalizedFlightBool(flight, "gate_changed");
    signature += "|";
    signature += formatFlightGateLabel(normalizedFlightField(flight, "previous_gate"));
    return signature;
}

static String buildCurrentFlightSignature(const FlightInfo& flight) {
    String signature;
    signature.reserve(256);
    signature += flight.flight_number;
    signature += "|";
    signature += flight.airline;
    signature += "|";
    signature += flight.destination;
    signature += "|";
    signature += flight.scheduled_departure;
    signature += "|";
    signature += flight.estimated_departure;
    signature += "|";
    signature += flight.boarding_time;
    signature += "|";
    signature += formatFlightGateLabel(flight.boarding_gate);
    signature += "|";
    signature += flight.terminal;
    signature += "|";
    signature += flight.checkin_counter;
    signature += "|";
    signature += normalizeFlightStatusValue(flight.status);
    signature += "|";
    signature += String(flight.delay_minutes);
    signature += "|";
    signature += flight.delay_reason;
    signature += "|";
    signature += flight.gate_changed ? "1" : "0";
    signature += "|";
    signature += formatFlightGateLabel(flight.previous_gate);
    return signature;
}

FlightInfoManager::FlightInfoManager() 
    : flight_info_received(false), last_display_time(0), display_interval(30000),
      last_update_time(0), has_last_payload_hash(false), last_payload_hash(0) {
    current_flight.valid = false;
    current_flight.delay_minutes = 0;
    current_flight.gate_changed = false;
}

bool FlightInfoManager::parseFlightInfo(const String& json) {
    DynamicJsonDocument doc(4096);  // 增大缓冲区
    DeserializationError error = deserializeJson(doc, json);
    
    if (error) {
        Serial.printf("航班信息解析失败: %s\n", error.c_str());
        return false;
    }
    
    // 检查命令类型
    String commandType = doc["command_type"] | "";
    if (commandType != "flight_info" && !doc.containsKey("flight_info")) {
        return false;
    }

    JsonObject flight;
    if (doc.containsKey("flight_info")) {
        flight = doc["flight_info"];
    } else {
        flight = doc.as<JsonObject>();
    }

    String flightSignature = buildFlightSignature(flight);
    uint32_t payloadHash = hashFlightPayload(flightSignature);
    bool forceFlightIdentity = flight["force_flight_identity"] | false;
    if (!forceFlightIdentity && flight_info_received && current_flight.valid &&
        isProtectedDemoFlight(current_flight) && isLegacyDemoFlight(flight)) {
        last_payload_hash = payloadHash;
        has_last_payload_hash = true;
        Serial.printf("[Flight] stale legacy demo payload ignored: active=%s incoming=%s\n",
                      current_flight.flight_number.c_str(),
                      normalizedFlightField(flight, "flight_number").c_str());
        return false;
    }

    bool sameAsLastPayload = has_last_payload_hash && payloadHash == last_payload_hash;
    bool sameAsCurrentFlight = flight_info_received && current_flight.valid &&
        flightSignature == buildCurrentFlightSignature(current_flight);
    if (sameAsLastPayload || sameAsCurrentFlight) {
        last_payload_hash = payloadHash;
        has_last_payload_hash = true;
        Serial.println("[Flight] duplicate flight payload ignored");
        return false;
    }
    
    // 保存旧信息用于比较
    bool hadFlightInfo = flight_info_received && current_flight.valid;
    String oldGate = current_flight.boarding_gate;
    String oldGateLabel = formatFlightGateLabel(oldGate);
    int oldDelay = current_flight.delay_minutes;
    String oldStatus = current_flight.status;
    bool oldGateChanged = current_flight.gate_changed;
    String oldDelayReason = current_flight.delay_reason;
    
    // 解析所有字段
    current_flight.flight_number = flight["flight_number"] | "Unknown";
    current_flight.airline = flight["airline"] | "";
    current_flight.destination = flight["destination"] | "Unknown";
    
    current_flight.scheduled_departure = flight["scheduled_departure"] | "--:--";
    current_flight.estimated_departure = flight["estimated_departure"] | "";
    current_flight.boarding_time = flight["boarding_time"] | "--:--";
    
    current_flight.boarding_gate = flight["boarding_gate"] | "Unknown";
    current_flight.terminal = flight["terminal"] | "";
    current_flight.checkin_counter = flight["checkin_counter"] | "";
    
    current_flight.status = normalizeFlightStatusValue(flight["status"] | "");
    current_flight.delay_minutes = flight["delay_minutes"] | 0;
    current_flight.delay_reason = flight["delay_reason"] | "";
    current_flight.gate_changed = flight["gate_changed"] | false;
    
    if (current_flight.gate_changed && flight.containsKey("previous_gate")) {
        current_flight.previous_gate = flight["previous_gate"] | "";
    }
    
    current_flight.valid = true;
    current_flight.last_update = millis();
    flight_info_received = true;
    last_payload_hash = payloadHash;
    has_last_payload_hash = true;
    
    Serial.println("\n========== 航班信息更新 ==========");
    Serial.printf("航班号: %s\n", current_flight.flight_number.c_str());
    Serial.printf("航空公司: %s\n", current_flight.airline.c_str());
    Serial.printf("目的地: %s\n", current_flight.destination.c_str());
    Serial.printf("计划起飞: %s\n", current_flight.scheduled_departure.c_str());
    if (current_flight.estimated_departure.length() > 0) {
        Serial.printf("预计起飞: %s\n", current_flight.estimated_departure.c_str());
    }
    Serial.printf("登机时间: %s\n", current_flight.boarding_time.c_str());
    Serial.printf("登机口: %s\n", current_flight.boarding_gate.c_str());
    Serial.printf("航站楼: %s\n", current_flight.terminal.c_str());
    Serial.printf("值机柜台: %s\n", current_flight.checkin_counter.c_str());
    Serial.printf("状态: %s\n", current_flight.status.c_str());
    if (current_flight.delay_minutes > 0) {
        Serial.printf("延误: %d 分钟\n", current_flight.delay_minutes);
        Serial.printf("延误原因: %s\n", current_flight.delay_reason.c_str());
    }
    if (current_flight.gate_changed) {
        Serial.printf("登机口变更: %s -> %s\n", 
                     current_flight.previous_gate.c_str(),
                     current_flight.boarding_gate.c_str());
    }
    Serial.println("===================================\n");

    float gateX = 0.0f;
    float gateY = 0.0f;
    bool hasGateCoordinates = getGateCoordinates(current_flight.boarding_gate, gateX, gateY);
    String navKey = SmartNavigationPlanner::normalizeKey(current_flight.boarding_gate);
    bool hasManualNavigation = display && display->hasManualNavigationDestination();
    String gateLabel = formatFlightGateLabel(current_flight.boarding_gate);
    String flightTargetKey = navKey.length() > 0 ? navKey : gateLabel;

    if (hasGateCoordinates && display) {
#if ENABLE_FLIGHT_ROUTE_NAVIGATION
        display->setSmartNavigationDestination(navKey, true);
#else
        display->setTargetGate(gateLabel, gateX, gateY);
        display->checkArrivalAtCurrentPosition();
        Serial.printf("[Flight] arrival target armed: %s @ (%.1f, %.1f)\n",
                      gateLabel.c_str(), gateX, gateY);
#endif
    } else if (hasGateCoordinates && navManager && !hasManualNavigation) {
#if ENABLE_FLIGHT_ROUTE_NAVIGATION
        navManager->setTarget(gateX, gateY, current_flight.boarding_gate);
        Serial.printf("[Flight] navigation target synced: %s @ (%.1f, %.1f)\n",
                      current_flight.boarding_gate.c_str(), gateX, gateY);
#endif
    }
#if !ENABLE_FLIGHT_ROUTE_NAVIGATION
    if (hasGateCoordinates && navManager) {
        navManager->setTarget(gateX, gateY, flightTargetKey);
        Serial.printf("[Flight] navigation target forced: %s @ (%.1f, %.1f)\n",
                      flightTargetKey.c_str(), gateX, gateY);
    }
#endif
    if (hasGateCoordinates && data_transmitter) {
        data_transmitter->setTargetPosition(gateX, gateY, gateLabel);
#if ENABLE_FLIGHT_ROUTE_NAVIGATION
        data_transmitter->setNavigationActive(true);
#else
        data_transmitter->setNavigationActive(false);
#endif
        Serial.printf("[Flight] telemetry target synced: %s @ (%.1f, %.1f)\n",
                      gateLabel.c_str(), gateX, gateY);
    }
    
    // 更新到显示器
    if (display) {
        display->setFlightInfo(
            current_flight.flight_number,
            current_flight.airline,
            current_flight.destination,
            current_flight.boarding_gate,
            current_flight.boarding_time,
            current_flight.delay_minutes,
            current_flight.status,
            current_flight.terminal,
            current_flight.scheduled_departure,
            current_flight.estimated_departure,
            current_flight.delay_reason
        );
    }

    // One accepted flight update may show only one primary popup.
    String primaryNewGateLabel = formatFlightGateLabel(current_flight.boarding_gate);
    bool primaryGateLabelChanged = hadFlightInfo &&
        oldGateLabel.length() > 0 &&
        primaryNewGateLabel.length() > 0 &&
        oldGateLabel != primaryNewGateLabel;
    bool primaryGateChangeEvent = current_flight.gate_changed && (!oldGateChanged || primaryGateLabelChanged);

    String primaryDelayReasonLower = current_flight.delay_reason;
    primaryDelayReasonLower.toLowerCase();
    bool primaryDelayIsGateChangeNotice = current_flight.gate_changed &&
        (primaryGateChangeEvent || primaryDelayReasonLower.indexOf("gate change") >= 0);

    String primaryNewStatus = current_flight.status;
    String primaryOldStatus = normalizeFlightStatusValue(oldStatus);
    bool primaryStatusChanged = primaryNewStatus != primaryOldStatus;
    bool primaryDelayChanged = current_flight.delay_minutes != oldDelay ||
                               current_flight.delay_reason != oldDelayReason;

    bool shouldNotifyCancelled = (primaryNewStatus == "cancelled") && primaryStatusChanged;
    bool shouldNotifyDelayed = (primaryNewStatus == "delayed") &&
                               current_flight.delay_minutes > 0 &&
                               (primaryStatusChanged || primaryDelayChanged);
    bool shouldNotifyBoarding = (primaryNewStatus == "boarding") && primaryStatusChanged;
    bool shouldNotifyFinalCall = (primaryNewStatus == "final call") && primaryStatusChanged;
    bool shouldNotifyOnTime = (primaryNewStatus == "scheduled" || primaryNewStatus == "on time") &&
                              current_flight.delay_minutes == 0 &&
                              oldDelay > 0 &&
                              primaryOldStatus == "delayed";

    if (shouldNotifyCancelled) {
        notifyCancelled();
    } else if (primaryGateChangeEvent) {
        notifyGateChange();
    } else if (shouldNotifyDelayed && !primaryDelayIsGateChangeNotice) {
        notifyDelay();
    } else if (shouldNotifyDelayed && primaryDelayIsGateChangeNotice) {
        Serial.println("[Flight] delay popup suppressed for gate change notice");
    } else if (shouldNotifyBoarding) {
        notifyBoarding();
    } else if (shouldNotifyFinalCall) {
        notifyFinalCall();
    } else if (shouldNotifyOnTime) {
        notifyOnTime();
    } else {
        Serial.printf("[Flight] accepted without primary popup status=%s gateChanged=%d delay=%d\n",
                      primaryNewStatus.c_str(),
                      current_flight.gate_changed ? 1 : 0,
                      current_flight.delay_minutes);
    }

    return true;
    
    // ========== 检查各种变更并调用对应的 notify 函数 ==========
    
    // 1. 登机口变更
    String newGateLabel = formatFlightGateLabel(current_flight.boarding_gate);
    bool gateLabelChanged = hadFlightInfo &&
        oldGateLabel.length() > 0 &&
        newGateLabel.length() > 0 &&
        oldGateLabel != newGateLabel;
    bool gateChangeEvent = current_flight.gate_changed && (!oldGateChanged || gateLabelChanged);
    if (gateChangeEvent) {
        notifyGateChange();
    }
    
    // 2. 航班延误
    String delayReasonLower = current_flight.delay_reason;
    delayReasonLower.toLowerCase();
    bool delayIsGateChangeNotice = current_flight.gate_changed &&
        (gateChangeEvent || delayReasonLower.indexOf("gate change") >= 0);
    if (current_flight.delay_minutes > 0 && current_flight.delay_minutes != oldDelay && !delayIsGateChangeNotice) {
        notifyDelay();
    } else if (current_flight.delay_minutes > 0 && current_flight.delay_minutes != oldDelay && delayIsGateChangeNotice) {
        Serial.println("[Flight] delay popup suppressed for gate change notice");
    }
    
    // 3. 登机状态变更
    String newStatus = current_flight.status;
    newStatus.toLowerCase();
    String oldStatusLower = oldStatus;
    oldStatusLower.toLowerCase();
    
    if (newStatus == "boarding" && oldStatusLower != "boarding") {
        notifyBoarding();      // 开始登机
    }
    else if (newStatus == "final call" && oldStatusLower != "final call") {
        notifyFinalCall();     // 最后登机提醒
    }
    
    // 4. 航班取消
    if (newStatus == "cancelled" && oldStatusLower != "cancelled") {
        notifyCancelled();     // 航班取消
    }
    
    // 5. 航班准点（延误取消）
    if (current_flight.delay_minutes == 0 && oldDelay > 0) {
        notifyOnTime();        // 航班准点
    }
    
    return true;
}

bool FlightInfoManager::getGateCoordinates(const String& gate, float& x, float& y) {
    const SmartDestination* destination = SmartNavigationPlanner::findDestination(gate);
    if (destination && destination->zone == NAV_ZONE_RESTRICTED) {
        x = destination->x;
        y = destination->y;
        return true;
    }
    return false;
}

void FlightInfoManager::notifyGateChange() {
    String title = "Gate Change";
    String gateLabel = formatFlightGateLabel(current_flight.boarding_gate);
    String message = formatGateChangeDestination(gateLabel);
    Serial.printf("[FlightPopup] gate_change flight=%s gate=%s\n",
                  current_flight.flight_number.c_str(),
                  gateLabel.c_str());
    
    Serial.printf("[航班提醒] %s\n", message.c_str());
    
    // 显示弹窗
    if (display) {
        display->showPopup(SimpleDisplayManager::POPUP_GATE_CHANGE, title, message);
    }
    
    // 语音播报
    Serial.println("[Flight] gate change cue handled by display popup");
    
    // 振动
}

void FlightInfoManager::notifyDelay() {
    String title = "Delay";
    String message ="Flight delayed " + String(current_flight.delay_minutes) + " minutes";
    if (current_flight.delay_reason.length() > 0) {
        message += " - " + current_flight.delay_reason;
    }
    Serial.printf("[FlightPopup] delayed flight=%s minutes=%d reason=%s\n",
                  current_flight.flight_number.c_str(),
                  current_flight.delay_minutes,
                  current_flight.delay_reason.c_str());
    
    Serial.printf("[航班提醒] %s\n", message.c_str());
    
    // 显示弹窗
    if (display) {
        display->showPopup(SimpleDisplayManager::POPUP_FLIGHT_DELAY, title, message);
    }
    
    // 语音播报
    Serial.println("[Flight] delay cue handled by display popup");
    
    // 振动
}

void FlightInfoManager::notifyBoarding() {
    String title = "Boarding";
    String message = "Boarding for flight " + current_flight.flight_number + "\n" +
                     "has started at gate " + current_flight.boarding_gate;
    Serial.printf("[FlightPopup] boarding flight=%s gate=%s\n",
                  current_flight.flight_number.c_str(),
                  current_flight.boarding_gate.c_str());
    
    Serial.printf("[登机提醒] %s\n", message.c_str());
    
    // 显示弹窗
    if (display) {
        display->showPopup(SimpleDisplayManager::POPUP_BOARDING, title, message);
    }
    
    // 语音播报
    Serial.println("[Flight] boarding cue handled by display popup");
    
    // 振动提醒
}

void FlightInfoManager::notifyFinalCall() {
    String title = "Final Call";
    String message = "Final call for flight " + current_flight.flight_number + " \n" +
                     "Please proceed to gate " + current_flight.boarding_gate + " immediately";
    
    Serial.printf("[最后登机提醒] %s\n", message.c_str());
    
    // 显示弹窗（可以用红色或特殊颜色）
    if (display) {
        display->showPopup(SimpleDisplayManager::POPUP_BOARDING, title, message);
    }
    
    // 语音播报（更紧急的语气）
    Serial.println("[Flight] final call cue handled by display popup");
    
    // 长振动提醒
}

void FlightInfoManager::notifyCancelled() {
    String title = "Cancelled";
    String message = "Flight " + current_flight.flight_number + " has been cancelled";
    
    if (current_flight.delay_reason.length() > 0) {
        message += "\nReason: " + current_flight.delay_reason;
    } else {
        message += "\nPlease contact the airline!";
    }
    Serial.printf("[FlightPopup] cancelled flight=%s reason=%s\n",
                  current_flight.flight_number.c_str(),
                  current_flight.delay_reason.c_str());
    
    Serial.printf("[航班取消] %s\n", message.c_str());
    
    // 显示弹窗
    if (display) {
        display->showPopup(SimpleDisplayManager::POPUP_FLIGHT_CANCELLED, title, message);
    }
    
    // 语音播报
    Serial.println("[Flight] cancelled cue handled by display popup");
    
    // 振动提醒（三次短振）
}

void FlightInfoManager::notifyOnTime() {
    String title = "On Time";
    String message = "Flight " + current_flight.flight_number + " is now on time\n" +
                     "scheduled " + current_flight.scheduled_departure + " departure";
    Serial.printf("[FlightPopup] on_time flight=%s scheduled=%s\n",
                  current_flight.flight_number.c_str(),
                  current_flight.scheduled_departure.c_str());
    
    Serial.printf("[航班准点] %s\n", message.c_str());
    
    // 显示弹窗
    if (display) {
        display->showPopup(SimpleDisplayManager::POPUP_BOARDING, title, message);
    }
    
    // 语音播报
    Serial.println("[Flight] on-time cue handled by display popup");
    
    // 短振动
}

void FlightInfoManager::playAlertSound(const char* filename) {
    if (!audioCommandQueue) return;
    AudioCommand audio_cmd;
    audio_cmd.command = AudioCommand::AUDIO_PLAY_ALERT;
    snprintf(audio_cmd.text, sizeof(audio_cmd.text), "%s", filename);
    xQueueSend(audioCommandQueue, &audio_cmd, 0);
}

void FlightInfoManager::speakAlert(const String& message) {
    AudioCommand audio_cmd;
    audio_cmd.command = AudioCommand::AUDIO_PLAY_TTS;
    snprintf(audio_cmd.text, sizeof(audio_cmd.text), "%s", message.c_str());
    
    if (audioCommandQueue) {
        xQueueSend(audioCommandQueue, &audio_cmd, 0);
    }
}

void FlightInfoManager::clearFlightInfo() {
    current_flight.valid = false;
    flight_info_received = false;
    
    if (display) {
        display->clearFlightInfo();
    }
    
    Serial.println("航班信息已清除");
}

void FlightInfoManager::updateDisplay() {
    if (!flight_info_received) return;
    
    unsigned long now = millis();
    if (now - last_display_time > display_interval) {
        displayFlightInfo();
        last_display_time = now;
    }
}

void FlightInfoManager::displayFlightInfo() {
    DisplayCommand display_cmd;
    display_cmd.command = DisplayCommand::DISPLAY_SET_STATUS;
    
    String status = "Flight: " + current_flight.flight_number + " ";
    status += current_flight.destination + " Gate: ";
    status += current_flight.boarding_gate;
    
    if (current_flight.delay_minutes > 0) {
        status += " Delay " + String(current_flight.delay_minutes) + "min";
    }
    
    snprintf(display_cmd.text, sizeof(display_cmd.text), "%s", status.c_str());
    
    if (displayCommandQueue) {
        xQueueSend(displayCommandQueue, &display_cmd, 0);
    }
}

void FlightInfoManager::checkForAlerts(const String& json) {
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, json);
    
    if (error) return;
    
    if (doc.containsKey("alerts")) {
        JsonArray alerts = doc["alerts"];
        for (JsonObject alert : alerts) {
            String type = alert["type"] | "";
            String message = alert["message"] | "";
            
            if (type == "gate_change" && display) {
                String compactMessage = formatGateChangeDestination(message);
                display->showPopup(SimpleDisplayManager::POPUP_GATE_CHANGE, "Gate Change", compactMessage);
                Serial.println("[Flight] alert cue handled by display popup");
            } 
            else if (type == "delay" && display) {
                display->showPopup(SimpleDisplayManager::POPUP_FLIGHT_DELAY, "Delay", message);
                Serial.println("[Flight] alert cue handled by display popup");
            }
            else if (type == "boarding" && display) {
                display->showPopup(SimpleDisplayManager::POPUP_BOARDING, "Boarding", message);
                Serial.println("[Flight] alert cue handled by display popup");
            }
            else if (type == "cancelled" && display) {
                display->showPopup(SimpleDisplayManager::POPUP_FLIGHT_CANCELLED, "Cancelled", message);
                Serial.println("[Flight] alert cue handled by display popup");
            }
        }
    }
}
