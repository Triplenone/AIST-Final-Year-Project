# FlyCare Test Evidence Index

Snapshot generated: 2026-06-17 11:52 +08:00

This index records validation commands and evidence for the FlyCare source pack. It separates current terminal results from local demo evidence. These checks support demo readiness only; they do not prove production readiness.

## Required Commands

Run from:

```powershell
cd E:\flycare\frontend
```

Commands required for this source-pack task:

```powershell
npm run build
npm run lint
npm run test
```

Windows execution note:

- The actual command may be invoked as `npm.cmd run ...` in PowerShell to avoid PowerShell script execution-policy issues.
- Treat `npm.cmd run build` as the Windows-safe equivalent of `npm run build`.

## Latest Terminal Results From This Update

| Command | Working directory | Result | Evidence summary |
| --- | --- | --- | --- |
| `npm.cmd run build` | `E:\flycare\frontend` | Passed | Vite built 1262 modules in 3.84s. Output included the existing dynamic/static import chunk warning for `src/services/api.ts` and a Vite CJS Node API deprecation notice. |
| `npm.cmd run lint` | `E:\flycare\frontend` | Passed | ESLint completed with no findings in terminal output. |
| `npm.cmd run test` | `E:\flycare\frontend` | Passed | Vitest reported 5 passed test files and 61 passed tests. |

## Existing Frontend Test Coverage Relevant To FlyCare

| File | Status | Coverage area |
| --- | --- | --- |
| `E:\flycare\frontend\src\components\flycare\FlyCareMapStage.test.ts` | Implemented | Marker alert flashing, stale alert suppression, linked MySQL event mapping, tooltip status. |
| `E:\flycare\frontend\src\utils\flycare-flight.test.ts` | Implemented | Flight passenger fallback, gate parsing, alias matching by `mysql_device_id`, rich nested `flight_info`, legacy flat fields. |
| `E:\flycare\frontend\src\utils\fall-alert-rows.test.ts` | Implemented | Backend event row mapping, lookup maps, event params precedence, SOS kind mapping. |
| `E:\flycare\frontend\src\adapters\flycare-map.test.ts` | Implemented | Airport grid/route behavior. |
| `E:\flycare\frontend\src\adapters\position-command-center.test.ts` | Implemented | Shared position/FlyCare view model behavior. |

## Latest Local Demo Evidence In Repo Logs

These are local demo evidence files, not production evidence.

| Evidence file | Latest observed summary |
| --- | --- |
| `E:\flycare\logs\flycare-goal-audit.md` | Overall `pass` at `2026-06-17T03:14:20`, base URL `http://127.0.0.1:8001`. |
| `E:\flycare\logs\flycare-goal-audit.json` | Machine-readable audit details for stack, freshness, positioning, flight, popup UI, display/runtime stability, fall path, SOS, buttons, and vitals. |
| `E:\flycare\logs\flycare-local-stack-status.json` | Captured `2026-06-17T03:12:45`; active backend `8001`; MQTT connected to `192.168.0.203:1883`; serial bridge running on `COM5`; `8000` healthy but MQTT-disabled. |
| `E:\flycare\logs\flycare-serial-bridge-live-20260617-031233.log` | Runtime bridge evidence audited as `durationSeconds=102.2`, `uplinks=12`, `invalidUplinks=0`, `crashes=0`; duplicate retained flight payload ignored. |
| `E:\flycare\logs\flycare-serial-bridge-simfall-final-20260617-030333.log` | `SIMFALL` final smoke path; fall EventLog `319` created and later handled as `false_alarm`; latest status returned fall normal. |

## Evidence Labels

Implemented:

- Unit tests exist for FlyCare map alert state and flight response normalization.
- The frontend package defines `build`, `lint`, and `test` scripts in `E:\flycare\frontend\package.json`.
- Vite build uses `E:\flycare\frontend\vite.config.ts`, with manual chunks for maps/charts and same-origin `crossorigin` stripping.

Partial:

- Latest real-watch stack evidence used active `8001` backend and MQTT broker `192.168.0.203:1883`.
- Software-only final local smoke baseline should use `127.0.0.1:1883`.
- Hardware checks depend on COM port, firmware upload state, and network topology.

Future:

- Add Playwright/E2E only when repo evidence exists and the user asks for that scope.
- Add production CI evidence only when current branch has configured CI and a fresh run.

## Terminal Evidence Summary

Commands run while preparing or updating this source pack:

| Command | Working directory | Result |
| --- | --- | --- |
| `Get-ChildItem -Force` | `E:\flycare` | Passed; listed repo root structure. |
| `Get-Content -Raw AGENTS.md` | `E:\flycare` | Passed; confirmed project rules and latest FlyCare progress log. |
| `git status --short --branch --untracked-files=all` | `E:\flycare` | Passed; branch `Flycare...origin/Flycare`, with only the six source-pack docs untracked after move to `docs\`. |
| `git log -1 --format="%h %H %cI %s"` | `E:\flycare` | Passed; output `fe24363 fe243638d913bc933ac2a425fb77d09ac31bc437 2026-06-17T03:15:13+08:00 fix(firmware): 修复 Gate Change 重启循环`. |
| `Get-Content -Raw frontend\package.json` | `E:\flycare` | Passed; confirmed scripts `build`, `lint`, `test`. |
| `Get-Content -Raw logs\flycare-goal-audit.md` | `E:\flycare` | Passed; latest audit overall `pass` at `2026-06-17T03:14:20`. |
| `Get-Content -Raw logs\flycare-local-stack-status.json` | `E:\flycare` | Passed; active backend `8001`, MQTT connected to `192.168.0.203:1883`, serial bridge running. |
| `Get-ChildItem logs -File \| Sort-Object LastWriteTime -Descending \| Select-Object -First 20` | `E:\flycare` | Passed; confirmed latest bridge, audit, and stack evidence files. |
| `npm.cmd run build` | `E:\flycare\frontend` | Passed; Vite build completed with existing warnings noted above. |
| `npm.cmd run lint` | `E:\flycare\frontend` | Passed; no ESLint findings in terminal output. |
| `npm.cmd run test` | `E:\flycare\frontend` | Passed; 5 test files and 61 tests passed. |

Post-edit documentation checks from this update:

| Command | Working directory | Result |
| --- | --- | --- |
| `git diff --check -- docs\00_FlyCare_Source_Index.md docs\01_FlyCare_Current_Repo_Audit.md docs\03_FlyCare_API_Contract_and_Responses.md docs\04_FlyCare_Test_Evidence_Index.md docs\05_FlyCare_Demo_Script_and_Smoke_Checklist.md docs\06_FlyCare_Open_Issues_and_Risks.md` | `E:\flycare` | Passed; no whitespace/error output. |
| `rg` sensitive-term scan over the six markdown files | `E:\flycare` | Passed after review; no credential values were found. |
| `git status --short --branch --untracked-files=all` | `E:\flycare` | Passed; branch `Flycare...origin/Flycare`, with only the six source-pack docs untracked before staging. |
