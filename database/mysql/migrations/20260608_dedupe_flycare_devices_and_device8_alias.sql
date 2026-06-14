-- Align FlyCare local demo devices with the canonical device registry.
--
-- This migration is idempotent:
-- - device 4 remains the only HO CHI WAI device binding;
-- - device 5 remains the only TANG WAI HAN device binding;
-- - device 8 remains bound to NG WAI LUN and uses the full ESP32_000048CA43A42298 ID.

USE smart_elderly_care_system;

SET @ho_chi_wai_user_id := (
  SELECT user_id FROM `user` WHERE name = 'HO CHI WAI' ORDER BY user_id LIMIT 1
);

SET @tang_wai_han_user_id := (
  SELECT user_id FROM `user` WHERE name = 'TANG WAI HAN' ORDER BY user_id LIMIT 1
);

SET @ng_wai_lun_user_id := (
  SELECT user_id FROM `user` WHERE name = 'NG WAI LUN' ORDER BY user_id LIMIT 1
);

UPDATE device
SET
  elderly_user_id = NULL,
  current_status = 'offline',
  deploy_location = COALESCE(NULLIF(deploy_location, ''), 'test-room09')
WHERE device_id = 9
  AND elderly_user_id = @ho_chi_wai_user_id;

UPDATE device
SET
  elderly_user_id = NULL,
  current_status = 'offline',
  deploy_location = COALESCE(NULLIF(deploy_location, ''), 'test-room10')
WHERE device_id = 10
  AND elderly_user_id = @tang_wai_han_user_id;

UPDATE device
SET
  device_type = 'IMU_Safety_Sensor',
  model_desc = 'ESP32_000048CA43A42298',
  elderly_user_id = @ng_wai_lun_user_id,
  current_status = 'offline',
  deploy_location = 'test-room08'
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
WHERE d.device_id IN (4, 5, 8, 9, 10)
ORDER BY d.device_id;

SELECT
  elderly_user_id,
  COUNT(*) AS device_count,
  GROUP_CONCAT(device_id ORDER BY device_id) AS device_ids
FROM device
WHERE elderly_user_id IS NOT NULL
GROUP BY elderly_user_id
HAVING COUNT(*) > 1;
