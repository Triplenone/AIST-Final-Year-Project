# FlyCare Open Issues And Risks

Snapshot generated: 2026-06-17 11:52 +08:00

This file records what is implemented, partial, planned, and risky in the FlyCare branch. It is intentionally conservative.

## Are These Six Files Dangerous?

Runtime risk: low.

- They are markdown documentation only.
- They do not change frontend code, backend code, firmware code, database schema/data, scripts, routes, environment variables, or build configuration.
- They should not affect the running FlyCare demo unless someone manually follows a command in the checklist.

Disclosure risk: medium if the remote repository is public or broadly shared.

- The files include local Windows paths, LAN IPs, COM port names, device IDs, passenger/demo names, event IDs, latest log filenames, and known demo limitations.
- This is useful for a private FlyCare ChatGPT Project source pack.
- It should be redacted before publishing to a public repo, public report, or external audience.
- No credential values are intended to be included.

## Implemented

Frontend:

- `/flycare` route exists and lazy-loads `FlyCarePage`.
- `/flycare` uses REST polling for passenger snapshots, activity, flight updates, and event state.
- Airport map image, passenger pins, clustered pins, alert animation, route overlay, and accessible tooltips are implemented.
- Flight panel and flight-update drawer are implemented.
- Admin FlyCare publish form is implemented under the Admin section.
- i18n keys for FlyCare and Admin FlyCare exist in English, Simplified Chinese, and Hong Kong Chinese locale files.

Backend:

- FastAPI mounts routes under `/api/v1`.
- Resident, event, Mongo upstream, data reception, and FlyCare admin routes exist.
- MQTT subscriber lifecycle starts from FastAPI lifespan.
- Device ID mapping supports external MQTT/Mongo IDs to MySQL device IDs.
- `POST /api/v1/flycare-admin/flight/publish` builds canonical `flight_info`, publishes MQTT aliases, and optionally saves Mongo.
- `GET /api/v1/mongo-upstream/flight/latest` exposes latest flight data to `/flycare`.
- `POST /api/v1/mongo-upstream/serial-ingest` supports local USB serial bridge fallback.

Firmware/demo support:

- Repo docs and latest progress log record COM5 firmware compile/upload success.
- Serial bridge supports upstream `FLYCARE_UPLINK` and downstream `FLYCARE_DOWNLINK`.
- `SIMFALL` serial-command path is documented in current logs.
- Gate Change final demo path shows large popup plus vibration and intentionally skips Gate Change audio/TTS to avoid the observed SD_MMC/audio reboot path.

Tests:

- Frontend Vitest tests cover FlyCare map alert state, flight normalization, fall/SOS alert row mapping, route behavior, and shared position/FlyCare view-model behavior.
- Package scripts include `build`, `lint`, and `test`.
- Latest run on 2026-06-17: `npm.cmd run build`, `npm.cmd run lint`, and `npm.cmd run test` all passed.

## Partial

Local stack:

- Latest stack evidence used active backend `http://127.0.0.1:8001` because `8000` can be healthy while MQTT-disabled or stale.
- `logs\flycare-local-stack-status.json` captured MQTT broker `192.168.0.203:1883` for a LAN/hardware topology.
- The software-only local smoke baseline should use `127.0.0.1:1883`.

Hardware:

- Direct watch MQTT depends on PC/watch network topology and client-to-client traffic.
- USB serial bridge is available when hotspot isolation blocks watch-to-PC TCP.
- COM5 ownership and Windows serial device state can block hardware checks.
- Live HR/SpO2 and physical SOS evidence depend on watch wear/contact and physical interaction.

Map and flight:

- Route rendering is focused on Gate 10 and Gate 11.
- Grid overlay code exists but is disabled by `FLYCARE_SHOW_GRID_OVERLAY=false`.
- Flight latest response supports both legacy flat fields and nested `flight_info`; this is compatibility, not a clean new-only schema.

Data model:

- Backend keeps legacy names such as `/residents`, `elderly_user_id`, `smart_elderly_care_system`, and role value `elderly`.
- Local Mongo/MySQL data is demo-stateful. Old unhandled events or stale upstream rows can affect UI.

Auth and operations:

- Demo accounts and Admin UI exist, but production RBAC is not proven.
- There is no inspected evidence of production audit logging, access policy hardening, or authenticated MQTT.

## Planned / Future

Do not claim these as implemented:

- Production deployment readiness.
- Aviation-grade reliability.
- Production RBAC.
- Browser WebSocket/SSE live stream for `/flycare`.
- Push notifications.
- Offline mode.
- Playwright/E2E coverage.
- Full gate coverage beyond Gate 10/Gate 11.
- Authenticated/TLS MQTT broker for production.
- Public cloud broker as safe production transport.
- Frontend direct hardware control.

Reasonable future work:

- Add an explicit local smoke script that enforces `127.0.0.1:1883` for software-only baseline.
- Add Playwright smoke after the user asks for E2E and a stable browser target is available.
- Add production broker/auth/RBAC planning as a separate architecture task.
- Add data cleanup scripts for demo-created SOS/fall events.
- Redact local identifiers before any public sharing of this source pack.

## Demo Risks

High:

- Public MQTT broker usage can receive retained or external messages. Do not use public broker as final local smoke baseline.
- Stale backend on `8000` can look healthy while MQTT bridge is disabled. Always check MQTT status or active backend evidence.
- Network client isolation can block direct watch MQTT even when PC MQTT is healthy.

Medium:

- These docs are disclosure-sensitive if the repo is public: they include local infrastructure details and demo evidence.
- Old unhandled events can trigger alert UI unrelated to the selected FlyCare passenger.
- Local database state can drift from tracked migrations if manual MySQL edits are made.
- Alias mapping can make a canonical device and short alias both valid for the same MySQL device. Verify `mysql_device_id` when reading latest flight/location.
- PowerShell JSON quoting can break `mosquitto_pub -m`; use stdin with `-s`.

Low:

- Locale files contain all key groups found in inspection, but some terminal output renders mojibake in PowerShell.
- Documentation can become stale quickly because the branch is demo-active.

## Rollback Notes

Documentation-only rollback:

- Remove or restore the six markdown files under `E:\flycare\docs\`.
- No frontend, backend, firmware, database, route, script, env, or setup files were intentionally edited.

Runtime rollback during demo:

- Resolve or mark false alarm for smoke-created events.
- Publish clear SOS/fall payloads after alert testing.
- Stop serial bridge if COM5 must be released.
- Re-run `scripts\start_flycare_local_stack.ps1 -Elevate -RestartMqtt -RestartApps` only when a port/process reset is needed.

Git rollback:

- Do not force push.
- If these docs are committed and later need revision, make a normal follow-up commit with a Simplified Chinese commit message if committing from this repo.

## Current Decision Boundary

Safe to claim:

- FlyCare demo branch has a working `/flycare` route in source.
- The route consumes backend REST APIs and local Mongo/MQTT-derived data.
- The backend has FlyCare admin publish and latest flight endpoints.
- Latest local logs show a successful demo-audit pass on 2026-06-17, scoped to this machine and local stack.
- The latest final hardware smoke is local-demo evidence, not production certification.

Not safe to claim:

- Production readiness.
- Aviation-grade reliability.
- Hardware is controlled directly by frontend.
- Browser realtime channel beyond REST polling.
- Public broker safety.
- Full airport coverage.
