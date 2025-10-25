# Smart Elderly Care Platform Monorepo / 智慧長者照護平台 Monorepo

## English Overview
This repository follows the proposal-aligned playbook for a Wi-Fi only wearable ecosystem. It is organised as a monorepo so firmware, backend, frontend (PWA), AI services, documentation, and infrastructure can eventually integrate end-to-end. At the moment only the legacy web dashboard (`smart-wearable-elderly-care/frontend/web-dashboard`) is fully implemented; every other module is scaffolded as an empty shell with TODO notes so teams can onboard without guessing the structure.

## 繁體中文概覽
此版本依照提案所需的單一儲存庫架構建立，方便穿戴式裝置、後端、前端（PWA）、AI 服務、文件與基礎設施未來能夠無縫整合。目前僅保留既有的網頁儀表板（`smart-wearable-elderly-care/frontend/web-dashboard`）作為完整實作，其餘資料夾皆為空殼與代辦事項，方便各小組依路線圖逐步填入內容。

---

## Repository Layout / 專案目錄
| Path | Status | Description |
|------|--------|-------------|
| `smart-wearable-elderly-care/frontend/web-dashboard` | ? Implemented | Existing static dashboard (authentication, resident CRUD, staffing, messaging, i18n). |
| `frontend/` | ? Placeholder | Future Vite + React PWA. Currently only docs / config stubs. |
| `backend/` | ? Placeholder | FastAPI + MQTT bridge skeleton (requirements + empty modules). |
| `firmware/` | ? Placeholder | PlatformIO project shell for ESP32 wearable. |
| `ai/` | ? Placeholder | Notebooks + optional inference service. |
| `infra/` | ? Placeholder | Docker Compose, Mosquitto config, dev certificates. |
| `tests-e2e/` | ? Placeholder | Reserved for Cypress / Playwright / k6. |
| `docs/` | ? Placeholder | Professional documentation set (system design, API, data dictionary, OTA, security). |
| `.github/` | ? Placeholder | CI/CD workflows, issue & PR templates, CODEOWNERS. |

---

## Frontend Status / 前端狀態
* **Production demo:** `smart-wearable-elderly-care/frontend/web-dashboard`
  * Pure HTML/CSS/JS with localStorage data, bilingual UI, role-based flows.
  * See `GUIDE_FRONTEND.md` for beginner-friendly instructions (EN + 繁體)。
* **Future PWA:** `frontend/`
  * Contains `package.json`, Vite config placeholder, and service worker TODOs.
  * Once backend APIs exist, migrate UI modules or rewrite using React.

---

## Getting Started / 起步步驟
1. **Clone** the repo (`git clone ...`).
2. **Install requirements per module** (see individual READMEs inside `firmware/`, `backend/`, `frontend/`, etc.).
3. **Run the existing dashboard**
   ```powershell
   cd smart-wearable-elderly-care/frontend/web-dashboard
   python -m http.server 5500
   # open http://localhost:5500 and press Ctrl+F5
   ```
4. **Follow the roadmap** in this README + `docs/` to implement remaining shells.

---

## Branching & Governance / 分支與治理
- Default branch: `main` (protected). Use `dev` for day?to?day integration.
- Feature naming: `feat/<area>-<short-desc>`; Hotfix: `hotfix/<ticket>-<short-desc>`.
- Enable CODEOWNERS & CI once each module becomes active.

---

## Next Steps / 後續建議
1. Formalise GitHub settings (branch protection, CODEOWNERS, labels, project board, milestones).
2. Flesh out backend FastAPI app (`backend/app`).
3. Convert dashboard into a PWA inside `frontend/` (React + Vite + Web Push).
4. Scaffold firmware features (Wi-Fi, BLE, GNSS, MQTT/TLS, OTA) using `firmware/` stub.
5. Keep documentation in sync (`docs/`).

請搭配 `GUIDE_FRONTEND.md` 了解目前網頁儀表板的使用方式。當所有團隊準備就緒，即可依此結構快速展開跨模組開發。
