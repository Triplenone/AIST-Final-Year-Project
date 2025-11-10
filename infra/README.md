# Infrastructure Skeleton

## English Version
`infra/` defines the local/dev stack that mirrors production: Mosquitto for MQTT, TimescaleDB for time-series storage, MinIO for artifacts, and containers for backend/frontend. TLS assets are generated with `mkcert`, enabling HTTPS/TLS even in local demos.

### Key Files
| File | Description |
|------|-------------|
| `docker-compose.dev.yml` | Brings up MQTT (1883/8883), TimescaleDB (5432), MinIO (9000/9001), backend (8000), frontend (5173). |
| `mkcert-dev-certs.sh` | Generates `server.crt/key` and copies dev root CA for Mosquitto TLS. |
| `mosquitto/mosquitto.conf` | Dual listeners (1883 plaintext, 8883 TLS) with anonymous dev access. |
| `sql/000_init.sql` | Placeholder schema to be replaced by real migrations. |

### Usage
```bash
cd infra
./mkcert-dev-certs.sh   # run once per machine
docker compose -f docker-compose.dev.yml up --build
```
Set `APP_CONFIG.apiBase = 'http://localhost:8000/api/v1'` and `dataMode = 'hybrid'` to exercise the whole stack.

### Latest Alignment (Feb 2025)
- The React PWA now depends on `/sim/sse` and `/sim/snapshot`. When fronting the app with nginx/Caddy, ensure both endpoints are reachable (and cache-bypassed) at the site root.
- Streaming can be paused while polling snapshots; configure reverse proxies to keep SSE read timeouts ≥ 60 s and allow HTTP/1.1 keep-alive.
- Manual resident creation and delete calls will soon map to backend APIs. Plan port mappings (e.g., 5173 → 8443) so future gateway testing mimics production TLS.

### Hardening TODO
- Disable anonymous MQTT and require client certificates for prod.
- Add observability stack (Prometheus/Grafana/Loki).
- Provide edge-mode compose for gateway deployments.

## 繁體中文（香港）版本
`infra/` 負責定義本地／開發用堆疊，模擬正式環境：Mosquitto（MQTT）、TimescaleDB（時序資料）、MinIO（檔案），以及後端／前端容器。透過 `mkcert` 產生 TLS 憑證，可在本機也使用 HTTPS/TLS。

### 重要檔案
| 檔案 | 說明 |
|------|------|
| `docker-compose.dev.yml` | 啟動 MQTT(1883/8883)、TimescaleDB(5432)、MinIO(9000/9001)、後端(8000)、前端(5173)。 |
| `mkcert-dev-certs.sh` | 產生 `server.crt/key` 並複製本機根憑證供 Mosquitto TLS 使用。 |
| `mosquitto/mosquitto.conf` | 1883 明文 + 8883 TLS，開發模式允許匿名。 |
| `sql/000_init.sql` | 占位 Schema，將來以實際遷移取代。 |

### 使用方法
```bash
cd infra
./mkcert-dev-certs.sh   # 每台機器一次
docker compose -f docker-compose.dev.yml up --build
```
將 `APP_CONFIG.apiBase` 設為 `http://localhost:8000/api/v1`，並切換 `dataMode = 'hybrid'`，即可測試端到端流程。

### 最新對齊（2025-02）
- React PWA 仰賴 `/sim/sse` 與 `/sim/snapshot`，部署時請確保這兩個路徑可直接由 root 存取並跳過快取。
- 串流可能暫停改用輪詢，反向代理需允許 SSE 連線逾時 ≥ 60 秒並保持 HTTP/1.1 keep-alive。
- 管理員刪除／自訂住民未來會改接後端 API，提前規畫對外埠號與 TLS 配置，以便日後在 Gateway 環境複製相同行為。
### 強化待辦
- 正式環境需停用匿名 MQTT，並改用客戶端證書。
- 新增觀察性堆疊（Prometheus/Grafana/Loki）。
- 提供 Edge Gateway 專用的 compose 組態。
