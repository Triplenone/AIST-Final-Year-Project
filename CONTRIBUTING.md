# Contributing / 貢獻指南

1. Fork + clone the repo. Use `dev` branch for integration.
2. Create feature branches with the naming scheme `feat/<area>-<desc>` (e.g. `feat/backend-geofence`).
3. Run formatting / tests locally (pre-commit hooks and module-specific commands).
4. Open a PR into `dev`, request reviews from CODEOWNERS, ensure CI passes, then merge.
5. `main` is tagged for releases and competition submissions.

繁體中文：請依照專案管理規則送 PR，並確保文件（`docs/`）與 Schema 更新同步。若修改 API/MQTT topics，請一併更新 `docs/API.md`。
