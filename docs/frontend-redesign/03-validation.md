# 阶段 03：构建与真实浏览器验证

## 变更范围
- 构建验证。
- 本地预览验证。
- 浏览器交互快照验证。

## 涉及文件
- `frontend/dist/*`
- `run-logs/frontend-preview.out.log`
- `run-logs/frontend-preview.err.log`

## 变更内容
- 运行 `npm run build`，确认新的组件结构与动效依赖可通过构建。
- 启动 `npm run preview -- --host 127.0.0.1 --port 4173`。
- 用真实浏览器检查 overview、position、location 的首屏与路由表现。

## What
- 验证这轮重构不是“代码看起来对”，而是“页面真的跑起来了”。

## 为什么
- 这种前端重构的核心价值在交互与视觉，不做真实浏览器检查就不算完成。
- 构建通过只能证明语法与 bundling 正常，不能证明首屏、壳层、抽屉和路由过渡成立。

## 如何做
- 先 build，再 preview。
- 在浏览器里确认：
  - overview 的 hero、signal panels、metrics rail 正常渲染
  - position 页面没有被新 shell 误伤
  - location 页面仍能正常展示 floor map
  - quick actions 可以打开
- 记录可见 warning 与后续处理项。

## 交互/视觉说明
- 新壳层已能在不同路由上维持统一品牌感。
- overview 的首屏构图已形成明显的层次与氛围。
- Position 页面在不改其业务文件的前提下，被纳入统一视觉壳层。

## 验证结果
- `npm run build`：通过。
- 本地预览：通过。
- 浏览器快照验证：通过。
- 已知问题：
  - 若本地 backend 未启动，会出现 API `ERR_CONNECTION_REFUSED`。
  - 首轮验证时曾发现 `Recharts width/height warning`，已在阶段 04 补做 chart stability 修正并完成 overview 复测。

## 风险与后续
- 下一轮应补充更完整的 route regression 与 reduced-motion 专项检查。
- 若后续提供 Figma，可在此基础上再接入高保真追齐阶段。
