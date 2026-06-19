-- FlyCare final demo visible binding layer.
-- This migration does not delete or renumber existing users/devices/events.

CREATE TABLE IF NOT EXISTS flycare_demo_registry (
  demo_id INT NOT NULL PRIMARY KEY,
  mysql_device_id INT NOT NULL,
  user_id INT NOT NULL,
  canonical_device_id VARCHAR(64) NOT NULL,
  alias_device_ids JSON NULL,
  display_name VARCHAR(100) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_flycare_demo_registry_device
    FOREIGN KEY (mysql_device_id) REFERENCES device(device_id),
  CONSTRAINT fk_flycare_demo_registry_user
    FOREIGN KEY (user_id) REFERENCES user(user_id)
);

INSERT INTO flycare_demo_registry (
  demo_id,
  mysql_device_id,
  user_id,
  canonical_device_id,
  alias_device_ids,
  display_name,
  enabled,
  sort_order
) VALUES
  (1, 8, 15, 'ESP32_000048CA43A42298', JSON_ARRAY('ESP32_48CA43A42298'), 'NG WAI LUN', 1, 1),
  (2, 3, 4, 'ESP32_0000C8292A04A7AC', JSON_ARRAY('ESP32_00005CFA7AD4DB1C'), 'WONG KA MING', 1, 2),
  (3, 4, 8, 'ESP32_0000A022A443CA48', JSON_ARRAY(), 'HO CHI WAI', 1, 3),
  (4, 6, 13, 'ESP32_00008C292A04A7AC', JSON_ARRAY(), 'MA KA WAI', 1, 4),
  (5, 7, 14, 'ESP32_00009022A443CA48', JSON_ARRAY(), 'YIP MAN LING', 1, 5),
  (6, 9, 16, 'ESP32_0000E03948D4DB1C', JSON_ARRAY('ESP32_1CDBD44839E0'), 'LEE KA YAN', 1, 6)
ON DUPLICATE KEY UPDATE
  mysql_device_id = VALUES(mysql_device_id),
  user_id = VALUES(user_id),
  canonical_device_id = VALUES(canonical_device_id),
  alias_device_ids = VALUES(alias_device_ids),
  display_name = VALUES(display_name),
  enabled = VALUES(enabled),
  sort_order = VALUES(sort_order),
  updated_at = CURRENT_TIMESTAMP;
