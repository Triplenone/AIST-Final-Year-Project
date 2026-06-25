# FlyCare Final Demo 部署与演示指南

本仓库是 FlyCare final demo 版本。目标是在没有互联网的情况下，只要本地 router 有电，Server PC 和 6 只手表连接到同一个本地 Wi-Fi，就可以完整演示：

- Smart Positioning & Navigation
- Flight Information real-time update
- SpO2 / Heart Rate / status / location sync
- One-click SOS
- Admin 触发 SOS / Fall alert 并处理事件

当前 final hardware backend 固定使用 `8001`，不要把硬件 demo 切回 `8000`。

## 1. Final Demo 网络与网址

默认 router-based local demo：

| 项目 | 地址 |
| --- | --- |
| Router Wi-Fi SSID | `flycare` |
| Server PC IP | `192.168.1.232` |
| MQTT broker | `192.168.1.232:1883` |
| Backend API | `http://192.168.1.232:8001` |
| Dashboard | `http://192.168.1.232:5173/flycare` |
| Admin | `http://192.168.1.232:5173/admin` |
| Local backend check | `http://127.0.0.1:8001/api/v1/data-reception/mqtt/status` |

Router 设置要求：

- 使用 2.4 GHz Wi-Fi 给手表连接。
- 关闭 Guest network / AP isolation / client isolation。
- Server PC 最好在 router DHCP 保留地址中固定为 `192.168.1.232`。
- Windows Firewall 放行 `1883`, `8001`, `5173`。
- Mosquitto 必须监听 `0.0.0.0:1883`，不是只监听 `127.0.0.1`。

## 2. 一键启动 Final Demo

切换到 `flycare` Wi-Fi 后，用 Administrator PowerShell 执行：

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start_flycare_offline_demo.ps1 -OpenBrowser
```

这个脚本会启动或重启：

- Mosquitto MQTT：`192.168.1.232:1883`
- Backend：`8001`
- Frontend：`5173`
- MySQL service
- MongoDB service
- Singapore time broadcaster
- Offline demo recorder

脚本不会自动切 Wi-Fi，也不会自动把 Server PC IP 改成 `192.168.1.232`。如果 PC 不在 `flycare` LAN 上，手表不能连到本机 MQTT broker。

启动后检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/v1/data-reception/mqtt/status
```

正常应看到：

```text
connected = true
broker = 192.168.1.232
port = 1883
```

## 3. 从零安装依赖

### 3.1 基础软件

Windows PC 需要安装：

- Git
- Node.js + npm
- Python 3.11 或兼容版本
- MySQL Server
- MongoDB Community Server
- Mosquitto
- Arduino IDE 或 Arduino CLI
- ESP32 Arduino core

推荐在 Administrator PowerShell 中操作。

### 3.2 克隆仓库

```powershell
cd E:\
git clone -b flycare-demo-ready https://github.com/Triplenone/AIST-Final-Year-Project.git flycare
cd E:\flycare
```

如果已经有仓库：

```powershell
cd E:\flycare
git fetch origin
git checkout flycare-demo-ready
git pull origin flycare-demo-ready
```

### 3.3 Frontend

```powershell
cd E:\flycare\frontend
npm install
```

`frontend\.env.local` 应指向当前 Server PC：

```text
VITE_BACKEND_BASE_URL=http://192.168.1.232:8001
```

### 3.4 Backend

```powershell
cd E:\flycare\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

`backend\backend\.env` 示例：

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

### 3.5 MySQL 初始化

先导入基础 dump：

```powershell
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot -e "CREATE DATABASE IF NOT EXISTS smart_elderly_care_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -uroot -proot smart_elderly_care_system < E:\flycare\database\mysql\ben_sql\smart_elderly_care_system_full_20260616_145904.sql
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

### 3.6 Mosquitto

本地配置文件：

```text
E:\flycare\infra\mosquitto\local-windows.conf
```

内容应包含：

```text
listener 1883 0.0.0.0
allow_anonymous true
persistence false
log_dest stdout
```

手动启动方式：

```powershell
& 'C:\Program Files\Mosquitto\mosquitto.exe' -c E:\flycare\infra\mosquitto\local-windows.conf -v
```

一般 demo 不需要手动启动，因为 `start_flycare_offline_demo.ps1` 会处理。

## 4. 六只手表固定绑定

Final demo UI 只显示 6 只实体手表。MySQL 旧数据不删除，只通过 `flycare_demo_registry` 隐藏非 final demo 设备。

| Demo ID | Passenger | Canonical device_id | MySQL device_id | 已知 alias |
| ---: | --- | --- | ---: | --- |
| 1 | NG WAI LUN | `ESP32_000048CA43A42298` | 8 | `ESP32_48CA43A42298` |
| 2 | WONG KA MING | `ESP32_0000C8292A04A7AC` | 3 | `ESP32_00005CFA7AD4DB1C` |
| 3 | HO CHI WAI | `ESP32_0000A022A443CA48` | 4 | - |
| 4 | MA KA WAI | `ESP32_00008C292A04A7AC` | 6 | - |
| 5 | YIP MAN LING | `ESP32_00009022A443CA48` | 7 | - |
| 6 | LEE KA YAN | `ESP32_0000E03948D4DB1C` | 9 | `ESP32_1CDBD44839E0` |

Legacy hidden watches:

| Passenger | device_id |
| --- | --- |
| LAU SIU FONG | `ESP32_0000C422A443CA48` |
| TANG WAI HAN | `ESP32_00009822A443CA48` |

## 5. 烧录手表 Firmware

所有手表使用同一套 firmware code base。每次烧录不同手表前，只改 `firmware\Config.h` 顶部两行：

```cpp
#define DEVICE_ID "ESP32_000048CA43A42298"
#define CLOCK_DEVICE_LABEL "NG WAI LUN"
```

把这两行替换成对应乘客的 `device_id` 和显示名，然后 compile/upload。

### 5.1 查找 COM port

插入手表后执行：

```powershell
[System.IO.Ports.SerialPort]::GetPortNames() | Sort-Object
Get-PnpDevice -Class Ports | Select-Object Status,FriendlyName,InstanceId | Format-Table -AutoSize
```

常见 ESP32-S3 端口会显示为 `USB 序列装置 (COMx)`。

### 5.2 Compile

```powershell
cd E:\flycare
$cli='C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe'
$fqbn='esp32:esp32:esp32s3:FlashSize=8M,PartitionScheme=huge_app,PSRAM=opi,CDCOnBoot=cdc'
& $cli --config-file .arduino-cli\arduino-cli.yaml compile --fqbn $fqbn firmware --build-path .arduino-cli\tmp\watch-id-build
```

### 5.3 Upload

把 `COM8` 换成实际端口：

```powershell
cd E:\flycare
$cli='C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe'
$fqbn='esp32:esp32:esp32s3:FlashSize=8M,PartitionScheme=huge_app,PSRAM=opi,CDCOnBoot=cdc'
& $cli --config-file .arduino-cli\arduino-cli.yaml upload -p COM8 --fqbn $fqbn firmware --input-dir .arduino-cli\tmp\watch-id-build
```

成功时会看到：

```text
Hash of data verified.
Hard resetting via RTS pin...
```

### 5.4 Serial 验证

```powershell
cd E:\flycare
$portName='COM8'
$sp = [System.IO.Ports.SerialPort]::new($portName,115200,[System.IO.Ports.Parity]::None,8,[System.IO.Ports.StopBits]::One)
$sp.ReadTimeout=500
$sp.Open()
$deadline=(Get-Date).AddSeconds(30)
try {
  while((Get-Date) -lt $deadline) {
    try { $sp.ReadLine() } catch [System.TimeoutException] {}
  }
} finally {
  $sp.Close()
  $sp.Dispose()
}
```

确认 serial 中出现对应 topic，例如：

```text
status topic: smartwatch/ESP32_0000A022A443CA48/status
FLYCARE_UPLINK smartwatch/ESP32_0000A022A443CA48/status ...
```

这说明固定 ID 已经生效。

## 6. 换 Router 或换 Server PC IP

如果新的 router 不能保留 `192.168.1.232`，需要统一改四处：

1. `backend\backend\.env`
2. `frontend\.env.local`
3. `firmware\Config.h`
4. 手表重新 compile/upload

推荐流程：

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\set_flycare_mqtt_endpoint.ps1 -Mode OfflineLan -BrokerHost <NEW_PC_IP> -ServerHost <NEW_PC_IP>
```

然后手动确认：

```text
backend\backend\.env
MQTT_BROKER=<NEW_PC_IP>

frontend\.env.local
VITE_BACKEND_BASE_URL=http://<NEW_PC_IP>:8001

firmware\Config.h
MQTT_BROKER "<NEW_PC_IP>"
MQTT_BROKER_MILLION1 "<NEW_PC_IP>"
MQTT_BROKER_TRIPLE_NONE "<NEW_PC_IP>"
```

确认后重新烧录手表。

如果可以在 router 中固定 Server PC 仍为 `192.168.1.232`，就不需要重烧 firmware。

## 7. 完整 Demo 流程

### 7.1 启动

1. Server PC 连接 `flycare` Wi-Fi。
2. 用 Administrator PowerShell 执行：

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start_flycare_offline_demo.ps1 -OpenBrowser
```

3. 打开：

```text
http://192.168.1.232:5173/flycare
http://192.168.1.232:5173/admin
```

4. 检查 MQTT：

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/v1/data-reception/mqtt/status
```

### 7.2 Dashboard 在线状态

在 `/flycare`：

1. 选择 NG WAI LUN 或其他 demo passenger。
2. 等手表发布 status/location。
3. 确认 passenger 显示 Online/Live。
4. 地图 marker 应跟随手表位置更新。

### 7.3 Flight update

在 `/admin`：

1. 进入 `FlyCare` tab。
2. 在 Device preset 选择目标乘客，例如 `#1 NG WAI LUN`。
3. 填写推荐 demo 值：

```text
Flight number: CX910
Airline: Cathay Pacific
Departure airport: HKG
Destination: Singapore
Seat number: 21C
Scheduled departure: 17:35
Estimated departure: 17:56
Boarding time: 17:05
Boarding gate: 11
Terminal: T1
Check-in counter: C12-C18
Flight status: delayed
Delay minutes: 21
Delay reason: Gate Change to 11
Gate changed: checked
```

4. 点击 `MQTT + save Mongo`。
5. 预期结果：
   - Admin 显示 publish success。
   - Broker 出现 `smartwatch/<device_id>/flight`。
   - 手表 flight page 更新 gate/status。
   - Gate change 有 popup + vibration。
   - `/flycare` flight panel 更新。

### 7.4 SOS / Fall Admin 下发

在 `/admin` 的 FlyCare 区域：

1. 选择目标乘客。
2. 点击 `Trigger SOS`。
3. 手表出现 SOS popup + vibration。
4. 点击 `Clear SOS` 清除。
5. 点击 `Trigger Fall`。
6. 手表出现 Fall popup + vibration。
7. 点击 `Clear Fall` 清除。
8. 在 Event handling 区域把事件标记为 `confirmed` / `resolved` / `false_alarm`。

### 7.5 手表实体操作

手表目前使用侧键操作：

- SOS 短按：切换页面。
- SOS 长按约 3 秒：触发或取消 SOS。
- PWR：地图页呼出导航选择。
- 地图页内 SOS：选择/确认目的地。

如果手表没有声音，这是当前 final demo 稳定策略：SD/TTS/I2S audio 关闭，只保留 popup + vibration，避免影响 direct MQTT。

## 8. 离线 Demo

离线 demo 指没有 WAN/Internet，但 router 有电，Server PC 和手表都在 `flycare` LAN。

可以拔掉 router 的互联网网线，但不要关 router 电源。只要 Server PC 仍是 `192.168.1.232`，系统可继续本地运行：

- MQTT broker 在 Server PC
- Backend 在 Server PC
- Frontend 在 Server PC
- MySQL/MongoDB 在 Server PC
- 手表通过 Wi-Fi 直连 `192.168.1.232:1883`

如果 demo 中途为了问问题切到其他 Wi-Fi，回来后：

1. 切回 `flycare` Wi-Fi。
2. 确认 PC IP 是 `192.168.1.232`。
3. 重新执行：

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start_flycare_offline_demo.ps1 -OpenBrowser
```

## 9. 记录 Demo 过程

一键脚本会自动启动 recorder。也可以手动运行：

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\record_flycare_offline_demo.ps1 -Minutes 20 -BrokerHost 192.168.1.232 -BrokerPort 1883 -BaseUrl http://127.0.0.1:8001
```

记录文件会写入 `E:\flycare\logs`。

## 10. 常见问题

### MQTT 显示 disconnected

先确认 PC 是否真的在 `flycare` LAN 且 IP 是 `192.168.1.232`：

```powershell
ipconfig
Test-NetConnection 192.168.1.232 -Port 1883
```

再确认 backend：

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/v1/data-reception/mqtt/status
```

### 手表有 IP 但 Dashboard 不更新

检查 broker 是否收到手表 payload：

```powershell
& 'C:\Program Files\Mosquitto\mosquitto_sub.exe' -h 192.168.1.232 -p 1883 -t 'smartwatch/#' -v -R
```

如果 broker 没收到，问题在 Wi-Fi/router/MQTT path。
如果 broker 收到但 dashboard 不更新，检查 backend `8001` 和 Mongo latest API。

### COM port busy

关闭 Arduino Serial Monitor、旧 PowerShell serial reader、COM bridge，然后重新插拔手表：

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'bridge_flycare_serial\.ps1|SerialPort' } | Select-Object ProcessId,CommandLine
```

### Admin publish 成功但手表无反应

用 broker monitor 区分问题：

```powershell
& 'C:\Program Files\Mosquitto\mosquitto_sub.exe' -h 192.168.1.232 -p 1883 -t 'smartwatch/#' -v -R
```

- 看不到 `/flight` 或 `/alert`：Admin/backend publish path 有问题。
- 看得到 `/flight` 或 `/alert`，但手表无反应：检查手表是否订阅对应 canonical/alias topic。

## 11. 验证命令

Frontend：

```powershell
cd E:\flycare\frontend
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Backend Python compile：

```powershell
cd E:\flycare
python -m compileall backend\backend\app
```

Final audit：

```powershell
cd E:\flycare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit_flycare_goal.ps1 -BaseUrl http://127.0.0.1:8001
```

Firmware compile：

```powershell
cd E:\flycare
$cli='C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe'
$fqbn='esp32:esp32:esp32s3:FlashSize=8M,PartitionScheme=huge_app,PSRAM=opi,CDCOnBoot=cdc'
& $cli --config-file .arduino-cli\arduino-cli.yaml compile --fqbn $fqbn firmware --build-path .arduino-cli\tmp\watch-id-build
```

## 12. 关键边界

- `8001` 是 final hardware backend。
- `8000` 不用于 final hardware smoke。
- COM bridge 是 fallback，不是 direct Wi-Fi MQTT 成功证明。
- 不要 raw delete database rows；FlyCare demo 显示层用 `flycare_demo_registry` 控制。
- 更换 router IP 后，必须同时更新 backend/frontend/firmware，并重新烧录手表。
- Final demo 声音默认关闭；popup + vibration 是稳定路径。
