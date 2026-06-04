# FlyCare MQTT And Device Mapping

## Device Mapping

FlyCare keeps `backend/backend/config/device_id_map.json` backward compatible with the current backend loader shape:

```json
{ "version": 1, "mongo_to_mysql": [{ "mongodb_device_id": "ESP32_...", "mysql_device_id": 1 }] }
```

Do not replace these rows with nested metadata objects. Verification notes belong in docs or an optional metadata file. Runtime overrides remain available through `DEVICE_ID_MAP` and `DEVICE_ID_MAP_FILE`.

| External MQTT/Mongo device_id | MySQL device_id | Bound name | Verification note |
| --- | ---: | --- | --- |
| `ESP32_0000E03948D4DB1C` | 1 | CHAN TAI MAN | Existing mapping |
| `ESP32_0000C422A443CA48` | 2 | LAU SIU FONG | Existing mapping |
| `ESP32_00005CFA7AD4DB1C` | 3 | WONG KA MING | Existing mapping |
| `ESP32_0000A022A443CA48` | 4 | HO CHI WAI | Verified in live Mongo upstream |
| `ESP32_00009822A443CA48` | 5 | TANG WAI HAN | User-corrected ID; not found in live Mongo during implementation precheck |
| `ESP32_00008C292A04A7AC` | 6 | MA KA WAI | Bound by `database/mysql/migrations/20260603_bind_flycare_devices_6_7_hk_names.sql` |
| `ESP32_00009022A443CA48` | 7 | YIP MAN LING | Bound by `database/mysql/migrations/20260603_bind_flycare_devices_6_7_hk_names.sql` |

## MySQL Migration

After importing the base MySQL dump, run the tracked migrations so every local repo has the same FlyCare device/user seed data:

```powershell
cd E:\flycare
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260603_register_esp32_devices_6_7.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260603_bind_flycare_devices_6_7_hk_names.sql"
```

Do not keep FlyCare user/device binding changes only in a local MySQL instance. If a binding affects the UI or demo data, add an idempotent migration under `database/mysql/migrations/` and update this mapping table.

## MQTT Topics

Smartwatch uplink topics:

```text
smartwatch/+/status
smartwatch/+/location
smartwatch/+/sos
smartwatch/+/fall
smartwatch/+/door
smartwatch/+/light
smartwatch/+/log
smartwatch/+/heartbeat
smartwatch/+/vitals
```

Legacy loopback ingest topic retained for compatibility:

```text
flycare/flight
```

Primary FlyCare flight downlink topic:

```text
smartwatch/{device_id}/flight
```

The backend MQTT subscriber also listens on `smartwatch/+/flight` and writes received downlink JSON into Mongo (`data_type=flight`). This loopback lets Admin **Publish to MQTT** update the FlyCare page without enabling **Mongo only** / **MQTT + save Mongo**.

`backend/backend/app/services/MQTT-topic.txt` defines the same downlink pattern as `smartwatch/%s/flight`. The repo firmware folder is only a PlatformIO scaffold and contains no `.ino` / `.cpp` MQTT subscribe implementation, so smartwatch flight receive handling is pending firmware confirmation.

Flight downlink JSON on `smartwatch/{device_id}/flight`:

```json
{
  "command_type": "flight_info",
  "flight_info": {
    "flight_number": "CA1234",
    "airline": "Air China",
    "departure_airport": "Hong Kong",
    "destination": "Beijing",
    "seat_number": "21C",
    "scheduled_departure": "14:30",
    "estimated_departure": "14:45",
    "boarding_time": "14:00",
    "boarding_gate": "A12",
    "status": "boarding",
    "delay_minutes": 15,
    "delay_reason": "Weather conditions",
    "gate_changed": true,
    "terminal": "T3",
    "checkin_counter": "C12-C18"
  }
}
```

`POST /api/v1/flycare-admin/flight/publish` maps existing admin form fields into `flight_info` (for example `flightNumber` -> `flight_number`, `departureAirport` -> `departure_airport`, `arrivalAirport` -> `destination`, `seatNumber` -> `seat_number`, `gate` -> `boarding_gate`, `flightTime` -> `scheduled_departure`). Optional body fields can override: `airline`, `destination`, `scheduled_departure`, `estimated_departure`, `boarding_time`, `boarding_gate`, `status`, `delay_minutes`, `delay_reason`, `gate_changed`, `terminal`, `checkin_counter`.

`save_mongo=true` in `POST /api/v1/flycare-admin/flight/publish` is only a UI/demo fallback that writes `data_type=flight` into Mongo for the selected `device_id`. It is not proof that the smartwatch received the MQTT command.

## Local Validation

Backend:

```powershell
cd E:\flycare\backend\backend
..\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd E:\flycare\frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Checks:

```powershell
cd E:\flycare\backend\backend
..\.venv\Scripts\python -m compileall app

cd E:\flycare\frontend
npm run test
npm run lint
npm run build
```
