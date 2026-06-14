# FlyCare Frontend Backend Guide

This guide connects the active `frontend/` React/Vite dashboard to the FastAPI backend and the local MySQL/Mongo/MQTT runtime.

## Backend

For a full local Windows stack check from an elevated PowerShell, run:

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start_flycare_local_stack.ps1 -Elevate
```

The script starts or verifies MySQL, MongoDB, MQTT, backend, and frontend where possible, then writes `logs/flycare-local-stack-status.json` with admin status, port listeners, `/health`, and MQTT status.

For COM5 watch evidence during physical tests:

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify_flycare_watch.ps1
```

To prove live heart-rate, live SpO2, and physical BOOT SOS in one run, wear the watch firmly and run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify_flycare_watch.ps1 -WaitForValidHeartRate -WaitForValidSpO2 -WaitForPhysicalSOS -AutoClearSOS -AutoHandleSosEvents -HeartRateLedBrightness 0xFF -Seconds 60
```

If `-HeartRateLedBrightness` is supplied, the verifier sends `HRLED <value>` before diagnostics. If heart-rate validity is not observed, it sends `HRCAL` and continuously drains serial output so raw MAX30102 IR/red contact and saturation statistics are recorded in `logs/flycare-watch-verification.json`.

For repeatable MAX30102 troubleshooting, add `-RunHeartRateSensorCheck -RunHeartRateSweep`; the verifier sends `HRSENSOR` to read part ID/revision/die temperature, then sends `HRSWEEP` so firmware tests `0x1F`, `0x3F`, `0x7F`, and `0xFF` LED levels in one serial capture. The generated JSON includes `heartRateDiagnostics.classification`; `optical_contact_missing` means the chip answered over I2C but the red/IR readings never crossed the contact threshold.

To consolidate the full FlyCare goal evidence after running the stack and watch verifier:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit_flycare_goal.ps1
```

The audit writes `logs/flycare-goal-audit.json` and `logs/flycare-goal-audit.md`; exit code `2` means only live HR/SpO2 is physically blocked.

Run the API from `backend/backend`:

```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The implemented backend still uses the legacy MySQL schema name `smart_elderly_care_system`. Treat that name, `/api/v1/residents`, `elderly_user_id`, and the `elderly` role enum as compatibility contracts until a coordinated migration changes the API and database together.

Apply FlyCare setup migrations after creating or refreshing the database:

```powershell
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260603_register_esp32_devices_6_7.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260603_bind_flycare_devices_6_7_hk_names.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260605_register_esp32_48ca43a42298.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260608_dedupe_flycare_devices_and_device8_alias.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260613_flycare_demo_labels.sql"
```

Check the backend:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/api/v1/residents
```

## Frontend

Run the active Vite app from `frontend/`:

```powershell
npm install
npm run dev -- --host 0.0.0.0
```

Open `http://127.0.0.1:5173`. The frontend API base URL is defined in `frontend/src/constants/backend.ts` and defaults to `http://localhost:8000/api/v1`.

Important data flows:

- Passenger list: `frontend/src/shared/resident-live-store.tsx` calls `/api/v1/residents` and maps the response through `frontend/src/adapters/residents.ts`.
- Admin modules: `frontend/src/components/admin/` call `/api/v1/users`, `/api/v1/devices`, `/api/v1/events`, `/api/v1/locations`, `/api/v1/user-status`, `/api/v1/device-data-log`, `/api/v1/residents`, and `/api/v1/kpi`.
- FlyCare positioning: `/flycare` and `/position` use the same backend passenger/device contracts plus Mongo upstream status data.

## Validation

Use these checks after frontend/backend contract changes:

```powershell
cd frontend
npm run test
npm run lint
npm run build:static

cd ../backend/backend
python -m compileall app
```

Then smoke test:

- `GET http://127.0.0.1:8000/health`
- `GET http://127.0.0.1:8000/api/v1/flycare-admin/mqtt/status`
- `GET http://127.0.0.1:8000/api/v1/mongo-upstream/?device_id=ESP32_48CA43A42298&page_size=5`
- Browser routes `/`, `/flycare`, `/position`, and `/admin`
