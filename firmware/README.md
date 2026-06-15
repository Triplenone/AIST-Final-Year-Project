# SmartWatch Project S3R8 Runtime Notes

## Arduino build target

Use the ESP32-S3 board profile with USB CDC enabled so Serial logs appear on COM5:

```powershell
arduino-cli compile --fqbn "esp32:esp32:esp32s3:FlashSize=8M,PartitionScheme=huge_app,PSRAM=opi,CDCOnBoot=cdc" .
```

On the current Windows workstation, Arduino CLI is installed with Arduino IDE and may not be on `PATH`. Use the full path if needed:

```powershell
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' compile --fqbn "esp32:esp32:esp32s3:FlashSize=8M,PartitionScheme=huge_app,PSRAM=opi,CDCOnBoot=cdc" .
```

The local `libraries/` folder is an Arduino Library Manager cache and is intentionally ignored by git. Recreate the required dependencies before compiling on a clean machine:

```powershell
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' lib install PubSubClient
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' lib install 'GFX Library for Arduino'
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' lib install TJpg_Decoder
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' lib install SensorLib
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' lib install NTPClient
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' lib install 'Adafruit MAX1704X'
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' lib install 'SparkFun MAX3010x Pulse and Proximity Sensor Library'
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' lib install ArduinoJson@6.21.5
```

## Network

`Config.h` keeps a WiFi candidate list. The firmware tries each configured SSID in order and uses the first one that connects:

```text
MILLION1
MILLION
MILLION 1
Triple-None
```

`MILLION1`, `MILLION`, and `MILLION 1` use the same hotspot password in the current config. Phone hotspots should work as long as they expose a 2.4 GHz-compatible network, allow new devices, and use compatible security.

If Serial shows `auth=7 (WPA2/WPA3)` followed by disconnect reason `208 (ASSOC_COMEBACK_TIME_TOO_LONG)`, the watch can see the hotspot but the WPA2/WPA3 mixed-mode association is failing. Enable the phone hotspot's WPA2/Compatibility/Max Compatibility mode if that option is available.

HTTP upload is disabled by default with `ENABLE_HTTP_UPLOAD 0` because local FlyCare currently receives watch telemetry through MQTT and `mongo-upstream`. To enable direct HTTP upload, run the backend on a LAN-reachable host, then set `ENABLE_HTTP_UPLOAD 1`.

MQTT telemetry is sent to the same broker used by the backend. Use the repo helper when the PC changes Wi-Fi or when switching between local LAN and cloud MQTT:

```powershell
cd E:\flycare

# Use the current PC Wi-Fi IPv4 as the local broker/server endpoint.
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\set_flycare_mqtt_endpoint.ps1 -Mode AutoLan

# Use the PC as the fully offline local backend/MQTT host.
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\set_flycare_mqtt_endpoint.ps1 -Mode OfflineLan

# Use a public cloud MQTT broker for demos where the watch and PC are on different Wi-Fi networks.
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\set_flycare_mqtt_endpoint.ps1 -Mode Cloud
```

Local LAN mode requires the watch and PC to be on the same SSID/subnet. If the PC is on `MILLION1` but the watch falls back to `Triple-None`, a broker on the PC is normally unreachable from the watch. Cloud MQTT mode works across different networks only when both sides have internet access. It uses a private demo topic root (`flycare-demo-20260614/smartwatch`) on the public broker so unrelated `smartwatch/...` retained messages are ignored. Use a private authenticated broker instead of the public demo broker for production.

For the offline path, keep the PC and watch on the same local network. Firmware always tries `MILLION1` before `MILLION`, `MILLION 1`, and `Triple-None`; when MQTT connects it now prefers the broker configured for the connected SSID:

```text
MILLION1 / MILLION / MILLION 1 -> MQTT_BROKER_MILLION1
Triple-None                   -> MQTT_BROKER_TRIPLE_NONE
Fallback order                -> MQTT_BROKER, MQTT_BROKER_FALLBACK_1, MQTT_BROKER_FALLBACK_2
```

To make one firmware build work on both `MILLION1` and `Triple-None`, collect the PC IP on each SSID and write both broker hosts before upload:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\set_flycare_mqtt_endpoint.ps1 `
  -Mode OfflineLan `
  -Million1BrokerHost 172.20.10.3 `
  -TripleNoneBrokerHost <pc-ip-when-connected-to-Triple-None>
```

Primary watch topics use the `<MQTT_TOPIC_ROOT>/<device_id>/...` pattern. In local mode the root is `smartwatch`; in Cloud mode the root is `flycare-demo-20260614/smartwatch`. For the current ESP32-S3 watch this is expected to look like in local mode:

```text
smartwatch/ESP32_48CA43A42298/status
smartwatch/ESP32_48CA43A42298/location
smartwatch/ESP32_48CA43A42298/heartbeat
smartwatch/ESP32_48CA43A42298/sos
```

Current local API path is generated into `Config.h` by `scripts/set_flycare_mqtt_endpoint.ps1`:

```text
http://<pc-lan-ip>:8000/api/v1/data-reception/receive
```

## BLE positioning

BLE positioning is enabled with `ENABLE_BLE_LOCATION 1`. The firmware uses these 12 registered beacons. Multiple MACs may intentionally share the same zone coordinate:

```text
20:a7:16:60:f7:c4  Check-in
20:a7:16:60:eb:73  Check-in
20:a7:16:60:f7:ca  Customer Services
20:a7:16:5e:ef:24  Security Check
20:a7:16:61:02:3f  Toilet
20:a7:16:61:09:40  Gate 11
20:a7:16:60:fb:ff  Gate 11
20:a7:16:5e:bc:32  Gate 10
20:a7:16:60:f3:d9  Gate 10
20:a7:16:61:02:2a  Toilet
20:a7:16:61:02:03  Security Check
20:a7:16:61:02:42  Customer Services
```

Positioning uses all registered beacons seen within the recent scan window, so the beacons do not need to appear in the same scan result. The status JSON includes `location.current.beacons[]` with each matched beacon's MAC, RSSI, estimated distance, confidence, and map coordinate.

## Smart navigation

`SmartNavigationPlanner` owns the destination list and route policy used by both manual navigation and flight-driven navigation.

Known destinations:

```text
CHECKIN           Check-in             (7.6, 14.6) public
SECURITY          Security Check       (6.6, 10.4)  checkpoint
CUSTOMERSERVICES  Customer Services    (6.2, 4.0)  restricted
TOILET            Toilet               (1.6, 2.2)  restricted
GATE10            Gate 10              (8.0, 1.8)  restricted
GATE11            Gate 11              (4.4, 1.8)  restricted
```

Transition checkpoints:

```text
Security Check          (6.6, 10.4)
Immigration & Customs   (6.2, 7.6) virtual waypoint
```

Route policy:

```text
Check-in/public -> restricted destination:
Current -> Check-in -> Security Check -> Immigration & Customs -> destination

Restricted -> restricted:
Stay on the restricted-side corridor and do not force Check-in.

Restricted -> Check-in:
Current -> Immigration & Customs -> Security Check -> Check-in
```

Manual controls:

```text
Touch                 Disabled and not initialized
Initial page          Home/clock page
SOS single click      Switch to the next page: Home -> Map -> Flight -> Home
SOS long press        Hold for 3 seconds to trigger SOS; hold for 3 seconds again to clear SOS
PWR single click      Turn the display off
PWR long press        Hold for 3 seconds to toggle the display on/off
```

Manual destination selection and the on-watch navigation menu are disabled for the FlyCare airport demo. Flight updates may arm an arrival target for Gate 10/Gate 11, but SOS/PWR button presses no longer select or confirm routes. SOS short press only switches pages. The SOS wheel/rotary is not used for FlyCare navigation.

The destination picker fits labels by available pixel width rather than raw string length, so `Security Check` stays the same large size as the other standard destinations while longer labels still shrink safely when needed.

Map display layout is intentionally bounded for the 240x310 active watch surface: the lower half uses a fixed left route card and a fixed right destination card, distance text has its own narrow column, and long places are compacted or split (`Customer Services` -> `Customer` / `Svc`, `Security Check` -> `Security` / `Check`) instead of overflowing. BLE jitter redraws are throttled so the map does not repaint on tiny RSSI-driven movement. `NAV_DISPLAY_INTERVAL` is 4 seconds, with immediate redraw only when position movement is meaningful.

Flight JSON updates are connected to `FlightInfoManager`. When `boarding_gate` maps to a known destination, the watch stores that gate as the arrival target without opening the manual navigation route UI:

```text
Gate 10 / 10 / A10 -> GATE10
Gate 11 / 11 / A11 -> GATE11
```

Arrival is checked against the flight arrival target. If backend flight JSON says `Gate 10`, only reaching Gate 10 shows and speaks:

```text
You've arrived at Gate 10
You have arrived at Gate 10.
```

If backend flight JSON says `Gate 11`, only Gate 11 can trigger the arrival reminder.
Arrival popup uses the large dedicated `ARRIVED` layout, auto-closes after 5 seconds, clears the active route plus `location.target.active`, and returns to the map page. Flight and arrival popups are rendered from a separate popup dirty flag so live BLE/MQTT updates do not repeatedly repaint the full popup surface.

Flight display layout uses fixed destination/gate columns, a top status bar that stays above the flight title, and a bounded delay panel kept above the rounded bottom edge. Long airline, destination, gate, and delay reason text is fitted or wrapped inside its panel rather than drawing into the next column or off the bottom edge.

Alert sounds are queued before or alongside TTS for SOS, gate change, delay, boarding, final call, cancellation, on-time updates, and arrival. Missing alert sound files are logged and the firmware safely continues with TTS.

Fall detection is disabled for power saving in this build (`ENABLE_FALL_DETECTION 0`). `FALL`, `SIMFALL`, and `FALLDISP` only print a disabled message.

Heart-rate sampling and MQTT upload cadence are intentionally separate: `HR_SAMPLE_INTERVAL_MS` controls MAX30102 sampling for pulse detection, while `HR_UPLOAD_INTERVAL_MS` keeps the existing 2-second vitals publish cadence. SpO2 starts as unknown and remains invalid until pulse-derived confidence is positive.

Serial smoke-test commands:

```text
NAVLIST              Print all smart navigation destinations
UPLOAD              Publish one status telemetry payload
NAVPICK              Open the destination picker
NAVNEXT              Simulate one SOS picker click and start/reset the 5s auto-confirm timer
NAVCANCEL            Cancel the destination picker
NAVDEST Gate10       Set route to Gate 10
NAVDEST Toilet       Set route to Toilet
NAVDEST Security     Set route to Security Check
NAVDEST CheckIn      Set route to Check-in
TESTROUTE Gate11     Set and print a smart navigation route
SIMFLIGHT            Simulate a Gate 10 flight JSON update
SIMFLIGHT11          Simulate a Gate 11 flight JSON update
SIMDELAY             Simulate a delayed flight JSON update
PAGE 2               Switch to the flight page
REDRAW               Force a display redraw after a serial UI test command
TESTARRIVAL          Trigger arrival test for Gate 10
TESTARRIVAL Gate11   Trigger arrival test for Gate 11
TESTSOUND            Queue alert sound plus English TTS
SOSON / SOSOFF       Test the same SOS publish/display/audio path used by BOOT
HR / HRDEBUG         Print current HR/SpO2 and MAX30102 IR/red/contact diagnostics
HRSENSOR            Print MAX30102 part ID, revision, die temperature, and contact state
HRCAL                Sample raw MAX30102 IR/red for 10 seconds and report contact/saturation percentage
HRLED 0x1F           Set/report MAX30102 red/IR LED brightness without recompiling
HRSWEEP              Sweep 0x1F/0x3F/0x7F/0xFF LED levels and print HRCAL stats
```
