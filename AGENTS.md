# AGENTS.md

You are a repo-first coding agent for this project.

## Operating Rules

1. Inspect the repo structure, package files, config files, and nearby docs before editing.
2. For any task beyond a tiny edit, state a short plan with target files, risks, and validation steps.
3. Prefer the smallest safe diff. Do not refactor unrelated code.
4. Preserve existing behavior unless the user explicitly asks for a behavior change.
5. After edits, run the most relevant checks available, such as lint, typecheck, tests, build, or targeted smoke tests.
6. Report exactly what changed, which files were touched, what commands were run, and the result of each command.
7. If requirements are incomplete, make the smallest reasonable assumption and state it clearly.
8. When changing workflow, architecture, scripts, routes, env vars, setup, or shared seed data, update the nearest README or docs in the same task.
9. For Git operations, never force push unless explicitly instructed.
10. Commit messages must use Simplified Chinese, while keeping English technical nouns, API names, file names, package names, and commands as-is.
11. For frontend tasks, do not break backend contracts, API schemas, env names, or existing routes without explicit instruction.
12. If a task has risk, say the risk first.

## Database Consistency

- Do not leave UI-affecting MySQL data changes only in a local database.
- If a change affects demo users, devices, FlyCare bindings, seeded rows, or shared local setup, add an idempotent SQL migration under `database/mysql/migrations/`.
- Update the nearest docs that explain how to run that migration. For FlyCare device bindings, update `docs/FLYCARE_MQTT.md`.
- Prefer `INSERT ... SELECT ... WHERE NOT EXISTS` plus targeted `UPDATE` statements so migrations can be re-run without creating duplicate users or devices.
- After adding a migration, validate it against `smart_elderly_care_system` and check the relevant API or UI output.

## Progress Log

### 2026-06-16 13:31-13:57 FlyCare bidirectional serial flight downlink + audio stability

- I.bridge.serial_downlink=updated `scripts/bridge_flycare_serial.ps1` to poll retained `smartwatch/+/flight`, de-duplicate topic/payload alias repeats, and write `FLYCARE_DOWNLINK <topic> <json>` to the connected watch while still bridging `FLYCARE_UPLINK` into MQTT.
- I.firmware.serial_downlink=updated `firmware/firmware.ino` to handle `FLYCARE_DOWNLINK` before uppercasing serial commands, enlarged Serial RX to 2048 bytes, and routes flight JSON through `FlightInfoManager` with `[SERIAL_DOWNLINK] handled=1` evidence.
- I.firmware.gate_popup=updated `firmware/FlightInfoManager.cpp` and `AudioManager.cpp` so `gate_changed=true` with `delay_reason=Gate Change to 10` shows the large simplified Gate Change popup, suppresses the extra verbose delay popup, and speaks a short gate-number TTS.
- I.firmware.audio_stability=updated Audio task creation to use `AUDIO_TASK_STACK_SIZE=8192`; this fixed the observed `***ERROR*** A stack overflow in task Audio` after Gate Change TTS/SD audio fallback.
- V.firmware.compile_upload=ok ESP32-S3 compile/upload to COM5 succeeded after the audio fix; final sketch 1538363/3145728 bytes, RAM 55176/327680 bytes, MAC `48:ca:43:a4:22:98`.
- V.flight.serial_downlink=ok backend `POST /api/v1/flycare-admin/flight/publish` for NG WAI LUN inserted Mongo `_id=6a30e330dde90a25b65b7f6e`, published retained QoS1 to both `ESP32_48CA43A42298` aliases, and bridge log `logs/flycare-serial-bridge-20260616-135549.log` shows serial downlink len=411, `[SERIAL_DOWNLINK] handled=1`, Gate Change popup, delay popup suppression, and no reboot over 75 seconds.
- V.positioning_after_upload=ok latest NG WAI LUN status `_id=6a30e5addde90a25b65b7f7e` is fresh with x=6.01, y=3.77, quality=high, beacon_count=6.
- V.goal.audit=pass `scripts/audit_flycare_goal.ps1` after the final upload passed using active backend `http://127.0.0.1:8001`; local stack, positioning, flight update, popup UI, SOS state, button policy, and historical HR/SpO2 checks passed.

### 2026-06-16 13:17-13:24 FlyCare USB serial-to-MQTT fallback bridge

- I.firmware.serial_uplink=updated `firmware/DataTransmitter.cpp` emits `FLYCARE_UPLINK <topic> <json>` for every MQTT uplink before attempting Wi-Fi MQTT, so COM5 can carry status/SOS/fall/heartbeat payloads when hotspot client isolation blocks watch-to-PC TCP.
- I.firmware.ble_mqtt_balance=updated `firmware/firmware.ino` no longer lets MQTT reconnect starvation permanently block BLE scans; when MQTT is disconnected it only skips BLE if the last BLE scan was within 15 seconds.
- I.bridge.serial_mqtt=added `scripts/bridge_flycare_serial.ps1` reads COM5 `FLYCARE_UPLINK` lines and republishes them to local Mosquitto from `logs/flycare-local-stack-status.json.mqttStatus`, with optional HTTP serial-ingest fallback.
- I.backend.serial_ingest=added `/api/v1/mongo-upstream/serial-ingest` and shared `ingest_upstream_payload()` helper so a restarted backend can ingest serial bridge payloads directly; default bridge path remains USB-to-MQTT to reuse the already-running 8001 subscriber.
- V.serial_bridge.smoke=ok `bridge_flycare_serial.ps1 -SmokeTest` published `smartwatch/ESP32_SERIAL_BRIDGE_SMOKE/status` to `192.168.0.203:1883`; existing backend 8001 subscriber wrote Mongo `_id=6a30dc44dde90a25b65b7f3d`.
- V.firmware.compile_upload=ok ESP32-S3 compile/upload to COM5 succeeded; final sketch 1537471/3145728 bytes, RAM 55176/327680 bytes, MAC `48:ca:43:a4:22:98`.
- V.ng_wai_lun.serial_realtime=ok `bridge_flycare_serial.ps1 -SerialPort COM5 -Seconds 90` parsed/sent 12 real watch uplinks, including heartbeat; latest NG WAI LUN status `_id=6a30dddedde90a25b65b7f4f` is fresh with x=6.47, y=4.93, quality=medium, beacon_count=5, target Gate 10, SOS inactive, fall Normal.
- V.goal.audit=pass `scripts/audit_flycare_goal.ps1` at 2026-06-16T13:23:54 passed using active backend `http://127.0.0.1:8001`; `watch_status_freshness` age=0.2min and `positioning_arrival` quality=medium/beacons=5.

### 2026-06-16 07:06-07:09 FlyCare stack audit active backend + freshness gate

- I.stack.report=updated `scripts/start_flycare_local_stack.ps1` now probes backend candidates on `8000` and `8001`, records `activeBackend`, includes `8001` in port evidence, and promotes the MQTT-connected bridge to top-level `health` / `mqttStatus` when `8000` is a stale healthy-but-MQTT-disabled listener.
- I.goal.audit=updated `scripts/audit_flycare_goal.ps1` auto-uses `logs/flycare-local-stack-status.json.activeBackend.baseUrl` when `-BaseUrl` is not supplied and adds `watch_status_freshness` with a default 5-minute freshness limit so stale Mongo/serial evidence cannot falsely complete realtime watch checks.
- V.stack.report=ok non-admin launcher run at 2026-06-16T07:06:25 selected active backend `http://127.0.0.1:8001`, MQTT connected to `192.168.0.203:1883`, with `8000` still healthy but MQTT disconnected.
- V.goal.audit=expected-fail audit now exits 1 because latest NG WAI LUN status `_id=6a307676dde90a25b65b7f3c` was ~65.6 minutes old (`server_received_at=2026-06-15T22:02:30.805000+00:00`), proving current realtime watch MQTT is still not complete.

### 2026-06-16 06:09-06:40 FlyCare watch MQTT stability + Triple-None isolation finding

- I.firmware.mqtt_stability=updated `firmware/DataTransmitter.cpp/.h` now uses monotonic `millis()` for MQTT/status scheduling, clears stale BLE-busy flags after 15s, closes stale `PubSubClient`/`WiFiClient` transports before and after failed reconnects, and lets status publish enter the reconnect path instead of requiring an already-connected MQTT session.
- I.firmware.task_ownership=updated `firmware/SimpleDisplayManager.cpp` no longer owns periodic telemetry publish; `DataTransmitter` on the Network task is the periodic telemetry owner. `firmware/firmware.ino` skips BLE scans while MQTT reconnect is pending to give ESP32 Wi-Fi a quiet connect window.
- V.firmware.compile_upload=ok final ESP32-S3 compile/upload to COM5 succeeded after restoring formal config `MQTT_PORT=1883` and `ENABLE_HTTP_UPLOAD=0`; sketch 1537363/3145728 bytes, RAM 55176/327680 bytes, MAC `48:ca:43:a4:22:98`.
- V.watch.runtime=partial serial confirms watch boots, joins `Triple-None`, gets IP `192.168.0.143`, scans FlyCare beacons, and keeps attempting MQTT to `192.168.0.203`.
- B.network.triple_none_isolation=confirmed current `Triple-None` topology blocks watch-to-PC traffic: MQTT to PC `1883` remains `state=-2`, A/B Mosquitto on `1884` also `state=-2` with no watch TCP session, HTTP POST to backend `8001` returns `-1`, and PC ping to watch `192.168.0.143` times out. Public MQTT probes from PC to `broker.emqx.io:1883` and `broker.hivemq.com:1883` also failed.
- B.admin.mqtt_restart=not-completed non-admin cannot stop Mosquitto PID 20168 or inspect/add firewall rules; UAC elevated PowerShell attempt did not produce a result file. Backend bridge `8001` remains connected to local Mosquitto, but the watch cannot reach PC over this hotspot.
- N.next.network=to complete hardware demo, move PC+watch to a non-isolated LAN or make the PC the hotspot, then set broker to the PC host IP and rerun MQTT/status, flight gate-change, SOS, and fall smoke tests. Do not claim real-time update path is fixed while `Triple-None` client isolation remains.

### 2026-06-16 05:46-05:49 FlyCare alert modal backlog fix

- I.frontend.alert_baseline=updated `frontend/src/App.tsx` waits for `useBackendEvents.lastUpdatedAt` before seeding known fall/SOS event IDs, so historical unhandled EventLog rows are treated as backlog instead of newly discovered alerts after `/flycare` reload.
- V.frontend.validation=ok `npm.cmd test` 61/61 pass; `npm.cmd run build` ok with existing Vite dynamic-import chunk warning.
- V.browser.flycare=ok reloaded `http://192.168.0.203:5173/flycare` after one event poll; NG WAI LUN remains Online with CX910, Gate 10, `Gate Change to 10`, no console errors, and no `.fall-alert-modal` / old overlay text.

### 2026-06-16 05:30-05:38 FlyCare NG WAI LUN bridge + alert smoke

- V.stack.lan=up Mosquitto `0.0.0.0:1883` PID 20168, frontend `0.0.0.0:5173` PID 22432, backend bridge `0.0.0.0:8001` PID 11372; `8001/api/v1/data-reception/mqtt/status` reports broker `192.168.0.203:1883` connected. `8000` remains a stale ghost listener and is not the reliable MQTT bridge.
- V.frontend.bridge=ok `frontend\.env.local` points Vite to `VITE_BACKEND_BASE_URL=http://192.168.0.203:8001`; browser smoke at `http://192.168.0.203:5173/flycare` shows selected passenger NG WAI LUN online, Customer Services, CX910, Gate 10, and `Gate Change to 10` with no console errors.
- V.ng_wai_lun.status=ok latest Mongo status `_id=6a306edfdde90a25b65b7e25` maps alias `ESP32_48CA43A42298` to MySQL device 8 with x=6.19, y=4.00, high quality, 6 beacons, SOS inactive, fall normal.
- V.flight.gate_change=ok latest flight `_id=6a306e0ddde90a25b65b7e02` for canonical/alias device 8 is CX910, Cathay Pacific, Singapore, Gate 10, `delay_reason=Gate Change to 10`.
- V.sos.path=ok valid JSON published through local MQTT using `mosquitto_pub -s` to `smartwatch/ESP32_48CA43A42298/sos` created Mongo `_id=6a306f91dde90a25b65b7e46` and EventLog 309 for MySQL device 8, then was resolved and followed by clear payload `_id=6a306facdde90a25b65b7e4d`.
- V.fall.path=ok valid JSON published through local MQTT using `mosquitto_pub -s` to `smartwatch/ESP32_48CA43A42298/fall` created Mongo `_id=6a306fbedde90a25b65b7e4e` and EventLog 310 for MySQL device 8, then was resolved and followed by normal payload `_id=6a306fcbdde90a25b65b7e4f`.
- V.validation=ok frontend `npm.cmd test` 61/61 pass; frontend `npm.cmd run build` ok with existing Vite dynamic-import chunk warning; backend `python -m compileall backend\backend\app` ok; PowerShell script parse ok; firmware ESP32-S3 compile ok, sketch 1537091/3145728 bytes and RAM 55176/327680 bytes.
- B.dashboard.alert_overlay=stale unrelated old unhandled events from other devices still show a fall/SOS overlay on `/flycare`; NG WAI LUN current event state is normal. Do not treat that overlay as NG path failure.

### 2026-06-15 17:00-17:40 FlyCare LAN stack restart/MQTT bridge

- V.lan.urls=up frontend `0.0.0.0:5173` PID 10496 serves `http://192.168.0.203:5173/flycare`; backend `0.0.0.0:8000` answers `/health` on `http://192.168.0.203:8000/health`.
- V.mqtt.lan=up Mosquitto `0.0.0.0:1883` PID 21492; `netstat` shows external client `192.168.0.143` connected plus backend bridge connection from `192.168.0.203`.
- V.mqtt.bridge=up temporary backend bridge `0.0.0.0:8001` PID 11372 reports `/api/v1/data-reception/mqtt/status` with `enabled=true`, `connected=true`, broker `192.168.0.203:1883`.
- V.mqtt.ingest=ok valid JSON heartbeat published to `smartwatch/ESP32_000048CA43A42298/heartbeat` through `192.168.0.203:1883` was written to Mongo `_id=6a2fd545dde90a25b65b76db` and read back from the existing `8000` API for MySQL device 8.
- I.stack.script=updated `scripts/start_flycare_local_stack.ps1` now detects LAN MQTT listeners, avoids starting localhost-only Mosquitto service, supports `-RestartMqtt`/`-RestartApps`, records LAN IPv4s and `mqttLanListener`, and retries HTTP health checks.
- I.backend.mqtt=updated backend MQTT subscriber now schedules a 5s background retry if the broker is unavailable at startup; status includes `retry_pending` and `last_error`.
- B.backend.8000=degraded PID 18164 still owns `0.0.0.0:8000` but Windows `taskkill` reports it cannot find that PID; until Windows/session restart frees it, use `8001` as the MQTT bridge while `8000` remains the dashboard/API read endpoint.

### 2026-06-15 16:21-16:38 FlyCare NG WAI LUN local debug

- V.stack.local=up backend `0.0.0.0:8000` PID 28976, frontend `0.0.0.0:5173` PID 25792, LAN MQTT `192.168.0.203:1883` PID 27300; `/api/v1/data-reception/mqtt/status` reports broker `192.168.0.203:1883`.
- V.firmware.compile=ok `arduino-cli compile` for ESP32-S3; sketch 1533647/3145728 bytes, RAM 55176/327680 bytes.
- I.firmware.buttons=latest spec: SOS short press cycles pages only; SOS long press 3s toggles SOS on/off; PWR short press turns screen off; PWR long press 3s toggles screen on/off. Manual destination picker/navigation menu remains disabled.
- V.ng_wai_lun.location=ok MySQL device 8 / NG WAI LUN online; latest Mongo location maps alias `ESP32_48CA43A42298` to MySQL 8 with x=5.81, y=3.85, 6 beacons, target Gate 10.
- V.flight.gate_change=ok Admin publish `Gate Change to 10` for `ESP32_000048CA43A42298` wrote Mongo `_id=6a2fb955c36ff89252fbffa7` and published retained QoS1 to `smartwatch/ESP32_000048CA43A42298/flight` plus alias `smartwatch/ESP32_48CA43A42298/flight`.
- V.sos.path=ok MQTT smoke `smartwatch/ESP32_000048CA43A42298/sos` created EventLog 307 for user 15/device 8, then marked resolved after verification.
- V.fall.path=ok MQTT smoke `smartwatch/ESP32_000048CA43A42298/fall` created EventLog 308 for user 15/device 8, then marked resolved after verification.
- B.upload.com5=blocked Windows PnP shows real ESP32 USB serial `USB\VID_303A&PID_1001&MI_00\6&20EF5D4B&0&0000` as `USB Serial Device (COM5)` with Status=Error; OS cannot open COM5, `pnputil /restart-device` denied. COM3/COM4 are Bluetooth serial ports; COM3 upload write-timeout, COM4 semaphore-timeout. Next physical action: unplug/replug watch USB or hold BOOT while reconnecting, then retry COM5 upload.
