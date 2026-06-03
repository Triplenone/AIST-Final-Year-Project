-- Bind FlyCare ESP32 devices 6 and 7 to stable Hong Kong demo users.
--
-- This migration is idempotent:
-- - it creates the demo users only when the names do not already exist;
-- - it resolves the user IDs by name;
-- - it unbinds duplicate assignments for those users before binding devices 6 and 7.
--
-- Run against smart_elderly_care_system after the base dump and earlier migrations.

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
  'MA KA WAI',
  'elderly',
  'male',
  73,
  '',
  '',
  NOW(),
  NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `user` WHERE name = 'MA KA WAI'
);

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
  'YIP MAN LING',
  'elderly',
  'female',
  76,
  '',
  '',
  NOW(),
  NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `user` WHERE name = 'YIP MAN LING'
);

SET @ma_ka_wai_user_id := (
  SELECT user_id FROM `user` WHERE name = 'MA KA WAI' ORDER BY user_id LIMIT 1
);

SET @yip_man_ling_user_id := (
  SELECT user_id FROM `user` WHERE name = 'YIP MAN LING' ORDER BY user_id LIMIT 1
);

UPDATE `user`
SET
  role_type = 'elderly',
  gender = 'male',
  age = 73,
  updated_at = NOW()
WHERE user_id = @ma_ka_wai_user_id;

UPDATE `user`
SET
  role_type = 'elderly',
  gender = 'female',
  age = 76,
  updated_at = NOW()
WHERE user_id = @yip_man_ling_user_id;

UPDATE device
SET elderly_user_id = NULL
WHERE elderly_user_id = @ma_ka_wai_user_id
  AND device_id <> 6;

UPDATE device
SET elderly_user_id = NULL
WHERE elderly_user_id = @yip_man_ling_user_id
  AND device_id <> 7;

UPDATE device
SET
  device_type = 'IMU_Safety_Sensor',
  model_desc = 'ESP32_00008C292A04A7AC',
  elderly_user_id = @ma_ka_wai_user_id,
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
  @ma_ka_wai_user_id,
  'AA:BB:CC:DD:EE:06',
  'offline',
  NULL,
  'test-room06'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM device WHERE device_id = 6);

UPDATE device
SET
  device_type = 'IMU_Safety_Sensor',
  model_desc = 'ESP32_00009022A443CA48',
  elderly_user_id = @yip_man_ling_user_id,
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
  @yip_man_ling_user_id,
  'AA:BB:CC:DD:EE:07',
  'offline',
  NULL,
  'test-room07'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM device WHERE device_id = 7);

SELECT
  d.device_id,
  d.model_desc,
  d.elderly_user_id,
  u.name AS bound_name,
  d.deploy_location
FROM device d
LEFT JOIN `user` u ON u.user_id = d.elderly_user_id
WHERE d.device_id IN (1, 2, 3, 4, 5, 6, 7)
ORDER BY d.device_id;
