-- Mark the live NG WAI LUN FlyCare watch as online for the local demo.
--
-- This migration is idempotent:
-- - device 8 remains bound to NG WAI LUN;
-- - ESP32_000048CA43A42298 remains the canonical MySQL model_desc;
-- - the backend still accepts ESP32_48CA43A42298 as a Mongo/MQTT alias.

USE smart_elderly_care_system;

SET @ng_wai_lun_user_id := (
  SELECT user_id FROM `user` WHERE name = 'NG WAI LUN' ORDER BY user_id LIMIT 1
);

UPDATE device
SET
  device_type = 'IMU_Safety_Sensor',
  model_desc = 'ESP32_000048CA43A42298',
  elderly_user_id = COALESCE(@ng_wai_lun_user_id, elderly_user_id),
  current_status = 'online',
  deploy_location = COALESCE(NULLIF(deploy_location, ''), 'Gate 10')
WHERE device_id = 8;

SELECT
  d.device_id,
  d.model_desc,
  d.elderly_user_id,
  u.name AS bound_name,
  d.current_status,
  d.deploy_location
FROM device d
LEFT JOIN `user` u ON u.user_id = d.elderly_user_id
WHERE d.device_id = 8;
