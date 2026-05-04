# EmergencyWatch Arduino Firmware

Single-file ESP32-S3 campus smartwatch firmware for the ITP4458 demo path.

## Arduino IDE Setup

- Board: `ESP32S3 Dev Module`
- Serial baud: `115200`
- Required libraries:
  - `PubSubClient` by Nick O'Leary
  - `ArduinoJson` by Benoit Blanchon

Copy only `EmergencyWatch.ino` into the Arduino sketch folder, for example:

```text
C:\Users\user\Documents\Arduino\4458\EmergencyWatch\EmergencyWatch.ino
```

Do not mix this sketch with old `.h`, `.cpp`, display, audio, SD card, or `REG` files.

## Demo Settings

- Wi-Fi SSID: `No`
- Wi-Fi password: `77777777`
- MQTT host fallback list:
  - `172.20.10.3`
  - `192.168.0.203`
  - `192.168.137.1`
- MQTT port: `1883`
- Primary device ID: `ESP32_0000E03948D4DB1C`
- MySQL device ID: `1`

The watch screen stays black by design. Serial Monitor is only for debugging.
Final demo visualization is the `/campus` dashboard through MQTT, backend, Mongo,
and the frontend.

## Serial Commands

- `p`: publish status update now
- `s`: publish SOS event
- `f`: publish fall test event
- `n`: clear SOS state

The Campus frontend focuses on SOS, BLE/RSSI room-level positioning, device
status, battery, connection status, and dashboard visualization.

## Beacon Layout

- `20:a7:16:61:02:42`: Campus Beacon A, Classroom A, `x=2`, `y=14`
- `20:a7:16:61:02:2a`: Campus Beacon B, Library / Study Area, `x=10`, `y=14`
- `20:a7:16:61:02:03`: Campus Beacon C, Main Entrance, `x=6`, `y=2`

The firmware publishes `location.beacons[]` and `location.nearest_beacon` so the
Campus dashboard can display the real detected beacon name, MAC, zone, and RSSI.
