# FlyCare Demo Ready 安装与演示指南

本分支是 FlyCare final demo 的稳定版本入口。目标是让普通组员可以从零配置本地 router demo、启动前后端和数据库、烧录 6 只手表、打开 dashboard，并按固定流程完成完整演示。

当前 demo-ready 基线来自 `Flycare` 分支稳定提交：

```text
6ff23ec882a0668695f9d0ea1f9882f102b3a701
```

## 重要结论

- Final hardware backend 使用 `8001`，不要把硬件 demo 改回 `8000`。
- Frontend 使用 Vite `5173`。
- MQTT broker 使用 Server PC 的 LAN IP，例如当前为 `192.168.1.232:1883`。
- 手表、Server PC、手机或其他浏览器设备必须在同一个 router LAN 内。
- 这套 demo 可以拔掉 Internet/WAN 线运行，只要 router 有电、Server PC 和手表都连上同一个 LAN。
- 目前声音提示故意禁用，手表提示使用 popup + vibration。不要在 final demo 前打开 SD/TTS/I2S audio。
- 6 只手表使用同一套 `firmware/` code base。每次烧录前只改 Clock 上显示的名字 `CLOCK_DEVICE_LABEL`。
- COM5 serial bridge 只作为 fallback，不可以把 COM5 bridge 成功当作 direct Wi-Fi MQTT 成功。

## 目录结构

```text
E:\flycare
├── backend\backend\            FastAPI backend
├── frontend\                   React/Vite dashboard
├── firmware\                   ESP32-S3 watch firmware，唯一手表 code base
├── database\mysql\migrations\ MySQL idempotent migrations
├── infra\mosquitto\            Mosquitto LAN config
├── scripts\                    启动、MQTT endpoint、audit、demo recorder 脚本
└── docs\FLYCARE_MQTT.md         更详细的 MQTT/设备映射说明
```

## 1. 安装依赖

### 1.1 Windows 软件

建议使用 Windows 10/11，PowerShell 以 Administrator 权限运行。

需要安装：

- Git
- Node.js LTS
- Python 3.11 或兼容版本
- MySQL 8.x
- MongoDB Community Server
- Mosquitto for Windows
- Arduino IDE 2.x
- ESP32 Arduino core

如果安装路径与下面示例不同，把命令里的路径替换成你的实际路径。

### 1.2 克隆 demo-ready 分支

```powershell
git clone -b Flycare-demo-ready --single-branch https://github.com/Triplenone/AIST-Final-Year-Project.git E:\flycare
cd E:\flycare
```

如果已经有 `E:\flycare`，先确认你不会覆盖本地修改。

```powershell
cd E:\flycare
git branch --show-current
git rev-parse --short HEAD
git status -sb
```

### 1.3 Backend Python dependencies

```powershell
cd E:\flycare\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\pip.exe install -r requirements.txt
```

### 1.4 Frontend dependencies

```powershell
cd E:\flycare\frontend
npm.cmd install
```

### 1.5 Arduino libraries

Arduino CLI 常见路径：

```powershell
$arduino = 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe'
```

安装库：

```powershell
& $arduino lib install PubSubClient
& $arduino lib install 'GFX Library for Arduino'
& $arduino lib install TJpg_Decoder
& $arduino lib install SensorLib
& $arduino lib install NTPClient
& $arduino lib install 'Adafruit MAX1704X'
& $arduino lib install 'SparkFun MAX3010x Pulse and Proximity Sensor Library'
& $arduino lib install ArduinoJson@6.21.5
```

## 2. 数据库配置

### 2.1 MySQL

数据库名固定沿用 legacy schema：

```text
smart_elderly_care_system
```

创建数据库：

```powershell
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot -e "CREATE DATABASE IF NOT EXISTS smart_elderly_care_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

导入基础 dump。优先使用仓库里最新的完整 dump，如果你的仓库只有 `database/mysql/Dump20251120.sql`，就用它：

```powershell
cd E:\flycare
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system < .\database\mysql\Dump20251120.sql
```

然后按顺序执行 FlyCare migrations：

```powershell
cd E:\flycare
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260603_register_esp32_devices_6_7.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260603_bind_flycare_devices_6_7_hk_names.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260605_register_esp32_48ca43a42298.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260608_dedupe_flycare_devices_and_device8_alias.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260613_flycare_demo_labels.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260615_register_flycare_device4_canonical_id.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260615_mark_flycare_device8_ng_wai_lun_online.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260615_register_flycare_device9_and_aliases.sql"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "source E:/flycare/database/mysql/migrations/20260619_flycare_demo_registry.sql"
```

检查 6 个 final demo 绑定：

```powershell
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system -e "SELECT demo_id, display_name, mysql_device_id, user_id, canonical_device_id, enabled FROM flycare_demo_registry ORDER BY sort_order;"
```

### 2.2 MongoDB

MongoDB 用于保存手表 status/location/flight 上行数据。默认连接：

```text
mongodb://localhost:27017
smart_elderly_care_system
```

一般不需要手动建 collection，backend 会写入。

## 3. MQTT 配置

### 3.1 Mosquitto 必须监听 LAN

`infra/mosquitto/local-windows.conf` 应该是：

```text
listener 1883 0.0.0.0
allow_anonymous true
persistence false
log_dest stdout
```

启动 Mosquitto：

```powershell
& 'C:\Program Files\Mosquitto\mosquitto.exe' -c E:\flycare\infra\mosquitto\local-windows.conf -v
```

检查端口：

```powershell
netstat -ano | findstr :1883
Test-NetConnection 192.168.1.232 -Port 1883
```

如果 Server PC IP 不是 `192.168.1.232`，把命令里的 IP 换成你的 Server PC IP。

### 3.2 Windows Firewall

用 Administrator PowerShell 放行 demo 端口：

```powershell
New-NetFirewallRule -DisplayName "FlyCare MQTT 1883 LAN" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 1883 -Profile Any
New-NetFirewallRule -DisplayName "FlyCare Backend 8001 LAN" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8001 -Profile Any
New-NetFirewallRule -DisplayName "FlyCare Frontend 5173 LAN" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -Profile Any
```

如果重复添加报错，通常可以忽略，代表规则已存在。

## 4. Backend / Frontend 配置

### 4.1 Backend `.env`

文件位置：

```text
E:\flycare\backend\backend\.env
```

当前 router demo 参考值：

```text
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=smart_elderly_care_system

DEBUG=True
API_V1_PREFIX=/api/v1
APP_NAME=FlyCare API
APP_VERSION=1.0.0

MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=smart_elderly_care_system

MQTT_BROKER=192.168.1.232
MQTT_PORT=1883
MQTT_USER=
MQTT_PASSWORD=
MQTT_TOPIC_ROOT=smartwatch
FLYCARE_FLIGHT_DOWNLINK_TOPIC_TEMPLATE=smartwatch/{device_id}/flight
FLYCARE_LEGACY_FLIGHT_TOPIC=smartwatch/flight
```

如果换 router/IP，只改 `MQTT_BROKER=<新的 Server PC IP>`。

### 4.2 Frontend `.env.local`

文件位置：

```text
E:\flycare\frontend\.env.local
```

当前 router demo：

```text
VITE_BACKEND_BASE_URL=http://192.168.1.232:8001
```

如果换 IP，改成：

```text
VITE_BACKEND_BASE_URL=http://<新的 Server PC IP>:8001
```

## 5. 启动系统

### 5.1 推荐启动顺序

1. Router 开机。
2. Server PC 连接 demo Wi-Fi。
3. 确认 Server PC IP。
4. 启动 MySQL。
5. 启动 MongoDB。
6. 启动 Mosquitto。
7. 启动 backend `8001`。
8. 启动 frontend `5173`。
9. 打开 dashboard。
10. 打开手表。

### 5.2 查 Server PC IP

```powershell
ipconfig
```

找到当前 Wi-Fi/Ethernet 的 IPv4。当前稳定 demo 使用：

```text
192.168.1.232
```

### 5.3 启动 backend 8001

```powershell
cd E:\flycare\backend\backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8001/health
Invoke-RestMethod http://127.0.0.1:8001/api/v1/data-reception/mqtt/status
```

期望：

```text
healthy / ok
mqtt connected = true
broker = 192.168.1.232
port = 1883
```

### 5.4 启动 frontend 5173

```powershell
cd E:\flycare\frontend
npm.cmd run dev -- --host 0.0.0.0 --port 5173
```

### 5.5 Dashboard URL

Server PC 本机：

```text
http://127.0.0.1:5173/flycare
http://127.0.0.1:5173/admin
http://127.0.0.1:8001
```

同一 Wi-Fi 下手机 / iPad / 其他电脑：

```text
http://192.168.1.232:5173/flycare
http://192.168.1.232:5173/admin
http://192.168.1.232:8001
```

如果 Server PC IP 不是 `192.168.1.232`，把 URL 换成你的实际 IP。

## 6. 手表 firmware 烧录

### 6.1 统一 code base

只保留一套手表代码：

```text
E:\flycare\firmware
```

6 只手表都烧录这一套 code。区别只在 Clock 页面显示的名字。

### 6.2 修改 Clock 显示名字

打开：

```text
E:\flycare\firmware\Config.h
```

找到：

```cpp
#define CLOCK_DEVICE_LABEL "NG WAI LUN"
```

烧录哪只手表，就把它改成对应名字。例如烧录 LEE KA YAN：

```cpp
#define CLOCK_DEVICE_LABEL "LEE KA YAN"
```

不要为了改名字复制 6 份 firmware。只改这一行、compile、upload。

### 6.3 修改 Wi-Fi / MQTT

同一个文件：

```text
E:\flycare\firmware\Config.h
```

关键字段：

```cpp
#define WIFI_SSID "flycare"
#define WIFI_PASSWORD "<你的 Wi-Fi 密码>"
#define MQTT_BROKER "192.168.1.232"
#define MQTT_PORT 1883
#define MQTT_TOPIC_ROOT "smartwatch"
```

README 不保存真实 Wi-Fi 密码。请在本地 `Config.h` 填入实际密码。

### 6.4 编译

```powershell
cd E:\flycare\firmware
$arduino = 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe'
& $arduino compile --fqbn "esp32:esp32:esp32s3:FlashSize=8M,PartitionScheme=huge_app,PSRAM=opi,CDCOnBoot=cdc" .
```

### 6.5 找 COM port

插入手表 USB 后：

```powershell
[System.IO.Ports.SerialPort]::GetPortNames()
```

如果看到 `COM5`，就用 COM5。如果不是，就用实际出现的 COM 口。

上传前关闭：

- Arduino Serial Monitor
- 其他占用 COM 的程序
- `bridge_flycare_serial.ps1`

### 6.6 上传

```powershell
cd E:\flycare\firmware
$arduino = 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe'
& $arduino upload -p COM5 --fqbn "esp32:esp32:esp32s3:FlashSize=8M,PartitionScheme=huge_app,PSRAM=opi,CDCOnBoot=cdc" --upload-property upload.speed=115200 .
```

如果 COM 不是 COM5，把 `COM5` 换成实际端口。

## 7. 已定设备 ID / 用户名字

Final demo 只显示 6 只实体手表。MySQL 原始 ID 不重排，Dashboard 显示 demo ID 1-6。

| Demo ID | Clock 名字 | Canonical device_id | Alias device_id | MySQL device_id | MySQL user_id |
|---:|---|---|---|---:|---:|
| 1 | NG WAI LUN | `ESP32_000048CA43A42298` | `ESP32_48CA43A42298` | 8 | 15 |
| 2 | WONG KA MING | `ESP32_0000C8292A04A7AC` | `ESP32_00005CFA7AD4DB1C` | 3 | 4 |
| 3 | HO CHI WAI | `ESP32_0000A022A443CA48` |  | 4 | 8 |
| 4 | MA KA WAI | `ESP32_00008C292A04A7AC` |  | 6 | 13 |
| 5 | YIP MAN LING | `ESP32_00009022A443CA48` |  | 7 | 14 |
| 6 | LEE KA YAN | `ESP32_0000E03948D4DB1C` | `ESP32_1CDBD44839E0` | 9 | 16 |

隐藏但不删除的 legacy 绑定：

| 用户 | device_id |
|---|---|
| LAU SIU FONG | `ESP32_0000C422A443CA48` |
| TANG WAI HAN | `ESP32_00009822A443CA48` |

这些仍可能存在于 MySQL/Mongo 历史数据中，但 final FlyCare presets 和 passenger rail 不显示它们。

## 8. 换 router / 换 IP 完整教程

如果 demo router、Wi-Fi 或 Server PC IP 改了，按这个顺序做。

### 8.1 让 Server PC 和手表连同一个 LAN

推荐 router 设置：

- 2.4 GHz Wi-Fi 开启，SSID 可用 `flycare`。
- 关闭 Guest network / AP isolation / client isolation。
- Server PC 尽量固定 IP 或 DHCP reserve。
- Mosquitto 监听 `0.0.0.0:1883`。

### 8.2 查新 IP

```powershell
ipconfig
```

假设新 IP 是：

```text
192.168.50.20
```

### 8.3 更新 backend MQTT

编辑：

```text
E:\flycare\backend\backend\.env
```

改：

```text
MQTT_BROKER=192.168.50.20
MQTT_PORT=1883
MQTT_TOPIC_ROOT=smartwatch
```

### 8.4 更新 frontend backend URL

编辑：

```text
E:\flycare\frontend\.env.local
```

改：

```text
VITE_BACKEND_BASE_URL=http://192.168.50.20:8001
```

### 8.5 更新 firmware MQTT broker

编辑：

```text
E:\flycare\firmware\Config.h
```

改：

```cpp
#define MQTT_BROKER "192.168.50.20"
#define MQTT_BROKER_MILLION1 "192.168.50.20"
#define MQTT_BROKER_TRIPLE_NONE "192.168.50.20"
#define MQTT_PORT 1883
```

如果 SSID 也变了，改：

```cpp
#define WIFI_SSID "你的SSID"
#define WIFI_PASSWORD "你的WiFi密码"
```

### 8.6 可选：使用 helper 自动写 MQTT endpoint

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\set_flycare_mqtt_endpoint.ps1 -Mode OfflineLan -BrokerHost 192.168.50.20 -ServerHost 192.168.50.20
```

注意：helper 会更新 backend `.env` 和 firmware `Config.h` 的 MQTT 相关字段。Frontend `.env.local` 仍建议手动确认是 `http://<IP>:8001`。

### 8.7 重新烧录手表

每次改了 `firmware/Config.h` 的 Wi-Fi 或 MQTT IP，都要重新 compile/upload 到手表。

### 8.8 重启 backend/frontend

重启 backend `8001` 和 frontend `5173` 后检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/v1/data-reception/mqtt/status
Test-NetConnection 192.168.50.20 -Port 1883
Test-NetConnection 192.168.50.20 -Port 8001
Test-NetConnection 192.168.50.20 -Port 5173
```

### 8.9 证明 direct Wi-Fi MQTT 成功

停掉 COM5 bridge，然后运行：

```powershell
& 'C:\Program Files\Mosquitto\mosquitto_sub.exe' -h 192.168.50.20 -p 1883 -t 'smartwatch/#' -v -R
```

看到手表发出：

```text
smartwatch/ESP32_48CA43A42298/status
smartwatch/ESP32_48CA43A42298/location
```

才算 direct Wi-Fi MQTT 成功。

## 9. Demo 流程

### 9.1 开始前检查

```powershell
cd E:\flycare
Invoke-RestMethod http://127.0.0.1:8001/health
Invoke-RestMethod http://127.0.0.1:8001/api/v1/data-reception/mqtt/status
Invoke-RestMethod http://127.0.0.1:8001/api/v1/flycare-admin/presets
```

打开：

```text
http://192.168.1.232:5173/flycare
http://192.168.1.232:5173/admin
```

在 `/flycare` 选择 `#1 NG WAI LUN`，确认显示 Online/Live。

### 9.2 Flight update

进入：

```text
http://192.168.1.232:5173/admin
```

选择 FlyCare tab。

Flight form 建议输入：

```text
Device preset: #1 NG WAI LUN
Flight number: CX910
Airline: Cathay Pacific
Departure airport: HKG
Destination: Singapore
Seat number: 21C
Scheduled departure: 16:25
Estimated departure: 16:25
Boarding time: 15:35
Boarding gate: 10
Terminal: T3
Check-in counter: C12-C18
Flight status: Scheduled
Delay minutes: 0
Delay reason: 留空
Gate changed: 不勾或按需要勾
```

点击：

```text
MQTT + save Mongo
```

期望：

- Broker 看到 `/flight`。
- 手表 flight page 显示 CX910 / Gate 10。
- `/flycare` flight panel 更新。

### 9.3 Gate Change 10 -> 11

把 `Boarding gate` 改成：

```text
11
```

勾选：

```text
Gate changed
```

可填：

```text
Delay reason: Gate Change to 11
```

点击：

```text
MQTT + save Mongo
```

期望：

- 手表显示 Gate Change popup + vibration。
- 手表 flight page 和 map DEST 都变成 Gate 11。
- `/flycare` 显示 Gate 11。

### 9.4 Boarding / Delayed / Cancelled

依次测试：

1. `Flight status = Boarding`，点击 `MQTT + save Mongo`。
2. `Flight status = Delayed`，`Delay minutes = 16`，`Delay reason = Demo delay 16 mins`，点击 `MQTT + save Mongo`。
3. `Flight status = Cancelled`，`Delay reason = Demo Cancelled`，点击 `MQTT + save Mongo`。

期望：手表 popup/vibration，dashboard flight panel 更新。

### 9.5 SOS / Fall

在 Admin FlyCare 的 Emergency MQTT 区域：

1. Trigger SOS
2. Clear SOS
3. Trigger Fall
4. Clear Fall

期望：

- Broker 看到 `smartwatch/<device_id>/alert`。
- 手表显示对应 popup + vibration。
- Event handling 可以 Acknowledge / Resolved / False alarm。
- `/flycare` 不留下 stale SOS/Fall modal。

手表实体 SOS：

- 长按 SOS 3 秒：触发 SOS。
- 再长按 SOS 3 秒：取消 SOS。

### 9.6 Positioning / Arrival

把手表带到 beacon 区域移动：

1. Customer Services 停 30-60 秒，确认不误弹 Gate arrival。
2. 从 Customer Services 走向 Gate 10 或 Gate 11。
3. 目标 gate 与 latest flight gate 一致时，靠近目标 gate 后应出现 arrival popup。

定位是 demo 稳定优先：允许 marker 有轻微延迟，但不应频繁在 Customer Services / Gate 10 / Gate 11 之间闪烁。

## 10. 完整记录一次 demo

可以用 recorder 留证据。它不会打开 COM5，也不会把 COM5 bridge 当 direct proof。

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\record_flycare_offline_demo.ps1 -Minutes 20 -BaseUrl http://127.0.0.1:8001 -BrokerHost 192.168.1.232 -RunAudit
```

输出在：

```text
E:\flycare\logs\offline-demo-YYYYMMDD-HHMMSS
```

重点看：

- `summary.json`
- `mqtt-smartwatch.log`
- `api-samples.jsonl`
- `audit.txt`
- `manual-observations.md`

如果最后 audit 失败但手表已关机，`watch_status_freshness` 失败是正常的。正式验收前保持手表开机，等待 `/status` 和 `/location` 刷新后再 audit。

## 11. Final audit

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit_flycare_goal.ps1 -BaseUrl http://127.0.0.1:8001
```

期望：

```text
overallStatus = pass
invalidUplinks = 0
crashes = 0
mqttConnected = true
```

## 12. Troubleshooting

### 12.1 手表没有出现在 dashboard

先确认手表是否真的发 MQTT：

```powershell
& 'C:\Program Files\Mosquitto\mosquitto_sub.exe' -h 192.168.1.232 -p 1883 -t 'smartwatch/#' -v -R
```

如果没有 `/status` 或 `/location`：

- 手表是否开机。
- 手表是否连上正确 Wi-Fi。
- `Config.h` 的 `MQTT_BROKER` 是否是 Server PC IP。
- Router 是否关闭 AP/client isolation。
- Windows firewall 是否放行 1883。
- Mosquitto 是否监听 `0.0.0.0:1883`。

### 12.2 Admin publish 后手表没有反应

分三层查：

1. Admin/API response 是否 `mqtt.ok=true`。
2. `mosquitto_sub` 是否看到 `/flight` 或 `/alert` topic。
3. 手表是否开机、在线、订阅成功。

如果 broker 有 topic 但手表没反应，通常是手表未在线、订阅断了、或者刚刚切换 Wi-Fi/MQTT 后未重新烧录。

### 12.3 COM5 busy

关闭：

- Arduino Serial Monitor
- 任何串口工具
- `bridge_flycare_serial.ps1`

查看串口：

```powershell
[System.IO.Ports.SerialPort]::GetPortNames()
```

### 12.4 8000 healthy 但 MQTT disconnected

这是已知情况。Final hardware demo 使用 `8001`。

检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/v1/data-reception/mqtt/status
```

不要用 `8000` 作为硬件 demo backend，除非它明确 `mqttConnected=true`。

### 12.5 声音为什么没有

当前稳定 firmware 禁用声音：

```cpp
#define ENABLE_AUDIO_ALERTS 0
#define ENABLE_TONE_ALERTS 0
```

原因是 SD/TTS/ES8311/I2S audio path 曾造成 direct MQTT 不稳定、黑屏或重启风险。Final demo 使用 popup + vibration。

### 12.6 断网后能否 demo

可以。条件是：

- Router 有电。
- Server PC 和手表都连接同一个 LAN。
- Server PC IP 没变，或已按本 README 修改 IP 并重新烧录。
- MySQL、MongoDB、Mosquitto、backend 8001、frontend 5173 都在 Server PC 本地运行。

Internet/WAN 不是必须。

## 13. 不要随便改的东西

Final demo 前不要改：

- Backend API schema/routes。
- MySQL/Mongo schema。
- MQTT topic 结构。
- `8001` final hardware backend 策略。
- Audio/TTS/I2S 开关。
- COM5 bridge 作为 direct MQTT 证明。

如果需要改 router/IP，只按第 8 节做。