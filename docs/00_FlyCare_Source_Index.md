# FlyCare Source Index

Snapshot generated: 2026-06-17 11:52 +08:00

This source pack documents the current FlyCare branch truth for a FlyCare-focused ChatGPT Project. It is scoped to the `/flycare` route, FlyCare API contracts, test evidence, demo evidence, and implemented/planned boundaries. It is not a full Proactive Guardian Care FYP report.

## Repository Snapshot

- Repo root: `E:\flycare`
- Branch inspected: `Flycare`
- Upstream branch: `origin/Flycare`
- Commit inspected: `fe24363` / `fe243638d913bc933ac2a425fb77d09ac31bc437`
- Commit date: `2026-06-17T03:15:13+08:00`
- Commit subject: `fix(firmware): 修复 Gate Change 重启循环`
- Route focus: `/flycare`
- Change type for this source pack update: documentation-only

## Source Files Created

The requested six files now live under `docs\`:

1. `E:\flycare\docs\00_FlyCare_Source_Index.md`
   - Index for the FlyCare source pack, scope, and claim boundaries.
2. `E:\flycare\docs\01_FlyCare_Current_Repo_Audit.md`
   - Branch audit, `/flycare` route status, file map, API use, i18n status, event flow, and demo boundaries.
3. `E:\flycare\docs\03_FlyCare_API_Contract_and_Responses.md`
   - Frontend-consumed REST API contract, response shapes, MQTT/admin publish contract, and exclusions.
4. `E:\flycare\docs\04_FlyCare_Test_Evidence_Index.md`
   - Required validation commands, latest terminal results, and evidence pointers.
5. `E:\flycare\docs\05_FlyCare_Demo_Script_and_Smoke_Checklist.md`
   - Demo script and smoke checklist for `/flycare`, MQTT, events, flight update, SOS, fall, and serial bridge paths.
6. `E:\flycare\docs\06_FlyCare_Open_Issues_and_Risks.md`
   - Implemented, partial, planned, risk, disclosure, and rollback boundaries.

There is no `02_...` file in this pack because the requested output list intentionally skipped that number.

## Primary Repo Truth Sources

### Frontend route and runtime

- `E:\flycare\frontend\src\App.tsx`
- `E:\flycare\frontend\src\pages\FlyCarePage.tsx`
- `E:\flycare\frontend\src\components\flycare\FlyCareMapStage.tsx`
- `E:\flycare\frontend\src\components\flycare\FlyCareFlightPanel.tsx`
- `E:\flycare\frontend\src\components\flycare\FlyCareGridOverlay.tsx`
- `E:\flycare\frontend\src\components\position\PositionResidentRail.tsx`
- `E:\flycare\frontend\src\components\position\PositionSummaryBar.tsx`
- `E:\flycare\frontend\src\components\position\PositionDecisionPanel.tsx`
- `E:\flycare\frontend\src\components\FallAlertModal.tsx`
- `E:\flycare\frontend\src\styles\position-page.css`
- `E:\flycare\frontend\src\img\FlyCare.png`

### Frontend data and API layer

- `E:\flycare\frontend\src\constants\backend.ts`
- `E:\flycare\frontend\src\services\api.ts`
- `E:\flycare\frontend\src\hooks\useBackendEvents.ts`
- `E:\flycare\frontend\src\hooks\useBackendResidentSnapshot.ts`
- `E:\flycare\frontend\src\shared\resident-live-store.tsx`
- `E:\flycare\frontend\src\adapters\position-command-center.ts`
- `E:\flycare\frontend\src\adapters\flycare-map.ts`
- `E:\flycare\frontend\src\utils\fall-alert-rows.ts`
- `E:\flycare\frontend\src\utils\flycare-flight.ts`
- `E:\flycare\frontend\src\types\backend.ts`

### Admin and demo controls

- `E:\flycare\frontend\src\components\admin\FlyCareAdmin.tsx`
- `E:\flycare\frontend\src\components\admin\AdminSection.tsx`
- `E:\flycare\scripts\start_flycare_local_stack.ps1`
- `E:\flycare\scripts\audit_flycare_goal.ps1`
- `E:\flycare\scripts\bridge_flycare_serial.ps1`
- `E:\flycare\scripts\verify_flycare_watch.ps1`

### Backend API implementation

- `E:\flycare\backend\backend\app\main.py`
- `E:\flycare\backend\backend\app\api\routes\__init__.py`
- `E:\flycare\backend\backend\app\api\routes\residents.py`
- `E:\flycare\backend\backend\app\api\routes\events.py`
- `E:\flycare\backend\backend\app\api\routes\mongo_upstream.py`
- `E:\flycare\backend\backend\app\api\routes\flycare_admin.py`
- `E:\flycare\backend\backend\app\api\routes\data_reception.py`
- `E:\flycare\backend\backend\app\services\mqtt_subscriber.py`
- `E:\flycare\backend\backend\app\services\mqtt_publish.py`
- `E:\flycare\backend\backend\config\device_id_map.json`

### Local docs and evidence

- `E:\flycare\AGENTS.md`
- `E:\flycare\frontend\README.backend-integration.md`
- `E:\flycare\docs\FLYCARE_MQTT.md`
- `E:\flycare\docs\ARCHITECTURE.md`
- `E:\flycare\logs\flycare-goal-audit.md`
- `E:\flycare\logs\flycare-goal-audit.json`
- `E:\flycare\logs\flycare-local-stack-status.json`
- `E:\flycare\logs\flycare-serial-bridge-live-20260617-031233.log`
- `E:\flycare\logs\flycare-serial-bridge-simfall-final-20260617-030333.log`

## Latest Local Evidence Snapshot

- Goal audit: `E:\flycare\logs\flycare-goal-audit.md`, overall `pass` at `2026-06-17T03:14:20`, base URL `http://127.0.0.1:8001`.
- Local stack: `E:\flycare\logs\flycare-local-stack-status.json`, captured `2026-06-17T03:12:45`; active backend `http://127.0.0.1:8001`; MQTT connected to `192.168.0.203:1883`; `8000` was healthy but MQTT-disabled.
- Runtime bridge: `E:\flycare\logs\flycare-serial-bridge-live-20260617-031233.log`, audited as `durationSeconds=102.2`, `uplinks=12`, `invalidUplinks=0`, `crashes=0`.
- Fall smoke: `E:\flycare\logs\flycare-serial-bridge-simfall-final-20260617-030333.log`, latest fall path created EventLog `319` and was handled as `false_alarm`.
- Browser demo evidence from `AGENTS.md`: `http://192.168.0.203:5173/flycare` showed NG WAI LUN online/live, Customer Services, CX910, estimated departure `17:56`, and `21 min - Gate Change to 10`, with no console errors in that check.

## Disclosure Safety

Runtime danger is low because these six files are markdown-only and do not change frontend, backend, firmware, database, scripts, routes, or environment variables.

Disclosure risk is medium if the remote repository is public or broadly shared. The files intentionally contain local demo evidence such as Windows paths, LAN IPs, COM port names, device IDs, passenger/demo names, event IDs, and known demo limitations. That is appropriate for a private FlyCare project source pack, but it should be redacted before public publication. No credential values are intended to be included.

## Label Convention

- Implemented: behavior is present in inspected repo source and/or latest local logs.
- Partial: behavior exists but depends on local demo conditions, legacy compatibility, manual steps, or fallback paths.
- Planned/Future: not implemented in the inspected repo, or only mentioned as future work.
- Historical: old Proactive Guardian / elderly care report material. Use only as background, not as FlyCare branch truth.

## Hard Claim Boundaries

Do not claim:

- Production readiness.
- Aviation-grade reliability.
- Frontend direct control of hardware.
- WebSocket/SSE, push notification, offline mode, Playwright/E2E, or production RBAC unless future repo evidence proves them.
- Public MQTT as the final local smoke baseline.

Use this instead:

- The frontend sends REST requests to the backend.
- The backend publishes MQTT flight downlinks and ingests MQTT/serial payloads.
- `/flycare` is polling-based in the inspected code.
- The software-only local smoke baseline should use MQTT broker `127.0.0.1:1883`.
- The latest real-watch hardware smoke used the PC LAN broker `192.168.0.203:1883` because the watch needed LAN reachability; that is local topology evidence, not a public-broker or production contract.
