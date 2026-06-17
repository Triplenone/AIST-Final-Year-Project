# FlyCare MQTT And Device Mapping

## Device Mapping

FlyCare keeps `backend/backend/config/device_id_map.json` backward compatible with the current backend loader shape:

```json
{ "version": 1, "mongo_to_mysql": [{ "mongodb_device_id": "ESP32_...", "mysql_device_id": 1 }] }
```

Do not replace these rows with nested metadata objects. Verification notes belong in docs or an optional metadata file. Runtime overrides remain available through `DEVICE_ID_MAP` and `DEVICE_ID_MAP_FILE`.

| External MQTT/Mongo device_id | MySQL device_id | Bound name | Verification note |
| --- | ---: | --- | --- |
| `ESP32_0000C422A443CA48` | 2 | LAU SIU FONG | Existing mapping |
| `ESP32_0000C8292A04A7AC` | 3 | WONG KA MING | Canonical device 3 ID after `database/mysql/migrations/20260615_register_flycare_device9_and_aliases.sql` |
| `ESP32_00005CFA7AD4DB1C` | 3 | WONG KA MING | Backward-compatible alias for existing local Mongo records |
| `ESP32_0000A022A443CA48` | 4 | HO CHI WAI | Canonical device 4 ID after `database/mysql/migrations/20260615_register_flycare_device4_canonical_id.sql`; verified in live Mongo upstream |
| `ESP32_00009822A443CA48` | 5 | TANG WAI HAN | User-corrected ID; not found in live Mongo during implementation precheck |
| `ESP32_00008C292A04A7AC` | 6 | MA KA WAI | Bound by `database/mysql/migrations/20260603_bind_flycare_devices_6_7_hk_names.sql` |
| `ESP32_00009022A443CA48` | 7 | YIP MAN LING | Bound by `database/mysql/migrations/20260603_bind_flycare_devices_6_7_hk_names.sql` |
| `ESP32_000048CA43A42298` | 8 | NG WAI LUN | Canonical device 8 ID after `database/mysql/migrations/20260608_dedupe_flycare_devices_and_device8_alias.sql` |
| `ESP32_48CA43A42298` | 8 | NG WAI LUN | Backward-compatible alias for existing local Mongo records |
| `ESP32_0000E03948D4DB1C` | 9 | LEE KA YAN | Canonical ID emitted by `SmartWatch_Project_S3R8_ISS_20260614163130` after COM5 upload |
| `ESP32_1CDBD44839E0` | 9 | LEE KA YAN | Backward-compatible alias for the previously uploaded firmware ID |

## MySQL Migration

After importing the base MySQL dump, run the tracked migrations so every local repo has the same FlyCare device/user seed data:

```powershell
cd E:\flycare
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260603_register_esp32_devices_6_7.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260603_bind_flycare_devices_6_7_hk_names.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260605_register_esp32_48ca43a42298.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260608_dedupe_flycare_devices_and_device8_alias.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260613_flycare_demo_labels.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260615_register_flycare_device4_canonical_id.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260615_mark_flycare_device8_ng_wai_lun_online.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260615_register_flycare_device9_and_aliases.sql"
```

Do not keep FlyCare user/device binding changes only in a local MySQL instance. If a binding affects the UI or demo data, add an idempotent migration under `database/mysql/migrations/` and update this mapping table.

Device 3 accepts both `ESP32_0000C8292A04A7AC` and the older local alias `ESP32_00005CFA7AD4DB1C`; admin presets should show only the canonical `ESP32_0000C8292A04A7AC` row. Device 8 accepts both `ESP32_000048CA43A42298` and the older local alias `ESP32_48CA43A42298`; admin presets should show only the canonical `ESP32_000048CA43A42298` row. Flight commands published from Admin fan out to every mapped alias for the selected MySQL device. If the FlyCare dashboard shows a passenger as stale/offline while the device is powered, verify that the device is publishing fresh `smartwatch/<device_id>/status` or `heartbeat` payloads to the same MQTT broker that the backend reports from `/api/v1/data-reception/mqtt/status`.

## MQTT Topics

Smartwatch uplink topics use `<MQTT_TOPIC_ROOT>/<device_id>/<suffix>`. Local LAN mode defaults to `smartwatch`; Cloud mode defaults to `flycare-demo-20260614/smartwatch`.

Default local uplink topics:

```text
smartwatch/+/status
smartwatch/+/location
smartwatch/+/sos
smartwatch/+/fall
smartwatch/+/door
smartwatch/+/light
smartwatch/+/log
smartwatch/+/heartbeat
smartwatch/+/vitals
```

Legacy loopback ingest topic retained for compatibility:

```text
flycare/flight
```

Default local FlyCare flight downlink topic:

```text
smartwatch/{device_id}/flight
```

FlyCare flight downlinks are published with QoS 1 and the retained flag so a watch that briefly disconnects during Wi-Fi scanning or MQTT fallback receives the latest flight update after it re-subscribes to `smartwatch/<device_id>/#`. Firmware ignores identical retained flight payloads after the first successful parse, preventing MQTT reconnects from repeatedly reopening the same Gate Change popup.

For local Windows demos with a real ESP32 on Wi-Fi, Mosquitto must listen on the PC LAN interface, not only `127.0.0.1`. Use `infra/mosquitto/local-windows.conf` when starting Mosquitto locally:

```powershell
& 'C:\Program Files\Mosquitto\mosquitto.exe' -c E:\flycare\infra\mosquitto\local-windows.conf
```

The ESP32 firmware and backend must use the same MQTT broker host. For a local Windows demo, that host is the PC Wi-Fi/LAN IP, not `localhost` or `127.0.0.1`; those point back to the ESP32/backend process itself. If the PC changes network, the broker IP changes too.

Use the endpoint helper before rebuilding firmware or restarting the backend:

```powershell
cd E:\flycare

# Local LAN/hotspot mode: writes the current PC Wi-Fi IPv4 into backend .env and firmware Config.h.
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\set_flycare_mqtt_endpoint.ps1 -Mode AutoLan

# Offline demo mode: same as local LAN, but records that the PC is the required local backend/MQTT host.
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\set_flycare_mqtt_endpoint.ps1 -Mode OfflineLan

# Cloud MQTT mode: backend and watch may be on different Wi-Fi networks if both have internet access.
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\set_flycare_mqtt_endpoint.ps1 -Mode Cloud
```

Local LAN/hotspot mode only works when the PC and watch are on the same SSID/subnet and the access point allows client-to-client traffic. If the PC is on a phone hotspot such as `MILLION1` but the watch is on another SSID such as `Triple-None`, a local broker on the PC is normally not reachable from the watch. In that case, either connect both devices to the same hotspot/LAN, or use Cloud MQTT / a private internet-reachable broker.

For a fully offline demo, use one local network at a time:

1. Connect the PC to `MILLION1` first when available; firmware tries `MILLION1` before all other SSIDs.
2. Run `set_flycare_mqtt_endpoint.ps1 -Mode OfflineLan`, then restart the backend and upload the firmware.
3. Confirm Mosquitto listens on `0.0.0.0:1883`, not only `127.0.0.1:1883`.
4. Connect the watch to the same SSID/subnet as the PC. The watch cannot reach a PC-local broker from `Triple-None` while the PC is on `MILLION1`, unless those networks are bridged/routed.

Firmware now keeps SSID-specific broker candidates. When connected to `MILLION1` or its aliases (`MILLION`, `MILLION 1`), it tries `MQTT_BROKER_MILLION1` first. When connected to `Triple-None`, it tries `MQTT_BROKER_TRIPLE_NONE` first. It then falls back to `MQTT_BROKER`, `MQTT_BROKER_FALLBACK_1`, and `MQTT_BROKER_FALLBACK_2`.

If both demo SSIDs must work from one firmware build, collect the PC broker IP for each SSID and write both values before upload:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\set_flycare_mqtt_endpoint.ps1 `
  -Mode OfflineLan `
  -Million1BrokerHost 172.20.10.3 `
  -TripleNoneBrokerHost <pc-ip-when-connected-to-Triple-None>
```

If the PC IP changes after switching hotspot/router, rerun the helper and re-upload firmware, or use a fixed travel router/static DHCP lease so the PC broker address stays stable.

Cloud MQTT mode currently uses `broker.emqx.io:1883` unless `-BrokerHost` is supplied. Because that broker is public, Cloud mode also writes a private demo topic root, currently `flycare-demo-20260614/smartwatch`, into both backend and firmware. Do not subscribe to public `smartwatch/...` topics on a public broker because retained or external messages can create false dashboard events. Use a private authenticated broker for production or external demos with sensitive data.

The backend MQTT subscriber also listens on `<MQTT_TOPIC_ROOT>/+/flight` and writes received downlink JSON into Mongo (`data_type=flight`). This loopback lets Admin **Publish to MQTT** update the FlyCare page without enabling **Mongo only** / **MQTT + save Mongo**.

`backend/backend/app/services/MQTT-topic.txt` defines the same downlink pattern as `smartwatch/%s/flight`. The migrated Arduino firmware now lives under `firmware/` and subscribes to this downlink through `DataTransmitter` / `FlightInfoManager`; keep the broker host aligned between `backend/backend/.env` and `firmware/Config.h`. The endpoint helper updates both files together.

Flight downlink JSON on `smartwatch/{device_id}/flight`:

```json
{
  "command_type": "flight_info",
  "flight_info": {
    "flight_number": "CA1234",
    "airline": "Air China",
    "departure_airport": "Hong Kong",
    "destination": "Beijing",
    "seat_number": "21C",
    "scheduled_departure": "14:30",
    "estimated_departure": "14:45",
    "boarding_time": "14:00",
    "boarding_gate": "A12",
    "status": "boarding",
    "delay_minutes": 15,
    "delay_reason": "Weather conditions",
    "gate_changed": true,
    "terminal": "T3",
    "checkin_counter": "C12-C18"
  }
}
```

`POST /api/v1/flycare-admin/flight/publish` maps existing admin form fields into `flight_info` (for example `flightNumber` -> `flight_number`, `departureAirport` -> `departure_airport`, `arrivalAirport` -> `destination`, `seatNumber` -> `seat_number`, `gate` -> `boarding_gate`, `flightTime` -> `scheduled_departure`). Optional body fields can override: `airline`, `destination`, `scheduled_departure`, `estimated_departure`, `boarding_time`, `boarding_gate`, `status`, `delay_minutes`, `delay_reason`, `gate_changed`, `terminal`, `checkin_counter`.

`flight_info` is the canonical ISS JSON shape. For UI compatibility, Mongo flight reads may also expose legacy flat fields such as `flightNumber`, `gate`, `flightTime`, `departureAirport`, `arrivalAirport`, and `seatNumber`. The FlyCare page resolves the map destination from `gate` first, then falls back to `flight_info.boarding_gate`.

Admin's primary FlyCare publish action sends the MQTT downlink and also writes Mongo (`publish_mqtt=true`, `save_mongo=true`) so the watch and dashboard update from the same operator action. The MQTT response `alias_results` is the watch-downlink proof; the Mongo write is the dashboard/popup proof. `save_mongo=true` by itself is only a UI/demo fallback and is not proof that the smartwatch received the MQTT command.

## Local Validation

To start or verify the local Windows stack from an elevated PowerShell, use the repo launcher:

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start_flycare_local_stack.ps1 -Elevate
```

The launcher checks/starts MySQL, MongoDB, MQTT, backend, and frontend where available, then writes `logs/flycare-local-stack-status.json` with `isAdmin`, port listeners, `/health`, LAN IPv4 addresses, `mqttLanListener`, `activeBackend`, and MQTT status evidence. If `8000` is occupied by a stale backend but a recovery bridge on `8001` has MQTT connected, `activeBackend` is set to `http://127.0.0.1:8001` and the top-level `health` / `mqttStatus` fields come from that bridge. If it is already running inside an Administrator PowerShell, omit `-Elevate`.

The launcher starts backend from `backend\.venv` when available and runs uvicorn without `--reload` so `-RestartApps` can replace the single port owner cleanly during demo recovery. The Vite frontend is started in a minimized `cmd /k` window because hidden, detached Vite processes can exit after printing `ready` on Windows.

If a stale local process owns the demo ports, add explicit restart flags:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start_flycare_local_stack.ps1 -Elevate -RestartMqtt -RestartApps
```

`-RestartMqtt` stops the listener on `1883` before starting Mosquitto with `infra/mosquitto/local-windows.conf`. This is required when the Windows Mosquitto service is listening only on `127.0.0.1:1883`; the watch cannot reach that localhost-only broker. `-RestartApps` stops listeners on `8000` and `5173` before starting backend and frontend again.

For a COM5 watch on a network that blocks watch-to-PC MQTT, the launcher can also start the USB serial bridge and include its PID/log evidence in `logs/flycare-local-stack-status.json`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start_flycare_local_stack.ps1 -Elevate -StartSerialBridge -SerialPort COM5
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start_flycare_local_stack.ps1 -Elevate -RestartSerialBridge -SerialPort COM5
```

`-RestartSerialBridge` stops the previously recorded bridge PID from `logs/flycare-serial-bridge-process.json`, then starts a new minimized console process and records `serialBridge.running`, `pids`, `logPath`, `stdoutLog`, and `stderrLog`. In Codex's restricted shell, a background serial bridge may be cleaned up when the command exits; use an elevated/non-sandbox PowerShell for a persistent demo bridge. The bridge log is the runtime proof for live dashboard freshness. It also preserves watch reset, panic, abort, stack, overflow, and backtrace markers so runtime stability checks can catch reboots instead of filtering those lines out as noise.

If a Windows/sandbox ghost listener keeps `8000` occupied but cannot be killed, run a temporary backend bridge on `8001` from an Administrator PowerShell so MQTT still writes Mongo while the dashboard continues reading through `8000`:

```powershell
cd E:\flycare\backend\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

Verify the bridge with `http://127.0.0.1:8001/api/v1/data-reception/mqtt/status`. The expected MQTT state is `enabled=true`, `connected=true`, broker `192.168.0.203`, port `1883`.

After running the launcher, `scripts/audit_flycare_goal.ps1` automatically uses `logs/flycare-local-stack-status.json.activeBackend.baseUrl` when no explicit `-BaseUrl` is supplied and that backend reports MQTT connected. Pass `-BaseUrl` only when you intentionally want to audit a specific backend port.

For a Vite dev dashboard during that ghost-listener recovery, set `frontend\.env.local` to the LAN bridge URL before restarting `5173`:

```text
VITE_BACKEND_BASE_URL=http://192.168.0.203:8001
```

The frontend still defaults to the same host on `:8000` when this override is absent.

If the watch is connected over USB but the current Wi-Fi/hotspot blocks watch-to-PC traffic, use the serial fallback bridge for local demo validation. Firmware emits every upstream payload as `FLYCARE_UPLINK <topic> <json>` on Serial before attempting MQTT; the bridge reads those lines from COM5 and republishes them into the local Mosquitto broker so the existing backend MQTT subscriber writes Mongo and EventLog exactly as if the watch had reached MQTT itself. The bridge is bidirectional for flight updates: it also polls retained `smartwatch/+/flight` MQTT downlinks, de-duplicates each topic and identical alias payload, and writes `FLYCARE_DOWNLINK <topic> <json>` back to the watch over USB. Firmware handles that serial downlink through `FlightInfoManager`, which also ignores identical retained flight payloads, so Gate Change popups still work when hotspot isolation blocks direct watch MQTT without flickering from repeat messages.

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bridge_flycare_serial.ps1 -SerialPort COM5
```

For a bounded capture during verification, add `-Seconds 60`. The bridge auto-uses `logs/flycare-local-stack-status.json.mqttStatus.broker` / `port`; in the current stack that is `192.168.0.203:1883`. This is a local USB-to-MQTT fallback for blocked networks only; the normal demo path remains direct watch MQTT over `192.168.0.203:1883`. `-Transport Http` is available for direct backend serial ingest after restarting a backend that includes `/api/v1/mongo-upstream/serial-ingest`, but MQTT transport is the recommended demo fallback because it exercises the same subscriber path. Use `-DisableDownlink` only when you need uplink-only serial capture; otherwise leave downlink enabled so Admin Gate Change reaches the connected watch. For the simplified gate-change demo, publish `delay_reason="Gate Change to 10"` and `gate_changed=true`; firmware suppresses the extra long delay popup and keeps the visible watch notification as the large `Gate Change` popup. Gate Change audio/TTS is intentionally skipped on the watch; use the popup plus short vibration as the hardware confirmation.

The downlink poll intentionally consumes one retained/new flight message per poll. This keeps `mosquitto_sub` from blocking serial reads while still delivering the retained Gate Change payload; repeated alias payloads are de-duplicated by payload and topic.

For one-shot software-path smoke tests that must also bridge the resulting serial uplink, pass serial commands through the bridge itself instead of opening COM5 from another process:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bridge_flycare_serial.ps1 -SerialPort COM5 -SerialCommand SIMFALL -Seconds 30
```

When publishing JSON smoke payloads from Windows PowerShell, avoid `mosquitto_pub -m $json`; native argument parsing can strip double quotes and the broker will receive invalid JSON such as `{device_id:...}`. Pipe the complete JSON to stdin instead:

```powershell
$payload = @{ device_id = "ESP32_48CA43A42298"; data_type = "sos"; sos = @{ active = $true } } |
  ConvertTo-Json -Depth 8 -Compress
$payload | & "C:\Program Files\Mosquitto\mosquitto_pub.exe" -h 192.168.0.203 -p 1883 -q 1 -t "smartwatch/ESP32_48CA43A42298/sos" -s
```

To capture watch evidence from COM5, use the verifier:

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify_flycare_watch.ps1
```

For the remaining physical checks, wear the watch firmly, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify_flycare_watch.ps1 -WaitForValidHeartRate -WaitForValidSpO2 -WaitForPhysicalSOS -AutoClearSOS -AutoHandleSosEvents -HeartRateLedBrightness 0xFF -Seconds 60
```

The verifier writes `logs/flycare-watch-verification.json` plus a timestamped `logs/flycare-watch-verification-YYYYMMDD-HHMMSS.json` with serial output, latest status/SOS payloads, unhandled events, and whether physical BOOT/SOS plus live heart-rate and SpO2 validity were observed. Current firmware uses SOS short click only to switch pages; SOS long press for 3 seconds toggles the SOS path on/off. PWR short click toggles the display off/on, and PWR long press for 3 seconds also toggles the display off/on. If `-HeartRateLedBrightness` is supplied, it sends `HRLED <value>` before diagnostics. If a heart-rate wait fails, it sends `HRCAL` and continuously drains serial output so the JSON includes raw MAX30102 contact and saturation diagnostics.

For repeatable MAX30102 troubleshooting, add `-RunHeartRateSensorCheck -RunHeartRateSweep`; the verifier sends `HRSENSOR` to read part ID/revision/die temperature, then sends `HRSWEEP` so firmware tests `0x1F`, `0x3F`, `0x7F`, and `0xFF` LED levels in one serial capture. The generated JSON includes `heartRateDiagnostics.classification`; `optical_contact_missing` means the chip answered over I2C but the red/IR readings never crossed the contact threshold.

To rerun physical verifier evidence in one repeatable flow, wear the watch firmly before starting and long-press SOS/BOOT for 3 seconds during the SOS window:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify_flycare_physical_blockers.ps1
```

The wrapper calls `verify_flycare_watch.ps1` twice, keeps each timestamped verifier JSON, and writes `logs/flycare-physical-blockers-summary-YYYYMMDD-HHMMSS.json`.

To consolidate the goal-level evidence after running the stack and watch verifier:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit_flycare_goal.ps1
```

The audit writes `logs/flycare-goal-audit.json` and `logs/flycare-goal-audit.md` with stack, beacon, legacy-brand cleanup, positioning, flight, watch popup UI, display runtime stability, watch runtime stability, fall detection path, SOS, physical SOS long-press, SOS/PWR navigation menu input, and live HR/SpO2 status. Dashboard positioning evidence should show the current airport location plus the live navigation target from `location.target` when present, including target name, distance, direction, and ETA. Flight sync evidence can come from `logs/flycare-watch-verification.json`, a focused `logs/flight-downlink-*.log` serial capture, or `logs/serial-ui-popup-smoke-*.log`. Display stability evidence comes from source checks for parsed-flight semantic de-duplication and NAV redraw throttling plus the newest `logs/flycare-serial-bridge-*.log`; that latest bridge log must show a flight payload, no repeated Gate Change display popup, duplicate retained payloads ignored, enough status uplinks, and no crash markers. Watch runtime stability checks task stack headroom and the newest `logs/flycare-serial-bridge-*.log` with status uplinks for at least a 60s no-crash window; stack source mismatch, reset/panic/abort/backtrace/stack-overflow evidence, or `[serial] invalid uplink` JSON corruption is a failure. Fall detection path checks firmware source parity, the latest confirmed fall payload, a matching EventLog row, no unhandled fall for the target device, and a later normal status payload. Firmware keeps the full MQTT/HTTP status JSON, but serial fallback uses a compact status payload and a larger Serial TX buffer so UART lines are less likely to be corrupted by concurrent watch logs; the bridge also extracts the first complete JSON object if a normal watch log is appended after it. Physical SOS long-press evidence can come from the verifier window or from a captured Event API `ButtonLong` SOS event for the watch. The audit reads timestamped verifier JSON files so HR diagnostics and physical SOS windows do not overwrite each other. Exit code `2` means there is no hard software failure but a physical verifier condition remains blocked.

Backend:

```powershell
cd E:\flycare\backend\backend
..\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd E:\flycare\frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Checks:

```powershell
cd E:\flycare\backend\backend
python -m compileall app

cd E:\flycare\frontend
npm run test
npm run lint
npm run build
```

## Debug Status and Troubleshooting Plan (2026-06-17 final demo freeze)

Current local runtime:

```text
Backend API:     http://127.0.0.1:8001 (active MQTT bridge; 8000 may be a stale listener)
Frontend Vite:   http://127.0.0.1:5173
MQTT broker:     See `backend/backend/.env`, `firmware/Config.h`, and `logs/flycare-mqtt-endpoint.json`
Watch serial:    COM5, ESP32_48CA43A42298, MySQL device 8, NG WAI LUN
Fall detection:  enabled with ENABLE_FALL_DETECTION 1; `SIMFALL` uploads a fall payload for software-path smoke testing; status telemetry normalizes non-confirmed transient fall states to normal and confirmed falls still use the fall topic/event path
```

Verified in the latest COM5 run and current firmware source:

- Current stack proof in `logs/flycare-local-stack-status.json` from 2026-06-14 12:25:58 shows ports 1883, 3306, 5173, 8000, and 27017 listening, `/health=healthy`, and MQTT connected to `192.168.0.203:1883`. That check ran from a non-admin shell (`isAdmin=false`) and therefore confirmed existing services rather than restarting Windows services. Earlier elevated proof is available from 2026-06-13 19:23:31 with `isAdmin=true`.
- BLE positioning is configured with 12 FlyCare beacon MAC records. Duplicate MACs intentionally share the same zone coordinates for Check-in, Gate 10, Gate 11, Toilet, Security Check, and Customer Services. Live scans report the subset currently nearby.
- Navigation/arrival logic was serial-tested for Gate 10 and Gate 11 with the correct arrival message for the active destination. Current firmware clears the active route and `navigation_active` telemetry state as soon as the ARRIVED popup is raised.
- Flight downlink was published through `POST /api/v1/flycare-admin/flight/publish`, received by the watch, and stored in Mongo as `data_type=flight`. The focused capture `logs/flight-downlink-20260614-002657.log` shows `smartwatch/ESP32_48CA43A42298/flight`, `[Flight] telemetry target synced: Gate 10 @ (8.0, 1.8)`, and Gate 10 arrival/TTS evidence. A later local publish at 2026-06-14 12:30:02 fanned out CX910 to both canonical and alias watch topics with `estimated_departure=17:50`, `status=delayed`, `delay_minutes=15`, and `delay_reason=Live integration retest`; the FlyCare dashboard now renders those rich `flight_info` fields in the flight panel and drawer instead of only the legacy top-level fields.
- SOS serial smoke (`SOSON` then `SOSOFF`) created an event and then cleared the latest SOS payload to `active=false`; the generated event was closed through the normal Event API as `false_alarm`.
- Previous physical BOOT SOS generated event `199` with `trigger_method=Button`; latest SOS payload then cleared to `active=false`, and event `199` was handled as `false_alarm`. Current freeze UX is: SOS short click switches pages only, and SOS long press for 3 seconds toggles the SOS path.
- Historical heart-rate and SpO2 sync are visible in the vitals bridge for NG WAI LUN / device 8 (`hr=83`, `spo2=98`, both valid in the latest confirmed vitals document). Invalid live vitals no longer overwrite that last confirmed row in `/api/v1/residents`.
- Physical SOS long-press is proven through Event API evidence: events `316` and `317` were created for device `8` with `trigger_method=ButtonLong`, the latest SOS payload was then cleared to `active=false`, and both events were handled through the normal Event API as `false_alarm`. The verifier window did not catch that event live, so `audit_flycare_goal.ps1` also accepts a captured Event API `ButtonLong` event as evidence for this check.
- The current active `buttonTask` uses PWR short press to toggle screen off/on and PWR long press for 3 seconds to toggle screen off/on. Manual destination selection and the on-watch navigation picker are disabled for the final FlyCare airport demo; SOS/PWR button presses do not select or confirm routes. The SOS wheel/rotary is not used for navigation.
- Watch notification UI was tightened after COM5 upload: Arrival now uses a large `ARRIVED` popup for 5 seconds, flight delay/gate popups use larger wrapped text, and the popup is redrawn from a dedicated popup dirty flag so BLE/MQTT updates do not repeatedly repaint the full popup surface. The current smoke capture is `logs/serial-ui-popup-smoke-20260614-082742.log`.
- Live heart-rate and live SpO2 are now proven in the timestamped verifier evidence (`logs/flycare-watch-verification-20260614-010836.json`): `heart_rate.valid=true`, `bpm=78`, `spo2.valid=true`, and `percentage=100`. The browser dashboard check at 2026-06-14 12:39 showed the last confirmed resident vitals row for NG WAI LUN as `83 bpm` and `98%`. Firmware still keeps HR/SpO2 invalid when optical contact is missing; `HRLED`, `HRSENSOR`, `HRCAL`, and `HRSWEEP` remain available for runtime MAX30102 diagnostics if contact drops again.

Troubleshooting order:

1. For physical SOS, hold the SOS/BOOT button for 3 seconds and verify `smartwatch/<device_id>/sos` plus `/api/v1/events/?event_status=unhandled`. Then clear with `SOSOFF` or another 3-second SOS/BOOT hold and handle the event through `PUT /api/v1/events/{event_id}/handle`; `audit_flycare_goal.ps1` will still count the handled `ButtonLong` event as evidence.
2. For PWR physical proof, observe the watch while pressing PWR once: the expected final-demo behavior is screen off if it was on, and screen on if it was off. Hold PWR for 3 seconds to verify the long-press screen toggle is not broken. The source-level audit confirms the active `buttonTask` intent, but final physical completion still needs human visual confirmation because the backend does not receive a PWR event.
3. For heart rate, first validate physical contact: wear the watch tightly, clean the MAX3010x window, keep the wrist still for 20-30 seconds, then send `HRDEBUG` and `HRSENSOR` on COM5. Run `HRCAL` for a 10-second raw IR/red window or `HRSWEEP` for a repeatable `0x1F`/`0x3F`/`0x7F`/`0xFF` LED sweep. If `HRSENSOR` reports `part_id=0x15` and a plausible die temperature but IR never crosses `30000`, fix contact/window/hardware before changing BPM logic; if `saturated_pct` is high, reduce LED drive with `HRLED 0x1F` or improve placement; if signal remains too low even at `HRLED 0xFF`, inspect the sensor window, wrist contact geometry, cable/solder path, or MAX30102 module orientation; if contact is stable but `avg=0`, keep still longer and inspect beat detection.
4. For SpO2, keep the same physical-contact checks. Live SpO2 is intentionally invalid until pulse-derived confidence is positive, so `spo2.valid=false` with `heart_rate.valid=false` is expected when MAX30102 contact is not established.
5. For arrival accuracy, use `TESTARRIVAL Gate10` / `TESTARRIVAL Gate11` before moving hardware. Confirm the serial log includes `[NAV] arrival route cleared` and that the next status payload has `location.target.active=false` with an empty target name. The firmware uses `FLIGHT_ARRIVAL_RADIUS_METERS` for BLE-derived Gate 10/Gate 11 arrival tolerance and checks the current position immediately when the flight target is armed. If live arrival fires early or late, adjust only beacon coordinates/RSSI references first, then retest `/api/v1/mongo-upstream/location/latest?device_id=ESP32_48CA43A42298`.
6. For popup readability or flicker, use `TESTARRIVAL Gate10` and `SIMDELAY` on COM5, then check serial evidence in `logs/serial-ui-popup-smoke-*.log`. Source audit expects `popupNeedsRedraw`, `POPUP_ARRIVAL_AUTO_CLOSE_MS = 5000`, `ARRIVED`, `Route complete`, and no stale side-button confirm prompt.
7. For map and flight page layout readability, use the frozen arrival/flight path rather than the disabled picker: send `TESTARRIVAL CUSTOMERSERVICES`, `PAGE 2`, `SIMDELAY`, and `REDRAW` on COM5. The watch should keep route steps inside the left card, the destination inside the right card, `Singapore` and `Gate 10` in separate flight columns, and the delay reason inside the bottom yellow panel.
8. For flight sync, verify four points in order: backend MQTT status reports the expected broker from `/api/v1/data-reception/mqtt/status`, `POST /api/v1/flycare-admin/flight/publish` fan-out to canonical and alias topics, Mongo latest flight for the watch alias, and watch Serial `FlightInfoManager` parse output or focused `logs/flight-downlink-*.log` evidence. The `/flycare` panel should show scheduled time plus `estimated_departure`, `status`, `delay_minutes`, and `delay_reason`; a new flight document should open the flight update drawer before staff confirmation. If it only shows Gate/Flight Time, rerun `npm test -- src/utils/flycare-flight.test.ts` and inspect `frontend/src/utils/flycare-flight.ts`.
9. For stale UI rows, select the live `NG WAI LUN` row in `/flycare`. Older seeded users can still show stale cards because their historical Mongo documents remain in the local database.
