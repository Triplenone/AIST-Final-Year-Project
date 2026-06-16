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

### 2026-06-17 00:46-00:49 FlyCare final freeze SOS evidence closeout

- V.git.current=ok branch `Flycare`, HEAD `ed69072198fad7d924be0ff9e6711611f2d8512a`, upstream `origin/Flycare`, `origin/Flycare...HEAD=0/0`; working tree only had the six pre-existing untracked `00_`-`06_FlyCare_*.md` audit docs before this note.
- D.backend.final_demo.current=use `http://127.0.0.1:8001` / `http://192.168.0.203:8001` for final hardware smoke because `logs/flycare-local-stack-status.json` shows `8000` healthy but MQTT-disabled (`mqttConnected=false`) and `8001` healthy with MQTT connected to `192.168.0.203:1883`.
- V.dashboard.current=ok browser `http://192.168.0.203:5173/flycare` sampled a no-loading window with NG WAI LUN Online, freshness Live, CX910, Customer Services, and `Gate Change to 10`; no console errors and no fall/SOS modal were present.
- V.location.current=ok latest device 8 status `_id=6a317e5ddde90a25b65b881e` at `2026-06-16T16:48:29.392000+00:00`, x=4.35, y=2.10, quality=high, beacon_count=4, SOS inactive, fall normal.
- V.flight.current=ok latest flight `_id=6a314783dde90a25b65b8247` remains CX910 / Gate 10 / `Gate Change to 10`; live serial bridge `logs/flycare-serial-bridge-live-20260616-234509.log` shows `[SERIAL_DOWNLINK] handled=1`, `TTS: Gate change to Gate 10`, duplicate retained flight payload ignored, and no crash markers.
- V.sos_physical.current=ok physical SOS long press is now proven by live serial bridge lines `[SOS] Activate via ButtonLong` and `[SOS] Clear via ButtonLong` twice, plus EventLog 316 and 317 for device 8 with `trigger_method=ButtonLong`; both were marked `false_alarm`, and latest status is `sos.active=false`.
- V.fall.current=ok final SIMFALL path evidence remains EventLog 315 for device 8, handled as `false_alarm`, with latest status fall normal and no unhandled target fall events.
- V.goal.audit.current=warn `scripts/audit_flycare_goal.ps1` at 2026-06-17T00:46:00 using active backend `http://127.0.0.1:8001`; all core checks passed except `display_runtime_stability` warning (`gatePopups=2`, `duplicateIgnored=2`, `uplinks=493`, `crashes=0`).
- P.pwr_physical.current=partial: source policy and audit confirm PWR short press sleeps the screen and PWR long press toggles screen power, but the live bridge has no `PWR`/screen-off serial evidence and Codex cannot visually observe the watch screen. Final completion still needs human visual confirmation of PWR short-press screen-off without breaking long-press power behavior.

### 2026-06-17 00:11-00:13 FlyCare final freeze resumed audit

- V.git.resumed=ok branch `Flycare`, HEAD `345ad6beafae318559b3d753ff5d409505509017`, `origin/Flycare...HEAD=0/0`; working tree only had the six pre-existing untracked `00_`-`06_FlyCare_*.md` audit docs before this note.
- V.goal.audit=pass `scripts/audit_flycare_goal.ps1` at 2026-06-17T00:11:13 using active backend `http://127.0.0.1:8001`; freshness age=0.1min, latest status `_id=6a317599dde90a25b65b86e3`, x=6.21, y=4.00, quality=high, beacon_count=6, SOS inactive, fall normal.
- V.dashboard.current=ok browser `http://192.168.0.203:5173/flycare` shows NG WAI LUN Online/Live, Boarding Gate 10, CX910, Gate 10, `Gate Change to 10`, no loading state, and no active fall/SOS overlay.
- V.bridge.current=ok `logs/flycare-serial-bridge-live-20260616-234509.log` is still live with 200 status uplinks, invalidUplinks=0, crashes=0, flight downlink seen, Gate Change notice, and duplicate retained payload ignored.
- B.physical_buttons=blocked: latest 200 EventLog rows still contained no fresh device 8 SOS/ButtonLong event; latest checked status `_id=6a3175eedde90a25b65b86ef` remained `sos.active=false`. Fresh physical SOS trigger/cancel and PWR short-press screen-off still require a human to press/observe the watch.

### 2026-06-16 23:52-23:53 FlyCare final freeze current UI recheck

- V.goal.audit=pass `scripts/audit_flycare_goal.ps1` at 2026-06-16T23:52:02 using active backend `http://127.0.0.1:8001`; freshness age=0.1min, status `_id=6a31711edde90a25b65b8650`, x=6.20, y=4.00, quality=high, beacon_count=3, SOS inactive, fall normal.
- V.dashboard.current=ok browser `http://192.168.0.203:5173/flycare` shows NG WAI LUN Online/Live, Boarding Gate 10, CX910, Gate 10, `Gate Change to 10`, no loading state, and no active fall/SOS overlay.
- V.bridge.current=ok `logs/flycare-serial-bridge-live-20260616-234509.log` has live status uplinks, `[SERIAL_DOWNLINK] handled=1`, Gate Change to 10 notice, one retained duplicate ignored, invalidUplinks=0, crashes=0.
- P.physical_buttons.current=partial: latest 150 EventLog rows still contained no fresh device 8 SOS/ButtonLong event; latest checked status `_id=6a31715adde90a25b65b865a` remained `sos.active=false`, so fresh physical SOS trigger/cancel and PWR short-press screen-off remain unproven in this resumed run.

### 2026-06-16 23:44-23:47 FlyCare final freeze live bridge restore

- B.bridge.stale=found `logs/flycare-serial-bridge-live-20260616-205947.log` had stopped at 2026-06-16T22:58:14 after parsed/sent 943, so `scripts/audit_flycare_goal.ps1` at 23:44 failed freshness with latest status age=46.7min.
- V.bridge.restore=ok restarted persistent COM5 serial bridge with `start_flycare_local_stack.ps1 -NoPause -RestartSerialBridge -SerialPort COM5`; new live log `logs/flycare-serial-bridge-live-20260616-234509.log` shows downlink sent, watch `[SERIAL_DOWNLINK] handled=1`, Gate Change to 10 notice, duplicate retained alias ignored, and live status uplinks.
- V.status.restore=ok latest status `_id=6a316ffadde90a25b65b8629` received at `2026-06-16T15:47:06.349000+00:00`, x=5.04, y=2.73, quality=medium, beacon_count=5, SOS inactive, fall normal.
- V.goal.audit=pass `scripts/audit_flycare_goal.ps1` at 2026-06-16T23:47:10; freshness age=0.1min, display/watch runtime duration=117.4s with 14 uplinks, invalidUplinks=0, crashes=0, flight serial sync, fall path latestEvent=315/false_alarm, SOS current state inactive.
- N.remaining=still no fresh physical SOS/PWR proof from this resumed run; button completion still requires a human to press SOS for 3s trigger/cancel and observe PWR short-press screen-off on the watch.

### 2026-06-16 21:25-21:26 FlyCare final freeze blocked audit

- V.stack.blocked_audit=ok branch `Flycare`, HEAD `4b2f1f06ed57e01b4a5cad0fe3de3863a4932448`, `origin/Flycare...HEAD=0/0`; active backend remains `http://127.0.0.1:8001` with MQTT connected, while `8000` remains healthy but MQTT-disabled.
- B.physical_buttons=blocked: latest 120 EventLog rows contained no fresh device 8 SOS/ButtonLong event, latest status `_id=6a314ee9dde90a25b65b834e` remained `sos.active=false`; remaining proof requires a human to press SOS for 3s trigger/cancel and observe PWR short-press screen-off on the watch.
- N.goal.status=software/hardware data paths are smoke-passed, but the active final demo goal cannot be marked complete until fresh physical button evidence is captured.

### 2026-06-16 21:12-21:15 FlyCare final freeze physical button monitor

- V.stack.recheck=ok branch `Flycare`, HEAD `c650de58ae18c25481cce35ac57fdba7c239348f`, `origin/Flycare...HEAD=0/0`; active backend remains `http://127.0.0.1:8001`, MQTT connected to `192.168.0.203:1883`, and persistent COM5 bridge log is `logs/flycare-serial-bridge-live-20260616-205947.log`.
- P.sos_physical.monitor=partial: a second 90s live Event API monitor during final freeze did not observe a new device 8 SOS/ButtonLong event; latest status `_id=6a314c22dde90a25b65b82e8` remained `sos.active=false`.
- V.goal.audit=pass `scripts/audit_flycare_goal.ps1` at 2026-06-16T21:14:46; freshness age=0.1min, display/watch runtime duration=892.7s with 129 uplinks, invalidUplinks=0, crashes=0, fall path latestEvent=315/false_alarm, SOS current state inactive, and button source policy still pass.
- N.final_blocker=remaining proof gap is fresh physical SOS long-press trigger/cancel plus physical PWR short-press observation; Codex can monitor backend/source evidence but cannot press the watch buttons remotely.

### 2026-06-16 20:53-21:02 FlyCare final demo freeze smoke

- V.git.final_freeze=ok branch `Flycare`, pre-smoke HEAD `ef6548bbdea85f9a1669e6b45acb0cecf0da0ecf`, `origin/Flycare...HEAD=0/0`; working tree only had the six pre-existing untracked `00_`-`06_FlyCare_*.md` audit docs.
- D.backend.final_demo=use `http://127.0.0.1:8001` / `http://192.168.0.203:8001` for final hardware smoke because `8000` is healthy but stale/MQTT-disabled, while `8001` is the active backend connected to MQTT `192.168.0.203:1883`.
- V.dashboard.final=ok browser `http://192.168.0.203:5173/flycare` shows NG WAI LUN Online/Live, Customer Services, CX910, Gate 10, `Gate Change to 10`, no loading state, and after SIMFALL clear no active fall/SOS overlay.
- V.location.final=ok latest status `_id=6a31476cdde90a25b65b8241` mapped to MySQL device 8 with x=6.19, y=3.98, quality=high, beacon_count=5, SOS inactive, fall normal.
- V.flight.final=ok Admin `POST /api/v1/flycare-admin/flight/publish` on 8001 saved Mongo `_id=6a314783dde90a25b65b8247`, published retained QoS1 to `ESP32_000048CA43A42298` and `ESP32_48CA43A42298`; serial bridge showed `[downlink] sent`, watch `[SERIAL_DOWNLINK]`, and duplicate payload ignored without reopening repeated popup.
- V.fall.final=ok `bridge_flycare_serial.ps1 -SerialCommand SIMFALL -Seconds 45` on COM5 produced fall uplinks, `[FallDetection] SIMFALL alert displayed and uploaded`, backend EventLog 315, then EventLog 315 was marked `false_alarm`; persistent COM5 bridge was restarted afterward.
- P.sos_pwr.final=partial: 70s live monitor during this freeze run did not observe a new device 8 SOS EventLog, so the fresh physical long-press trigger/cancel was not re-proven; current state is SOS inactive, audit still has historical `ButtonLong` evidence and source policy confirms SOS short press cycles pages, SOS long press toggles SOS, PWR short press sleeps screen, and PWR long press toggles screen.
- V.goal.audit=pass `scripts/audit_flycare_goal.ps1` at 2026-06-16T21:01:46 using active backend `http://127.0.0.1:8001`; freshness age=0.1min, positioning high/5 beacons, flight serial sync, display/watch runtime 112.3s with 17 uplinks, invalidUplinks=0, crashes=0, fall path latestEvent=315/false_alarm.

### 2026-06-16 19:58-20:20 FlyCare persistent COM5 serial bridge + live dashboard pass

- I.stack.serial_launcher=updated `scripts/start_flycare_local_stack.ps1` with `-StartSerialBridge`, `-RestartSerialBridge`, `-SerialPort`, and `logs/flycare-serial-bridge-process.json` PID tracking so local stack status records COM5 bridge PID/log evidence.
- I.bridge.downlink_poll=updated `scripts/bridge_flycare_serial.ps1` to poll one retained/new `smartwatch/+/flight` payload per cycle instead of waiting for a 20-message batch; this prevents flight downlink polling from starving serial status reads.
- I.audit.live_runtime=updated `scripts/audit_flycare_goal.ps1` so live bridge logs without a stop line use `LastWriteTime - bridge start` for runtime duration.
- D.serial.launcher=updated `docs/FLYCARE_MQTT.md` with launcher serial bridge usage and the elevated/non-sandbox requirement for persistent COM5 demo bridges.
- V.stack.serial_live=ok non-sandbox launcher started COM5 bridge from `logs/flycare-local-stack-status.json` with `activeBackend=http://127.0.0.1:8001`, MQTT `192.168.0.203:1883`, and live log `logs/flycare-serial-bridge-live-20260616-195844.log`.
- V.dashboard.live=ok browser `/flycare` shows NG WAI LUN Online/Live, Customer Services, CX910, Gate 10, `Gate Change to 10`, no loading state for selected passenger; stale labels are only other passengers.
- V.goal.audit=pass `scripts/audit_flycare_goal.ps1` at 2026-06-16T20:20:25; freshness age=0.2min, display runtime uplinks=185/crashes=0, watch runtime duration=1289.8s/invalidUplinks=0, fall/SOS/button policy all pass.

### 2026-06-16 17:18-17:21 FlyCare semantic flight dedupe + fall audit pass

- I.flight.semantic_dedupe=updated `firmware/FlightInfoManager.cpp` to hash a parsed flight signature rather than raw JSON, so canonical/alias retained downlinks with different spacing or transport paths are treated as the same flight update and repeated MQTT alias payloads are ignored.
- I.firmware.startup_flight=updated the default startup flight JSON in `firmware/firmware.ino` to `scheduled`, `delay_minutes=0`, and `gate_changed=false`, preventing a fake Gate Change/Delay popup immediately after reboot before the real retained flight downlink arrives.
- I.serial.stability=updated `firmware/firmware.ino`, `firmware/DataTransmitter.cpp`, and `firmware/BLELocation.cpp` to use a 2048-byte Serial TX buffer, shorten inactive-target/inactive-SOS serial status JSON, and suppress high-frequency BLE target debug lines that could interleave into `FLYCARE_UPLINK`.
- I.audit.fall_runtime=updated `scripts/audit_flycare_goal.ps1` with `fall_detection_path` and stricter latest-log runtime checks for semantic flight dedupe, Gate Change popup count, invalid uplinks, and crash markers.
- V.compile_upload=ok ESP32-S3 compile/upload to COM5 succeeded after the final stability fix; sketch 1543523/3145728 bytes, RAM 55184/327680 bytes, MAC `48:ca:43:a4:22:98`.
- V.serial_runtime=ok `logs/flycare-serial-bridge-20260616-171610.log` ran 120s with parsed/sent 17, downlinks=1, no invalid uplink, no crash markers, and repeated MQTT retained flight payloads ignored.
- V.simfall=ok `logs/flycare-serial-bridge-20260616-171853.log` ran `SIMFALL`, published two fall uplinks plus fresh status, ignored the retained flight downlink as duplicate, and created EventLog 314 for device 8; EventLog 314 was handled as `false_alarm` after verification.
- V.goal.audit=pass `scripts/audit_flycare_goal.ps1` at 2026-06-16T17:20:54 using active backend `http://127.0.0.1:8001`; all checks passed, including freshness age=0.9min, display runtime duplicateIgnored=1/gatePopups=0/invalidUplinks=0, watch runtime duration=71s, fall_detection_path latestEvent=314/false_alarm, SOS state, button policy, and historical HR/SpO2 evidence.

### 2026-06-16 15:02-15:20 FlyCare serial JSON corruption fix + runtime stability gate

- I.firmware.serial_json=updated `firmware/DataTransmitter.cpp/.h` so periodic status keeps the full MQTT/HTTP JSON but emits a compact status payload on `FLYCARE_UPLINK`; serial output is now built as one buffered line with a serial uplink mutex to reduce UART interleaving.
- I.bridge.json_recovery=updated `scripts/bridge_flycare_serial.ps1` to parse the first balanced JSON object from a `FLYCARE_UPLINK` line, log invalid uplink previews plus raw sidecar `.invalid` files, and preserve evidence when normal watch logs are appended after JSON.
- I.goal.audit.runtime=updated `scripts/audit_flycare_goal.ps1` with `watch_runtime_stability`; it checks task stack headroom plus the newest 60s+ bridge log for uplinks, invalid uplinks, and reset/panic/stack-overflow evidence.
- V.firmware.compile_upload=ok ESP32-S3 compile/upload to COM5 succeeded; final sketch 1542235/3145728 bytes, RAM 55184/327680 bytes, MAC `48:ca:43:a4:22:98`.
- V.serial.bridge_json=ok final 90s COM5 bridge log `logs/flycare-serial-bridge-20260616-151759.log` parsed/sent 15 uplinks with `invalidUplinks=0`, duplicate retained flight payload ignored twice, one initial Gate Change popup, and no crash evidence.
- V.goal.audit=pass `scripts/audit_flycare_goal.ps1` after final upload using active backend `http://127.0.0.1:8001`; `watch_runtime_stability` duration=90s/uplinks=15/invalidUplinks=0/crashes=0, and `display_runtime_stability` also passed.

### 2026-06-16 14:52-14:55 FlyCare display runtime audit hardening

- I.goal.audit.display=updated `scripts/audit_flycare_goal.ps1` with `display_runtime_stability`, which verifies retained-flight payload de-duplication source, accepted-only flight logging, NAV/map redraw throttling, and the newest serial bridge runtime log containing `[Flight] duplicate flight payload ignored`.
- D.goal.audit.display_docs=updated `docs/FLYCARE_MQTT.md` so future agents know display stability evidence comes from firmware source checks plus `logs/flycare-serial-bridge-*.log`; missing runtime evidence is a warning, source mismatch or crash evidence is a failure.
- V.serial.bridge.refresh=ok `bridge_flycare_serial.ps1 -SerialPort COM5 -DisableDownlink -Seconds 90` parsed/sent 14 status uplinks through MQTT/backend and captured 3 duplicate retained flight payloads ignored with no crash evidence in `logs/flycare-serial-bridge-20260616-145318.log`.
- V.goal.audit=pass `scripts/audit_flycare_goal.ps1` at 2026-06-16T14:54:57 using active backend `http://127.0.0.1:8001`; `watch_status_freshness` age=0.2min, positioning quality=medium/beacons=5, and `display_runtime_stability` duplicateIgnored=3/uplinks=14/crashes=0.

### 2026-06-16 14:24-14:34 FlyCare display flicker reduction + retained flight dedupe

- I.firmware.flight_dedupe=updated `firmware/FlightInfoManager.cpp/.h` to hash the last successfully parsed flight JSON and ignore identical retained payloads, so MQTT reconnects or serial fallback repeats do not reopen the same Gate Change popup.
- I.firmware.flight_log=updated `firmware/DataTransmitter.cpp` so `Flight info updated` is logged only when `FlightInfoManager::parseFlightInfo()` accepts a non-duplicate payload.
- I.firmware.nav_redraw=updated `firmware/SimpleDisplayManager.cpp` so the navigation/map page no longer does fixed periodic full-screen refreshes; it redraws from meaningful movement or explicit UI state changes.
- V.firmware.compile_upload=ok ESP32-S3 compile/upload to COM5 succeeded; final sketch 1538623/3145728 bytes, RAM 55176/327680 bytes, MAC `48:ca:43:a4:22:98`.
- V.flight.dedupe_runtime=ok 90s uplink-only COM5 bridge log `logs/flycare-serial-bridge-20260616-143124.log` captured one initial Gate Change popup, then a second identical retained `smartwatch/ESP32_48CA43A42298/flight` payload was ignored with `[Flight] duplicate flight payload ignored`; no reboot, panic, or stack overflow was observed and 13 uplinks were bridged.
- V.positioning_after_upload=ok latest status `_id=6a30ee08dde90a25b65b7fa8` is fresh with x=4.65, y=3.19, quality=medium, beacon_count=4, fall normal, SOS inactive.
- V.goal.audit=pass `scripts/audit_flycare_goal.ps1` at 2026-06-16T14:33:24 using active backend `http://127.0.0.1:8001`; local stack, freshness, positioning, flight update, popup UI, SOS state, button policy, and historical HR/SpO2 checks passed.

### 2026-06-16 14:08-14:21 FlyCare fall source parity + SIMFALL serial smoke

- I.firmware.fall_source=updated `firmware/Config.h` to keep fall detection enabled and align `IMPACT_THRESHOLD=1` with the ISS source logic from `D:\Download\SmartWatch_Project_S3R8_ISS_20260614163130`; deeper false-positive tuning is intentionally deferred.
- I.firmware.simfall=updated `firmware/firmware.ino` so `SIMFALL` shows the fall alert and uploads a confirmed fall payload through `DataTransmitter::transmitFallAlert()` instead of being display-only.
- I.firmware.fall_status=updated `firmware/DataTransmitter.cpp` so normal status/all-data telemetry reports fall as normal unless the fall state is confirmed; transient Freefall/Impact/Static states stay internal and do not leave `/flycare` in a false alert state.
- I.bridge.serial_command=updated `scripts/bridge_flycare_serial.ps1` with `-SerialCommand`, allowing one COM5 owner to send `SIMFALL` and bridge the resulting `FLYCARE_UPLINK` into MQTT/backend.
- V.firmware.compile_upload=ok ESP32-S3 compile/upload to COM5 succeeded; final sketch 1538471/3145728 bytes, RAM 55176/327680 bytes, MAC `48:ca:43:a4:22:98`.
- V.fall.status_normal=ok after final upload, 60s COM5 bridge captured status `_id=6a30ead0dde90a25b65b7f94` with x=6.18, y=4.18, quality=high, 6 beacons, and fall normal; post-SIMFALL latest status `_id=6a30eafddde90a25b65b7f9a` still reports fall normal.
- V.fall.simfall_path=ok final SIMFALL bridge log `logs/flycare-serial-bridge-20260616-141919.log` shows `smartwatch/ESP32_48CA43A42298/fall` published, `[FallDetection] SIMFALL alert displayed and uploaded`, and `[SERIAL_DOWNLINK] handled=1`; backend stored fall Mongo `_id=6a30eaf1dde90a25b65b7f97` and EventLog 312 for MySQL device 8, then it was marked resolved after verification.
- V.goal.audit=pass `scripts/audit_flycare_goal.ps1` at 2026-06-16T14:20:45 using active backend `http://127.0.0.1:8001`; local stack, freshness, positioning, flight update, popup UI, SOS state, button policy, and historical HR/SpO2 checks passed.

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
