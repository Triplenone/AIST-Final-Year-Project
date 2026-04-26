# Frontend Phase — Codex 執行指示
> **Status: COMPLETED — historical handoff, kept for audit trail.**
> Landed via: PR #30 / commits e45d768, 5d1f0f8, 2063281, 0cb4bbb, 518eb87
> Date completed: 2026-04
> 為 final report 引用保留原文，唔再係 active plan。

## 讀者
Codex（自動執行者）、frontend maintainer、PR reviewer。

## Boot 順序
執行前必須依序讀：
1. `_ben_mem/PROTO.md`
2. `_ben_mem/CURR.mem`
3. `docs/merge-frontend-plan.md`
4. `AGENTS.md`
5. 本文件（`docs/frontend-phase-codex-handoff.md`）
6. 各 Feature 對應的 target files

---

## 背景

Merge Phase Slice A+B 已 committed（`417a73d`, `c0918e7`）。
Slice C/D 延後：Slice D 被 `Device.mac_address` 長度問題 block。
Frontend phase 現在可以開始。

Backend 已提供：
- `/api/v1/residents/` — 含 `avatar_url`（optional, nullable）
- `/api/v1/family-summary/today` — placeholder endpoint
- `/api/v1/mongo-upstream/latest` — 已有
- `/api/v1/mongo-upstream/` — 已有

Backend 尚未提供：
- `/api/v1/mongo-upstream/vitals/user/{id}/history` — Slice D 未落地

---

## 全局規則

### Protected surfaces（所有 Feature 共用）
- `backend/**` — 零修改
- `frontend/src/pages/FlyCarePage.tsx` — 零修改
- `frontend/src/pages/PositionPage.tsx` — 除 Feature 4 外零功能修改
- `frontend/src/adapters/position-command-center.ts` — 零修改
- `frontend/src/components/position/**` — 零修改
- `frontend/src/styles/position-page.css` — 零修改
- route contract — 不刪除現有 route path
- auth persistence — 不改
- theme persistence — 不改

### CSS boundary rule
- 新 Family 樣式放 `frontend/src/styles/family-page.css`
- 不把 Family-specific selectors 寫回 `global.css`
- 可在 `app-shell.css` 加少量 route-stack 整合

### Fallback rule（適用 Feature 2 和 Feature 5）
- 若 endpoint 不存在或 404/503，顯示友善 fallback message（如「後端接口尚未就緒」）
- 絕不 crash
- 絕不拋 uncaught error
- 用 try/catch + graceful UI state

### Commit 規則
- 每個 Feature 一個獨立 commit
- commit message 格式：`feat(frontend): <description>`
- 不 batch 多個 Feature 到同一 commit

### 驗證規則（每個 Feature commit 前）
1. `npm run build` 通過
2. `npm run lint` 通過
3. `git diff -- backend/` 為空
4. `git diff -- frontend/src/pages/FlyCarePage.tsx` 為空
5. `git diff -- frontend/src/adapters/position-command-center.ts` 為空

---

## Feature 1: Family 頁面 — 頭像、姓名、房間

### Objective
`/family` 顯示住民列表，每個住民有頭像（或 fallback icon）、姓名、房間。

### Target files
- `frontend/src/types/backend.ts` — 在 `BackendResident` interface 加 `avatar_url?: string | null`
- `frontend/src/pages/FamilyPage.tsx` — **新建**
- `frontend/src/components/family/FamilyResidentCard.tsx` — **新建**
- `frontend/src/styles/family-page.css` — **新建**
- `frontend/src/services/api.ts` — 只加 `familySummaryApi`（見 Feature 3，可一起做）
- `frontend/src/App.tsx` — 把 `/family` route 從 inline `renderInsightsPanel()` 改為 lazy import `FamilyPage`

### Backend dependency
- `/api/v1/residents/` 含 `avatar_url`（Slice B 已落地）

### 實作要點
1. 在 `BackendResident` 加 `avatar_url?: string | null`（line ~134-158 of `backend.ts`）
2. 新建 `FamilyPage.tsx`：
   - 呼叫 `residentApi.list()` 取得住民列表
   - 用 `FamilyResidentCard` 渲染每個住民
   - 頭像：若 `avatar_url` 有值則顯示 `<img>`，否則顯示 fallback icon（首字母或 generic icon）
   - 佈局：grid 或 list，responsive
3. 新建 `family-page.css`
4. 在 `App.tsx` 加 lazy import：
   ```ts
   const FamilyPage = lazy(() =>
     import('./pages/FamilyPage').then(m => ({ default: m.FamilyPage }))
   );
   ```
5. 在 `renderDashboardPage()` 的 `case 'family':` 改為 render `<FamilyPage />`
6. 保留現有 `renderInsightsPanel()` 函數但不再在 family route 使用

### Acceptance
- `/family` route 顯示住民 card grid
- 每個 card 有頭像（或 fallback）、姓名、房間
- 住民資料來自 `/api/v1/residents/`
- 若 backend 未啟動，不 crash
- `npm run build` 通過

---

## Feature 2: Family 頁面 — 生命徵象歷史 + 時間範圍篩選

### Objective
在 `/family` 選擇住民後，顯示該住民的生命徵象歷史記錄，支持時間範圍篩選。

### Target files
- `frontend/src/pages/FamilyPage.tsx` — 擴充
- `frontend/src/hooks/useVitalsHistory.ts` — **新建**
- `frontend/src/components/family/VitalsHistoryPanel.tsx` — **新建**
- `frontend/src/styles/family-page.css` — 擴充

### Backend dependency
- `/api/v1/mongo-upstream/vitals/user/{id}/history` — **Slice D 未落地**

### Fallback rule（強制）
- 若 endpoint 回 404 或 503 或 network error：
  - 顯示 fallback 訊息：「生命徵象歷史接口尚未就緒，請等待後端更新」
  - 三語 i18n（在 translation.json 加 `family.vitalsHistory.pending`）
- 絕不 crash，絕不 console.error 未處理

### 實作要點
1. 新建 `useVitalsHistory.ts` hook：
   - 接受 `residentId` 和 `timeRange` 參數
   - 嘗試呼叫 API endpoint
   - 回傳 `{ data, loading, error, isUnavailable }` 狀態
   - `isUnavailable = true` 時 UI 顯示 fallback
2. 新建 `VitalsHistoryPanel.tsx`：
   - 顯示心率、血氧、體溫等歷史
   - 時間範圍選擇器：最近 1 小時 / 6 小時 / 24 小時 / 7 天
   - loading state、empty state、unavailable state
3. 在 `FamilyPage` 加住民選擇邏輯：點擊 card → 展開該住民的 vitals panel
4. 在三語 translation.json 加 `family.vitalsHistory.*` keys

### Acceptance
- 選擇住民後出現 vitals panel
- 時間範圍可切換
- 因 Slice D 未落地，目前必定顯示 fallback 訊息
- fallback 訊息三語正確
- 不 crash

---

## Feature 3: Family 頁面 — 今日摘要

### Objective
`/family` 底部顯示今日摘要，資料來自 `/api/v1/family-summary/today`。

### Target files
- `frontend/src/pages/FamilyPage.tsx` — 擴充
- `frontend/src/hooks/useFamilySummary.ts` — **新建**
- `frontend/src/components/family/FamilySummarySection.tsx` — **新建**
- `frontend/src/services/api.ts` — 加 `familySummaryApi`
- `frontend/src/styles/family-page.css` — 擴充

### Backend dependency
- `/api/v1/family-summary/today`（Slice B 已落地，但目前是 placeholder）

### Fallback rule
- 若 endpoint 回 404 或空資料，顯示 graceful fallback（如「今日摘要暫無資料」）
- 三語 i18n

### 實作要點
1. 在 `api.ts` 加：
   ```ts
   export const familySummaryApi = {
     getToday: () => api.get('/family-summary/today'),
   };
   ```
2. 新建 `useFamilySummary.ts` hook：
   - 呼叫 `familySummaryApi.getToday()`
   - 回傳 `{ summary, loading, error }`
3. 新建 `FamilySummarySection.tsx`：
   - 顯示今日摘要資訊
   - loading / empty / error states
4. 在 `FamilyPage` 底部加入 `<FamilySummarySection />`
5. 在三語 translation.json 加 `family.summary.*` keys

### Acceptance
- `/family` 底部有今日摘要區塊
- 資料來自 `/api/v1/family-summary/today`
- 若 backend 回空或 error，顯示 graceful fallback
- 三語正確
- `npm run build` 通過

---

## Feature 4: Position 取代 Location — 導航重定向

### Objective
`/location` 自動 redirect 到 `/position`；更新三語 nav 標籤。

### Target files
- `frontend/src/App.tsx` — 修改 route 和 nav
- `frontend/src/locales/en/translation.json` — 更新 nav label
- `frontend/src/locales/zh-HK/translation.json` — 更新 nav label
- `frontend/src/locales/zh-CN/translation.json` — 更新 nav label

### 實作要點
1. 在 `App.tsx` 的 route 處理中，為 `/location` 加 `<Navigate to="/position" replace />`
   - **不要刪除** `/location` route path（保留 URL 兼容）
   - 只加 redirect
2. 更新 NAV_ITEMS：
   - 保留 `position` nav item
   - 移除或隱藏 `location` nav item（因為已 redirect）
   - 或者將 `location` label 改為指向 position
3. 更新三語 nav 標籤：
   - en: `"position": "Indoor Position"` 或 `"Position"`（保持現有即可）
   - zh-HK: `"position": "室內定位"`
   - zh-CN: `"position": "室内定位"`
   - 若移除 location nav item，則不需要 location label
4. import `Navigate` from `react-router-dom`（若未 import）

### Forbidden
- 不刪除 `/location` route（只 redirect）
- 不修改 `PositionPage.tsx` 的功能邏輯
- 不修改 Position adapter 或 components

### Acceptance
- 訪問 `/location` 自動跳轉到 `/position`
- `/position` 正常顯示（功能不變）
- nav bar 標籤三語正確
- `npm run build` 通過
- `git diff -- frontend/src/pages/PositionPage.tsx` 只有 zero 或 minimal change（不影響功能）

---

## Feature 5: Residents 頁面 — 生命徵象 Modal

### Objective
`/residents` 的每個住民列有按鈕，點擊打開 modal 顯示生命徵象歷史 + 時間範圍篩選。

### Target files
- `frontend/src/components/admin/ResidentsAdmin.tsx` — 加 modal trigger button
- `frontend/src/components/family/VitalsHistoryModal.tsx` — **新建**（可複用 Feature 2 的 VitalsHistoryPanel）
- `frontend/src/styles/family-page.css` — 擴充（modal styles）

### Backend dependency
- 同 Feature 2（Slice D 未落地）

### Fallback rule（同 Feature 2）
- Modal 內若 endpoint 不可用，顯示「生命徵象歷史接口尚未就緒」fallback
- 三語 i18n
- 絕不 crash

### 實作要點
1. 新建 `VitalsHistoryModal.tsx`：
   - 接受 `residentId`, `residentName`, `isOpen`, `onClose` props
   - 內部複用 `useVitalsHistory` hook 和 `VitalsHistoryPanel` component（Feature 2 已建）
   - modal overlay + close button
   - 關閉 modal 不影響 residents table state
2. 在 `ResidentsAdmin.tsx`：
   - 每列加「查看生命徵象」按鈕
   - 點擊 → 開啟 `VitalsHistoryModal`
   - state: `selectedResidentId`, `isModalOpen`
3. 在三語 translation.json 加 `residents.vitalsModal.*` keys

### Forbidden
- 不修改 residents table 的現有欄位或排序邏輯
- 關閉 modal 後 table 狀態不可丟失（search, filter, scroll position）

### Acceptance
- 每個住民列有「查看生命徵象」按鈕
- 點擊打開 modal
- Modal 內顯示 vitals history（目前因 Slice D 未落地會顯示 fallback）
- 關閉 modal 後 table 狀態保持
- `npm run build` 通過

---

## 執行順序

建議順序（每個 Feature 一個 commit）：

1. **Feature 4**（最小改動，獨立，可先驗證 routing）
2. **Feature 1**（建立 FamilyPage 基礎架構）
3. **Feature 3**（擴充 FamilyPage + api.ts）
4. **Feature 2**（加 vitals history + fallback）
5. **Feature 5**（複用 Feature 2 的 hook 和 component）

---

## _ben_mem 更新規則

所有 5 個 Feature commit 完成後：
1. 更新 `_ben_mem/CURR.mem`：
   - `V.frontend.family.page=frontend/src/pages/FamilyPage.tsx`
   - `V.frontend.family.components=[...]`
   - `V.frontend.family.css=frontend/src/styles/family-page.css`
   - `V.frontend.family.api.familySummary=/api/v1/family-summary/today`
   - `V.frontend.family.avatar_url=additive-in-type`
   - `V.frontend.family.vitals_history.fallback=active`
   - `V.frontend.location_redirect=Navigate-to-position`
   - `V.frontend.residents.vitals_modal=fallback-active`
   - `V.frontend.build=ok`
   - `V.frontend.lint=ok`
   - `I.next=slice-d-vitals-endpoint-then-remove-fallback`
2. 新建 `_ben_mem/LOG/YYYYMMDD-HHMMSS.mem`
3. 更新 `docs/merge-frontend-plan.md` 的 Feature status

---

## Final Report 格式

完成後回報：
1. branch used
2. files changed（列出所有新建和修改的檔案）
3. validations run（build, lint, git diff）
4. blockers（若有）
5. docs updated
6. mem updated
7. 每個 Feature 的 commit hash

---

## Decision log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-04-13 | Feature 執行順序 4→1→3→2→5 | 最小依賴鏈，Feature 2 和 5 共享 hook |
| 2026-04-13 | Family CSS 獨立檔案 | 遵循 Position 的 CSS boundary 先例 |
| 2026-04-13 | VitalsHistoryPanel 可複用 | Feature 2 和 5 共享相同 hook 和 UI |
| 2026-04-13 | avatar_url 加在 BackendResident type | Slice B 已在 backend 加了此欄位 |
| 2026-04-13 | 保留 /location route 只做 redirect | URL 兼容性 |
