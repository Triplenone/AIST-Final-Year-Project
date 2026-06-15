-- Canonicalize FlyCare device 4 for the live HO CHI WAI smartwatch.
--
-- This migration is idempotent:
-- - device 4 remains bound to HO CHI WAI;
-- - ESP32_0000A022A443CA48 is the canonical MQTT/Mongo device ID for device 4;
-- - the device row is marked online for the local FlyCare demo after a successful upload.

USE smart_elderly_care_system;

SET @ho_chi_wai_user_id := (
  SELECT user_id FROM `user` WHERE name = 'HO CHI WAI' ORDER BY user_id LIMIT 1
);

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
  4,
  'IMU_Safety_Sensor',
  'ESP32_0000A022A443CA48',
  @ho_chi_wai_user_id,
  '48:CA:43:A4:22:A0',
  'online',
  0,
  'Gate 10'
FROM DUAL
WHERE @ho_chi_wai_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM device WHERE device_id = 4);

UPDATE device
SET
  device_type = 'IMU_Safety_Sensor',
  model_desc = 'ESP32_0000A022A443CA48',
  elderly_user_id = COALESCE(@ho_chi_wai_user_id, elderly_user_id),
  mac_address = '48:CA:43:A4:22:A0',
  current_status = 'online',
  deploy_location = COALESCE(NULLIF(deploy_location, ''), 'Gate 10')
WHERE device_id = 4;

SELECT
  d.device_id,
  d.model_desc,
  d.elderly_user_id,
  u.name AS bound_name,
  d.mac_address,
  d.current_status,
  d.deploy_location
FROM device d
LEFT JOIN `user` u ON u.user_id = d.elderly_user_id
WHERE d.device_id = 4;
