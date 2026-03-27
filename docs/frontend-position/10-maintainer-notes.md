# Position Command Center Maintainer Notes

## 1. 目的

这份文档给后续 maintainer、backend engineer、reviewer、Codex 使用。

目标只有一个:
- 让 Position Command Center 持续可维护
- 不让 Phase 1 的 truth model 再次退化

## 2. 当前 repo reality

已验证现状:
- shell 已升级, 入口在 `frontend/src/App.tsx`
- Position 仍是主问题, 原文件在 `frontend/src/pages/PositionPage.tsx`
- Position Phase 1 使用 frontend orchestration, 不等待 backend change
- Position 专属 CSS 必须落在 `frontend/src/styles/position-page.css`
- `_ben_mem` 只能使用 repo-local 路径 `E:\FYP\AIST-Final-Year-Project-main\_ben_mem`

## 3. 保护面

不要改:
- `backend/backend/**`
- backend route contract
- backend payload shape
- database schema
- `frontend/src/pages/FlyCarePage.tsx`
- route path
- auth persistence
- theme persistence

## 4. Phase 1 architecture

Phase 1 只解决 trust 和 structure。

主结构:
- Left: `PositionResidentRail`
- Center: `PositionMapStage`
- Right: `PositionDecisionPanel`
- Map top strip: `PositionSummaryBar`
- Truth layer: `frontend/src/adapters/position-command-center.ts`

`PositionPage.tsx` 只保留:
- polling lifecycle
- selected resident state
- highlighted zone state
- refresh trigger
- modal edge detection
- component composition

## 5. Adapter contract

Position UI 只能消费 adapter / view model。

核心类型:
- `PositionTruthState = online | stale | offline`
- `PositionFreshnessLevel = live | delayed | stale`
- `PositionRiskLevel = stable | warning | critical`

核心 view model 字段:
- `residentId`
- `displayName`
- `deviceId`
- `truthState`
- `freshnessLevel`
- `riskLevel`
- `currentZone`
- `targetZone`
- `currentCoords`
- `targetCoords`
- `heartRate`
- `spo2`
- `battery`
- `fallState`
- `sosState`
- `lastSeenAt`
- `recentActions`
- `nextActionLabel`

规则:
- render layer 不要直接解析 raw payload
- online/offline/stale 只能算一次
- right panel 不要再做第二套 truth 判断

## 6. Truth model rules

Phase 1 锁定默认值:
- age `<= 30s` => `online`
- 有文档但 age `> 30s` => `stale`
- 没有 latest doc 或 request fail => `offline`
- freshness `<= 30s` => `live`
- freshness `<= 120s` => `delayed`
- freshness `> 120s` 或 timestamp 无法解析 => `stale`

风险规则:
- `sosState = true` => `critical`
- confirmed fall => `critical`
- `heartRate >= 110` => `warning`
- `SpO2 <= 92` => `warning`
- 非 `online` truth => `warning`
- 其他 => `stable`

## 7. Resident registry rule

Phase 1 仍使用 frontend-owned resident registry。

原因:
- 当前 repo 没有 authoritative resident-to-mongo-device mapping
- `residentApi`, `deviceApi`, `eventApi` 之间没有可靠 join 可直接用于 Position truth

要求:
- 只做 exact match
- 不做 fuzzy mapping
- 如果 backend 未来提供 authoritative mapping, 在新 phase 单独升级

## 8. CSS boundary rule

Position 新增样式只能放到:
- `frontend/src/styles/position-page.css`

`frontend/src/styles/global.css` 只允许保留:
- FlyCare 仍共享的 legacy `.position-page__*` 选择器
- 必要的 integration cleanup

不要再把 Position growth 放回 `global.css`。

## 9. Right panel rule

Decision panel 必须 summary-first。

高优先级:
- live status
- current zone
- battery
- heart rate
- SpO2

低优先级:
- target zone
- fall state
- SOS state
- device id
- raw coordinates
- last update

raw field 只能做 secondary context。

## 10. Read order

后续 Position 维护建议顺序:
1. `_ben_mem/PROTO.md`
2. `_ben_mem/CURR.mem`
3. `docs/frontend-position/00-master-plan.md`
4. `docs/frontend-position/00-governance.md`
5. 当前 phase doc
6. `frontend/src/adapters/position-command-center.ts`
7. `frontend/src/pages/PositionPage.tsx`

## 11. Write discipline

每次 Phase work 都要更新:
- phase doc
- maintainer notes
- backend-facing boundary doc
- `_ben_mem/CURR.mem`
- `_ben_mem/LOG/*`

`_ben_mem` 规则:
- one fact per line
- `KEY=VALUE`
- ASCII first
- 不写散文

## 12. Future triggers

如果出现以下情况, 需要新 phase:
- backend 提供 authoritative mapping
- backend 提供 aggregated Position DTO
- Position 要引入 event timeline
- Position 要做 full responsive finishing
- FlyCare 需要脱离 legacy `.position-page__*` 样式
