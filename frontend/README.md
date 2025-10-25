# Future PWA Frontend / 未來 PWA 前端骨架

- This directory will host the Vite + React + TypeScript PWA described in the playbook.
- Current production UI still lives at `smart-wearable-elderly-care/frontend/web-dashboard`.
- When ready, run `npm create vite@latest` (or copy the provided package.json) and start migrating modules.

建議：
1. `npm install` 後撰寫 `src/app.tsx` 與 Map/Alerts/Resident 組件。
2. 加入 `@vite-pwa/vite-plugin` 以支援 Web Push 與離線快取。
3. 透過 `src/services/api.ts` 與 FastAPI 後端串接。
