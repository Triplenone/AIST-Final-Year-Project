# 阶段 04：Chart Stability 与交互抛光

## 变更范围
- Recharts 容器稳态修正。
- Overview 图表区域的测量盒补强。
- 文档索引同步。

## 涉及文件
- `frontend/src/components/charts/DashboardCharts.tsx`
- `frontend/src/styles/charts.css`
- `docs/frontend-redesign/README.md`

## 变更内容
- 为三个图表统一加入稳定的 `ResponsiveContainer` 配置。
- 补充 `chart-card__viewport` 容器，确保图表在 route transition 中仍有稳定宽高。
- 为图表稳态修正增加代码注释，解释该兼容层存在的原因。

## What
- 做了一次针对图表容器的稳态修正，让 overview 在动画切页时更成熟、更稳。

## 为什么
- 之前的图表虽然能正常显示，但在 route transition 或容器重测量时会出现 `width/height` warning。
- 这种 warning 不一定会导致功能错误，但会降低交互质量，也会干扰后续 UI 调校与验证。

## 如何做
- 在 `DashboardCharts.tsx` 里抽出统一的 `responsiveFrameProps`，显式设置 `width`、`height`、`minWidth`、`minHeight` 与 `debounce`。
- 在 `charts.css` 中增加 `chart-card__viewport`，给 Recharts 一个稳定测量盒。
- 保持现有图表结构与数据契约不变，只做前端表现层修正。

## 交互/视觉说明
- 这一步不是改图表样式主题，而是让图表在壳层动画和自适应布局下表现更平滑。
- 它属于 `interaction polish`，解决的是“切换时是否稳”和“控制台是否干净”。

## 验证结果
- 已重新执行前端构建验证。
- 图表代码和样式层均未触碰后端接口，也未影响 FlyCare。

## 风险与后续
- 如果后续引入更复杂的图表切换动画，仍需要再看一次 `ResponsiveContainer` 与父容器时序。
- 当前中文 locale 的编码表现问题与本阶段无关，后续应独立处理。
