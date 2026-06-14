#ifndef CONFIG_H
#define CONFIG_H

// 设备配置
#define DEVICE_ID "ESP32_SmartWatch"

// Feature switches. Set to 1 only when the hardware path is ready.
#define ENABLE_BLE_LOCATION 1
#define ENABLE_IMU_SENSOR 0
#define ENABLE_FALL_DETECTION 0

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

// 网络配置
#define WIFI_SSID "MILLION1"
#define WIFI_PASSWORD "wml6949619"
#define WIFI_ALT1_SSID "MILLION"
#define WIFI_ALT1_PASSWORD "wml6949619"
#define WIFI_ALT2_SSID "MILLION 1"
#define WIFI_ALT2_PASSWORD "wml6949619"
#define WIFI_FALLBACK_SSID "Triple-None"
#define WIFI_FALLBACK_PASSWORD "08080606"
#define ENABLE_HTTP_UPLOAD 0
#define SERVER_URL "http://192.168.0.203:8000/api/v1/data-reception/receive"
#define MQTT_BROKER "192.168.0.203"
#define MQTT_PORT 1883

// 跌倒检测阈值
#define FREEFALL_THRESHOLD 0.5      // 自由落体阈值 (g)
// #define IMPACT_THRESHOLD 2.5          // 冲击阈值 (g)测试用
#define IMPACT_THRESHOLD 5          // 冲击阈值 (g)
#define LOW_ACC_THRESHOLD 1.5       // 低加速度阈值 (g)
#define LOW_GYRO_THRESHOLD 20       // 低角速度阈值 (°/s)
#define ORIENTATION_THRESHOLD 20    // 姿态变化阈值 (度)

// BLE信标配置
#define BEACON_COUNT 12
#define AREA_WIDTH 12
#define AREA_HEIGHT 16

// 地图配置（压缩后 600×800）
#define MAP_WIDTH 600
#define MAP_HEIGHT 800
#define MAP_PIXEL_WIDTH 600
#define MAP_PIXEL_HEIGHT 800
#define MAP_REAL_WIDTH 12.0
#define MAP_REAL_HEIGHT 16.0

// 屏幕配置
#define SCREEN_WIDTH 240
#define SCREEN_HEIGHT 310
#define MAP_GRID_COLOR 0x52AA       // 网格颜色 (灰色)
#define MAP_BORDER_COLOR 0xFFFF     // 边框颜色 (白色)
#define CURRENT_POS_COLOR 0xF800    // 当前位置颜色 (红色)
#define TARGET_POS_COLOR 0x07E0     // 目标位置颜色 (绿色)

// 按钮配置
#define BOOT_BUTTON_PIN 0
#define PWR_BUTTON_PIN 45
#define SOS_WHEEL_A_PIN -1
#define SOS_WHEEL_B_PIN -1
#define SOS_WHEEL_STEPS_PER_DETENT 4
#define SOS_WHEEL_DEBOUNCE_MS 80
#define SOS_HOLD_TIME 3000          // 3秒长按

// 时间同步配置
#define NTP_SERVER "pool.ntp.org"

// 音频配置
#define AUDIO_VOLUME_DEFAULT 80        // 默认音量 0-100
#define AUDIO_BUFFER_SIZE 4096         // 音频缓冲区大小
#define AUDIO_TASK_STACK_SIZE 4096     // 音频任务堆栈大小
#define AUDIO_TASK_PRIORITY 1          // 音频任务优先级

// 音频文件路径
#define ALERT_SOUND_PATH "/alerts/alert1.mp3"
#define TTS_PATH "/tts/"
#define NAV_PATH "/nav/"

// 音频引脚（根据你的硬件）
#define BCLKPIN 18      // 位时钟
#define WSPIN 13        // 字选择/左右时钟
#define DIPIN 17        // 数据输入 (DIN)
#define DOPIN 12        // 数据输出 (DOUT)
#define MCLKPIN 21       // 主时钟

// 抬手亮屏配置
#define WRIST_RAISE_THRESHOLD 0.5     // 抬手检测阈值

// 振动配置
#define VIB_MOTOR_PIN 9               // 振动电机引脚
#define VIB_SHORT_MS 100              // 短振动
#define VIB_LONG_MS 500               // 长振动

// 任务优先级
#define PRIORITY_LOCATION 3           // 定位优先级
#define PRIORITY_UPLOAD 2             // 上传优先级
#define PRIORITY_DISPLAY 1            // 显示优先级

// RTC 配置
#define RTC_I2C_ADDR 0x51             // PCF85063 地址

// BLE 扫描周期
#define BLE_SCAN_INTERVAL 1000        // 1秒

// 数据上传周期
#define UPLOAD_INTERVAL 2000          // 2秒

// 画面更新周期
#define DISPLAY_UPDATE_INTERVAL 2000  // 2秒

// 报警上报延迟
#define ALARM_REPORT_DELAY 0      // 0秒

// 页面显示刷新间隔（独立）
#define HOME_DISPLAY_INTERVAL 10000   // 10秒
#define NAV_DISPLAY_INTERVAL 4000     // 4秒; BLE jitter redraws still update sooner when movement is meaningful
#define FLIGHT_DISPLAY_INTERVAL 10000 // 10秒

#endif
