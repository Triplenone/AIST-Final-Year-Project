#ifndef CONFIG_H
#define CONFIG_H

// ??????謕?
#define DEVICE_ID "ESP32_SmartWatch"
#define CLOCK_DEVICE_LABEL "NG WAI LUN"

// Feature switches. Set to 1 only when the hardware path is ready.
#define ENABLE_BLE_LOCATION 1
#define ENABLE_IMU_SENSOR 0
#define ENABLE_FALL_DETECTION 1
// Final FlyCare smoke keeps SIMFALL available but does not run the continuous
// fall detector, because accidental wrist movement creates demo-polluting false
// fall events and Fall Detection is out of scope for this demo.
#define ENABLE_AUTO_FALL_DETECTION 0
#define ENABLE_MANUAL_NAVIGATION 0
#define ENABLE_NAVIGATION_DOWNLINK 0
#define ENABLE_FLIGHT_ROUTE_NAVIGATION 0
#define ENABLE_FLIGHT_ARRIVAL_TARGET 1
// Final demo keeps SD/TTS/I2S alert playback disabled because audio init has
// caused runtime aborts or direct MQTT loss on this watch.
#define ENABLE_AUDIO_ALERTS 0
#define ENABLE_TONE_ALERTS 0

// MAX30102 heart-rate contact/sampling settings.
// Keep HR validity gated by contact; do not lower this to fake a BPM reading.
#define HR_CONTACT_THRESHOLD 30000L
#define HR_LED_BRIGHTNESS 0x1F
#define HR_SAMPLE_AVERAGE 4
#define HR_SAMPLE_RATE 400
#define HR_PULSE_WIDTH 411
#define HR_ADC_RANGE 16384
#define HR_SAMPLE_INTERVAL_MS 20
#define HR_UPLOAD_INTERVAL_MS 2000

// ?????謕?
#define WIFI_SSID "flycare"
#define WIFI_PASSWORD "flycare888"
#define WIFI_ALT1_SSID "MILLION"
#define WIFI_ALT1_PASSWORD "wml6949619"
#define WIFI_ALT2_SSID "MILLION1"
#define WIFI_ALT2_PASSWORD "wml6949619"
#define WIFI_FALLBACK_SSID "Triple-None"
#define WIFI_FALLBACK_PASSWORD "08080606"
#define ENABLE_HTTP_UPLOAD 0
#define SERVER_URL "http://192.168.1.232:8001/api/v1/data-reception/receive"
#define MQTT_BROKER "192.168.1.232"
#define MQTT_BROKER_MILLION1 "192.168.1.232"
#define MQTT_BROKER_TRIPLE_NONE "192.168.1.232"
#define MQTT_BROKER_FALLBACK_1 ""
#define MQTT_BROKER_FALLBACK_2 ""
#define MQTT_PORT 1883
#define MQTT_TOPIC_ROOT "smartwatch"

// ?豲ㄝ????謍綜????
#define FREEFALL_THRESHOLD 0.5      // ??????????怏?(g)
// #define IMPACT_THRESHOLD 2.5          // ???????怏?(g)?謍????
#define IMPACT_THRESHOLD 1          // Source ISS fall logic; optimize later
#define LOW_ACC_THRESHOLD 1.5       // ?????鞈察撮????怏?(g)
#define LOW_GYRO_THRESHOLD 20       // ?????鞈察撮????怏?(??s)
#define ORIENTATION_THRESHOLD 20    // ??曇?頩??雓???(??

// BLE?鞈歹????謕?
#define BEACON_COUNT 12
#define AREA_WIDTH 12
#define AREA_HEIGHT 16

// ??????謕??謅???擗?? 600?800??
#define MAP_WIDTH 600
#define MAP_HEIGHT 800
#define MAP_PIXEL_WIDTH 600
#define MAP_PIXEL_HEIGHT 800
#define MAP_REAL_WIDTH 12.0
#define MAP_REAL_HEIGHT 16.0
// BLE-derived flight arrival tolerance. Keep below adjacent FlyCare zone spacing.
#define FLIGHT_ARRIVAL_RADIUS_METERS 2.4f
// Small-field demo positioning: strongest-beacon snap drives the displayed
// marker; zones remain a guard for labels and arrival confirmation.
#define BLE_ZONE_SWITCH_CONFIRMATIONS 1
#define BLE_ZONE_REFERENCE_BLEND_HIGH 0.10f
#define BLE_ZONE_REFERENCE_BLEND_MEDIUM 0.05f
#define BLE_ZONE_STRONG_CONFIDENCE 0.78f
#define BLE_ZONE_SNAP_RSSI_LEAD_DB 6
#define BLE_ZONE_SNAP_BLEND 0.20f
#define BLE_ZONE_SCORE_RATIO_FOR_SWITCH 1.35f
#define BLE_MARKER_LOCK_HOLD_MS 0UL
#define BLE_STRONGEST_SNAP_MIN_RSSI -82
#define BLE_STRONGEST_SNAP_LEAD_DB 3
#define BLE_STRONGEST_SNAP_IMMEDIATE_RSSI -65
#define BLE_STRONGEST_SNAP_BLEND 0.92f
#define BLE_CORRIDOR_CUSTOMER_OVERRIDE_RSSI -60
#define BLE_CORRIDOR_CUSTOMER_OVERRIDE_LEAD_DB 8
#define DISPLAY_POSITION_REDRAW_THRESHOLD_METERS 0.45f
#define FLIGHT_ARRIVAL_CONFIRMATIONS 1
#define DATA_STATUS_UPLOAD_INTERVAL_MS 5000UL
#define DATA_LOCATION_UPLOAD_INTERVAL_MS 3000UL
#define DATA_LOCATION_MOVED_THRESHOLD_METERS 0.50f
#define DATA_MQTT_FAILURE_BACKOFF_MS 30000UL
#define DATA_MQTT_CONNECT_TIMEOUT_MS 2500UL
#define BLE_POSITION_VERBOSE_LOGS 0

// ??賃????謕?
#define SCREEN_WIDTH 240
#define SCREEN_HEIGHT 310
#define MAP_GRID_COLOR 0x52AA       // ??韏航????制 (??謅?)
#define MAP_BORDER_COLOR 0xFFFF     // ?貉???鞈狩??(?????
#define CURRENT_POS_COLOR 0xF800    // ?憛狐???????雓??(?隡??
#define TARGET_POS_COLOR 0x07E0     // ?????????雓??(??湔??

// ??????謕?
#define BOOT_BUTTON_PIN 0
#define PWR_BUTTON_PIN 45
#define SOS_WHEEL_A_PIN -1
#define SOS_WHEEL_B_PIN -1
#define SOS_WHEEL_STEPS_PER_DETENT 4
#define SOS_WHEEL_DEBOUNCE_MS 80
#define SOS_HOLD_TIME 3000          // 3?謢????

// ??????擏???謕?
#define NTP_SERVER "pool.ntp.org"

// ?????謕?
#define AUDIO_VOLUME_DEFAULT 80        // ?蝬迨???? 0-100
#define AUDIO_BUFFER_SIZE 4096         // ????擳狐??????
#define AUDIO_TASK_STACK_SIZE 8192     // Audio alerts/TTS need headroom for SD + I2S
#define AUDIO_TASK_PRIORITY 1          // ????豯??瞏殉狀雓???

// ??????駁瑣?豲?
#define ALERT_SOUND_PATH "/alerts/alert1.mp3"
#define TTS_PATH "/tts/"
#define NAV_PATH "/nav/"

// ????謢遴馮??謅?韏??????螞????
#define BCLKPIN 18      // ???雓??
#define WSPIN 13        // ?畾???甇察/???????
#define DIPIN 17        // ?????貉謇??(DIN)
#define DOPIN 12        // ?????貉謇??(DOUT)
#define MCLKPIN 21       // ?豲?雓??

// ?????????謕?
#define WRIST_RAISE_THRESHOLD 0.5     // ???????謍綜????

// ??蝛???謕?
#define VIB_MOTOR_PIN 9               // ??蝛???謚喟??謢遴馮?
#define VIB_SHORT_MS 100              // ??謚???
#define VIB_LONG_MS 500               // ??西????

// ?豯??瞏殉狀雓???
#define PRIORITY_LOCATION 3           // ?????菜???
#define PRIORITY_UPLOAD 2             // ?豲???菜???
#define PRIORITY_DISPLAY 1            // ?????菜???

// RTC ??謕?
#define RTC_I2C_ADDR 0x51             // PCF85063 ???

// BLE ??????
#define BLE_SCAN_INTERVAL 1000        // 1??

// ?????豲????
#define UPLOAD_INTERVAL 2000          // 2??

// ???????????
#define DISPLAY_UPDATE_INTERVAL 2000  // 2??

// ??凋遛??豲???????
#define ALARM_REPORT_DELAY 0      // 0??

// ?頛?鞊?????賹?????謅???察???
#define HOME_DISPLAY_INTERVAL 10000   // 10??
#define NAV_DISPLAY_INTERVAL 4000     // reserved fallback; nav page redraw is event-driven to avoid map flicker
#define FLIGHT_DISPLAY_INTERVAL 10000 // 10??

#endif
