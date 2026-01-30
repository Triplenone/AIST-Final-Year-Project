# Firmware (ESP32 PlatformIO scaffold)

This folder is a **PlatformIO project scaffold** for an ESP32 wearable.

## What exists (repo evidence)

- `platformio.ini` defines `env:esp32dev` and pins libraries:
  - Adafruit MPU6050
  - SparkFun MAX3010x
  - TinyGPSPlus
  - PubSubClient
  - ArduinoJson
- `src/` contains placeholder folders only (`.gitkeep`).

## Build & monitor (verified commands)

```bash
cd firmware
pio run
```

Optional serial monitor:

```bash
pio device monitor
```

## Not found (in this repo)

- Firmware application code under `src/` (sensor reading, Wi-Fi/MQTT upload, OTA, etc.).
