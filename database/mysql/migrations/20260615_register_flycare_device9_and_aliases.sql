-- Register FlyCare device 9 with a Hong Kong demo passenger and align device 3's requested ESP32 ID.
--
-- This migration is idempotent:
-- - it renames the temporary WATCH 2 user to LEE KA YAN when present;
-- - it creates LEE KA YAN only if neither name exists;
-- - it binds the uploaded S3R8 sketch's emitted ID ESP32_0000E03948D4DB1C to MySQL device 9;
-- - ESP32_1CDBD44839E0 remains a backward-compatible alias in backend/backend/config/device_id_map.json;
-- - it makes ESP32_0000C8292A04A7AC the canonical display ID for MySQL device 3.
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
  'LEE KA YAN',
  'elderly',
  'female',
  68,
  '',
  'FlyCare demo passenger',
  NOW(),
  NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `user` WHERE name IN ('LEE KA YAN', 'WATCH 2')
);

SET @flycare_device9_user_id := (
  SELECT user_id
  FROM `user`
  WHERE name IN ('LEE KA YAN', 'WATCH 2')
  ORDER BY
    CASE name
      WHEN 'LEE KA YAN' THEN 0
      WHEN 'WATCH 2' THEN 1
      ELSE 2
    END,
    user_id
  LIMIT 1
);

UPDATE `user`
SET
  name = 'LEE KA YAN',
  role_type = 'elderly',
  gender = 'female',
  age = 68,
  medical_conditions = 'FlyCare demo passenger',
  updated_at = NOW()
WHERE user_id = @flycare_device9_user_id;

UPDATE device
SET elderly_user_id = NULL
WHERE elderly_user_id = @flycare_device9_user_id
  AND device_id <> 9;

UPDATE device
SET
  device_type = 'IMU_Safety_Sensor',
  model_desc = 'ESP32_0000E03948D4DB1C',
  elderly_user_id = @flycare_device9_user_id,
  mac_address = '1C:DB:D4:48:39:E0',
  current_status = 'online',
  deploy_location = 'Gate 11'
WHERE device_id = 9;

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
  9,
  'IMU_Safety_Sensor',
  'ESP32_0000E03948D4DB1C',
  @flycare_device9_user_id,
  '1C:DB:D4:48:39:E0',
  'online',
  0,
  'Gate 11'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM device WHERE device_id = 9);

SET @wong_ka_ming_user_id := (
  SELECT user_id FROM `user` WHERE name = 'WONG KA MING' ORDER BY user_id LIMIT 1
);

UPDATE device
SET
  device_type = 'IMU_Safety_Sensor',
  model_desc = 'ESP32_0000C8292A04A7AC',
  elderly_user_id = COALESCE(@wong_ka_ming_user_id, elderly_user_id),
  deploy_location = COALESCE(NULLIF(deploy_location, ''), 'Security Checkpoint')
WHERE device_id = 3;

SELECT
  d.device_id,
  d.model_desc,
  d.elderly_user_id,
  u.name AS bound_name,
  d.current_status,
  d.deploy_location
FROM device d
LEFT JOIN `user` u ON u.user_id = d.elderly_user_id
WHERE d.device_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9)
ORDER BY d.device_id;
