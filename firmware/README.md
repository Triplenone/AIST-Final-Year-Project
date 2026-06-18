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

For NG WAI LUN/device 8 uploads on the current COM5 watch, use a conservative USB upload speed if the default high-speed upload stalls:

```powershell
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' upload -p COM5 --fqbn "esp32:esp32:esp32s3:FlashSize=8M,PartitionScheme=huge_app,PSRAM=opi,CDCOnBoot=cdc" --upload-property upload.speed=115200 .
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
flycare
MILLION
MILLION1
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

For the offline path, keep the PC and watch on the same local network. The router build tries `flycare` first, then keeps `MILLION`, `MILLION1`, and `Triple-None` as fallback SSIDs; when MQTT connects it prefers the broker configured for the connected SSID:

```text
flycare                     -> MQTT_BROKER
MILLION / MILLION1          -> MQTT_BROKER_MILLION1
Triple-None                 -> MQTT_BROKER_TRIPLE_NONE
Fallback order              -> MQTT_BROKER, MQTT_BROKER_FALLBACK_1, MQTT_BROKER_FALLBACK_2
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

`DataTransmitter` is the only runtime owner of the FlyCare MQTT session. `MyNetworkManager` keeps Wi-Fi/NTP alive but does not auto-connect its own MQTT client, because two `PubSubClient` instances on the watch can race and leave publishes disconnected. Serial publish diagnostics use `[MQTT_PUB]` lines. Reconnect attempts use a short exponential backoff so a failed direct-Wi-Fi broker connect does not create overlapping half-open MQTT sockets while status telemetry keeps running. The MQTT client id is fixed to the watch `device_id` so Mosquitto closes any stale same-watch session before accepting the new one.

During router migration, `DataTransmitter` also has a narrow one-shot MQTT uplink fallback. If the persistent `PubSubClient` session is disconnected, status/location publishes can open a short `WiFiClient`, send MQTT 3.1.1 CONNECT + QoS 0 PUBLISH to the same `smartwatch/<device_id>/...` topic, flush, then disconnect. This does not replace the persistent session used for retained flight downlinks, and `[MQTT_RAW] publish ok` is only firmware-side diagnostic evidence; direct proof still requires seeing the payload on the broker and Mongo latest refresh.

Status and location direct Wi-Fi uplinks use compact JSON for the router demo path. COM5 serial fallback keeps status as the single periodic telemetry carrier, with the current location embedded in that status payload; direct MQTT still publishes both `/status` and `/location`. MQTT publish pumps the client loop only briefly after each direct publish and the BLE task waits on the shared RF mutex before scanning, so direct telemetry does not starve fresh BLE scans.

The committed local demo config leaves `MQTT_BROKER_FALLBACK_1` empty so an offline `Triple-None` run does not block on the public broker. Use `scripts/set_flycare_mqtt_endpoint.ps1 -Mode Cloud` before uploading when a public broker is intentionally required.

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

The BLE scan task is the only runtime owner of `BLELocation::getLocation()`. `DataTransmitter` uses the cached position supplied by `setCurrentLocation()` so MQTT/Serial status generation does not re-enter BLE scan-result cleanup while the BLE task is processing results.

## Smart navigation

`SmartNavigationPlanner` owns the destination list and route policy used by both manual navigation and flight-driven navigation.

Manual navigation and destination picker UI are disabled for the FlyCare demo. The boot-time demo flight/arrival target is `CX910` to `Gate 10`; backend flight updates can still override it through MQTT.

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
PWR single click      Toggle the display off/on
PWR long press        Hold for 3 seconds to toggle the display off/on
```

Manual destination selection and the on-watch navigation menu are disabled for the FlyCare airport demo. Flight updates may arm an arrival target for Gate 10/Gate 11, but SOS/PWR button presses no longer select or confirm routes. SOS short press only switches pages. The SOS wheel/rotary is not used for FlyCare navigation.

The destination picker fits labels by available pixel width rather than raw string length, so `Security Check` stays the same large size as the other standard destinations while longer labels still shrink safely when needed.

Map display layout is intentionally bounded for the 240x310 active watch surface: the normal map page uses a full-height map with no SOS badge, route line, route arrow, route step list, target flag, or bottom progress bar. Gate 10/Gate 11 is shown in one lower-left white destination card with subtle green `DEST`, smaller dark gray `Gate`, a muted-gold gate number, and soft gray walk-time text; the card is narrow, taller, and lifted clear of the bottom rounded edge. BLE jitter redraws are throttled so the map does not repaint on tiny RSSI-driven movement. The navigation/map and flight pages use a shorter compact black top status band with left/right-spaced white signal bars, a larger centered `HH:MM`, and a white battery outline with level fill.

BLE positioning is strongest-beacon-first for the small FlyCare demo field. The 12 registered beacon MACs remain grouped into six airport zones for labels and arrival safety, but the displayed/stable XY now follows the strongest beacon when its RSSI is at least `BLE_STRONGEST_SNAP_MIN_RSSI` and either leads the second strongest beacon by `BLE_STRONGEST_SNAP_LEAD_DB` or is stronger than `BLE_STRONGEST_SNAP_IMMEDIATE_RSSI`. Ambiguous scans hold the previous marker instead of weighted-XY drifting through Toilet or the adjacent gate. Customer Services requires `BLE_CUSTOMER_SNAP_CONFIRMATIONS` consecutive clear scans before it can take over the marker; pending Customer scans use the best non-Customer alternative when one is visible. When Customer Services is blocked by the corridor guard, the selected Check-in/Security/Gate alternative is treated as a clear forced alternative and uses `BLE_FORCED_ALTERNATIVE_SNAP_BLEND`, so the marker leaves stale Customer Services without fully hard-jumping like a normal strongest-beacon snap. Raw weighted XY and zone evidence are still logged for tuning. Small display movements under `DISPLAY_POSITION_REDRAW_THRESHOLD_METERS` do not repaint the map.

Flight JSON updates are connected to `FlightInfoManager`. When `boarding_gate` maps to a known destination, the watch stores that gate as the arrival target without opening the manual navigation route UI. The latest flight gate also forces the internal `NavigationManager` target and display destination, so the map `DEST` card and arrival checks follow Gate 10/Gate 11 changes instead of a stale boot-time route:

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
Arrival uses `FLIGHT_ARRIVAL_RADIUS_METERS` from `Config.h` to tolerate BLE-derived positioning noise, and the current position is checked immediately when a flight update arms a Gate 10/Gate 11 target. Direct flight arrival also requires the current BLE-derived point's nearest FlyCare destination to match the armed gate, so nearby areas such as Customer Services cannot trigger the Gate 11 arrival popup just because they are inside the broad tolerance edge. Arrival popup uses the large dedicated `ARRIVED` layout, auto-closes after 5 seconds, clears the active route plus `location.target.active`, and returns to the map page. Flight and arrival popups are rendered from a separate popup dirty flag so live BLE/MQTT updates do not repeatedly repaint the full popup surface.

Arrival follows the current flight gate target and is guarded by nearest-zone matching. The current small-field profile uses one arrival confirmation because the display position already requires a clear strongest-beacon snap or holds the previous marker when the scan is ambiguous. Customer Services, Toilet, or the opposite gate cannot trigger a Gate 10/Gate 11 arrival unless the current nearest FlyCare destination matches the armed gate.

Flight display layout uses the flight number as the main title, places the airline name directly below it, reads the visible gate from `flight_info.boarding_gate`, and uses one unified status card for scheduled, boarding, delayed, cancelled, final-call, and pending states. The flight page uses restrained color accents for airline, gate, boarding, estimated time, and status so the black watch surface stays readable without neon-heavy styling. Long airline, gate, time, and status detail text is fitted inside the 240x310 layout rather than drawing into the next column or off the bottom edge. Accepted flight updates show only one primary popup in priority order: cancelled, gate change, delayed, boarding, then scheduled/on-time recovery.

When a backend update is explicitly a gate-change notice (`gate_changed=true` and a `delay_reason` such as `Gate Change to 10`), the firmware keeps the large simplified Gate Change popup and suppresses the extra verbose delay popup. Identical retained flight payloads are ignored by `FlightInfoManager`, so MQTT reconnects or USB serial downlink fallback do not repeatedly reopen the same Gate Change popup.

Flight update, arrival, and SOS cues keep popup plus vibration active. Audio remains disabled with `ENABLE_AUDIO_ALERTS 0` and `ENABLE_TONE_ALERTS 0` for the router direct-MQTT demo, because the available alert tone path still initializes the ES8311/I2S audio stack and has caused direct MQTT loss on this watch. Do not re-enable SD/TTS/I2S audio for the final demo without a separate direct-MQTT regression proof.

Location freshness is tuned for the live dashboard: the watch publishes `/location` every `DATA_LOCATION_UPLOAD_INTERVAL_MS` (3 seconds) or immediately when the displayed position moves by `DATA_LOCATION_MOVED_THRESHOLD_METERS`. Status telemetry keeps carrying the latest stable/display XY, while `/flycare` performs a 1-second latest-location refresh for the selected resident only.

For the small 25-26 square meter demo field, `BLELocation` treats Check-in and Security as a corridor. A weak single Customer Services beacon no longer moves the marker by itself; while the previous or recent fix is in the Check-in/Security corridor, Customer Services must be very strong or clearly lead the corridor beacon before it can override the marker, and it must stay clear for consecutive scans. The current Customer Services override threshold is intentionally stricter than the general strongest-beacon snap path (`BLE_CUSTOMER_SNAP_RSSI` / `BLE_CUSTOMER_SNAP_LEAD_DB` / `BLE_CUSTOMER_SNAP_CONFIRMATIONS`) because this beacon can otherwise attract the marker while walking from Check-in/Security toward Gate 10/Gate 11. Clear strongest-beacon snaps use a shorter smoothing history and a larger allowed step so Gate/Check-in/Security changes are visible quickly without using slow 12-18 second zone confirmation. `startScan()` processes the returned BLE scan results immediately, so the displayed/MQTT position is based on fresh scan data instead of stale cached coordinates.

Fall detection source support remains enabled in this build (`ENABLE_FALL_DETECTION 1`), and `SIMFALL` still displays the fall alert and uploads a fall payload through the same `DataTransmitter` path used by a confirmed fall. The continuous automatic fall task is disabled for the final FlyCare demo with `ENABLE_AUTO_FALL_DETECTION 0`, because Fall Detection is out of scope and accidental wrist movement can create stale demo events. Normal status telemetry reports fall as normal unless the state is confirmed, so transient Freefall/Impact/Static states do not leave the dashboard in a false alarm state.

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
FLYCARE_DOWNLINK T J Apply serial MQTT downlink topic T with JSON payload J
PAGE 2               Switch to the flight page
REDRAW               Force a display redraw after a serial UI test command
TESTARRIVAL          Trigger arrival test for Gate 10
TESTARRIVAL Gate11   Trigger arrival test for Gate 11
TESTSOUND            Queue alert sound plus English TTS
SIMFALL              Show fall alert and upload fall payload
SOSON / SOSOFF       Test the same SOS publish/display/audio path used by BOOT
HR / HRDEBUG         Print current HR/SpO2 and MAX30102 IR/red/contact diagnostics
HRSENSOR            Print MAX30102 part ID, revision, die temperature, and contact state
HRCAL                Sample raw MAX30102 IR/red for 10 seconds and report contact/saturation percentage
HRLED 0x1F           Set/report MAX30102 red/IR LED brightness without recompiling
HRSWEEP              Sweep 0x1F/0x3F/0x7F/0xFF LED levels and print HRCAL stats
```
