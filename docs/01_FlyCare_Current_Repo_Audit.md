# FlyCare Current Repo Audit

Snapshot generated: 2026-06-17 11:52 +08:00

## Current Branch And Commit

- Repo root: `E:\flycare`
- Branch: `Flycare`
- Upstream branch: `origin/Flycare`
- Commit short SHA: `fe24363`
- Commit full SHA: `fe243638d913bc933ac2a425fb77d09ac31bc437`
- Commit date: `2026-06-17T03:15:13+08:00`
- Commit subject: `fix(firmware): 修复 Gate Change 重启循环`

## Changed Files

Status before this documentation update was clean against `origin/Flycare` except for the six untracked source-pack markdown files after they were moved into `docs\`:

```text
## Flycare...origin/Flycare
?? docs/00_FlyCare_Source_Index.md
?? docs/01_FlyCare_Current_Repo_Audit.md
?? docs/03_FlyCare_API_Contract_and_Responses.md
?? docs/04_FlyCare_Test_Evidence_Index.md
?? docs/05_FlyCare_Demo_Script_and_Smoke_Checklist.md
?? docs/06_FlyCare_Open_Issues_and_Risks.md
```

Documentation files added by this task:

- `E:\flycare\docs\00_FlyCare_Source_Index.md`
- `E:\flycare\docs\01_FlyCare_Current_Repo_Audit.md`
- `E:\flycare\docs\03_FlyCare_API_Contract_and_Responses.md`
- `E:\flycare\docs\04_FlyCare_Test_Evidence_Index.md`
- `E:\flycare\docs\05_FlyCare_Demo_Script_and_Smoke_Checklist.md`
- `E:\flycare\docs\06_FlyCare_Open_Issues_and_Risks.md`

No application source, backend source, firmware source, database migration, script, route, or environment file was intentionally edited for this source pack update.

## `/flycare` Route Status

Implemented:

- `E:\flycare\frontend\src\App.tsx` includes `/flycare` in `NAV_ITEMS`.
- `E:\flycare\frontend\src\App.tsx` resolves `/flycare` to page key `flycare`.
- `E:\flycare\frontend\src\App.tsx` lazy-loads `FlyCarePage` from `frontend/src/pages/FlyCarePage.tsx`.
- `E:\flycare\frontend\src\pages\FlyCarePage.tsx` renders the FlyCare command center using:
  - `PositionResidentRail`
  - `PositionSummaryBar`
  - `FlyCareMapStage`
  - `FlyCareFlightPanel`
  - `PositionDecisionPanel`

Partial:

- `/flycare` uses REST polling rather than a realtime browser channel:
  - Snapshot refresh: every `2000 ms`.
  - Flight refresh: every `5000 ms`.
  - SOS/fall event refresh: every `5000 ms`.
- `frontend/src/constants/backend.ts` defines `SSE_URL`, but the inspected `/flycare` route does not subscribe to SSE or WebSocket.
- `resident-live-store.tsx` also uses `/api/v1/residents` polling, with a 10-second interval when started.

Not claimed:

- No production readiness claim.
- No aviation-grade reliability claim.
- No frontend direct hardware-control claim.
- No WebSocket/SSE/push/offline claim for `/flycare`.

## Frontend Files Used By FlyCare

| File | Status | Role |
| --- | --- | --- |
| `E:\flycare\frontend\src\App.tsx` | Implemented | Registers `/flycare`, lazy-loads the page, and wires global fall/SOS alert modal handling. |
| `E:\flycare\frontend\src\pages\FlyCarePage.tsx` | Implemented | Main `/flycare` page. Polls snapshots, flight data, and active SOS/fall events. |
| `E:\flycare\frontend\src\components\flycare\FlyCareMapStage.tsx` | Implemented | Airport map, pins, alert flashing, tooltip state, clusters, and route overlay. |
| `E:\flycare\frontend\src\components\flycare\FlyCareMapStage.test.ts` | Implemented | Unit tests for alert flashing, tooltip state, and event normalization. |
| `E:\flycare\frontend\src\components\flycare\FlyCareFlightPanel.tsx` | Implemented | Flight info panel and flight-update drawer. |
| `E:\flycare\frontend\src\components\flycare\FlyCareGridOverlay.tsx` | Implemented but disabled by config | Grid calibration UI used only if `FLYCARE_SHOW_GRID_OVERLAY` is true. |
| `E:\flycare\frontend\src\components\position\PositionResidentRail.tsx` | Implemented | Passenger rail reused by FlyCare with FlyCare tone classes. |
| `E:\flycare\frontend\src\components\position\PositionSummaryBar.tsx` | Implemented | Selected passenger summary reused by FlyCare. |
| `E:\flycare\frontend\src\components\position\PositionDecisionPanel.tsx` | Implemented | Selected passenger decision/activity panel reused by FlyCare. |
| `E:\flycare\frontend\src\adapters\position-command-center.ts` | Implemented | Registry, Mongo snapshot merge, freshness/risk state, activity history, and FlyCare profile support. |
| `E:\flycare\frontend\src\adapters\flycare-map.ts` | Implemented | Airport grid, Gate 10/Gate 11 route targets, blocked cells, and route builder. |
| `E:\flycare\frontend\src\utils\flycare-flight.ts` | Implemented | Normalizes latest flight responses from flat legacy fields or nested `flight_info`. |
| `E:\flycare\frontend\src\utils\fall-alert-rows.ts` | Implemented | Builds alert modal rows from backend events or current FlyCare/Mongo state. |
| `E:\flycare\frontend\src\services\api.ts` | Implemented | Axios clients and TypeScript response types for REST endpoints. |
| `E:\flycare\frontend\src\hooks\useBackendEvents.ts` | Implemented | Polls `/events/` and filters active events client-side. |
| `E:\flycare\frontend\src\shared\resident-live-store.tsx` | Implemented | Polling store for resident snapshots. |
| `E:\flycare\frontend\src\styles\position-page.css` | Implemented | FlyCare map pins, alert animation, flight panel, grid overlay, and layout styles. |
| `E:\flycare\frontend\src\img\FlyCare.png` | Implemented | Airport map image rendered by `FlyCareMapStage`. |
| `E:\flycare\frontend\src\components\admin\FlyCareAdmin.tsx` | Implemented | Admin flight publish form for demo/operator-triggered backend MQTT/Mongo actions. |

## Backend APIs Consumed By FlyCare

Implemented REST endpoints consumed directly or through shared FlyCare support code:

- `GET /api/v1/residents/`
- `GET /api/v1/devices/{device_id}`
- `GET /api/v1/users/{user_id}`
- `GET /api/v1/locations/`
- `GET /api/v1/events/`
- `PUT /api/v1/events/{event_id}/handle`
- `GET /api/v1/mongo-upstream/latest`
- `GET /api/v1/mongo-upstream/location/latest`
- `GET /api/v1/mongo-upstream/`
- `GET /api/v1/mongo-upstream/flight/latest`
- `GET /api/v1/flycare-admin/presets`
- `GET /api/v1/flycare-admin/mqtt/status`
- `POST /api/v1/flycare-admin/flight/publish`

Demo and smoke support endpoints:

- `GET /health`
- `GET /api/v1/data-reception/mqtt/status`
- `POST /api/v1/mongo-upstream/serial-ingest`
- `POST /api/v1/mongo-upstream/flight` as Mongo-only demo fallback
- `POST /api/v1/data-reception/receive` for legacy HTTP ingest

Partial:

- Endpoint and schema names still preserve legacy care-system terms such as `/residents`, `elderly_user_id`, and role value `elderly`.
- This is intentionally preserved in `frontend/README.backend-integration.md`.

## i18n Key Status

Implemented:

- `E:\flycare\frontend\src\locales\en\translation.json` contains `layout.nav.flycare`, `flyCare.*`, `admin.tabs.flycare`, `admin.flycare.*`, and `fallAlert.*` keys used by `/flycare` and Admin FlyCare publish.
- `E:\flycare\frontend\src\locales\zh-CN\translation.json` contains matching FlyCare and Admin FlyCare keys.
- `E:\flycare\frontend\src\locales\zh-HK\translation.json` contains matching FlyCare and Admin FlyCare keys.

Risk:

- Some localized source text can render as mojibake in PowerShell output, but the JSON files are present and are exercised by the frontend build/test commands.

## Event Flow Status

Implemented:

- Backend event polling:
  - `useBackendEvents.ts` polls `eventApi.list({ limit })`.
  - `FlyCarePage.tsx` separately polls `eventApi.list({ event_type: 'sos', limit: 50 })` and `eventApi.list({ event_type: 'fall', limit: 50 })`.
- Active event filtering:
  - `useBackendEvents.ts` treats `unhandled` and `confirmed` as active by default.
  - `FlyCareMapStage.tsx` flashes markers only for fresh Mongo SOS/fall state or linked unhandled MySQL events.
- Alert rows:
  - `fall-alert-rows.ts` maps backend events to modal rows, preferring event params and lookup data when available.
- Handling:
  - `eventApi.handle()` calls `PUT /api/v1/events/{event_id}/handle` with `event_status`, `handled_by`, and `remark`.

Partial:

- `/flycare` does not directly clear hardware state. Staff actions go through backend event handling or demo scripts.
- Historical unhandled EventLog rows can affect global alert surfaces if they are not baselined or resolved. The current App code seeds known event IDs after the first backend event poll.

## Testing Commands And Latest Result

Required commands for this source pack:

- `npm run build`
- `npm run lint`
- `npm run test`

Latest result from this update:

- `npm.cmd run build`: passed. Vite built 1262 modules in 3.84s. Output included the existing dynamic/static import chunk warning for `src/services/api.ts` and a Vite CJS Node API deprecation notice.
- `npm.cmd run lint`: passed. ESLint completed with no findings in terminal output.
- `npm.cmd run test`: passed. Vitest reported 5 passed test files and 61 passed tests.

## Demo Evidence Required

Minimum software evidence for a FlyCare demo:

- `/flycare` route loads in the frontend.
- Backend `/health` is healthy.
- MQTT status endpoint reports connected to the intended local broker.
- Software-only local smoke baseline uses MQTT broker `127.0.0.1:1883`.
- Selected passenger, preferably NG WAI LUN / device 8, has fresh location/status data.
- Flight update reaches Mongo/latest flight and the `/flycare` flight panel.
- SOS and fall smoke paths create backend events and can be resolved or marked false alarm.
- If real hardware is shown, capture MQTT or serial bridge evidence that the watch received flight downlink and uploaded status/SOS/fall.

Latest observed local evidence in repo logs:

- `E:\flycare\logs\flycare-goal-audit.md`: overall `pass` at `2026-06-17T03:14:20`, base URL `http://127.0.0.1:8001`.
- `E:\flycare\logs\flycare-local-stack-status.json`: active backend `http://127.0.0.1:8001`; MQTT connected to `192.168.0.203:1883`; `8000` healthy but MQTT-disabled; captured at `2026-06-17T03:12:45`.
- `E:\flycare\logs\flycare-serial-bridge-live-20260617-031233.log`: latest clean bridge evidence with 102.2 seconds runtime, 12 uplinks, no invalid uplinks, and no crash markers.
- `E:\flycare\logs\flycare-serial-bridge-simfall-final-20260617-030333.log`: `SIMFALL` path created EventLog `319`, later handled as `false_alarm`.
- `AGENTS.md`: browser check at `http://192.168.0.203:5173/flycare` showed NG WAI LUN online/live, Customer Services, CX910, estimated departure `17:56`, and `21 min - Gate Change to 10`, with no console errors.

## Implemented / Partial / Planned Boundary

Implemented:

- `/flycare` route and React UI.
- REST polling for passengers, Mongo upstream status/location/vitals, latest flight, and events.
- Airport map grid and Gate 10/Gate 11 route overlay.
- Flight panel and flight update drawer.
- Admin FlyCare publish form that sends backend REST requests.
- Backend flight publish endpoint that publishes MQTT and/or saves Mongo.
- Backend MQTT subscriber and Mongo raw upstream storage.
- USB serial bridge fallback script for local demo networks that block watch-to-PC TCP.
- Gate Change final demo behavior: large simplified popup plus vibration, with Gate Change audio/TTS intentionally skipped to avoid the SD_MMC/audio reboot path observed in the final freeze.
- Unit tests for FlyCare map alert behavior and flight normalization.

Partial:

- Real hardware readiness depends on local network, MQTT broker reachability, COM port ownership, and current watch firmware.
- Recovery backend `8001` is current evidence for the MQTT-connected local bridge when `8000` is stale or MQTT-disabled.
- Gate route support is focused on Gate 10 and Gate 11.
- Local database and Mongo contents are demo-stateful; old records can influence UI if not resolved or baselined.
- The app has simple demo accounts and route-level UI, not production RBAC.

Planned/Future:

- Production deployment posture, authenticated broker, TLS MQTT, and production RBAC.
- WebSocket/SSE live browser stream for `/flycare`.
- Offline mode and push notifications.
- Playwright/E2E test coverage.
- Full airport gate set beyond Gate 10/Gate 11.
- Aviation-grade validation.

## Demo Risks And Rollback Notes

Risks:

- Local stack evidence can drift quickly because ports, MQTT broker host, and COM5 ownership are machine-state dependent.
- Public brokers can introduce retained/external messages and must not be treated as the local final smoke baseline.
- These markdown files are runtime-safe but disclosure-sensitive: they contain local paths, LAN IPs, device IDs, passenger/demo names, event IDs, and demo limitations.
- Old Proactive Guardian / elderly care reports are historical background, not FlyCare branch truth.

Rollback:

- This task adds documentation files only. Application rollback is not required.
- To remove this source pack, remove the six `docs\*_FlyCare_*.md` files listed above or restore them from Git if they are later committed.
- Do not force push when publishing any resulting commit.
