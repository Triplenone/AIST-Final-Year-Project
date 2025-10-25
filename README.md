# Smart Elderly Care Platform Monorepo / ���z���̷��@���x Monorepo

## English Overview
This repository follows the proposal-aligned playbook for a Wi-Fi only wearable ecosystem. It is organised as a monorepo so firmware, backend, frontend (PWA), AI services, documentation, and infrastructure can eventually integrate end-to-end. At the moment only the legacy web dashboard (`smart-wearable-elderly-care/frontend/web-dashboard`) is fully implemented; every other module is scaffolded as an empty shell with TODO notes so teams can onboard without guessing the structure.

## �c�餤�巧��
�������̷Ӵ��שһݪ���@�x�s�w�[�c�إߡA��K�������˸m�B��ݡB�e�ݡ]PWA�^�BAI �A�ȡB���P��¦�]�I���ӯ���L�_��X�C�ثe�ȫO�d�J������������O�]`smart-wearable-elderly-care/frontend/web-dashboard`�^�@�������@�A��l��Ƨ��Ҭ��Ŵ߻P�N��ƶ��A��K�U�p�ը̸��u�ϳv�B��J���e�C

---

## Repository Layout / �M�ץؿ�
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

## Frontend Status / �e�ݪ��A
* **Production demo:** `smart-wearable-elderly-care/frontend/web-dashboard`
  * Pure HTML/CSS/JS with localStorage data, bilingual UI, role-based flows.
  * See `GUIDE_FRONTEND.md` for beginner-friendly instructions (EN + �c��)�C
* **Future PWA:** `frontend/`
  * Contains `package.json`, Vite config placeholder, and service worker TODOs.
  * Once backend APIs exist, migrate UI modules or rewrite using React.

---

## Getting Started / �_�B�B�J
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

## Branching & Governance / ����P�v�z
- Default branch: `main` (protected). Use `dev` for day?to?day integration.
- Feature naming: `feat/<area>-<short-desc>`; Hotfix: `hotfix/<ticket>-<short-desc>`.
- Enable CODEOWNERS & CI once each module becomes active.

---

## Next Steps / �����ĳ
1. Formalise GitHub settings (branch protection, CODEOWNERS, labels, project board, milestones).
2. Flesh out backend FastAPI app (`backend/app`).
3. Convert dashboard into a PWA inside `frontend/` (React + Vite + Web Push).
4. Scaffold firmware features (Wi-Fi, BLE, GNSS, MQTT/TLS, OTA) using `firmware/` stub.
5. Keep documentation in sync (`docs/`).

�зf�t `GUIDE_FRONTEND.md` �F�ѥثe��������O���ϥΤ覡�C��Ҧ��ζ��ǳƴN���A�Y�i�̦����c�ֳt�i�}��Ҳն}�o�C
