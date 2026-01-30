// 後端資料型別定義 (Backend data types)
// 與 TestStage-FYP 的 Pydantic/SQLAlchemy 結構對齊 (Aligned with TestStage-FYP schemas)

export type RoleType = 'elderly' | 'caregiver' | 'administrator';
export type Gender = 'male' | 'female' | 'other';

export interface BackendUser {
  user_id: number;
  name: string;
  role_type: RoleType;
  gender?: Gender | null;
  age?: number | null;
  contact_info?: string | null;
  medical_conditions?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type DeviceStatus = 'online' | 'offline' | 'abnormal';

export interface BackendDevice {
  device_id: number;
  device_type?: string | null;
  model_desc?: string | null;
  elderly_user_id?: number | null;
  mac_address?: string | null;
  current_status?: DeviceStatus | null;
  battery_level?: number | null;
  deploy_location?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type LocationCategory =
  | 'room'
  | 'corridor'
  | 'bathroom'
  | 'common_area'
  | 'outdoor_area';

export interface BackendLocation {
  location_zone_id: number;
  name?: string | null;
  category: LocationCategory;
  related_beacon_ids?: string | null;
  geofence_coordinates?: string | null;
  is_safe_zone: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export type EventType =
  | 'fall'
  | 'bed_exit'
  | 'bathroom_retention'
  | 'geofence_breach'
  | 'sos'
  | 'vital_signs_abnormal';

export type EventStatus = 'unhandled' | 'confirmed' | 'false_alarm' | 'resolved';

export interface BackendEvent {
  event_id: number;
  event_type: EventType;
  related_user_id: number;
  trigger_device_id: number;
  location_zone_id?: number | null;
  event_timestamp: string;
  event_params?: Record<string, unknown> | null;
  event_status: EventStatus;
  handled_by?: number | null;
  handled_at?: string | null;
  remark?: string | null;
}

export interface BackendUserStatus {
  user_status_id: number;
  user_id: number;
  device_id: number;
  location_zone_id?: number | null;
  heart_rate: number;
  blood_oxygen: number;
  body_temperature: number;
  is_normal: boolean;
  status_timestamp: string;
  updated_at?: string | null;
  user_name?: string | null;
  device_name?: string | null;
  location_name?: string | null;
}

export interface BackendDeviceDataLog {
  id: number;
  device_id: number;
  device_name?: string | null;
  device_type?: string | null;
  timestamp: number;
  relative_time: number;
  accel_x: number;
  accel_y: number;
  accel_z: number;
  gyro_x: number;
  gyro_y: number;
  gyro_z: number;
  loc_x: number;
  loc_y: number;
  loc_z: number;
  loc_accuracy: number;
  position_quality: string;
  fall_state: number;
  fall_state_description: string;
  fall_confidence: number;
  is_fall_confirmed: boolean;
  impact_force: number;
  fall_direction: string;
  fall_time: number;
  wifi_connected: boolean;
  server_connected: boolean;
  battery_level: number;
  server_receive_time: string;
  created_at?: string | null;
}

export interface BackendResidentVitals {
  hr?: number | null;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  spo2?: number | null;
  temperature?: number | null;
}

export type BackendResidentStatus = 'stable' | 'followUp' | 'high' | 'checked_out';

export interface BackendResident {
  id: string;
  name: string;
  room: string;
  role_type?: RoleType | null;
  status: BackendResidentStatus;
  role_type?: RoleType | null;
  last_seen_at?: string | null;
  last_seen_location?: string | null;
  vitals?: BackendResidentVitals | null;
  checked_out: boolean;
  created_at: string;
  updated_at: string;
  // 可能攜帶的額外欄位來自聚合 (Optional aggregated fields)
  user_status_id?: number | null;
  heart_rate?: number | null;
  blood_oxygen?: number | null;
  body_temperature?: number | null;
  is_normal?: boolean | null;
  status_timestamp?: string | null;
  device_id?: number | null;
  device_current_status?: string | null;
  device_battery_level?: number | null;
  device_deploy_location?: string | null;
}

export type CalculationCycle = 'daily' | 'weekly' | 'monthly';

export interface BackendKpiMetric {
  kpi_metric_id: number;
  name: string;
  calculation_cycle: CalculationCycle;
  value: number;
  target_threshold: number;
  record_timestamp: string;
}
