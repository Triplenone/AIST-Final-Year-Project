/*
  EmergencyWatch.ino
  Final emergency single-file firmware for ITP4458 campus dashboard handoff.

  Purpose:
  - ESP32-S3 watch -> Wi-Fi -> MQTT -> backend/Mongo -> /campus dashboard.
  - No SD card, no display, no audio, no project .h/.cpp dependencies.
  - The watch screen stays black by design. Use Serial Monitor at 115200 baud.

  Arduino IDE:
  - Board: ESP32S3 Dev Module
  - Port: COM6
  - Libraries:
      PubSubClient by Nick O'Leary
      ArduinoJson by Benoit Blanchon

  Serial commands:
  - p = publish status_update now
  - s = publish SOS event
  - f = publish fall event
  - n = clear SOS state
*/

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <time.h>
#include <math.h>

// =====================
// Local demo config
// =====================

static const char* WIFI_SSID = "No";
static const char* WIFI_PASSWORD = "77777777";

static const char* MQTT_HOSTS[] = {
  "172.20.10.3",
  "192.168.0.203",
  "192.168.137.1"
};
static const int MQTT_HOST_COUNT = sizeof(MQTT_HOSTS) / sizeof(MQTT_HOSTS[0]);
static const uint16_t MQTT_PORT = 1883;

static const char* DEVICE_ID = "ESP32_0000E03948D4DB1C";
static const int MYSQL_DEVICE_ID = 1;

static const char* TOPIC_STATUS = "smartwatch/ESP32_0000E03948D4DB1C/status";
static const char* TOPIC_SOS    = "smartwatch/ESP32_0000E03948D4DB1C/sos";
static const char* TOPIC_FALL   = "smartwatch/ESP32_0000E03948D4DB1C/fall";

static const int SOS_BUTTON_PIN = 0;
static const bool SOS_ACTIVE_LOW = true;
static const unsigned long SOS_HOLD_MS = 1000;

static const unsigned long STATUS_INTERVAL_MS = 5000;
static const int BLE_SCAN_SECONDS = 2;

// Firmware coordinate system for the campus map.
// Frontend must convert x/12 and y/16 into percentage marker coordinates.
static const float MAP_W = 12.0;
static const float MAP_H = 16.0;

static const float TARGET_X = 6.0;
static const float TARGET_Y = 16.0;
static const char* TARGET_NAME = "Bedroom";

struct Beacon {
  const char* mac;
  const char* name;
  const char* zone;
  float x;
  float y;
  int rssi;
  bool found;
};

Beacon beacons[] = {
  {"20:a7:16:61:02:42", "Campus Beacon A", "Classroom A", 2.0, 14.0, -100, false},
  {"20:a7:16:61:02:2a", "Campus Beacon B", "Library / Study Area", 10.0, 14.0, -100, false},
  {"20:a7:16:61:02:03", "Campus Beacon C", "Main Entrance", 6.0, 2.0, -100, false}
};

static const int BEACON_COUNT = sizeof(beacons) / sizeof(beacons[0]);

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
BLEScan* bleScan = nullptr;

float locX = 0.0;
float locY = 0.0;
float locAccuracy = 0.0;
int locBeaconCount = 0;
String locQuality = "unknown";
String nearestBeacon = "";
String nearestBeaconName = "";
String nearestBeaconZone = "";
int nearestRssi = -100;

bool sosActive = false;
unsigned long sosStarted = 0;
unsigned long sosTriggeredAt = 0;
unsigned long sosTriggerCount = 0;
unsigned long lastStatusAt = 0;

String lowerCase(String s) {
  s.toLowerCase();
  return s;
}

uint32_t nowTs() {
  time_t now = time(nullptr);
  if (now > 1700000000) return (uint32_t)now;
  return 1777272491 + (millis() / 1000);
}

float clampf(float v, float lo, float hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

float dist2d(float ax, float ay, float bx, float by) {
  float dx = bx - ax;
  float dy = by - ay;
  return sqrt(dx * dx + dy * dy);
}

float bearingFromNorth(float ax, float ay, float bx, float by) {
  float dx = bx - ax;
  float dy = by - ay;
  float a = atan2(dx, dy) * 180.0 / PI;
  if (a < 0) a += 360.0;
  return a;
}

String directionFromBearing(float b) {
  if (b >= 337.5 || b < 22.5) return "north";
  if (b < 67.5) return "north-east";
  if (b < 112.5) return "east";
  if (b < 157.5) return "south-east";
  if (b < 202.5) return "south";
  if (b < 247.5) return "south-west";
  if (b < 292.5) return "west";
  return "north-west";
}

class ScanCB : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice d) override {
    String mac = lowerCase(String(d.getAddress().toString().c_str()));
    int rssi = d.getRSSI();

    for (int i = 0; i < BEACON_COUNT; i++) {
      if (mac == String(beacons[i].mac)) {
        beacons[i].found = true;
        beacons[i].rssi = rssi;

        if (rssi > nearestRssi) {
          nearestRssi = rssi;
          nearestBeacon = mac;
          nearestBeaconName = beacons[i].name;
          nearestBeaconZone = beacons[i].zone;
        }

        Serial.printf("Beacon matched: %s RSSI=%d\n", mac.c_str(), rssi);
      }
    }
  }
};

void initBLE() {
  BLEDevice::init("EmergencyWatch");
  bleScan = BLEDevice::getScan();
  bleScan->setAdvertisedDeviceCallbacks(new ScanCB(), true);
  bleScan->setActiveScan(true);
  bleScan->setInterval(100);
  bleScan->setWindow(90);
  Serial.println("BLE ready");
}

void scanLocation() {
  locBeaconCount = 0;
  nearestBeacon = "";
  nearestBeaconName = "";
  nearestBeaconZone = "";
  nearestRssi = -100;

  for (int i = 0; i < BEACON_COUNT; i++) {
    beacons[i].found = false;
    beacons[i].rssi = -100;
  }

  Serial.println("BLE scan start");
  if (bleScan) {
    bleScan->start(BLE_SCAN_SECONDS, false);
    bleScan->clearResults();
  }

  float wx = 0.0;
  float wy = 0.0;
  float ws = 0.0;

  for (int i = 0; i < BEACON_COUNT; i++) {
    if (!beacons[i].found) continue;

    locBeaconCount++;
    float w = max(1, 100 + beacons[i].rssi);
    wx += beacons[i].x * w;
    wy += beacons[i].y * w;
    ws += w;
  }

  if (locBeaconCount > 0 && ws > 0) {
    locX = clampf(wx / ws, 0.0, MAP_W);
    locY = clampf(wy / ws, 0.0, MAP_H);
    locAccuracy = (locBeaconCount >= 3) ? 5.0 : (locBeaconCount == 2 ? 8.0 : 10.0);
    locQuality = (locBeaconCount >= 3) ? "medium" : "low";
  } else {
    locX = 0.0;
    locY = 0.0;
    locAccuracy = 0.0;
    locQuality = "unknown";
  }

  Serial.printf("Location x=%.2f y=%.2f accuracy=%.1f quality=%s beacons=%d nearest=%s rssi=%d\n",
                locX, locY, locAccuracy, locQuality.c_str(), locBeaconCount,
                nearestBeacon.c_str(), nearestRssi);
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.disconnect(true);
  delay(500);

  Serial.printf("WiFi connecting to SSID: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");

    if (millis() - start > 20000) {
      Serial.println("\nWiFi retry");
      WiFi.disconnect(true);
      delay(500);
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      start = millis();
    }
  }

  Serial.println();
  Serial.printf("WiFi OK. IP=%s MAC=%s\n",
                WiFi.localIP().toString().c_str(),
                WiFi.macAddress().c_str());

  configTime(0, 0, "pool.ntp.org", "time.google.com");
}

void connectMQTT() {
  mqtt.setBufferSize(4096);

  while (!mqtt.connected()) {
    for (int i = 0; i < MQTT_HOST_COUNT && !mqtt.connected(); i++) {
      const char* host = MQTT_HOSTS[i];
      mqtt.setServer(host, MQTT_PORT);

      String clientId = String("EmergencyWatch-") + DEVICE_ID + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);
      Serial.printf("MQTT connecting to %s:%u\n", host, MQTT_PORT);

      if (mqtt.connect(clientId.c_str())) {
        Serial.printf("MQTT OK host=%s\n", host);
      } else {
        Serial.printf("MQTT failed host=%s state=%d\n", host, mqtt.state());
        delay(600);
      }
    }

    if (!mqtt.connected()) {
      Serial.println("MQTT all hosts failed. Retry in 2s");
      delay(2000);
    }
  }
}

void ensureNetwork() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected()) connectMQTT();
  mqtt.loop();
}

// Flat MQTT payload. Backend should wrap this into Mongo document:
// { device_id, mysql_device_id, timestamp, data_type, server_received_at, payload: <this payload> }
void fillPayload(JsonDocument& doc, const char* dataType) {
  uint32_t ts = nowTs();

  doc["device_id"] = DEVICE_ID;
  doc["mysql_device_id"] = MYSQL_DEVICE_ID;
  doc["timestamp"] = ts;
  doc["data_type"] = dataType;

  JsonObject location = doc["location"].to<JsonObject>();

  JsonObject current = location["current"].to<JsonObject>();
  current["x"] = serialized(String(locX, 2));
  current["y"] = serialized(String(locY, 2));
  current["accuracy"] = locAccuracy;
  current["quality"] = locQuality;
  current["beacon_count"] = locBeaconCount;
  current["map_width"] = MAP_W;
  current["map_height"] = MAP_H;

  JsonArray detectedBeacons = location["beacons"].to<JsonArray>();
  for (int i = 0; i < BEACON_COUNT; i++) {
    if (!beacons[i].found) continue;

    JsonObject item = detectedBeacons.add<JsonObject>();
    item["mac"] = beacons[i].mac;
    item["name"] = beacons[i].name;
    item["zone"] = beacons[i].zone;
    item["x"] = beacons[i].x;
    item["y"] = beacons[i].y;
    item["rssi"] = beacons[i].rssi;
    item["detected"] = true;
  }

  JsonObject nearest = location["nearest_beacon"].to<JsonObject>();
  nearest["mac"] = nearestBeacon;
  nearest["name"] = nearestBeaconName;
  nearest["zone"] = nearestBeaconZone;
  nearest["rssi"] = nearestRssi;

  JsonObject target = location["target"].to<JsonObject>();
  target["x"] = TARGET_X;
  target["y"] = TARGET_Y;
  target["name"] = TARGET_NAME;

  float d = dist2d(locX, locY, TARGET_X, TARGET_Y);
  float b = bearingFromNorth(locX, locY, TARGET_X, TARGET_Y);

  target["distance"] = serialized(String(d, 2));
  target["direction"] = directionFromBearing(b);
  target["bearing"] = serialized(String(b, 1));
  target["eta"] = max(1, (int)round(d / 1.5));

  JsonObject fall = doc["fall_detection"].to<JsonObject>();
  fall["state"] = 0;
  fall["state_description"] = "Normal";
  fall["confidence"] = 0;
  fall["is_fall_confirmed"] = false;
  fall["impact_force"] = 0;
  fall["direction"] = "backward";
  fall["fall_time"] = millis();

  JsonObject sos = doc["sos"].to<JsonObject>();
  sos["active"] = sosActive;
  sos["trigger_method"] = sosActive ? "button" : "none";
  sos["trigger_time"] = sosActive ? sosTriggeredAt : 0;
  sos["trigger_count"] = sosTriggerCount;
  sos["duration"] = sosActive ? (millis() - sosTriggeredAt) / 1000 : 0;

  JsonObject sensors = doc["sensors"].to<JsonObject>();

  JsonObject hr = sensors["heart_rate"].to<JsonObject>();
  hr["bpm"] = 0;
  hr["confidence"] = 0;
  hr["timestamp"] = ts;
  hr["valid"] = false;

  JsonObject sp = sensors["spo2"].to<JsonObject>();
  sp["percentage"] = 0;
  sp["confidence"] = 0;
  sp["timestamp"] = ts;
  sp["valid"] = false;

  JsonObject system = doc["system"].to<JsonObject>();
  JsonObject battery = system["battery"].to<JsonObject>();
  battery["level"] = 60;
  battery["voltage"] = 3.85;
  battery["charging"] = false;
}

void publishDoc(const char* topic, JsonDocument& doc) {
  ensureNetwork();

  char out[4096];
  size_t len = serializeJson(doc, out, sizeof(out));
  bool ok = mqtt.publish(topic, out, len);

  Serial.printf("Publish %s => %s, bytes=%u\n", topic, ok ? "OK" : "FAIL", (unsigned)len);
  Serial.println(out);
}

void publishStatus() {
  StaticJsonDocument<4096> doc;
  fillPayload(doc, "status_update");
  publishDoc(TOPIC_STATUS, doc);
}

void publishSOS() {
  sosActive = true;
  sosTriggeredAt = millis();
  sosTriggerCount++;

  StaticJsonDocument<4096> doc;
  fillPayload(doc, "sos");
  doc["sos"]["active"] = true;
  doc["sos"]["trigger_method"] = "button";
  doc["sos"]["trigger_time"] = sosTriggeredAt;
  doc["sos"]["trigger_count"] = sosTriggerCount;
  publishDoc(TOPIC_SOS, doc);
}

void publishFall() {
  StaticJsonDocument<4096> doc;
  fillPayload(doc, "fall");

  JsonObject fall = doc["fall_detection"];
  fall["state"] = 4;
  fall["state_description"] = "Confirmed fall";
  fall["confidence"] = 0.90;
  fall["is_fall_confirmed"] = true;
  fall["impact_force"] = 2.67;
  fall["direction"] = "left";
  fall["fall_time"] = millis();

  publishDoc(TOPIC_FALL, doc);
}

bool buttonPressed() {
  int v = digitalRead(SOS_BUTTON_PIN);
  return SOS_ACTIVE_LOW ? (v == LOW) : (v == HIGH);
}

void handleButton() {
  bool pressed = buttonPressed();

  if (!pressed) {
    sosStarted = 0;
    return;
  }

  if (sosStarted == 0) {
    sosStarted = millis();
  }

  if (millis() - sosStarted > SOS_HOLD_MS && !sosActive) {
    Serial.println("SOS button detected");
    scanLocation();
    publishSOS();
  }
}

void handleSerial() {
  while (Serial.available()) {
    char c = (char)Serial.read();

    if (c == 'p' || c == 'P') {
      scanLocation();
      publishStatus();
    } else if (c == 's' || c == 'S') {
      scanLocation();
      publishSOS();
    } else if (c == 'f' || c == 'F') {
      scanLocation();
      publishFall();
    } else if (c == 'n' || c == 'N') {
      sosActive = false;
      Serial.println("Normal mode");
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("EmergencyWatch campus MQTT firmware");
  Serial.println("No external files. No SD/display/audio.");

  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);

  connectWiFi();
  connectMQTT();
  initBLE();

  scanLocation();
  publishStatus();

  lastStatusAt = millis();

  Serial.println("Ready. Commands: p=status, s=SOS, f=fall, n=normal");
}

void loop() {
  ensureNetwork();
  handleSerial();
  handleButton();

  if (millis() - lastStatusAt >= STATUS_INTERVAL_MS) {
    lastStatusAt = millis();
    scanLocation();
    publishStatus();
  }

  delay(20);
}
