# Firmware Skeleton / 韌體骨架

## English
This directory is a placeholder for the ESP32-based wearable firmware. It already matches the PlatformIO layout (src/include/test) and pulls in the libraries we expect to use (MPU6050, MAX30102, TinyGPS++, PubSubClient, ArduinoJson). Add your implementation to `src/` and keep secrets (Wi-Fi, MQTT credentials, TLS certs) inside `src/util/config.h` or a separate config file that is git-ignored.

### TODO checklist
1. Implement Wi-Fi bootstrap with exponential backoff.
2. BLE beacon scanner that emits `{beacon_id, rssi}` at a configurable duty-cycle.
3. GNSS reader (ATGM336H) via TinyGPS++.
4. MQTT/TLS publisher + SOS / OTA subscribers.
5. OTA client that validates SHA256 + signature before flashing.

## 繁體中文
本資料夾為 ESP32 韌體的預留空間，已設定好 PlatformIO 所需的檔案結構與常用函式庫。未來請把實作程式放在 `src/`，並務必將 Wi-Fi / MQTT / TLS 憑證等敏感資訊放在 `.gitignore` 的設定檔中。

### 待辦事項
1. 建立 Wi-Fi 連線流程（含重試/backoff）。
2. 撰寫 BLE Beacon 掃描器，定期輸出 `{beacon_id, rssi}`。
3. 使用 TinyGPS++ 讀取 ATGM336H GNSS 模組。
4. 透過 MQTT/TLS 上行資料，並監聽 SOS/OTA 指令。
5. 實作 OTA 驗證（SHA256 + 簽章）後再寫入快閃記憶體。
