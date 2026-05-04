# Campus Watch Emergency Upstream

This note documents the ITP4458 CampusWatch demo path from ESP32-S3 smartwatch
to the `/campus` dashboard.

## Device And Broker

- Primary device ID: `ESP32_0000E03948D4DB1C`
- Alias device ID: `ESP32_000040FA7AD4DB1C`
- MySQL device ID: `1`
- MQTT broker: `192.168.0.203`
- MQTT port: `1883`
- MQTT topics:
  - `smartwatch/<device_id>/status`
  - `smartwatch/<device_id>/sos`
  - `smartwatch/<device_id>/fall`

The backend device map keeps both CampusWatch device IDs mapped to MySQL device
`1`. The frontend `/campus` page filters Mongo upstream reads to those device
IDs and does not use unfiltered latest data.

## Coordinate System

The firmware publishes BLE/RSSI room-level estimates using a `12 x 16` campus
map coordinate system.

```text
xPercent = x / 12 * 100
yPercent = y / 16 * 100
```

The base map image remains clean. The current smartwatch marker is rendered as
a frontend overlay only.

## Local Demo Tools

Use the bridge if the backend MQTT subscriber is not writing to MongoDB:

```powershell
py -m pip install paho-mqtt pymongo
py tools/local_mqtt_to_mongo_bridge.py
```

Use the print subscriber when `mosquitto_sub` is unavailable:

```powershell
py -m pip install paho-mqtt
py tools/mqtt_print_subscriber.py
```

Check latest Mongo upstream documents:

```powershell
py -m pip install pymongo
py tools/mongo_check_latest.py
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
