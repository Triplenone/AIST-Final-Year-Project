# 前端重构执行索引

## 变更范围
- 本轮执行仅覆盖前端壳层、overview 体验、非 FlyCare 路由的视觉统一、执行记忆与交付文档。
- 后端、API 契约、数据库、`frontend/src/pages/FlyCarePage.tsx` 不在本轮改动范围。

## 涉及文件
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/App.tsx`
- `frontend/src/components/shell/AppHeader.tsx`
- `frontend/src/components/shell/QuickActionsDock.tsx`
- `frontend/src/components/shell/AuthModal.tsx`
- `frontend/src/components/charts/DashboardCharts.tsx`
- `frontend/src/components/overview/OverviewExperience.tsx`
- `frontend/src/styles/tokens.css`
- `frontend/src/styles/app-shell.css`
- `frontend/src/styles/overview.css`
- `frontend/src/styles/charts.css`
- `docs/frontend-redesign/01-preflight-and-memory.md`
- `docs/frontend-redesign/02-shell-overview-and-route-harmonization.md`
- `docs/frontend-redesign/03-validation.md`
- `docs/frontend-redesign/04-chart-stability-and-polish.md`

## 变更内容
- 新增 `framer-motion` 作为统一动效基础设施。
- 将 `App.tsx` 从重复 render 的单体结构改成可维护的 shell orchestration。
- 新增 shell / overview 组件与样式分层，建立 Ambient Care 视觉方向。
- 保持 Position、Location、Residents、Operations、Family、Admin 的原有能力，但换上统一壳层。
- 增加执行前与执行后的 memory 记录。
- 给 Recharts 图表补上稳定测量容器，降低切页时的宽高 warning。

## What
- 做了一次以 `Ambient Care Command Center` 为主题的前端重构起步版本。

## 为什么
- 旧结构的 UI 逻辑、路由分支、overview 体验和控制抽屉耦合过重，难以继续做高质量交互打磨。
- 用户要求前端必须更前卫、更有动态感，同时要留下清晰可交接的变更记录与记忆轨迹。

## 如何做
- 先写执行前记忆，再重构 shell 和 overview，再做构建与浏览器验证，最后补文档与执行后记忆。
- 文档按阶段拆分，每个阶段都明确回答 `What / 为什么 / 如何做`。

## 交付导航
- [01-preflight-and-memory](./01-preflight-and-memory.md)
- [02-shell-overview-and-route-harmonization](./02-shell-overview-and-route-harmonization.md)
- [03-validation](./03-validation.md)
- [04-chart-stability-and-polish](./04-chart-stability-and-polish.md)

## 验证结果
- `npm run build` 已通过。
- 预览站点已在本地跑起，并完成 overview / position / location 的浏览器检查。
- 图表容器已补强，后续重点从 warning 收敛转向真实数据态的视觉微调。

## 风险与后续
- 现有中文 locale 文件在控制台输出时仍表现为编码异常，暂未在本轮改写翻译资源。
- Recharts 在页面切换时仍有宽高 warning，需要后续专门收敛。
