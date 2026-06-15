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
