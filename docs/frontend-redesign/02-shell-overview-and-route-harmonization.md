# 阶段 02：Shell、Overview 与非 FlyCare 路由统一

## 变更范围
- App shell 重构。
- Overview 视觉重建。
- Quick Actions / Auth Modal / Header 的统一化。
- 非 FlyCare 路由外壳统一。

## 涉及文件
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/App.tsx`
- `frontend/src/components/shell/AppHeader.tsx`
- `frontend/src/components/shell/QuickActionsDock.tsx`
- `frontend/src/components/shell/AuthModal.tsx`
- `frontend/src/components/overview/OverviewExperience.tsx`
- `frontend/src/styles/tokens.css`
- `frontend/src/styles/app-shell.css`
- `frontend/src/styles/overview.css`

## 变更内容
- 新增 `framer-motion`，让 route、hero、modal 具备统一的 motion language。
- 清理 `App.tsx` 的重复 render 分支，保留一个明确的 route switch。
- 把 header、quick actions、auth modal 抽成独立组件。
- 把 overview 从“hero + card + chart”重构成更强视觉锚点的 Ambient Care 首屏。
- 保留 Position / Location / Admin / Residents 等页面能力，只替换外层视觉容器与交互节奏。

## What
- 做了一套新的前端壳层和 overview 体验，让页面从“原型感”变成“产品感”。

## 为什么
- 旧版 overview 更像功能堆叠，不像一个有清晰气质的主工作区。
- 旧版 `App.tsx` 耦合高、重复结构多，不适合继续做高强度交互迭代。
- 用户明确要求页面更动态、更成熟、更有设计感，同时禁止改 FlyCare 与后端。

## 如何做
- 用 `AppHeader` 统一品牌与导航语法。
- 用 `QuickActionsDock` 统一主题、语言、账号操作的控制层。
- 用 `AuthModal` 承接登录/注册弹层，并统一过渡动画。
- 用 `OverviewExperience` 承担 hero、signal panels、metrics rail、charts、alerts、insights、next steps 的新布局。
- 用 `tokens.css + app-shell.css + overview.css` 建立新的视觉底座，而不是继续把所有样式塞回单个旧文件。

## 交互/视觉说明
- 壳层方向是 `Ambient Care`：暖色调、轻玻璃、强留白、柔和纵深。
- Overview 首屏采用“左文案、右视觉信号面板”的构图，形成明确第一印象。
- Quick Actions 继续保持浮动控制逻辑，但视觉语气从 utilitarian 改成 polished control dock。
- 非 FlyCare 页保留 operational 属性，不做 marketing hero 化。

## 验证结果
- `npm run build` 已通过。
- 本地预览可正常进入 overview、position、location 等路由。

## 风险与后续
- 当前英文文案沿用现有 key，中文 locale 资源因编码表现异常暂未扩写。
- 图表在个别切页场景仍有 `width/height` warning，后续可继续做容器稳态优化。
