# FlyCare API Contract And Responses

Snapshot generated: 2026-06-17 11:52 +08:00

This file records the current REST and MQTT-adjacent contract used by the FlyCare branch. It is a repo snapshot, not a production API guarantee.

## Base URL Resolution

Frontend source:

- `E:\flycare\frontend\src\constants\backend.ts`
- `E:\flycare\frontend\src\services\api.ts`

Rules:

- If `VITE_BACKEND_BASE_URL` is set, the frontend uses it after trimming a trailing slash.
- In Vite dev ports `5173` or `4173`, the frontend uses the same protocol/hostname with backend port `8000`.
- In same-origin static deploy, the frontend uses `window.location.origin`.
- REST prefix is `API_BASE_URL = BACKEND_BASE_URL + /api/v1`.

Current demo note:

- Latest local stack evidence uses active backend `http://127.0.0.1:8001` because `8000` was healthy but MQTT-disabled.
- Software-only local smoke baseline should use MQTT broker `127.0.0.1:1883`, not a public broker.
- Latest real-watch hardware smoke used broker `192.168.0.203:1883` because the watch needed to reach the PC over LAN. That is local topology evidence, not a production contract.

## `/flycare` Frontend Consumption Summary

| Purpose | Frontend source | API client | Endpoint |
| --- | --- | --- | --- |
| Passenger registry and vitals fallback | `useBackendResidentSnapshot.ts`, `resident-live-store.tsx`, `position-command-center.ts` | `residentApi.list` | `GET /api/v1/residents/` |
| Device to passenger registry resolution | `position-command-center.ts` | `deviceApi.get` | `GET /api/v1/devices/{device_id}` |
| Passenger display name resolution | `position-command-center.ts` | `userApi.get` | `GET /api/v1/users/{user_id}` |
| Location lookup names | `position-command-center.ts`, `fall-alert-rows.ts` | `locationApi.list` | `GET /api/v1/locations/` |
| Active SOS/fall events | `FlyCarePage.tsx`, `useBackendEvents.ts` | `eventApi.list` | `GET /api/v1/events/` |
| Event handling | `App.tsx`, `FallAlertModal.tsx` | `eventApi.handle` | `PUT /api/v1/events/{event_id}/handle` |
| Latest merged upstream snapshot | `position-command-center.ts` | `mongoUpstreamApi.getLatest` | `GET /api/v1/mongo-upstream/latest` |
| Latest valid location | `position-command-center.ts`, `fall-alert-rows.ts` | `mongoUpstreamApi.getLatestValidLocation` | `GET /api/v1/mongo-upstream/location/latest` |
| Recent passenger activity | `position-command-center.ts` | `mongoUpstreamApi.list` | `GET /api/v1/mongo-upstream/` |
| Latest flight | `FlyCarePage.tsx`, `flycare-flight.ts` | `mongoUpstreamApi.getLatestFlight` | `GET /api/v1/mongo-upstream/flight/latest` |
| Admin flight presets | `FlyCareAdmin.tsx` | `flycareAdminApi.getPresets` | `GET /api/v1/flycare-admin/presets` |
| Admin MQTT status | `FlyCareAdmin.tsx` | `flycareAdminApi.getMqttStatus` | `GET /api/v1/flycare-admin/mqtt/status` |
| Admin flight publish | `FlyCareAdmin.tsx` | `flycareAdminApi.publishFlight` | `POST /api/v1/flycare-admin/flight/publish` |

## Event API

Backend source:

- `E:\flycare\backend\backend\app\api\routes\events.py`
- `E:\flycare\frontend\src\types\backend.ts`
- `E:\flycare\frontend\src\hooks\useBackendEvents.ts`
- `E:\flycare\frontend\src\components\flycare\FlyCareMapStage.tsx`

### `GET /api/v1/events/`

Query params used or supported:

- `skip`
- `limit`
- `related_user_id`
- `event_type`
- `event_status`
- `start_time`
- `end_time`

Response shape consumed by frontend:

```json
[
  {
    "event_id": 319,
    "event_type": "fall",
    "related_user_id": 15,
    "trigger_device_id": 8,
    "location_zone_id": null,
    "event_timestamp": "2026-06-17T03:03:33+08:00",
    "event_params": {},
    "event_status": "false_alarm",
    "handled_by": null,
    "handled_at": null,
    "remark": null
  }
]
```

Current frontend logic:

- `useBackendEvents` fetches a recent slice and filters active statuses client-side.
- `FlyCarePage` requests `event_type=sos` and `event_type=fall` separately every 5 seconds.
- `FlyCareMapStage` only flashes for linked unhandled MySQL events or fresh Mongo alert state.

### `PUT /api/v1/events/{event_id}/handle`

Query params:

- `event_status`: one of `resolved`, `unhandled`, `confirmed`, `false_alarm`
- `handled_by`: optional
- `remark`: optional

Response:

- Same event object shape as `GET /api/v1/events/`.

Boundary:

- This handles backend events. It does not directly control or clear hardware state.

## Resident API

Backend source:

- `E:\flycare\backend\backend\app\api\routes\residents.py`
- `E:\flycare\frontend\src\hooks\useBackendResidentSnapshot.ts`
- `E:\flycare\frontend\src\adapters\position-command-center.ts`

### `GET /api/v1/residents/`

Query params:

- `skip`
- `limit`

Response shape consumed by frontend:

```json
[
  {
    "id": "15",
    "name": "NG WAI LUN",
    "avatar_url": null,
    "room": "Customer Services",
    "role_type": "elderly",
    "status": "stable",
    "last_seen_at": "2026-06-16T19:14:16.240000+00:00",
    "last_seen_location": "Customer Services",
    "vitals": {
      "hr": 83,
      "spo2": 98
    },
    "checked_out": false,
    "device_id": 8,
    "device_current_status": "online",
    "device_battery_level": 95,
    "device_deploy_location": "Gate 10"
  }
]
```

Boundary:

- The route name and fields are legacy-compatible. Do not rename `/residents`, `elderly_user_id`, or role value `elderly` in frontend-only FlyCare documentation or prompts.

## Mongo Upstream API

Backend source:

- `E:\flycare\backend\backend\app\api\routes\mongo_upstream.py`
- `E:\flycare\frontend\src\services\api.ts`
- `E:\flycare\frontend\src\adapters\position-command-center.ts`

### `GET /api/v1/mongo-upstream/latest`

Query params:

- `device_id`
- `data_type`
- `exclude_data_type`

Response shape when found:

```json
{
  "_id": "example-status-id",
  "device_id": "ESP32_48CA43A42298",
  "mysql_device_id": 8,
  "server_received_at": "2026-06-16T19:14:16.240000+00:00",
  "location": {
    "current": {
      "x": 4.35,
      "y": 2.10,
      "name": "Customer Services"
    }
  },
  "fall_detection": {
    "state_description": "Normal",
    "is_fall_confirmed": false
  },
  "sos": {
    "active": false
  },
  "sensors": {},
  "system": {}
}
```

Response when not found:

```json
{}
```

Frontend behavior:

- `position-command-center.ts` requests multiple latest documents per device and merges status, heartbeat, vitals, and valid location data.
- Flight documents are excluded from the main position snapshot.

### `GET /api/v1/mongo-upstream/location/latest`

Query params:

- `device_id`: external MQTT/Mongo ID or MySQL device ID
- `scan_limit`: optional, default from backend route

Response when found:

```json
{
  "found": true,
  "device_id": "ESP32_48CA43A42298",
  "mysql_device_id": 8,
  "server_received_at": "2026-06-16T19:14:16.240000+00:00",
  "x": 4.35,
  "y": 2.10,
  "location_name": "Customer Services",
  "location_zone_id": null
}
```

Response when not found:

```json
{
  "found": false,
  "device_id": "ESP32_48CA43A42298",
  "message": "No valid current.x/current.y location found in recent upstream documents"
}
```

### `GET /api/v1/mongo-upstream/`

Query params used by FlyCare activity history:

- `device_id`
- `page=1`
- `page_size=12`

Response shape:

```json
{
  "page": 1,
  "page_size": 12,
  "total": 12,
  "items": []
}
```

### `GET /api/v1/mongo-upstream/flight/latest`

Query params:

- `device_id`: optional, used by `/flycare`

Response when found:

```json
{
  "found": true,
  "device_id": "ESP32_48CA43A42298",
  "mysql_device_id": 8,
  "command_type": "flight_info",
  "flight_info": {
    "flight_number": "CX910",
    "airline": "Cathay Pacific",
    "departure_airport": "HKG",
    "destination": "Singapore",
    "seat_number": "21C",
    "scheduled_departure": "17:35",
    "estimated_departure": "17:56",
    "boarding_time": "17:05",
    "boarding_gate": "10",
    "status": "delayed",
    "delay_minutes": 21,
    "delay_reason": "Gate Change to 10",
    "gate_changed": true,
    "terminal": "T1",
    "checkin_counter": "C12-C18"
  },
  "passengerName": "NG WAI LUN",
  "flightNumber": "CX910",
  "gate": "10",
  "flightTime": "17:35",
  "departureAirport": "HKG",
  "arrivalAirport": "Singapore",
  "seatNumber": "21C"
}
```

Response when not found:

```json
{
  "found": false,
  "message": "No flight upstream data found. Publish to MQTT topic smartwatch/{device_id}/flight or POST /api/v1/mongo-upstream/flight with device_id."
}
```

Frontend behavior:

- `flycare-flight.ts` accepts exact device ID matches.
- It also accepts alias responses when `mysql_device_id` matches the expected MySQL device.
- It reads rich flight details from nested `flight_info` when legacy flat fields are absent.

## FlyCare Admin API

Backend source:

- `E:\flycare\backend\backend\app\api\routes\flycare_admin.py`
- `E:\flycare\backend\backend\app\services\mqtt_publish.py`
- `E:\flycare\frontend\src\components\admin\FlyCareAdmin.tsx`

### `GET /api/v1/flycare-admin/presets`

Response shape:

```json
{
  "items": [
    {
      "device_id": "ESP32_000048CA43A42298",
      "mysql_device_id": 8,
      "elderly_user_id": 15,
      "passengerName": "NG WAI LUN",
      "deploy_location": "Gate 10",
      "mqtt_topic": "smartwatch/ESP32_000048CA43A42298/flight"
    }
  ],
  "mqtt_topic": "smartwatch/flight",
  "downlink_topic_template": "smartwatch/{device_id}/flight"
}
```

### `GET /api/v1/flycare-admin/mqtt/status`

Response shape:

```json
{
  "enabled": true,
  "connected": true,
  "broker": "127.0.0.1",
  "port": 1883,
  "retry_pending": false,
  "last_error": null,
  "subscribed_topics": [
    "smartwatch/+/status",
    "smartwatch/+/location",
    "smartwatch/+/sos",
    "smartwatch/+/fall",
    "smartwatch/+/heartbeat",
    "smartwatch/+/vitals",
    "smartwatch/+/flight"
  ]
}
```

Note: latest hardware stack evidence used broker `192.168.0.203:1883`; the shape above is still the contract shape.

### `POST /api/v1/flycare-admin/flight/publish`

Request shape:

```json
{
  "device_id": "ESP32_000048CA43A42298",
  "mysql_device_id": 8,
  "passengerName": "NG WAI LUN",
  "flightNumber": "CX910",
  "airline": "Cathay Pacific",
  "departureAirport": "HKG",
  "destination": "Singapore",
  "seatNumber": "21C",
  "scheduled_departure": "17:35",
  "estimated_departure": "17:56",
  "boarding_time": "17:05",
  "boarding_gate": "10",
  "status": "delayed",
  "delay_minutes": 21,
  "delay_reason": "Gate Change to 10",
  "gate_changed": true,
  "terminal": "T1",
  "checkin_counter": "C12-C18",
  "publish_mqtt": true,
  "save_mongo": true
}
```

Response shape:

```json
{
  "status": "ok",
  "payload": {
    "device_id": "ESP32_000048CA43A42298",
    "mysql_device_id": 8,
    "data_type": "flight",
    "command_type": "flight_info",
    "flight_info": {
      "flight_number": "CX910",
      "boarding_gate": "10"
    }
  },
  "mqtt_payload": {
    "command_type": "flight_info",
    "flight_info": {
      "flight_number": "CX910",
      "boarding_gate": "10"
    }
  },
  "mqtt": {
    "ok": true,
    "topic": "smartwatch/ESP32_000048CA43A42298/flight",
    "topics": [
      "smartwatch/ESP32_000048CA43A42298/flight",
      "smartwatch/ESP32_48CA43A42298/flight"
    ],
    "aliases": [
      "ESP32_000048CA43A42298",
      "ESP32_48CA43A42298"
    ],
    "alias_results": [],
    "qos": 1,
    "broker": "127.0.0.1:1883",
    "error": null
  },
  "mongo": {
    "ok": true,
    "db_name": "smart_elderly_care_system",
    "collection": "device_raw_upstream",
    "error": null,
    "skipped": false,
    "inserted_id": "..."
  }
}
```

Boundary:

- Admin frontend does not publish MQTT directly.
- Admin frontend posts to backend.
- Backend publishes MQTT and/or saves Mongo.
- `save_mongo=true` alone is a UI/demo fallback, not proof that the smartwatch received the command.

## Data Reception And Serial Ingest Support

### `GET /api/v1/data-reception/mqtt/status`

Used by local stack and audit scripts to prove subscriber state.

Response shape matches the MQTT status fields shown above.

### `POST /api/v1/mongo-upstream/serial-ingest`

Request shape:

```json
{
  "topic": "smartwatch/ESP32_48CA43A42298/status",
  "payload": {
    "device_id": "ESP32_48CA43A42298",
    "data_type": "status_update"
  }
}
```

Response shape:

```json
{
  "status": "ok",
  "device_id": "ESP32_48CA43A42298",
  "data_type": "status_update"
}
```

Boundary:

- Serial ingest is a local USB fallback when network topology blocks direct watch MQTT.
- The preferred software-only local smoke broker is `127.0.0.1:1883`.

## MQTT Topics

Repo source:

- `E:\flycare\docs\FLYCARE_MQTT.md`
- `E:\flycare\backend\backend\app\services\mqtt_subscriber.py`
- `E:\flycare\backend\backend\app\services\mqtt_publish.py`

Implemented topic root:

- Default local root: `smartwatch`

Uplink topics:

- `smartwatch/+/status`
- `smartwatch/+/location`
- `smartwatch/+/sos`
- `smartwatch/+/fall`
- `smartwatch/+/door`
- `smartwatch/+/light`
- `smartwatch/+/log`
- `smartwatch/+/heartbeat`
- `smartwatch/+/vitals`

Flight downlink:

- `smartwatch/{device_id}/flight`
- QoS 1 and retained flag are documented in `docs\FLYCARE_MQTT.md`.

Legacy compatibility:

- `flycare/flight`
- `smartwatch/flight`

## Explicit Non-Claims

- This contract is not production-ready.
- This contract is not aviation-grade.
- This contract does not prove frontend direct hardware control.
- This contract does not include production RBAC.
- This contract does not include browser WebSocket/SSE/offline/push behavior for `/flycare`.
