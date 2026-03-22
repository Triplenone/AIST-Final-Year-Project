CREATE DATABASE  IF NOT EXISTS `smart_elderly_care_system` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `smart_elderly_care_system`;
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
INSERT INTO `device` VALUES
(1,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.0',1,'AA:BB:CC:DD:EE:01','online',85,'test-room01','2025-11-23 10:00:00','2025-11-23 10:00:00'),
(2,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.1',4,'AA:BB:CC:DD:EE:02','online',80,'test-room02','2025-11-23 10:05:00','2025-11-23 10:05:00'),
(3,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.0',6,'AA:BB:CC:DD:EE:03','abnormal',75,'test-room03','2025-11-23 10:10:00','2025-11-23 10:10:00'),
(4,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.2',8,'AA:BB:CC:DD:EE:04','offline',70,'test-room04','2025-11-23 10:15:00','2025-11-23 10:15:00'),
(5,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.1',10,'AA:BB:CC:DD:EE:05','online',90,'test-room05','2025-11-23 10:20:00','2025-11-23 10:20:00'),
(6,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.0',11,'AA:BB:CC:DD:EE:06','online',65,'test-room06','2025-11-23 10:25:00','2025-11-23 10:25:00'),
(7,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.2',12,'AA:BB:CC:DD:EE:07','abnormal',30,'test-room07','2025-11-23 10:30:00','2025-11-23 10:30:00'),
(8,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.1',NULL,'AA:BB:CC:DD:EE:08','offline',50,'test-room08','2025-11-23 10:35:00','2025-11-23 10:35:00'),
(9,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.0',NULL,'AA:BB:CC:DD:EE:09','online',88,'test-room09','2025-11-23 10:40:00','2025-11-23 10:40:00'),
(10,'IMU_Safety_Sensor','ESP32-based IMU Fall Detection V1.2',NULL,'AA:BB:CC:DD:EE:10','online',78,'test-room10','2025-11-23 10:45:00','2025-11-23 10:45:00'),
(11,'IMU_Safety_Sensor','test-esp21',NULL,'0000','offline',99,'test-room01','2025-11-23 10:50:00','2025-11-23 10:50:00');
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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备实时数据日志表（关联device表，device_id为int自增）';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device_data_log`
--

LOCK TABLES `device_data_log` WRITE;
/*!40000 ALTER TABLE `device_data_log` DISABLE KEYS */;
INSERT INTO `device_data_log` VALUES (1,1,1234567890,1234567890,0.123000,-0.046000,1.023000,1.254000,-0.754000,0.325000,2.350000,3.670000,0.000000,1.250000,'medium',4,'确认跌倒',0.90,1,4.25,'前',1234567890,1,1,85,'2024-01-01 14:30:25','2025-11-19 21:18:04'),(2,1,1763648791,1763648791,2.456000,-1.234000,9.876000,15.234000,-8.765000,12.345000,5.670000,8.920000,0.500000,2.500000,'high',4,'确认跌倒',0.95,1,6.80,'前',1763648791,1,1,82,'2025-11-20 22:26:31','2025-11-20 22:26:31'),(3,1,1763650811,1763650811,0.123000,-0.046000,1.023000,1.254000,-0.754000,0.325000,2.350000,3.670000,0.000000,1.250000,'medium',0,'正常',0.00,0,0.00,'',1763650811,1,1,85,'2025-11-20 15:00:11','2025-11-20 23:00:19'),(4,1,1763650834,1763650834,2.456000,-1.234000,9.876000,15.234000,-8.765000,12.345000,2.350000,3.670000,0.000000,1.250000,'medium',4,'确认跌倒',0.95,1,6.80,'前',1763650834,1,1,85,'2025-11-20 15:00:34','2025-11-20 23:00:59');
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event`
--

LOCK TABLES `event` WRITE;
/*!40000 ALTER TABLE `event` DISABLE KEYS */;
INSERT INTO `event` VALUES
(1,'fall',1,1,1,'2025-11-23 11:00:00','null','resolved',NULL,'2025-11-23 11:30:00',''),
(2,'fall',4,2,2,'2025-11-23 11:05:00','null','resolved',NULL,'2025-11-23 11:35:00',''),
(3,'fall',6,3,3,'2025-11-23 11:10:00','null','resolved',NULL,'2025-11-23 11:40:00',''),
(4,'fall',8,4,4,'2025-11-23 11:15:00','null','resolved',NULL,'2025-11-23 11:45:00',''),
(5,'fall',10,5,5,'2025-11-23 11:20:00','null','resolved',NULL,'2025-11-23 11:50:00',''),
(6,'fall',11,6,6,'2025-11-23 11:25:00','null','resolved',NULL,'2025-11-23 11:55:00',''),
(7,'fall',12,7,7,'2025-11-23 11:30:00','null','resolved',NULL,'2025-11-23 12:00:00','');
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
INSERT INTO `user_status` VALUES
(1,1,1,1,75,98.50,36.50,1,'2025-11-23 11:05:00','2025-11-23 11:05:00'),
(2,4,2,2,78,97.80,36.30,1,'2025-11-23 11:10:00','2025-11-23 11:10:00'),
(3,6,3,3,72,99.20,36.70,1,'2025-11-23 11:15:00','2025-11-23 11:15:00'),
(4,8,4,4,76,98.00,36.40,1,'2025-11-23 11:20:00','2025-11-23 11:20:00'),
(5,10,5,5,80,97.20,36.20,1,'2025-11-23 11:25:00','2025-11-23 11:25:00'),
(6,11,6,6,74,98.10,36.60,1,'2025-11-23 11:30:00','2025-11-23 11:30:00'),
(7,12,7,7,73,98.60,36.40,1,'2025-11-23 11:35:00','2025-11-23 11:35:00');
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

-- Dump completed on 2025-11-21  0:07:32
