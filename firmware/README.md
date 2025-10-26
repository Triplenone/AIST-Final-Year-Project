# Firmware Skeleton

## English Version
`firmware/` is a PlatformIO project targeting the ESP32 wearable. Dependencies (MPU6050, MAX3010x, TinyGPS++, PubSubClient, ArduinoJson) are pinned in `platformio.ini`. Application code belongs under `src/`, and secrets (Wi-Fi, MQTT creds, TLS material) must be placed in ignored headers (e.g., `src/util/config.h`).

### Build & Monitor
```bash
pio run            # build
pio device monitor # optional serial monitor
```
Add Unity-based tests under `test/` once modules (sensor fusion, telemetry encoding, OTA validators) stabilize.

### Todo Checklist
1. Wi-Fi bootstrap with exponential backoff.
2. BLE beacon scanner emitting `{beacon_id, rssi}` at configurable duty cycle.
3. GNSS (ATGM336H) ingestion via TinyGPS++.
4. MQTT/TLS publisher with SOS + OTA subscribers.
5. OTA client that validates SHA256 + signature before flashing.

## 繁體中文（香港）版本
`firmware/` 為 ESP32 穿戴裝置的 PlatformIO 專案。`platformio.ini` 已鎖定 MPU6050、MAX3010x、TinyGPS++、PubSubClient、ArduinoJson 等依賴；邏輯程式碼請放於 `src/`。Wi-Fi、MQTT 憑證與 TLS 資料必須寫在 `.gitignore` 的檔案（如 `src/util/config.h`）。

### 編譯與監看
```bash
pio run            # 編譯
pio device monitor # 序列埠監看（可選）
```
待模組（感測器融合、遙測編碼、OTA 驗證）穩定後，可在 `test/` 加入 Unity 測試。

### 待辦清單
1. Wi-Fi 啟動與指數退避。
2. BLE Beacon 掃描，依 duty cycle 輸出 `{beacon_id, rssi}`。
3. 透過 TinyGPS++ 讀取 ATGM336H GNSS。
4. MQTT/TLS 上傳與 SOS／OTA 訂閱。
5. OTA 前驗證 SHA256 與簽章後再寫入。
