# End-to-End Tests

## English Version
`tests-e2e/` will store UI and API regression suites once the product surface stabilises. Plan: smoke tests on every PR, full regression nightly on `dev`.

### Tooling Plan
| Suite | Scope |
|-------|-------|
| Playwright / Cypress | Browser automation: login, resident CRUD, staffing, messaging, localization, offline toggles. |
| k6 | API + MQTT load (telemetry bursts, OTA fan-out). |
| Reporting | Publish JUnit + HTML artifacts to CI. |

### Getting Started
1. Choose Playwright or Cypress and add dependencies to `package.json`.
2. Create `tests-e2e/.env.example` for base URLs, seeded accounts, feature flags.
3. Add npm scripts (e.g., `npm run test:e2e:smoke`) and wire to CI.

## 繁體中文（香港）版本
`tests-e2e/` 將在產品介面穩定後存放 UI 與 API 回歸測試。計畫：每個 PR 跑冒煙測試，`dev` 分支每日夜間跑完整回歸。

### 工具規劃
| 套件 | 範圍 |
|------|------|
| Playwright / Cypress | 瀏覽器自動化：登入、住民 CRUD、人力調整、訊息、語系、離線切換。 |
| k6 | API 與 MQTT 壓測（遙測尖峰、OTA 廣播）。 |
| 報告 | 在 CI 匯出 JUnit 與 HTML 結果。 |

### 開始使用
1. 選定 Playwright 或 Cypress，並在 `package.json` 安裝依賴。
2. 建立 `tests-e2e/.env.example`，記錄 Base URL、測試帳號、Feature Flag。
3. 新增 npm script（如 `npm run test:e2e:smoke`）並連動 CI。
