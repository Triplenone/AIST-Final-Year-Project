# AI Workspace

## English Version
Use this directory for analytics and ML artifacts: exploratory notebooks, feature engineering scripts, and optional inference services (FastAPI/gRPC) that feed risk scores back to the platform.

### Suggested Layout
| Path | Purpose |
|------|---------|
| `notebooks/` | EDA, prototyping, offline evaluation. |
| `service/` | Production inference code (FastAPI/gRPC) plus Dockerfile. |
| `data/` | Sample datasets for replayable demos (no PHI). |

### Workflow Tips
1. Track experiments with lightweight metadata (mlflow, wandb, or Markdown logs).
2. Export compact ONNX/TFLite artifacts so backend or firmware can fall back if AI is offline.
3. Keep notebooks deterministic: pinned seeds, documented inputs, mapping to backend enums.

### Latest Alignment (Feb 2025)
- The React PWA now surfaces `status` bands (stable/followUp/high), `lastSeenAt`, `lastSeenLocation`, vitals, and `origin` flags (seed/dynamic/manual). Design feature stores that match these fields so ML scores plug directly into the UI without reshaping data.
- Manual residents are often used for demos; provide synthetic datasets that mirror this behaviour so risk models stay resilient when admins inject curated samples.
- Streaming can be paused while polling snapshots. Batch inferences should therefore tolerate both push and pull cadences.

## 繁體中文（香港）版本
此目錄用於分析與機器學習成果：探索式 Notebook、特徵工程腳本，以及可選的推論服務（FastAPI/gRPC），用來將風險分數回饋主平台。

### 建議結構
| 路徑 | 用途 |
|------|------|
| `notebooks/` | 進行 EDA、模型原型、離線評估。 |
| `service/` | 正式推論程式（FastAPI/gRPC）與 Dockerfile。 |
| `data/` | 可重播 Demo 的樣本資料（不得含真實 PHI）。 |

### 工作提示
1. 以 mlflow、wandb 或 Markdown 記錄實驗，確保可追溯。
2. 將模型匯出成 ONNX/TFLite，便於後端或韌體在 AI 節點離線時切換到規則模式。
3. Notebook 必須可重現：固定亂數種子、標示輸入來源，並說明輸出如何對應後端列舉值。

### 最新對齊（2025-02）
- React PWA 目前顯示 `status`（stable/followUp/high）、`lastSeenAt`、`lastSeenLocation`、生命徵象與 `origin`（seed/dynamic/manual），請在特徵資料與模型輸出保持相同 schema，方便直接帶入 UI。
- Demo 期間常插入自訂住民，建議在樣本資料中模擬相同行為，以確保風險模型不受人工樣本干擾。
- 前端可暫停串流改用輪詢，因此模型推論需同時支援 push 與批次 pull 的節奏。
