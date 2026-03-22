-- ============================================
-- 简化版：插入确认跌倒的设备数据日志
-- is_fall_confirmed = 1
-- ============================================

-- 方法1：使用 NOW() 自动生成时间
INSERT INTO `device_data_log` (
    `device_id`, `timestamp`, `relative_time`,
    `accel_x`, `accel_y`, `accel_z`,
    `gyro_x`, `gyro_y`, `gyro_z`,
    `loc_x`, `loc_y`, `loc_z`, `loc_accuracy`, `position_quality`,
    `fall_state`, `fall_state_description`, `fall_confidence`, `is_fall_confirmed`,
    `impact_force`, `fall_direction`, `fall_time`,
    `wifi_connected`, `server_connected`, `battery_level`,
    `server_receive_time`
) VALUES (
    1,                              -- device_id（请根据实际情况调整）
    UNIX_TIMESTAMP(NOW()),          -- timestamp: 当前时间的Unix时间戳
    UNIX_TIMESTAMP(NOW()),          -- relative_time: 当前时间的Unix时间戳
    2.456000,                       -- accel_x: 加速度计X轴（跌倒时数值较大）
    -1.234000,                      -- accel_y: 加速度计Y轴
    9.876000,                       -- accel_z: 加速度计Z轴（垂直方向，跌倒时数值大）
    15.234000,                      -- gyro_x: 陀螺仪X轴（跌倒时角速度大）
    -8.765000,                      -- gyro_y: 陀螺仪Y轴
    12.345000,                      -- gyro_z: 陀螺仪Z轴
    5.670000,                       -- loc_x: 位置X坐标
    8.920000,                       -- loc_y: 位置Y坐标
    0.500000,                       -- loc_z: 位置Z坐标（跌倒后高度降低）
    2.500000,                       -- loc_accuracy: 位置精度
    'high',                         -- position_quality: 位置质量
    4,                              -- fall_state: 跌倒状态编码（4=确认跌倒）
    '确认跌倒',                      -- fall_state_description: 跌倒状态描述
    0.95,                           -- fall_confidence: 跌倒置信度（95%）
    1,                              -- is_fall_confirmed: 确认跌倒（1=是）
    6.80,                           -- impact_force: 冲击力度
    '前',                           -- fall_direction: 跌倒方向
    UNIX_TIMESTAMP(NOW()),          -- fall_time: 跌倒时间戳
    1,                              -- wifi_connected: WiFi已连接
    1,                              -- server_connected: 服务器已连接
    82,                             -- battery_level: 电池电量82%
    NOW()                           -- server_receive_time: 服务器接收时间
);

-- 方法2：使用固定时间戳（2024-12-25 14:30:56）
INSERT INTO `device_data_log` (
    `device_id`, `timestamp`, `relative_time`,
    `accel_x`, `accel_y`, `accel_z`,
    `gyro_x`, `gyro_y`, `gyro_z`,
    `loc_x`, `loc_y`, `loc_z`, `loc_accuracy`, `position_quality`,
    `fall_state`, `fall_state_description`, `fall_confidence`, `is_fall_confirmed`,
    `impact_force`, `fall_direction`, `fall_time`,
    `wifi_connected`, `server_connected`, `battery_level`,
    `server_receive_time`
) VALUES (
    1,                              -- device_id
    1735123456,                     -- timestamp: 2024-12-25 14:30:56
    1735123456,                     -- relative_time
    2.456000, -1.234000, 9.876000,  -- 加速度计数据
    15.234000, -8.765000, 12.345000, -- 陀螺仪数据
    5.670000, 8.920000, 0.500000,   -- 位置坐标
    2.500000, 'high',               -- 位置精度和质量
    4, '确认跌倒', 0.95, 1,         -- 跌倒信息（is_fall_confirmed=1）
    6.80, '前', 1735123456,         -- 冲击力度、方向、时间
    1, 1, 82,                       -- 连接状态和电量
    '2024-12-25 14:30:56'           -- 服务器接收时间
);

-- 验证插入的数据
SELECT 
    id,
    device_id,
    FROM_UNIXTIME(timestamp) AS device_time,
    fall_state_description AS 跌倒状态,
    fall_confidence AS 置信度,
    is_fall_confirmed AS 确认跌倒,
    fall_direction AS 跌倒方向,
    FROM_UNIXTIME(fall_time) AS 跌倒时间,
    battery_level AS 电量,
    server_receive_time AS 接收时间
FROM `device_data_log`
WHERE is_fall_confirmed = 1
ORDER BY id DESC
LIMIT 1;

-- 注意：
-- 1. 执行此 SQL 后，如果 device_id=1 的设备绑定了用户（elderly_user_id不为空），
--    系统会自动创建一条待处理的跌倒事件（event）
-- 2. 可以在事件管理页面查看和处理该事件
-- 3. device_id 请根据实际数据库中的设备ID调整

