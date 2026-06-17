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

### 2026-06-17 23:02-23:21 FlyCare NG WAI LUN router MQTT migration attempt

- V.git.preflight=ok branch `Flycare`, HEAD `d5b5b6e`, working tree clean before migration edits.
- V.network.router=ok Server PC Wi-Fi IPv4 `192.168.1.232`, gateway `192.168.1.1`; `Test-NetConnection` passed for `github.com:443`, `192.168.1.232:1883`, `192.168.1.232:8001`, and `192.168.1.232:5173`.
- I.endpoint.router=updated `backend/backend/.env`, `frontend/.env.local`, and `firmware/Config.h` for router endpoint `192.168.1.232`; firmware now prioritizes SSID `flycare` with credentials stored only in firmware/local config, while keeping `MILLION`, `MILLION1`, and `Triple-None` as fallback SSIDs.
- D.router.docs=updated `docs/FLYCARE_MQTT.md` with final router LAN URLs and direct Wi-Fi vs COM5 fallback boundaries; docs/AGENTS intentionally do not include the Wi-Fi password value.
- B.backend.restart=blocked current shell could not stop elevated backend PID `11372` on `8001` (`Access is denied`), so live `http://127.0.0.1:8001/api/v1/data-reception/mqtt/status` still reports broker `192.168.0.203`, `mqttConnected=false`; hardware backend was not moved to `8000`.
- B.mosquitto.restart=blocked current shell could not stop elevated Mosquitto PID `20168` (`Access is denied`), but listener evidence still shows `0.0.0.0:1883` and PC-side `smartwatch/#` pub/sub self-test received a payload through `192.168.1.232:1883`.
- V.firmware.compile_upload=ok ESP32-S3 compile/upload to COM5 succeeded for NG WAI LUN main watch MAC `48:ca:43:a4:22:98`; sketch `1553911/3145728` bytes, RAM `55240/327680` bytes.
- V.direct_wifi.partial=blocked for PASS: COM5 serial bridge PID `30676` was stopped before direct MQTT testing. Raw serial diagnosis showed watch connected to SSID `flycare`, IP `192.168.1.59`, and attempted MQTT broker `192.168.1.232:1883`; one capture saw intermittent `[MQTT_PUB] ok=1`, but `mosquitto_sub` fresh-payload captures `logs/flycare-direct-mqtt-router-20260617-230651.log`, `logs/flycare-direct-mqtt-router-20260617-231100.log`, and `logs/flycare-direct-mqtt-router-exact-20260617-231726.log` all timed out with zero watch payloads. Direct Wi-Fi MQTT is not PASS.
- B.direct_wifi.cause=classified as not SSID and not firmware-old-IP: firmware/serial evidence shows `SSID=flycare` and broker `192.168.1.232`. Mosquitto is not localhost-only and PC-side broker self-test passes. Remaining likely causes are router/client path instability, Windows/elevated broker process behavior, or watch MQTT reconnect instability under this router.
- V.frontend.validation=pass `npm.cmd run build`, `npm.cmd run lint`, and `npm.cmd run test` passed; tests `62/62` passed with only existing Vite warnings.
- V.audit=fail `scripts/audit_flycare_goal.ps1 -BaseUrl http://127.0.0.1:8001` failed because live `8001` still reports old broker `192.168.0.203` and `mqttConnected=false`; direct Wi-Fi proof remains incomplete.
- N.next=rerun from an Administrator PowerShell or stop/restart the elevated `8001` and Mosquitto processes manually, then verify `8001` reports broker `192.168.1.232` with `mqttConnected=true`; after that repeat direct `mosquitto_sub` proof before Gate 11/SOS/SIMFALL smoke.

### 2026-06-17 17:25-19:02 FlyCare watch safe-area UI + flight status popup stability

- I.watch.safe_area=updated `firmware/SimpleDisplayManager.cpp` so map/flight WiFi and battery indicators are inset from the rounded black bezel, the flight page content is shifted down into the visible safe area, and the clock face no longer draws WiFi/battery icons over the 11/1 numerals.
- I.flight.state_machine=updated `firmware/FlightInfoManager.cpp` so accepted flight updates use normalized status values and show only one primary popup in priority order: cancelled, gate change, delayed, boarding, final call, then on-time recovery.
- I.flight.legacy_guard=updated `firmware/FlightInfoManager.cpp` to ignore stale CA1234/Air China/Beijing retained demo payloads when the active demo flight is CX910, unless a payload explicitly sets `force_flight_identity=true`.
- I.flight.audio_stability=kept Gate Change as popup plus vibration and removed executable flight update audio/TTS calls for Gate Change, Delay, Boarding, Cancellation, Final Call, On Time, and generic flight alerts; serial logs now record the skipped audio path.
- I.ble.runtime_guard=updated `firmware/BLELocation.cpp` and `firmware/firmware.ino` to guard null/oversized BLE scan results and avoid stopping the blocking scan immediately before copying results.
- D.firmware_notes=updated `firmware/README.md` to document the inset status icons, clock cleanup, single-primary-popup policy, and flight popup audio/TTS suppression.
- V.compile_upload=ok ESP32-S3 compile/upload to COM5 succeeded after the final fix; sketch 1553911/3145728 bytes, RAM 55240/327680 bytes, MAC `48:ca:43:a4:22:98`.
- V.flight_sequence=pass `logs/flycare-flight-sequence-20260617-185525.log` used backend `http://127.0.0.1:8001` to publish CX910 scheduled Gate 10, Gate Change to 11, cancelled, boarding, cancelled again, and delayed 15/idk; every API/Mongo step returned ok and latest flight stayed CX910/Gate 11.
- V.watch_popup_runtime=pass the same flight sequence log captured 5 serial flight downlinks, Gate Change/Cancelled/Boarding/Delay audio-skipped evidence, `invalid=0`, and `crash=0` with no `abort`, `Guru`, `Backtrace`, `panic`, or `rst:` markers.
- V.frontend=pass `npm.cmd run build`, `npm.cmd run lint`, and `npm.cmd run test` passed; tests were 62/62 with only the existing Vite CJS/dynamic-import warnings.
- V.audit=pass `scripts/audit_flycare_goal.ps1 -BaseUrl http://127.0.0.1:8001` at 2026-06-17T19:01 used latest live bridge `logs/flycare-serial-bridge-live-20260617-190006.log`; `watch_runtime_stability` duration=182.4s, uplinks=20, invalidUplinks=0, crashes=0, `positioning_arrival` quality=high/beacons=6, and overall=pass.
- R.remaining=final visual confirmation must still be done on the physical watch face after upload; router/direct-WiFi handoff remains separate from this COM5 serial fallback smoke, and `8000` remains healthy but not the final hardware backend because MQTT is disconnected there.

### 2026-06-17 17:10-17:14 FlyCare watch status icons bezel inset

- I.watch.status_inset=updated `firmware/SimpleDisplayManager.cpp` to move the compact WiFi/battery status capsules farther inside the active display area and lower from the top edge, avoiding the watch's black bezel/rounded-corner clipping.
- D.watch.ui=updated `firmware/README.md` to document that the compact status indicators are inset from the black bezel.
- V.compile=ok ESP32-S3 firmware compile passed; sketch `1549059/3145728` bytes and RAM `55224/327680`.
- V.upload=ok ESP32-S3 upload to COM5 succeeded for MAC `48:ca:43:a4:22:98`; upload wrote `1549200` bytes and hard-reset the watch.
- V.serial.runtime=ok bounded COM5 bridge `logs/flycare-serial-bridge-20260617-171234.log` ran 60s with `parsed=8`, `sent=8`, `downlinks=1`; no invalid uplink/crash marker appeared in the bridge output.
- V.audit=pass `scripts/audit_flycare_goal.ps1 -BaseUrl http://127.0.0.1:8001` passed overall after upload; persistent COM5 fallback was restarted with live log `logs/flycare-serial-bridge-live-20260617-171402.log`.
- R.remaining=physical screen visibility must still be confirmed by looking at the watch because the repo cannot capture the display pixels directly.

### 2026-06-17 17:00-17:04 FlyCare compact watch status icons

- I.watch.status_icons=updated `firmware/SimpleDisplayManager.cpp` so the watch draws a compact WiFi indicator in the top-left corner and a compact battery indicator in the top-right corner instead of the previous large status bar with time text.
- I.watch.pages=enabled the compact status overlay on the clock/home page and navigation/map page; the flight page keeps using `drawStatusBar()` with the new compact layout.
- D.watch.ui=updated `firmware/README.md` to document that clock, map, and flight pages use compact top-corner WiFi/battery indicators.
- V.compile=ok ESP32-S3 firmware compile passed; sketch `1549059/3145728` bytes and RAM `55224/327680`.
- V.upload=ok ESP32-S3 upload to COM5 succeeded for MAC `48:ca:43:a4:22:98`; upload wrote `1549200` bytes and hard-reset the watch.
- V.serial.runtime=ok bounded COM5 bridge `logs/flycare-serial-bridge-20260617-170223.log` ran 60s with `parsed=11`, `sent=11`, `downlinks=1`; no invalid uplink/crash marker was reported in the bridge output.
- V.audit=pass `scripts/audit_flycare_goal.ps1 -BaseUrl http://127.0.0.1:8001` passed overall after upload; persistent COM5 fallback was restarted with live log `logs/flycare-serial-bridge-live-20260617-170358.log`.
- R.remaining=visual sizing still needs physical watch-screen confirmation because the repo cannot capture the device display pixels directly.

### 2026-06-17 16:28-16:43 FlyCare passenger rail count stability

- B.flycare.user_count_flicker=read-only API sampling against `http://127.0.0.1:8001/api/v1` showed `/devices/2..9` stable at 8 tracked devices, `/flycare-admin/presets` stable at 8, and `/residents/?limit=500` stable at 12; the observed `Total users` flicker was therefore not caused by DB rows changing or Admin preset count changing.
- I.flycare.registry_stability=updated `frontend/src/adapters/position-command-center.ts` with `stabilizePositionResidentRegistry()` so a partial registry refresh is merged back onto the 8-entry FlyCare tracked registry instead of shrinking the passenger rail to the subset of successful API calls.
- I.flycare.refresh_race=updated `frontend/src/pages/FlyCarePage.tsx` with an in-flight snapshot guard and request sequence check, preventing overlapping 2s polling requests from letting an older/partial refresh overwrite a newer complete passenger snapshot.
- V.api.sample=ok 15 consecutive backend samples returned `deviceCount=8`, user bindings `6,4,8,10,13,14,15,16`, `residentCount=12`, and `presetCount=8` with no request errors.
- V.frontend.tests=ok `npm.cmd run test -- src/adapters/position-command-center.test.ts` passed 28/28, full `npm.cmd run test` passed 62/62, `npm.cmd run lint` passed, and `npm.cmd run build` passed with the existing Vite dynamic-import chunk warning only.
- V.browser.flycare=ok in-app browser at `http://192.168.0.203:5173/flycare` was reloaded and sampled for 10 refresh cycles; after initial loading, Passenger Rail stayed at `Total8`, `itemCount=8`, and did not flicker to 2. `Online1` reflected current freshness state, not total registry count.

### 2026-06-17 15:45-16:12 FlyCare Gate 11 arrival popup immediate trigger

- B.arrival.not_immediate=latest evidence showed the watch had Gate 11 flight target armed, but the direct flight-arrival threshold was still hard-coded at `0.6m`; with BLE-derived positioning this was too strict for the physical gate area, and a newly armed flight target only rechecked arrival on the next position update.
- I.arrival.radius=added `FLIGHT_ARRIVAL_RADIUS_METERS=2.4f` in `firmware/Config.h` and changed `SimpleDisplayManager::setCurrentPosition()` to use that tolerance for direct flight arrival, keeping it below adjacent FlyCare zone spacing.
- I.arrival.immediate_check=added `SimpleDisplayManager::checkArrivalAtCurrentPosition()` and called it from `FlightInfoManager` immediately after arming a Gate 10/Gate 11 flight target; `setTargetGate()` itself remains target-only so debug route commands do not double-trigger.
- D.arrival.docs=updated `firmware/README.md` and `docs/FLYCARE_MQTT.md` to document the configurable arrival radius and immediate target-arm check.
- V.compile_upload=ok ESP32-S3 compile/upload to COM5 succeeded for MAC `48:ca:43:a4:22:98`; final sketch used `1550947/3145728` bytes and RAM `55224/327680`, upload wrote `1551088` bytes and hard-reset the watch.
- V.arrival.test=ok direct COM5 capture `logs/flycare-arrival-test-20260617-160650.log` sent `TESTARRIVAL Gate11` after a 10s post-open delay and showed `[NAV] arrival popup shown: You've arrived at Gate 11`, `[NAV] arrival route cleared: Gate 11`, followed by status payloads with `target.active=false`.
- V.serial.runtime=ok final bounded bridge `logs/flycare-serial-bridge-20260617-160953.log` ran 90s with `parsed=13`, `sent=13`, `downlinks=1`, duplicate retained flight payloads ignored, `invalidUplinks=0`, and `crashes=0`; the prior `logs/flycare-serial-bridge-20260617-160807.log` had one invalid uplink framing and was treated as one-off after the clean rerun.
- V.audit=pass `scripts/audit_flycare_goal.ps1 -BaseUrl http://127.0.0.1:8001` at 2026-06-17T16:11:43; `watch_runtime_stability` passed with `invalidUplinks=0` and `crashes=0`, `positioning_arrival` passed with `arrivalEvidence=True`, and `flight_information_update` passed at Gate 11.
- R.remaining=physical live arrival timing still depends on beacon placement/RSSI and current BLE-derived coordinates; if arrival fires early or late in the real gate area, tune beacon coordinates/RSSI references before changing the 2.4m threshold.

### 2026-06-17 14:11-14:39 FlyCare Gate 10->11 popup proof + BLE status smoothing

- B.gate11.no_popup=latest API evidence before retest showed flight had been overwritten back to Gate 10 / `gate_changed=false`; live serial log also showed Gate 11 had previously reached the watch, so the visible miss was caused by state overwrite or an already-Gate-11 duplicate, not a missing `FlightInfoManager` gate-change path.
- I.ble.smoothing=updated `firmware/BLELocation.cpp/.h` to actually apply the existing `PositionSmoother`, preserve raw coordinates, clamp implausible per-location BLE jumps, and report speed/heading from the stabilized point.
- I.status.report_smoothing=updated `firmware/DataTransmitter.cpp/.h` so status JSON sent to MQTT/serial is clamped against the last reported position; this prevents `/flycare` and Mongo from seeing multi-scan accumulated BLE jumps as one large dashboard jump.
- V.compile_upload=ok ESP32-S3 compile/upload to COM5 succeeded after the final smoothing patch; sketch `1550883/3145728` bytes, RAM `55224/327680`, upload wrote `1551024` bytes, MAC `48:ca:43:a4:22:98`.
- V.location.smoothing=partial-pass bounded bridge `logs/flycare-serial-bridge-20260617-142827.log` ran 150s with `parsed=24`, `sent=24`, `downlinks=1`; after the expected post-upload startup `0,0 -> first BLE fix` jump, status steps were capped around `1.6m` or below instead of the earlier 3-7m jumps.
- V.gate10.baseline=ok Admin publish to Gate 10 returned MQTT/Mongo ok and `logs/flycare-serial-bridge-20260617-143247.log` showed `[SERIAL_DOWNLINK] handled=1` plus `Gate Change - 10`.
- V.gate11.popup=ok Admin publish to Gate 11 returned MQTT/Mongo ok and `logs/flycare-serial-bridge-20260617-143334.log` showed `Gate Change to 11`, `Gate Change - 11`, `delay popup suppressed for gate change notice`, and `[SERIAL_DOWNLINK] handled=1`.
- V.retained.flight=ok after final correction, `mosquitto_sub` showed both retained topics `smartwatch/ESP32_000048CA43A42298/flight` and `smartwatch/ESP32_48CA43A42298/flight` contain the same `Gate Change to 11` payload.
- V.stack.live=ok persistent COM5 fallback restarted with live log `logs/flycare-serial-bridge-live-20260617-143818.log`; active backend remains `http://127.0.0.1:8001`, MQTT connected to `192.168.0.203:1883`, and latest status refreshed for device 8 with high quality / 5 beacons.
- V.audit=warn not fail: `scripts/audit_flycare_goal.ps1 -BaseUrl http://127.0.0.1:8001` had `watch_runtime_stability` pass with `invalidUplinks=0`, `crashes=0`, and `flight_information_update` pass at Gate 11; remaining warnings were latest beacon count/quality and a short latest display-runtime duplicate-evidence window.
- R.remaining=Triple-None direct Wi-Fi MQTT is still not the primary proof path; COM5 serial bridge fallback must remain running for this network, and physical placement/RSSI can still affect absolute beacon accuracy even though large dashboard jumps are now damped.

### 2026-06-17 13:04-13:43 FlyCare Gate 11 popup + DB residue audit + Triple-None router simulation

- V.git=ok preflight branch `Flycare`, HEAD `ec66181e7b9018d80522ad077d8f2dc7fbaac872`, working tree clean before edits except repeated Git warnings that `C:\Users\user/.config/git/ignore` was permission-denied.
- V.stack=ok `logs/flycare-local-stack-status.json` selected active backend `http://127.0.0.1:8001`; `8001` health passed and MQTT connected to `192.168.0.203:1883`, while `8000` health passed but `mqttConnected=false`; `0.0.0.0:1883`, `0.0.0.0:8001`, and `0.0.0.0:5173` were listening.
- I.gate11.fix=updated `firmware/FlightInfoManager.cpp` so a Gate Change notification fires when `gate_changed=true` and the normalized gate label changes, not only when the boolean flips from false to true. This preserves retained-payload dedupe and keeps Gate Change audio/TTS skipped.
- V.gate11.publish=ok Admin API `POST /api/v1/flycare-admin/flight/publish` on `8001` for `Gate Change to 11` returned `status=ok`, MQTT `ok=true`, alias topics `smartwatch/ESP32_000048CA43A42298/flight` and `smartwatch/ESP32_48CA43A42298/flight` `ok=true`, and Mongo inserted `_id=6a32316edde90a25b65b8def`; latest flight API returned gate `11`, `delay_reason=Gate Change to 11`, and `gate_changed=true`.
- V.gate11.web_popup=pass browser `http://192.168.0.203:5173/flycare` first loaded Gate 10 with drawer closed, then after Gate 11 publish showed the existing Flight update drawer once with Gate `11` and `21 min - Gate Change to 11`; reload later showed Gate 11 in the panel with drawer closed, no repeated popup loop, no stale Gate 10, no fall/SOS stale modal, and no console errors.
- V.gate11.watch_popup=pass ESP32-S3 compile/upload to COM5 succeeded for MAC `48:ca:43:a4:22:98`; bounded bridge `logs/flycare-serial-bridge-20260617-133206.log` delivered Gate 10 baseline then Gate 11, showed `[SERIAL_DOWNLINK] handled=1`, `Gate Change - 11`, `[Flight] gate change audio skipped for display stability`, delay popup suppression, `invalidUplinks=0`, and `crashes=0`.
- V.db.audit=partial `backend/backend/config/device_id_map.json` and `docs/FLYCARE_MQTT.md` have no external ID mapped to multiple MySQL devices; aliases for devices 3, 8, and 9 map to the same passenger and Admin presets hide aliases. Read-only API/MySQL evidence still shows residue: Admin presets list 8 canonical FlyCare rows, MySQL has 11 devices and 12 elderly users including `CHAN TAI MAN`, `LEE MEI LING`, `insert-test-01`, and `edit-test-01`.
- P.db.cleanup=done-for-alerts only: 40 stale unhandled SOS/fall demo events from 2026-06-15 were marked `false_alarm` through `PUT /api/v1/events/{event_id}/handle` with remark `final demo stale-event cleanup 2026-06-17`; no raw deletes were used. Remaining passenger/device scope cleanup needs a separate idempotent migration decision because the current data model still contains more than the requested 6 physical-watch rows.
- V.triple_none.direct_mqtt=blocked direct proof ran with no COM5 bridge: `mosquitto_sub` on `smartwatch/ESP32_48CA43A42298/status` for 90s and `smartwatch/+/status` for 60s timed out, Mongo latest status stayed at the earlier serial fallback timestamp, and `netstat` showed Mosquitto listening on `0.0.0.0:1883` but no external watch TCP session. Endpoint alignment was correct in backend `.env`, firmware `Config.h`, docs, and stack status, so likely blockers are Triple-None client isolation or the watch not reaching the PC broker directly.
- V.serial.fallback=pass after the direct MQTT block, bounded COM5 fallback `logs/flycare-serial-bridge-20260617-133935.log` ran 90s with parsed/sent `13/13`, `downlinks=1`, `invalidUplinks=0`, `crashes=0`, and Mongo latest status refreshed to `_id=6a32336edde90a25b65b8e04`; persistent fallback was restarted afterward with live log `logs/flycare-serial-bridge-live-20260617-134239.log`.
- V.validation=pass firmware compile/upload passed; frontend `npm.cmd run build`, `npm.cmd run lint`, and `npm.cmd run test` passed (`61/61` tests, existing Vite dynamic-import warning only); `scripts/audit_flycare_goal.ps1 -BaseUrl http://127.0.0.1:8001` passed overall.
- D.router.handoff=keep router on 2.4GHz with Guest/AP/client isolation off, reserve Server PC at `192.168.0.203` if possible, and keep `192.168.0.203:1883` / `:8001` / `:5173`; if the router changes the PC IP, rerun `scripts/set_flycare_mqtt_endpoint.ps1 -Mode OfflineLan` and re-upload firmware.
- R.remaining=direct Wi-Fi MQTT remains blocked on current Triple-None evidence, final passenger/device scope still has more than 6 visible data rows unless a migration is approved, PWR physical visual retest and six-watch simultaneous smoke are still not freshly completed, and `8000` is still not the final hardware backend while `mqttConnected=false`.

### 2026-06-17 12:39-12:46 FlyCare final smoke invalid uplink closeout

- B.invalid_uplink.previous=treated the prior `invalidUplinks=1` as a one-off UART/status-line corruption after a clean bounded rerun; no firmware, frontend, backend contract, route, env, or schema changes were made.
- V.bridge.bounded_clean=ok after stopping the stale persistent COM5 owner, `bridge_flycare_serial.ps1 -SerialPort COM5 -Seconds 90` wrote `logs/flycare-serial-bridge-20260617-123920.log` with 91.0s runtime, 13 uplinks, `invalidUplinks=0`, `crashes=0`, `downlinks=1`, and duplicate retained flight payloads ignored.
- V.audit.clean=pass `scripts/audit_flycare_goal.ps1 -BaseUrl http://127.0.0.1:8001` at 2026-06-17T12:41:02; freshness age=0.2min, positioning high/6 beacons, flight serial sync, display/watch runtime crashes=0, and fall path latestEvent=319/false_alarm.
- V.flight.min_smoke=ok Admin Gate Change publish on `http://127.0.0.1:8001` returned `status=ok`, MQTT alias topics `ok=true`, Mongo inserted `_id=6a322585dde90a25b65b8d6d`; COM5 capture `logs/flycare-serial-bridge-20260617-124147.log` showed `[SERIAL_DOWNLINK] handled=1`, duplicate flight payload ignored, 5 status uplinks, and no invalid/crash output.
- V.sos.min_smoke=ok COM5 `SOSON` / `SOSOFF` through the serial bridge published `smartwatch/ESP32_48CA43A42298/sos`; EventLog `320` for device 8 was created and handled as `false_alarm`, with latest SOS state inactive.
- V.fall.min_smoke=ok COM5 `SIMFALL` through `logs/flycare-serial-bridge-20260617-124405.log` published two fall payloads, showed `[FallDetection] SIMFALL alert displayed and uploaded`, and EventLog `321` for device 8 was handled as `false_alarm`.
- V.audit.final=pass `scripts/audit_flycare_goal.ps1 -BaseUrl http://127.0.0.1:8001` at 2026-06-17T12:45:30; watch runtime duration=60.0s, uplinks=8, `invalidUplinks=0`, `crashes=0`, latest log `logs/flycare-serial-bridge-20260617-124405.log`, fall latestEvent=321/false_alarm, SOS inactive, and button policy passed.

### 2026-06-17 02:05-03:10 FlyCare final freeze Gate Change reboot closeout

- B.gate_audio_abort=confirmed the repeated Gate Change vibration/black-screen loop was a watch reboot path, not a dashboard retry loop: serial evidence showed `abort()` / `RTC_SW_CPU_RST`, and `addr2line` mapped the backtrace to `AudioManager::fileExists()` from `audioTask` during the SD_MMC alert-file lookup.
- I.flight.downlink_dedupe=updated `firmware/DataTransmitter.cpp`, `firmware/FlightInfoManager.cpp`, and `firmware/firmware.ino` so serial flight downlinks enter the same semantic de-duplication path as MQTT; identical retained/alias payloads are ignored, while same-gate updates with changed estimated time or delay still refresh the flight state without reopening the Gate Change popup.
- I.flight.gate_audio=updated Gate Change handling to keep the large simplified popup plus vibration and suppress the long delay popup, but intentionally skip Gate Change audio/TTS to avoid the SD_MMC alert lookup path that triggered the final-demo reboot loop.
- I.bridge.crash_evidence=updated `scripts/bridge_flycare_serial.ps1` so live COM5 bridge logs retain reset, panic, abort, stack, overflow, and backtrace markers for audit/runtime stability checks.
- D.backend.final_demo=use `http://127.0.0.1:8001` / `http://192.168.0.203:8001` for final hardware smoke because `logs/flycare-local-stack-status.json` shows `8000` healthy but MQTT-disabled (`mqttConnected=false`) while `8001` is healthy and MQTT-connected to `192.168.0.203:1883`.
- V.compile_upload=ok clean ESP32-S3 build/upload to COM5 succeeded for MAC `48:ca:43:a4:22:98`; final sketch used `1550027/3145728` bytes, RAM `55240/327680`, upload wrote `1550176` bytes, and hard-reset the watch.
- V.flight.runtime=ok live bridge `logs/flycare-serial-bridge-live-20260617-025903.log` showed the retained Gate Change downlink handled once with Gate Change audio skipped, alias duplicate payloads ignored, and a later same-gate 17:56 / 21-minute update parsed without reopening the Gate Change popup; no reset/panic/abort markers were observed in the audited runtime window.
- V.fall.final=ok final-binary `SIMFALL` through `bridge_flycare_serial.ps1 -SerialCommand SIMFALL` created EventLog `319` for device `8`, then it was handled as `false_alarm`; latest status returned fall normal.
- V.dashboard.final=ok browser `http://192.168.0.203:5173/flycare` shows NG WAI LUN Online/Live, Customer Services, CX910, estimated departure `17:56`, and `21 min - Gate Change to 10`, with no console errors.
- V.bridge.final_clean=ok restarted the persistent COM5 bridge to isolate a previous one-off UART character drop; newest live log `logs/flycare-serial-bridge-live-20260617-031233.log` ran 102.2s with 12 uplinks, `invalidUplinks=0`, `crashes=0`, and duplicate retained flight payload ignored.
- V.goal.audit=pass `scripts/audit_flycare_goal.ps1` at 2026-06-17T03:14:20 using active backend `http://127.0.0.1:8001`; freshness age=0.1min, positioning medium/4 beacons, flight serial sync, display/watch runtime crashes=0, fall path latestEvent=319/false_alarm, SOS inactive, and PWR/SOS source policy passed.

### 2026-06-17 01:05-01:20 FlyCare final freeze PWR wake fix upload

- I.pwr.short_toggle=updated `firmware/firmware.ino` so PWR short press toggles the screen off/on; user manually confirmed the pre-fix short press could turn the screen off, and hardware retest after this wake fix was skipped per user direction.
- I.audit.pwr=updated `scripts/audit_flycare_goal.ps1` so `button_policy_navigation_disabled` requires both PWR short-press sleep and wake evidence in the active `buttonTask`; docs were aligned in `firmware/README.md` and `docs/FLYCARE_MQTT.md`.
- V.compile_upload=ok ESP32-S3 compile passed (`1547115/3145728` bytes, RAM `55200/327680`), then upload to COM5 succeeded for MAC `48:ca:43:a4:22:98`; upload wrote `1547264` bytes and hard-reset the watch.
- V.stack.bridge=ok restarted the local stack serial bridge after upload with `start_flycare_local_stack.ps1 -NoPause -RestartSerialBridge -SerialPort COM5`; active backend remains `http://127.0.0.1:8001`, MQTT is connected to `192.168.0.203:1883`, and live log is `logs/flycare-serial-bridge-live-20260617-011354.log`.
- V.goal.audit=warn but no hard failures: `scripts/audit_flycare_goal.ps1` exited `0`; freshness passed, positioning passed (`quality=medium`, `beaconCount=4`, `arrivalEvidence=True`), flight update passed (`Gate 10`, serial sync true), watch runtime passed (`uplinks=38`, `invalidUplinks=0`, `crashes=0`), and PWR/SOS button policy passed.
- P.display.runtime=partial latest audit still warns because retained flight payloads produced `gatePopups=3`, `duplicateIgnored=0`, `uplinks=38`, `crashes=0`; data flow is live, but repeated Gate Change notification remains a final-demo UI risk.
- V.browser.flycare=ok in-app browser at `http://192.168.0.203:5173/flycare` shows NG WAI LUN Online/Live, Customer Services, CX910, Gate 10, `Gate Change to 10`, no loading state, no fall/SOS modal, and no console errors.

### 2026-06-17 00:55-00:59 FlyCare final freeze PWR polarity audit

- V.git.pwr_audit=ok branch `Flycare`, HEAD `599c641401b3c59fe43913962a72de960b81ee3f`, `origin/Flycare...HEAD=0/0`; only the six pre-existing untracked `00_`-`06_FlyCare_*.md` audit docs were present before this note.
- B.pwr.runtime=blocked live bridge `logs/flycare-serial-bridge-live-20260616-234509.log` was still receiving uplinks at 2026-06-17 00:55:35 but still had no `[Button] PWR...`, `screen off`, or `screen on` evidence.
- B.pwr.source_ambiguity=found `firmware/pin_config.h` documents `PWR_BUTTON_PIN 45` as high-active and `firmware/ButtonManager.h` checks PWR press on `HIGH`, while the active `firmware/firmware.ino` `buttonTask` checks PWR press on `LOW`; the downloaded ISS source has the same mixed history, so changing polarity without hardware sampling is risky.
- N.pwr.next=do not mark final demo complete until a human observes PWR short-press screen-off and long-press screen toggle, or a bounded serial/pin diagnostic proves the physical PWR edge on this watch. Direct firmware polarity changes are deferred during final freeze unless explicitly accepted as a bug fix and re-uploaded to COM5.

### 2026-06-17 00:50-00:52 FlyCare final freeze PWR blocker recheck

- V.git.recheck=ok branch `Flycare`, HEAD `8c3016c87a620b95ad78f5919d707c97023685ab`, `origin/Flycare...HEAD=0/0`; only the six pre-existing untracked `00_`-`06_FlyCare_*.md` audit docs were present before this note.
- V.audit.recheck=warn `scripts/audit_flycare_goal.ps1` at 2026-06-17T00:50:52 using active backend `http://127.0.0.1:8001`; freshness age=0.0min, positioning high/5 beacons, flight serial sync, SOS inactive, physical `ButtonLong` evidence pass, fall path pass, but `display_runtime_stability` still warns with `gatePopups=3`, `duplicateIgnored=2`, `uplinks=533`, `crashes=0`.
- V.pwr.source=ok active `firmware/firmware.ino` `buttonTask` maps SOS short press to page switch, SOS long press to `toggleSOSAlert("ButtonLong")`, PWR short press to `display->sleepScreen()`, and PWR long press to screen off/on toggle; audit `button_policy_navigation_disabled` passes and confirms no destination picker in the active button task.
- P.pwr.runtime=partial live bridge `logs/flycare-serial-bridge-live-20260616-234509.log` was still receiving status uplinks at 2026-06-17 00:50:50 and still had no `PWR`/screen-off serial evidence; physical screen-off remains a human visual confirmation gap.
- D.docs.final_freeze=updated `docs/FLYCARE_MQTT.md` troubleshooting notes to remove stale destination-picker/PWR guidance and align the runbook with final freeze behavior: PWR short press screen-off, PWR long press screen toggle, and no SOS/PWR route selection.

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
