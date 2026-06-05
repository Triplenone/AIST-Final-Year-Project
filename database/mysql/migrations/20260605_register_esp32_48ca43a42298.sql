-- Register FlyCare ESP32_48CA43A42298 and bind it to a stable Hong Kong demo user.
--
-- This migration is idempotent:
-- - it creates NG WAI LUN only if the name does not already exist;
-- - it resolves the user ID by name;
-- - it unbinds duplicate assignments for that user before binding device 8.
--
-- Run against smart_elderly_care_system after the base dump and earlier FlyCare migrations.

USE smart_elderly_care_system;

INSERT INTO `user` (
  name,
  role_type,
  gender,
  age,
  contact_info,
  medical_conditions,
  created_at,
  updated_at
)
SELECT
  'NG WAI LUN',
  'elderly',
  'male',
  72,
  '',
  '',
  NOW(),
  NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `user` WHERE name = 'NG WAI LUN'
);

SET @ng_wai_lun_user_id := (
  SELECT user_id FROM `user` WHERE name = 'NG WAI LUN' ORDER BY user_id LIMIT 1
);

UPDATE `user`
SET
  role_type = 'elderly',
  gender = 'male',
  age = 72,
  updated_at = NOW()
WHERE user_id = @ng_wai_lun_user_id;

UPDATE device
SET elderly_user_id = NULL
WHERE elderly_user_id = @ng_wai_lun_user_id
  AND device_id <> 8;

UPDATE device
SET
  device_type = 'IMU_Safety_Sensor',
  model_desc = 'ESP32_48CA43A42298',
  elderly_user_id = @ng_wai_lun_user_id,
  mac_address = 'AA:BB:CC:DD:EE:08',
  current_status = 'offline',
  deploy_location = 'test-room08'
WHERE device_id = 8;

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
  8,
  'IMU_Safety_Sensor',
  'ESP32_48CA43A42298',
  @ng_wai_lun_user_id,
  'AA:BB:CC:DD:EE:08',
  'offline',
  NULL,
  'test-room08'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM device WHERE device_id = 8);

SELECT
  d.device_id,
  d.model_desc,
  d.elderly_user_id,
  u.name AS bound_name,
  d.deploy_location
FROM device d
LEFT JOIN `user` u ON u.user_id = d.elderly_user_id
WHERE d.device_id = 8;
