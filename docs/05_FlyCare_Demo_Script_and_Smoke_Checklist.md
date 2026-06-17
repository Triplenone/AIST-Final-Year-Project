# FlyCare Demo Script And Smoke Checklist

Snapshot generated: 2026-06-17 11:52 +08:00

This checklist is for FlyCare demo readiness on the FlyCare branch and `/flycare` route. It is not a production runbook.

## Demo Claim Boundaries

Say:

- The frontend monitors FlyCare passenger state through backend REST APIs.
- The backend ingests MQTT or serial-bridge payloads into Mongo/MySQL-backed views.
- Admin flight publish sends a backend request; the backend publishes MQTT and/or saves Mongo.
- The software-only local smoke baseline uses MQTT broker `127.0.0.1:1883`.
- Latest real-watch hardware smoke used PC LAN broker `192.168.0.203:1883` because the watch needed LAN reachability.

Do not say:

- Production-ready.
- Aviation-grade reliability.
- Frontend directly controls hardware.
- WebSocket/SSE, push notification, offline mode, Playwright/E2E, or production RBAC.
- Public MQTT is the local final smoke baseline.

## Current Final-Demo Evidence

Latest evidence from this repo:

- Goal audit: `E:\flycare\logs\flycare-goal-audit.md`
  - Timestamp: `2026-06-17T03:14:20`
  - Overall: `pass`
  - Base URL: `http://127.0.0.1:8001`
- Local stack: `E:\flycare\logs\flycare-local-stack-status.json`
  - Timestamp: `2026-06-17T03:12:45`
  - Active backend: `http://127.0.0.1:8001`
  - MQTT: connected to `192.168.0.203:1883`
  - Serial bridge: running on `COM5`
  - Note: `8000` was healthy but MQTT-disabled.
- Runtime bridge: `E:\flycare\logs\flycare-serial-bridge-live-20260617-031233.log`
  - Audited runtime: 102.2 seconds
  - Uplinks: 12
  - Invalid uplinks: 0
  - Crash markers: 0
- Fall smoke: `E:\flycare\logs\flycare-serial-bridge-simfall-final-20260617-030333.log`
  - `SIMFALL` created EventLog `319`
  - Event was handled as `false_alarm`
  - Latest status returned fall normal
- Browser evidence from `AGENTS.md`:
  - `http://192.168.0.203:5173/flycare`
  - NG WAI LUN shown Online/Live at Customer Services
  - CX910 shown with estimated departure `17:56`
  - Flight summary showed `21 min - Gate Change to 10`
  - No console errors were reported in that check

## Baseline Topology

Software-only smoke baseline:

- Frontend: `http://127.0.0.1:5173/flycare`
- Backend: `http://127.0.0.1:8000` or documented recovery backend `http://127.0.0.1:8001`
- MQTT broker: `127.0.0.1:1883`
- Mongo/MySQL: local demo databases

Current real-watch hardware topology from latest evidence:

- Frontend: `http://192.168.0.203:5173/flycare`
- Backend: `http://127.0.0.1:8001` locally and `http://192.168.0.203:8001` for LAN access
- MQTT broker: `192.168.0.203:1883`
- Serial bridge: `COM5`

Hardware demo notes:

- If watch and PC are on the same non-isolated LAN, broker host may need to be the PC LAN IP.
- If watch-to-PC TCP is blocked by hotspot isolation, use the USB serial bridge fallback.
- LAN IP evidence such as `192.168.0.203:1883` is local topology evidence, not the software-only smoke baseline and not a production transport claim.

## Preflight

1. Confirm branch and commit.

```powershell
cd E:\flycare
git branch --show-current
git rev-parse --short HEAD
git status --short --untracked-files=all
```

Expected:

- Branch is `Flycare`.
- Status has no unexpected application-code changes.

2. Confirm frontend scripts.

```powershell
cd E:\flycare\frontend
npm run build
npm run lint
npm run test
```

Expected:

- Build passes.
- Lint result is recorded exactly, pass or fail.
- Tests pass.

3. Confirm local backend health.

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

If `8000` is stale or MQTT-disabled, use the active backend recorded by:

```powershell
Get-Content E:\flycare\logs\flycare-local-stack-status.json
```

## Start Or Verify Local Stack

Preferred launcher:

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start_flycare_local_stack.ps1 -Elevate
```

If ports need recovery:

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start_flycare_local_stack.ps1 -Elevate -RestartMqtt -RestartApps
```

Expected stack evidence:

- `logs\flycare-local-stack-status.json` exists.
- `/health` is healthy on the active backend.
- MQTT status is `connected=true`.
- MQTT broker for software-only local smoke is `127.0.0.1:1883`, unless this is the real-watch LAN topology recorded above.

## Open `/flycare`

Frontend dev:

```powershell
cd E:\flycare\frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Browser target:

```text
http://127.0.0.1:5173/flycare
```

Expected UI:

- FlyCare route loads.
- Passenger rail renders.
- Airport map image renders.
- Selected passenger renders on map when current coordinates are available.
- Flight panel renders.
- Decision/activity panel renders.
- No claim is made that the frontend directly controls the watch.

## Flight Update Smoke

Frontend path:

1. Open Admin.
2. Select the FlyCare tab.
3. Pick a mapped device preset, preferably NG WAI LUN / device 8.
4. Set a bounded demo flight update:
   - Flight: `CX910`
   - Airline: `Cathay Pacific`
   - Destination: `Singapore`
   - Gate: `10`
   - Status: `delayed`
   - Delay reason: `Gate Change to 10`
   - `gate_changed=true`
5. Use `MQTT + save Mongo`.

Backend API path:

```powershell
$body = @{
  device_id = "ESP32_000048CA43A42298"
  mysql_device_id = 8
  passengerName = "NG WAI LUN"
  flightNumber = "CX910"
  airline = "Cathay Pacific"
  departureAirport = "HKG"
  destination = "Singapore"
  seatNumber = "21C"
  scheduled_departure = "17:35"
  estimated_departure = "17:56"
  boarding_time = "17:05"
  boarding_gate = "10"
  status = "delayed"
  delay_minutes = 21
  delay_reason = "Gate Change to 10"
  gate_changed = $true
  terminal = "T1"
  checkin_counter = "C12-C18"
  publish_mqtt = $true
  save_mongo = $true
} | ConvertTo-Json -Depth 8
Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/v1/flycare-admin/flight/publish" -Method Post -Body $body -ContentType "application/json"
```

Expected evidence:

- Response `status=ok`.
- `mqtt.ok=true` or documented MQTT failure with `mongo.ok=true` only as UI fallback.
- `mqtt.alias_results` proves the backend attempted per-alias downlinks.
- `mongo.inserted_id` exists when `save_mongo=true`.
- `/flycare` flight panel updates after polling.
- If hardware/serial bridge is in scope, watch serial log shows `[SERIAL_DOWNLINK] handled=1`.

Final-freeze note:

- Gate Change audio/TTS is intentionally skipped in the current firmware path because the final demo reboot loop was traced to `AudioManager::fileExists()` during SD_MMC alert-file lookup. The demo-safe behavior is large Gate Change popup plus vibration.

## Latest Flight API Check

```powershell
Invoke-RestMethod "http://127.0.0.1:8001/api/v1/mongo-upstream/flight/latest?device_id=ESP32_000048CA43A42298"
```

Expected:

- `found=true`
- `flight_info.flight_number=CX910`
- `flight_info.boarding_gate=10`
- Rich nested `flight_info` fields are present or legacy flat fields are present.

## Positioning Smoke

```powershell
Invoke-RestMethod "http://127.0.0.1:8001/api/v1/mongo-upstream/location/latest?device_id=ESP32_000048CA43A42298"
```

Expected:

- `found=true`
- `x` and `y` are numeric.
- `server_received_at` is recent enough for the demo freshness threshold.
- `/flycare` map pin reflects the selected passenger if the route has current coordinates.

## SOS Smoke

MQTT payload path, using stdin to preserve JSON quoting in PowerShell:

```powershell
$payload = @{
  device_id = "ESP32_48CA43A42298"
  data_type = "sos"
  sos = @{
    active = $true
    trigger_method = "SmokeTest"
  }
} | ConvertTo-Json -Depth 8 -Compress
$payload | & "C:\Program Files\Mosquitto\mosquitto_pub.exe" -h 127.0.0.1 -p 1883 -q 1 -t "smartwatch/ESP32_48CA43A42298/sos" -s
```

Expected:

- Backend MQTT subscriber writes Mongo upstream data.
- MySQL EventLog contains an SOS event for the mapped device/user when bridge logic creates it.
- `/flycare` marker flashes only while fresh Mongo SOS or unhandled linked event is active.
- Resolve or mark false alarm after verification.

Clear payload:

```powershell
$payload = @{
  device_id = "ESP32_48CA43A42298"
  data_type = "sos"
  sos = @{
    active = $false
    trigger_method = "SmokeTestClear"
  }
} | ConvertTo-Json -Depth 8 -Compress
$payload | & "C:\Program Files\Mosquitto\mosquitto_pub.exe" -h 127.0.0.1 -p 1883 -q 1 -t "smartwatch/ESP32_48CA43A42298/sos" -s
```

## Fall Smoke

Preferred software path when watch is connected over USB:

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bridge_flycare_serial.ps1 -SerialPort COM5 -SerialCommand SIMFALL -Seconds 30
```

Expected:

- Bridge log shows `SIMFALL`.
- Bridge publishes `smartwatch/ESP32_48CA43A42298/fall`.
- Watch logs SIMFALL alert display/upload.
- Backend stores fall Mongo/EventLog evidence.
- After verification, event is resolved or marked false alarm.

MQTT-only fallback:

```powershell
$payload = @{
  device_id = "ESP32_48CA43A42298"
  data_type = "fall"
  fall_detection = @{
    state_description = "Confirmed Fall"
    is_fall_confirmed = $true
  }
} | ConvertTo-Json -Depth 8 -Compress
$payload | & "C:\Program Files\Mosquitto\mosquitto_pub.exe" -h 127.0.0.1 -p 1883 -q 1 -t "smartwatch/ESP32_48CA43A42298/fall" -s
```

## Serial Bridge Fallback

Use only when local network topology blocks direct watch MQTT:

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bridge_flycare_serial.ps1 -SerialPort COM5 -Seconds 60
```

Expected:

- Reads `FLYCARE_UPLINK <topic> <json>` lines from watch serial.
- Republishes to local MQTT by default.
- Polls retained `smartwatch/+/flight` downlinks and writes `FLYCARE_DOWNLINK <topic> <json>` to the watch unless disabled.
- Produces a timestamped `logs\flycare-serial-bridge-*.log`.

Boundary:

- Serial bridge is a demo fallback. Do not present it as aviation-grade or production architecture.

## Goal Audit

After stack and smoke checks:

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit_flycare_goal.ps1
```

Expected:

- Writes `logs\flycare-goal-audit.json`.
- Writes `logs\flycare-goal-audit.md`.
- Exit code `0` for pass.
- Exit code `2` means no hard software failure but a physical verifier condition remains blocked.

Latest observed log:

- `E:\flycare\logs\flycare-goal-audit.md`
- Timestamp: `2026-06-17T03:14:20`
- Overall: `pass`
- Base URL: `http://127.0.0.1:8001`

## Demo Closeout

Before ending a demo:

- Clear active SOS/fall payloads.
- Resolve or mark false alarm for smoke-created events.
- Capture the latest audit markdown/json.
- Save bridge logs if hardware was used.
- Keep claim language local-demo scoped.
