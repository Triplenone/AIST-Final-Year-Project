#ifndef CONFIG_H
#define CONFIG_H

// 设备配置
#define DEVICE_ID "ESP32_SmartWatch"

// 网络配置
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define SERVER_URL "http://YOUR_SERVER_HOST:PORT/api/data"
#define MQTT_BROKER "broker.emqx.io"
#define MQTT_PORT 1883

// 跌倒检测阈值
#define FREEFALL_THRESHOLD 0.5      // 自由落体阈值 (g)
#define IMPACT_THRESHOLD 2        // 冲击阈值 (g)
#define LOW_ACC_THRESHOLD 1.5       // 低加速度阈值 (g)
#define LOW_GYRO_THRESHOLD 0.5      // 低角速度阈值 (°/s)
#define ORIENTATION_THRESHOLD 20    // 姿态变化阈值 (度)

// BLE信标配置
#define BEACON_COUNT 6
#define AREA_WIDTH 12
#define AREA_HEIGHT 16

// 地图显示配置
#define MAP_WIDTH 300               // 地图显示宽度 (像素)
#define MAP_HEIGHT 150              // 地图显示高度 (像素)
#define MAP_GRID_COLOR 0x52AA       // 网格颜色 (灰色)
#define MAP_BORDER_COLOR 0xFFFF     // 边框颜色 (白色)
#define CURRENT_POS_COLOR 0xF800    // 当前位置颜色 (红色)
#define TARGET_POS_COLOR 0x07E0     // 目标位置颜色 (绿色)

// 按钮配置
#define BOOT_BUTTON_PIN 0
#define PWR_BUTTON_PIN 10
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
#define BCLKPIN 12      // 位时钟
#define WSPIN 13        // 字选择/左右时钟
#define DIPIN 14        // 数据输入 (DIN)
#define DOPIN 15        // 数据输出 (DOUT)
#define MCLKPIN 2       // 主时钟

#endif
