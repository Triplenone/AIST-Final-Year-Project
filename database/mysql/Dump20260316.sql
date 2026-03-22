-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: smart_elderly_care_system
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `device`
--

DROP TABLE IF EXISTS `device`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `device` (
  `device_id` int NOT NULL AUTO_INCREMENT,
  `device_type` varchar(50) DEFAULT NULL,
  `model_desc` varchar(100) DEFAULT NULL,
  `elderly_user_id` int DEFAULT NULL,
  `mac_address` varchar(20) DEFAULT NULL,
  `current_status` enum('online','offline','abnormal') DEFAULT 'offline',
  `battery_level` tinyint DEFAULT NULL,
  `deploy_location` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`device_id`),
  UNIQUE KEY `uk_mac_address` (`mac_address`),
  KEY `elderly_user_id` (`elderly_user_id`),
  CONSTRAINT `device_ibfk_1` FOREIGN KEY (`elderly_user_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device`
--

LOCK TABLES `device` WRITE;
/*!40000 ALTER TABLE `device` DISABLE KEYS */;
INSERT INTO `device` VALUES (1,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.0',1,'AA:BB:CC:DD:EE:01','online',85,'test-room01','2024-01-01 14:30:25','2024-01-01 14:30:25'),(2,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.1',4,'AA:BB:CC:DD:EE:02','online',80,'test-room02','2024-01-01 14:40:25','2024-01-01 14:40:25'),(3,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.0',6,'AA:BB:CC:DD:EE:03','abnormal',75,'test-room03','2024-01-01 14:50:25','2024-01-01 15:00:25'),(4,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.2',8,'AA:BB:CC:DD:EE:04','offline',70,'test-room04','2024-01-01 15:00:25','2024-01-01 15:00:25'),(5,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.1',10,'AA:BB:CC:DD:EE:05','online',90,'test-room05','2024-01-01 15:10:25','2024-01-01 15:10:25'),(6,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.0',1,'AA:BB:CC:DD:EE:06','online',65,'test-room06','2024-01-01 15:20:25','2024-01-01 15:20:25'),(7,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.2',4,'AA:BB:CC:DD:EE:07','abnormal',30,'test-room07','2024-01-01 15:30:25','2024-01-01 15:40:25'),(8,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.1',6,'AA:BB:CC:DD:EE:08','offline',50,'test-room08','2024-01-01 15:40:25','2024-01-01 15:40:25'),(9,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.0',8,'AA:BB:CC:DD:EE:09','online',88,'test-room09','2024-01-01 15:50:25','2024-01-01 15:50:25'),(10,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.2',10,'AA:BB:CC:DD:EE:10','online',78,'test-room10','2024-01-01 16:00:25','2024-01-01 16:00:25'),(11,'IMU_Safety_Sensor','test-esp21',NULL,'0000','offline',99,'room',NULL,'2025-11-20 15:12:10');
/*!40000 ALTER TABLE `device` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `device_data_log`
--

DROP TABLE IF EXISTS `device_data_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_data_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `device_id` int NOT NULL COMMENT '关联device表的自增主键',
  `timestamp` bigint NOT NULL COMMENT '设备端时间戳',
  `relative_time` bigint NOT NULL COMMENT '设备相对时间',
  `accel_x` decimal(10,6) NOT NULL COMMENT '加速度计X轴',
  `accel_y` decimal(10,6) NOT NULL COMMENT '加速度计Y轴',
  `accel_z` decimal(10,6) NOT NULL COMMENT '加速度计Z轴',
  `gyro_x` decimal(10,6) NOT NULL COMMENT '陀螺仪X轴',
  `gyro_y` decimal(10,6) NOT NULL COMMENT '陀螺仪Y轴',
  `gyro_z` decimal(10,6) NOT NULL COMMENT '陀螺仪Z轴',
  `loc_x` decimal(10,6) NOT NULL COMMENT '位置X坐标',
  `loc_y` decimal(10,6) NOT NULL COMMENT '位置Y坐标',
  `loc_z` decimal(10,6) NOT NULL COMMENT '位置Z坐标',
  `loc_accuracy` decimal(10,6) NOT NULL COMMENT '位置精度',
  `position_quality` varchar(20) NOT NULL COMMENT '位置质量（high/medium/low）',
  `fall_state` int NOT NULL COMMENT '跌倒状态编码',
  `fall_state_description` varchar(50) NOT NULL COMMENT '跌倒状态描述',
  `fall_confidence` decimal(5,2) NOT NULL COMMENT '跌倒置信度',
  `is_fall_confirmed` tinyint(1) NOT NULL COMMENT '是否确认跌倒（0=否，1=是）',
  `impact_force` decimal(10,2) NOT NULL COMMENT '冲击力度',
  `fall_direction` varchar(20) NOT NULL COMMENT '跌倒方向',
  `fall_time` bigint NOT NULL COMMENT '跌倒时间戳',
  `wifi_connected` tinyint(1) NOT NULL COMMENT 'WiFi连接状态（0=断开，1=连接）',
  `server_connected` tinyint(1) NOT NULL COMMENT '服务器连接状态（0=断开，1=连接）',
  `battery_level` tinyint NOT NULL COMMENT '电池电量（0-100）',
  `server_receive_time` datetime NOT NULL COMMENT '服务器接收时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '数据入库时间',
  PRIMARY KEY (`id`),
  KEY `idx_device_time` (`device_id`,`timestamp`),
  CONSTRAINT `device_data_log_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `device` (`device_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=296 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备实时数据日志表（关联device表，device_id为int自增）';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device_data_log`
--

LOCK TABLES `device_data_log` WRITE;
/*!40000 ALTER TABLE `device_data_log` DISABLE KEYS */;
INSERT INTO `device_data_log` VALUES (2,1,1763648791,1763648791,2.456000,-1.234000,9.876000,15.234000,-8.765000,12.345000,5.670000,8.920000,0.500000,2.500000,'high',4,'确认跌倒',0.95,1,6.80,'前',1763648791,1,1,82,'2025-11-20 22:26:31','2025-11-20 22:26:31'),(3,1,1763650811,1763650811,0.123000,-0.046000,1.023000,1.254000,-0.754000,0.325000,2.350000,3.670000,0.000000,1.250000,'medium',0,'正常',0.00,0,0.00,'',1763650811,1,1,85,'2025-11-20 15:00:11','2025-11-20 23:00:19'),(4,1,1763650834,1763650834,2.456000,-1.234000,9.876000,15.234000,-8.765000,12.345000,2.350000,3.670000,0.000000,1.250000,'medium',4,'确认跌倒',0.95,1,6.80,'前',1763650834,1,1,85,'2025-11-20 15:00:34','2025-11-20 23:00:59'),(258,1,1769972530,60279,0.270264,-0.064453,0.973877,0.122070,0.305176,-0.061035,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 03:02:10','2026-02-02 03:02:10'),(259,1,1769972536,69183,0.270752,-0.065186,0.974609,0.000000,0.122070,0.000000,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 03:02:16','2026-02-02 03:02:16'),(260,1,1769972542,75578,0.269775,-0.067871,0.978027,-3.173828,3.051758,0.061035,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 03:02:23','2026-02-02 03:02:22'),(261,1,1769972549,81953,0.265625,-0.062744,0.976807,0.000000,0.000000,-0.183105,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 03:02:29','2026-02-02 03:02:29'),(262,1,1769972555,88330,0.265137,-0.070068,0.975342,-0.671387,0.854492,0.061035,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 03:02:36','2026-02-02 03:02:35'),(263,1,1769972562,94735,0.264404,-0.068115,0.973389,-0.488281,0.854492,0.122070,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 03:02:42','2026-02-02 03:02:42'),(264,1,1769972568,101140,0.263184,-0.069580,0.975586,-0.122070,0.549316,0.061035,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 03:02:48','2026-02-02 03:02:48'),(265,1,1769972574,107515,0.261719,-0.065674,0.975830,-0.183105,0.305176,0.061035,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 03:02:55','2026-02-02 03:02:54'),(266,1,1769972581,113876,0.260010,-0.066406,0.978516,-0.671387,1.037598,0.000000,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 03:03:01','2026-02-02 03:03:01'),(267,1,1769972587,120251,0.421631,0.074951,0.966553,-43.212890,-63.964840,-98.754880,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 03:03:07','2026-02-02 03:03:07'),(268,1,1769972593,126612,-0.375244,0.379395,0.838867,-0.122070,0.061035,-0.305176,0.000000,0.000000,0.000000,999.000000,'low',3,'跌倒后静止',0.00,0,6.34,'',121449,1,0,85,'2026-02-02 03:03:14','2026-02-02 03:03:13'),(269,1,1769972600,132987,-0.373535,0.367920,0.840576,0.427246,-1.159668,-3.417969,0.000000,0.000000,0.000000,999.000000,'low',4,'确认跌倒',0.95,1,6.34,'',121449,1,0,85,'2026-02-02 03:03:20','2026-02-02 03:03:20'),(270,1,1769972606,139396,0.320557,-0.032715,0.961182,0.061035,1.281738,0.244141,0.000000,0.000000,0.000000,999.000000,'low',4,'确认跌倒',0.95,1,6.34,'',121449,1,0,85,'2026-02-02 03:03:27','2026-02-02 03:03:26'),(271,1,1769977983,294068,0.172852,-0.074707,0.991211,0.000000,0.366211,0.000000,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 04:33:04','2026-02-02 04:33:04'),(272,1,1769977990,303001,0.175537,-0.074707,0.991699,-0.122070,0.305176,-0.183105,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 04:33:10','2026-02-02 04:33:10'),(273,1,1769977996,309431,0.176270,-0.073975,0.992432,0.122070,0.183105,-0.122070,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 04:33:17','2026-02-02 04:33:16'),(274,1,1769979600,12804,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,999.000000,'low',1,'自由落体',0.00,0,0.00,'',0,0,0,85,'2026-02-02 05:00:00','2026-02-02 05:00:00'),(275,1,1769979606,22722,0.609863,0.470459,0.583984,-1.342773,1.525879,0.000000,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 05:00:07','2026-02-02 05:00:06'),(276,1,1769979613,29098,-0.074219,0.455811,0.876953,-0.427246,-2.563477,1.220703,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 05:00:13','2026-02-02 05:00:13'),(277,1,1769979619,35466,0.129639,0.413086,0.906006,0.549316,-0.732422,0.976563,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 05:00:20','2026-02-02 05:00:19'),(278,1,1769979625,41842,-0.134766,0.411133,0.907471,-2.258301,-3.234863,-2.075195,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 05:00:26','2026-02-02 05:00:25'),(279,1,1769979632,48225,0.312256,0.427002,0.840088,-0.976563,0.427246,1.403809,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 05:00:32','2026-02-02 05:00:32'),(280,1,1769979669,12816,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,999.000000,'low',1,'自由落体',0.00,0,0.00,'',0,0,0,85,'2026-02-02 05:01:09','2026-02-02 05:01:09'),(281,1,1769979675,23011,-0.090576,-0.256592,0.977051,-0.793457,0.000000,0.366211,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 05:01:16','2026-02-02 05:01:15'),(282,1,1769979682,29397,0.306641,-0.241455,0.940674,-1.281738,9.582520,0.366211,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,0.00,'',0,1,0,85,'2026-02-02 05:01:22','2026-02-02 05:01:22'),(283,1,1769979688,35794,0.878662,1.272217,0.336670,-416.748000,468.383800,146.362300,0.000000,0.000000,0.000000,999.000000,'low',2,'冲击检测',0.00,0,1.58,'前',35794,1,0,85,'2026-02-02 05:01:29','2026-02-02 05:01:28'),(284,1,1769979694,42191,0.561523,-0.183350,0.880127,-7.690430,53.527830,-18.493650,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,1.58,'',35794,1,0,85,'2026-02-02 05:01:35','2026-02-02 05:01:34'),(285,1,1769979712,12859,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,999.000000,'low',1,'自由落体',0.00,0,0.00,'',0,0,0,85,'2026-02-02 05:01:53','2026-02-02 05:01:52'),(286,1,1769979719,22025,-0.608643,-0.125977,0.982910,-65.002440,-3.295898,-50.170900,0.000000,0.000000,0.000000,999.000000,'low',2,'冲击检测',0.00,0,1.16,'上',22025,1,0,85,'2026-02-02 05:01:59','2026-02-02 05:01:59'),(287,1,1769979725,28402,0.120361,0.690674,-0.603027,-126.647900,35.217290,-546.020500,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,1.16,'',22025,1,0,85,'2026-02-02 05:02:05','2026-02-02 05:02:05'),(288,1,1769979731,34764,0.968262,0.156250,0.233643,1.037598,-0.183105,0.488281,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,2.50,'',29601,1,0,85,'2026-02-02 05:02:12','2026-02-02 05:02:11'),(289,1,1769979738,41140,0.300049,-0.351807,0.857422,-8.239746,13.610840,-16.662600,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,2.50,'',29601,1,0,85,'2026-02-02 05:02:18','2026-02-02 05:02:18'),(290,1,1769979744,47492,0.982422,0.146973,0.538086,-2.990723,13.610840,6.530762,0.000000,0.000000,0.000000,999.000000,'low',2,'冲击检测',0.00,0,1.13,'右',47492,1,0,85,'2026-02-02 05:02:25','2026-02-02 05:02:24'),(291,1,1769979750,53868,0.868896,-0.434570,0.317871,-0.122070,-3.845215,-2.685547,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,1.13,'',47492,1,0,85,'2026-02-02 05:02:31','2026-02-02 05:02:30'),(292,1,1769979757,60251,0.981934,-0.694580,0.661133,22.949220,292.663600,-144.958500,0.000000,0.000000,0.000000,999.000000,'low',2,'冲击检测',0.00,0,1.37,'右',60251,1,0,85,'2026-02-02 05:02:37','2026-02-02 05:02:37'),(293,1,1769979763,66627,0.239746,0.943359,-0.397705,-3.845215,-1.831055,-4.028320,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,1.37,'',60251,1,0,85,'2026-02-02 05:02:44','2026-02-02 05:02:43'),(294,1,1769979770,73016,0.752686,0.506348,-0.365479,-0.305176,0.732422,-0.915527,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,1.37,'',60251,1,0,85,'2026-02-02 05:02:50','2026-02-02 05:02:50'),(295,1,1769979776,79382,0.963623,0.148193,-0.256592,-2.441406,-0.732422,-0.854492,0.000000,0.000000,0.000000,999.000000,'low',0,'正常',0.00,0,1.37,'',60251,1,0,85,'2026-02-02 05:02:56','2026-02-02 05:02:56');
/*!40000 ALTER TABLE `device_data_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event`
--

DROP TABLE IF EXISTS `event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event` (
  `event_id` bigint NOT NULL AUTO_INCREMENT,
  `event_type` enum('fall','bed_exit','bathroom_retention','geofence_breach','sos','vital_signs_abnormal') NOT NULL,
  `related_user_id` int NOT NULL,
  `trigger_device_id` int NOT NULL,
  `location_zone_id` int DEFAULT NULL,
  `event_timestamp` datetime NOT NULL,
  `event_params` json DEFAULT NULL,
  `event_status` enum('unhandled','confirmed','false_alarm','resolved') DEFAULT 'unhandled',
  `handled_by` int DEFAULT NULL,
  `handled_at` datetime DEFAULT NULL,
  `remark` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`event_id`),
  KEY `related_user_id` (`related_user_id`),
  KEY `trigger_device_id` (`trigger_device_id`),
  KEY `location_zone_id` (`location_zone_id`),
  KEY `idx_event_timestamp` (`event_timestamp`),
  KEY `idx_event_status` (`event_status`),
  CONSTRAINT `event_ibfk_1` FOREIGN KEY (`related_user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `event_ibfk_2` FOREIGN KEY (`trigger_device_id`) REFERENCES `device` (`device_id`) ON DELETE CASCADE,
  CONSTRAINT `event_ibfk_3` FOREIGN KEY (`location_zone_id`) REFERENCES `location_zone` (`location_zone_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event`
--

LOCK TABLES `event` WRITE;
/*!40000 ALTER TABLE `event` DISABLE KEYS */;
INSERT INTO `event` VALUES (1,'fall',1,1,1,'2025-11-20 22:16:25','null','resolved',NULL,'2026-02-02 00:26:51','123'),(2,'fall',1,1,NULL,'2025-11-20 23:00:34','{\"log_id\": 4, \"fall_time\": 1763650834, \"fall_state\": 4, \"impact_force\": 6.8, \"fall_direction\": \"前\", \"fall_confidence\": 0.95, \"fall_state_description\": \"确认跌倒\"}','resolved',NULL,'2025-11-21 00:15:14','测试'),(3,'fall',1,1,NULL,'1970-01-01 14:59:43','{\"log_id\": 27, \"fall_time\": 25183, \"fall_state\": 4, \"impact_force\": 1.010649, \"fall_direction\": \"\", \"fall_confidence\": 0.95, \"fall_state_description\": \"确认跌倒\"}','resolved',NULL,'2026-02-02 00:26:17',''),(4,'fall',1,1,NULL,'1970-01-01 14:59:43','{\"log_id\": 28, \"fall_time\": 25183, \"fall_state\": 4, \"impact_force\": 1.010649, \"fall_direction\": \"\", \"fall_confidence\": 0.95, \"fall_state_description\": \"确认跌倒\"}','resolved',NULL,'2026-02-02 00:26:34',''),(23,'fall',1,1,NULL,'2026-02-02 02:55:01','{\"log_id\": 208, \"fall_time\": 95163, \"fall_state\": 4, \"impact_force\": 1.416973, \"fall_direction\": \"\", \"fall_confidence\": 0.9, \"fall_state_description\": \"确认跌倒\"}','resolved',NULL,'2026-02-02 03:00:53',''),(24,'fall',1,1,NULL,'2026-02-02 03:00:41','{\"log_id\": 255, \"fall_time\": 88404, \"fall_state\": 4, \"impact_force\": 8.330167, \"fall_direction\": \"\", \"fall_confidence\": 0.95, \"fall_state_description\": \"确认跌倒\"}','resolved',NULL,'2026-02-02 03:00:54',''),(25,'fall',1,1,NULL,'2026-02-02 03:03:20','{\"log_id\": 269, \"fall_time\": 121449, \"fall_state\": 4, \"impact_force\": 6.33805, \"fall_direction\": \"\", \"fall_confidence\": 0.95, \"fall_state_description\": \"确认跌倒\"}','resolved',NULL,'2026-02-02 03:03:32','');
/*!40000 ALTER TABLE `event` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpi_metrics`
--

DROP TABLE IF EXISTS `kpi_metrics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_metrics` (
  `kpi_metric_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `calculation_cycle` enum('daily','weekly','monthly') NOT NULL,
  `value` decimal(5,2) NOT NULL,
  `target_threshold` decimal(5,2) NOT NULL,
  `record_timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`kpi_metric_id`),
  UNIQUE KEY `uk_kpi_cycle_timestamp` (`name`,`calculation_cycle`,`record_timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpi_metrics`
--

LOCK TABLES `kpi_metrics` WRITE;
/*!40000 ALTER TABLE `kpi_metrics` DISABLE KEYS */;
/*!40000 ALTER TABLE `kpi_metrics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `location_zone`
--

DROP TABLE IF EXISTS `location_zone`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `location_zone` (
  `location_zone_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `category` enum('room','corridor','bathroom','common_area','outdoor_area') NOT NULL,
  `related_beacon_ids` varchar(200) DEFAULT NULL,
  `geofence_coordinates` text,
  `is_safe_zone` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`location_zone_id`),
  UNIQUE KEY `uk_location_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `location_zone`
--

LOCK TABLES `location_zone` WRITE;
/*!40000 ALTER TABLE `location_zone` DISABLE KEYS */;
INSERT INTO `location_zone` VALUES (1,'test-room01','room','BEACON-001,BEACON-002','116.403874,39.914885;116.404000,39.915000;116.404126,39.914920',1,'2024-01-01 09:00:00','2024-01-01 09:00:00'),(2,'test-room02','bathroom','BEACON-003','116.403950,39.914760;116.404020,39.914830;116.403980,39.914880',1,'2024-01-01 09:10:00','2024-01-01 09:10:00'),(3,'test-room03','corridor','BEACON-004,BEACON-005,BEACON-006','116.403780,39.914950;116.404250,39.914950;116.404250,39.915020',1,'2024-01-01 09:20:00','2024-01-01 09:20:00'),(4,'test-room04','common_area','BEACON-007,BEACON-008','116.403650,39.914680;116.404100,39.914680;116.404100,39.914850',1,'2024-01-01 09:30:00','2024-01-01 09:30:00'),(5,'test-room05','outdoor_area','BEACON-009','116.403500,39.915100;116.404300,39.915100;116.404300,39.915300',0,'2024-01-01 09:40:00','2024-01-01 09:40:00'),(6,'test-room06','room','BEACON-010,BEACON-011','116.404150,39.914700;116.404300,39.914700;116.404300,39.914820',1,'2024-01-01 09:50:00','2024-01-01 09:50:00'),(7,'test-room07','bathroom','BEACON-012','116.403820,39.914600;116.403890,39.914670;116.403850,39.914720',1,'2024-01-01 10:00:00','2024-01-01 10:00:00'),(8,'test-room08','common_area','BEACON-013,BEACON-014,BEACON-015','116.403700,39.914500;116.404200,39.914500;116.404200,39.914650',1,'2024-01-01 10:10:00','2024-01-01 10:10:00'),(9,'test-room09','corridor','BEACON-016,BEACON-017','116.403600,39.914900;116.403800,39.914900;116.403800,39.914980',1,'2024-01-01 10:20:00','2024-01-01 10:20:00'),(10,'test-room10','outdoor_area','BEACON-018','116.404400,39.915150;116.404700,39.915150;116.404700,39.915350',0,'2024-01-01 10:30:00','2024-01-01 10:30:00');
/*!40000 ALTER TABLE `location_zone` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `role_type` enum('elderly','caregiver','administrator') NOT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `age` int DEFAULT NULL,
  `contact_info` varchar(100) DEFAULT NULL,
  `medical_conditions` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'test-user01','elderly','male',78,'13800138001','高血压、轻度糖尿病','2024-01-01 08:00:00','2024-01-01 08:00:00'),(2,'test-user02','caregiver','female',45,'13800138002','','2024-01-01 08:30:00','2024-01-01 08:30:00'),(3,'test-user03','administrator','male',32,'13800138003','','2024-01-01 09:00:00','2024-01-01 09:00:00'),(4,'test-user04','elderly','female',82,'13800138004','骨质疏松、冠心病','2024-01-01 09:30:00','2024-01-01 09:30:00'),(5,'test-user05','caregiver','male',51,'13800138005','','2024-01-01 10:00:00','2024-01-01 10:00:00'),(6,'test-user06','elderly','other',75,'13800138006','关节炎','2024-01-01 10:30:00','2024-01-01 10:30:00'),(7,'test-user07','administrator','female',28,'13800138007','','2024-01-01 11:00:00','2024-01-01 11:00:00'),(8,'test-user08','elderly','male',69,'13800138008','高血压','2024-01-01 11:30:00','2024-01-01 11:30:00'),(9,'test-user09','caregiver','female',38,'13800138009','','2024-01-01 14:00:00','2024-01-01 14:00:00'),(10,'test-user10','elderly','male',85,'13800138010','糖尿病、帕金森','2024-01-01 14:30:00','2024-01-01 14:30:00'),(11,'insert-test-01','elderly','male',88,'','',NULL,'2025-11-20 15:10:02'),(12,'edit-test-01','elderly','male',85,'88','8888888\n',NULL,'2025-11-20 15:11:26');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_status`
--

DROP TABLE IF EXISTS `user_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_status` (
  `user_status_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `device_id` int NOT NULL,
  `location_zone_id` int DEFAULT NULL,
  `heart_rate` int NOT NULL COMMENT '心率（正常范围：60-100次/分钟）',
  `blood_oxygen` decimal(5,2) NOT NULL COMMENT '血氧饱和度（正常范围：95.00%-100.00%）',
  `body_temperature` decimal(5,2) NOT NULL COMMENT '体温（正常范围：36.00℃-37.20℃）',
  `is_normal` tinyint(1) DEFAULT '1' COMMENT '状态是否正常（基于生理指标判断）',
  `status_timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '状态采集时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_status_id`),
  KEY `device_id` (`device_id`),
  KEY `location_zone_id` (`location_zone_id`),
  KEY `idx_user_id_status` (`user_id`,`status_timestamp`),
  CONSTRAINT `user_status_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `user_status_ibfk_2` FOREIGN KEY (`device_id`) REFERENCES `device` (`device_id`) ON DELETE CASCADE,
  CONSTRAINT `user_status_ibfk_3` FOREIGN KEY (`location_zone_id`) REFERENCES `location_zone` (`location_zone_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='老年人用户实时状态表（含生理指标与位置关联）';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_status`
--

LOCK TABLES `user_status` WRITE;
/*!40000 ALTER TABLE `user_status` DISABLE KEYS */;
INSERT INTO `user_status` VALUES (1,1,1,1,75,98.50,36.50,1,'2024-01-01 15:00:00','2025-11-19 18:00:20'),(2,4,2,2,78,97.80,36.30,1,'2024-01-01 15:10:00','2025-11-19 18:00:20'),(3,6,3,3,72,99.20,36.70,1,'2024-01-01 15:20:00','2025-11-19 18:00:20'),(4,8,4,4,76,98.00,36.40,1,'2024-01-01 15:30:00','2025-11-19 18:00:20'),(5,10,5,5,80,97.20,36.20,1,'2024-01-01 15:40:00','2025-11-19 18:00:20');
/*!40000 ALTER TABLE `user_status` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-16  2:48:38
