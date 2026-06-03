-- Register ESP32 devices 6 and 7 with auto user binding.
-- Device 6 -> user 7 (user 6 already bound to device 3)
-- Device 7 -> user 9 (user 7 taken by device 6; user 8 taken to device 4)
--
-- Run against smart_elderly_care_system, then restart backend.

USE smart_elderly_care_system;

UPDATE device
SET
  device_type = 'IMU_Safety_Sensor',
  model_desc = 'ESP32_00008C292A04A7AC',
  elderly_user_id = 7,
  mac_address = 'AA:BB:CC:DD:EE:06',
  current_status = 'offline',
  deploy_location = 'test-room06'
WHERE device_id = 6;

INSERT INTO device (
  device_id,
  device_type,
  model_desc,
  elderly_user_id,
  mac_address,
  current_status,
  battery_level,
  deploy_location
)
SELECT
  6,
  'IMU_Safety_Sensor',
  'ESP32_00008C292A04A7AC',
  7,
  'AA:BB:CC:DD:EE:06',
  'offline',
  NULL,
  'test-room06'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM device WHERE device_id = 6);

-- Clear duplicate user bindings before assigning device 7 -> user 9
UPDATE device
SET elderly_user_id = NULL
WHERE elderly_user_id = 9 AND device_id <> 7;

UPDATE device
SET
  device_type = 'IMU_Safety_Sensor',
  model_desc = 'ESP32_00009022A443CA48',
  elderly_user_id = 9,
  mac_address = 'AA:BB:CC:DD:EE:07',
  current_status = 'offline',
  deploy_location = 'test-room07'
WHERE device_id = 7;

INSERT INTO device (
  device_id,
  device_type,
  model_desc,
  elderly_user_id,
  mac_address,
  current_status,
  battery_level,
  deploy_location
)
SELECT
  7,
  'IMU_Safety_Sensor',
  'ESP32_00009022A443CA48',
  9,
  'AA:BB:CC:DD:EE:07',
  'offline',
  NULL,
  'test-room07'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM device WHERE device_id = 7);

-- Ensure user 7 is only on device 6 (matches backend CRUD one-user-one-device rule)
UPDATE device
SET elderly_user_id = NULL
WHERE elderly_user_id = 7 AND device_id <> 6;

SELECT device_id, elderly_user_id, model_desc, deploy_location
FROM device
WHERE device_id IN (1, 2, 3, 4, 5, 6, 7)
ORDER BY device_id;
