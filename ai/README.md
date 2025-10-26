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
