# Campus Watch Emergency Upstream

This note documents the ITP4458 CampusWatch demo path from ESP32-S3 smartwatch
to the `/campus` dashboard.

## Arduino Sketch

Use this Arduino IDE sketch path:

```text
C:\Users\user\Documents\Arduino\4458\EmergencyWatch\EmergencyWatch.ino
```

The repo copy lives at `firmware/EmergencyWatch/EmergencyWatch.ino`. Keep the
Arduino folder single-file: do not mix old `Config.h`, `pin_config.h`, `REG`,
display, SD, audio, or old `.cpp` files into this sketch folder.

## Device And Broker

- Primary device ID: `ESP32_0000E03948D4DB1C`
- Alias device ID: `ESP32_000040FA7AD4DB1C`
- MySQL device ID: `1`
- Wi-Fi SSID: `No`
- Wi-Fi password: `77777777`
- MQTT host fallback list:
  - `172.20.10.3`
  - `192.168.0.203`
  - `192.168.137.1`
- MQTT port: `1883`
- MQTT topics:
  - `smartwatch/ESP32_0000E03948D4DB1C/status`
  - `smartwatch/ESP32_0000E03948D4DB1C/sos`
  - `smartwatch/ESP32_0000E03948D4DB1C/fall`
- MongoDB collection: `smart_elderly_care_system.device_raw_upstream`

The backend device map keeps both CampusWatch device IDs mapped to MySQL device
`1`. The frontend `/campus` page filters Mongo upstream reads to those device
IDs and does not use unfiltered latest data.

Important: Arduino Serial output such as `Publish ... => OK` only proves the
MQTT broker accepted the packet. It does not prove the backend subscriber wrote
MongoDB. If Mongo latest does not move forward, run the MQTT print subscriber
first, then run the local MQTT-to-Mongo bridge if needed.

## Beacon Layout

| MAC | Beacon | Zone | X | Y |
| --- | --- | --- | ---: | ---: |
| `20:a7:16:61:02:42` | Campus Beacon A | Classroom A | 2 | 14 |
| `20:a7:16:61:02:2a` | Campus Beacon B | Library / Study Area | 10 | 14 |
| `20:a7:16:61:02:03` | Campus Beacon C | Main Entrance | 6 | 2 |

Firmware payloads include:

```text
location.current.beacon_count
location.current.quality
location.beacons[]
location.nearest_beacon
```

## Coordinate System

The firmware publishes BLE/RSSI room-level estimates using a `12 x 16` campus
map coordinate system.

```text
xPercent = x / 12 * 100
yPercent = y / 16 * 100
```

The base map image remains clean. The current smartwatch marker is rendered as
a frontend overlay only. The three configured Campus Beacon A/B/C reference
positions are also rendered as frontend overlays so the demo always shows the
known BLE beacon layout without modifying the map image.

## Arduino Serial Verification

Open Serial Monitor at `115200` baud. Expected successful publish output:

```text
Publish smartwatch/ESP32_0000E03948D4DB1C/status => OK
```

Useful commands:

```text
p = publish status_update
s = publish SOS
f = publish fall test payload
n = clear SOS
```

The JSON should include `device_id`, `mysql_device_id`, `location.current.x`,
`location.current.y`, `location.current.beacon_count`, `location.current.quality`,
and detected beacon details when BLE beacons are found.

## Local Demo Tools

Use the bridge if the backend MQTT subscriber is not writing to MongoDB:

```powershell
py -m pip install paho-mqtt pymongo
py tools/local_mqtt_to_mongo_bridge.py
```

For a short verification run:

```powershell
$env:BRIDGE_RUN_SECONDS="12"; py tools/local_mqtt_to_mongo_bridge.py; Remove-Item Env:\BRIDGE_RUN_SECONDS
```

Use the print subscriber when `mosquitto_sub` is unavailable:

```powershell
py -m pip install paho-mqtt
py tools/mqtt_print_subscriber.py
```

For a short verification run:

```powershell
$env:MQTT_PRINT_SECONDS="6"; py tools/mqtt_print_subscriber.py; Remove-Item Env:\MQTT_PRINT_SECONDS
```

Check latest Mongo upstream documents:

```powershell
py -m pip install pymongo
py tools/mongo_check_latest.py
```

Expected latest primary status payload shape:

```text
device_id=ESP32_0000E03948D4DB1C
payload.location.current.beacon_count=1 or 2
payload.location.current.quality=low
payload.location.current.x/current.y=12x16 map coordinates
```

## Frontend Demo

Open:

```text
http://localhost:5173/campus
```

The Campus UI displays SOS state, BLE beacon positioning, device status,
battery, connection status, and dashboard visualization. Fall payloads may still
exist in upstream data for compatibility, but the Campus page does not display
fall detection wording.
