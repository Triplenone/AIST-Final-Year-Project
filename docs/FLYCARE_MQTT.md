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

`backend/backend/app/services/MQTT-topic.txt` defines the same downlink pattern as `smartwatch/%s/flight`. The repo firmware folder is only a PlatformIO scaffold and contains no `.ino` / `.cpp` MQTT subscribe implementation, so smartwatch flight receive handling is pending firmware confirmation.

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
