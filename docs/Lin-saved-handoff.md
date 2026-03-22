# Lin-saved Handoff Note

## 概要
这份文档用于说明本次 `Lin-saved` 版本整理后，`E:\FYP\AIST-Final-Year-Project-main` 的实际状态、关键变更、GitHub branch 建议，以及已完成的验证结果。

目标不是解释设计理想，而是让后端工程师一眼看懂：

- 现在 repo 的 active structure 是什么
- 这次 cleanup / archive / release packaging 实际改了什么
- 哪些 `git status` 变化是正常的
- 推 branch 前应该检查什么
- 当前已经验证了什么
- 当前还存在哪些真实问题

## 当前结论
当前 repo 已经具备建立 GitHub branch version 的条件，推荐 branch name 为：

`codex/Lin-saved-cleanup-release`

当前这次整理已经把 repo 收敛成：

- 唯一 active backend：`backend/backend`
- 唯一 active frontend：`frontend`
- 统一 data assets：`database/mysql`、`database/mongo`
- 统一 docs 入口：`README.md` 与 `docs/`
- 可重复执行的 release packaging flow：`scripts/build_release.ps1`

## 这次整理后的 active structure

### Backend
- `backend/backend` 是唯一 active backend entrypoint
- backend startup workflow 保持不变：

```powershell
cd backend\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r ..\requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend
- `frontend` 是唯一 active frontend entrypoint
- frontend startup workflow 保持不变：

```powershell
cd frontend
npm install
npm run dev -- --host
```

### Data assets
- `database/mysql`：MySQL dump
- `database/mongo`：Mongo JSON assets

### Docs
- `README.md`
- `docs/setup.md`
- `docs/data.md`
- `docs/troubleshooting.md`
- `docs/release.md`
- `docs/archive.md`

## 这次实际变更

### 1. Backend / Frontend 主体收敛
- 保留 `backend/backend` 作为唯一 active backend
- 移除 active repo 中的 `backend/app` placeholder scaffold
- 保留 `frontend` 作为唯一 active frontend
- 移除 active repo 中的 `frontend/web-dashboard`
- 移除 active repo 中的 `backend/forntend`

### 2. Repo 清理
- 扩展 `.gitignore`，排除 local runtime artifacts
- 活跃 source repo 不再保留：
  - `.env`
  - `venv` / `.venv`
  - `node_modules`
  - `dist`
  - zip / installer / exe
  - 测试录影、trace、cache
- source repo 的 `backend/backend/static` 不再保留 built frontend bundle，只保留 placeholder 文件

### 3. Data assets 标准化
- MySQL assets 收敛到 `database/mysql`
- MongoDB assets 收敛到 `database/mongo`
- 新增 `backend/backend/.env.example`
- `.env.example` 的默认值保持与现有代码默认配置一致

### 4. Docs 收敛
- 根目录只保留单一入口型 `README.md`
- 零散 docs 收敛到 `docs/`
- archive 去向单独记录在 `docs/archive.md`

### 5. Release packaging 落地
- 新增 `scripts/build_release.ps1`
- 固定输出：
  - `release/AIST-FYP-delivery`
  - `release/AIST-FYP-delivery.zip`
- release 包包含：
  - clean project snapshot
  - `database/mysql`
  - `database/mongo`
  - built `backend/backend/static`
  - `backend/backend/run_backend.ps1`
  - 中文 `Quickstart.md`

## 已归档内容
不再属于 active repo 的旧内容，统一移到：

`E:\FYP\archives\AIST-Final-Year-Project-main`

详细去向见：

- `docs/archive.md`

## 推荐 Git branch / commit / PR 命名

### Recommended branch name
`codex/Lin-saved-cleanup-release`

### Recommended commit message
`Clean up Lin-saved handoff package and add release packaging`

### Recommended PR title
`Clean up Lin-saved handoff package and add reproducible release packaging`

### Recommended PR description
## 概要
这个 PR 用于整理 Lin-saved handoff package，把当前项目收敛为更干净的 source repo，并补上可重复执行的 release packaging flow。

## 主要变更
- 保留 `backend/backend` 作为唯一 active backend entrypoint
- 保留 `frontend/` 作为唯一 active frontend entrypoint
- 归档 legacy frontend、placeholder backend scaffold 和 superseded docs
- 将 MySQL SQL dump 与 MongoDB JSON assets 统一整理到 `database/`
- 新增 `.env.example`，保留当前 default config values
- 扩展 `.gitignore`，排除 local runtime artifacts
- 将零散说明收敛到统一的 `docs/` 文档集合
- 新增 `scripts/build_release.ps1`，用于 frontend build 和 release package assembly

## Compatibility
本次整理不改变原有 backend startup workflow，也不改变 frontend startup workflow。

### Backend startup
```powershell
cd backend\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r ..\requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend startup
```powershell
cd frontend
npm install
npm run dev -- --host
```

## Validation
- release folder 与 zip 可成功生成
- built frontend assets 会被注入到 release package 内的 `backend/backend/static`
- 活跃 source repo 已移除 local venv、`.venv`、`node_modules`、`dist`
- data assets 已统一整理到 `database/mysql` 与 `database/mongo`

## 推荐执行命令
如果你要把当前版本推成一个新 branch，可以使用：

```powershell
git config --global --add safe.directory E:/FYP/AIST-Final-Year-Project-main
cd E:\FYP\AIST-Final-Year-Project-main
git checkout -b codex/Lin-saved-cleanup-release
git add .
git commit -m "Clean up Lin-saved handoff package and add release packaging"
git push -u origin codex/Lin-saved-cleanup-release
```

## 哪些 git status 变化是正常的
下面这些属于这次 cleanup 的预期结果，看到时不用误判成异常：

### 正常的删除
- `backend/app/*` 被删除
- `frontend/web-dashboard/*` 被删除
- 根目录旧 docs 被删除
- `docs/API.md`
- `docs/DATA_DICTIONARY.md`
- `docs/OTA.md`
- `docs/SECURITY.md`
- `docs/SYSTEM_DESIGN.md`
- `docs/sse-demo.gif`
- `backend/tests/.gitkeep`
- root `package-lock.json`

### 正常的新增
- `backend/backend/`
- `database/`
- `docs/setup.md`
- `docs/data.md`
- `docs/troubleshooting.md`
- `docs/release.md`
- `docs/archive.md`
- `scripts/build_release.ps1`
- `scripts/release/quickstart.template.md`
- `.editorconfig`

### 正常的修改
- `.gitignore`
- `README.md`
- `backend/README.md`
- `frontend/README.md`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/index.html`
- `frontend/src/...`

### 为什么 diff 会很大
这次不是“小修小补”，而是把 repo 从“旧 placeholder / legacy structure”切换为“实际在维护和交付的 structure”。所以 `git diff` 很大是预期现象，不代表 repo 坏掉。

## 不应该出现在 commit 里的内容
如果看到下面这些，先不要急着 push：

- `frontend/node_modules/`
- `frontend/dist/`
- `backend/.venv/`
- `backend/backend/.venv/`
- `backend/backend/venv/`
- `.env`
- release package 内部混入 `.git`
- source repo 内的 `backend/backend/static` 出现 built frontend assets
- `.msi`
- `.exe`
- 额外 zip / installer

## 已完成的直接验证
以下项目已在当前机器上直接执行过，不是推测：

### Frontend
- `npm install` 成功
- `npm run build` 成功
- 当前仍存在 10 个现有 dependency vulnerabilities
- build 时仍有 chunk size warning

### Release packaging
- `scripts/build_release.ps1` 已重新执行成功
- `release/AIST-FYP-delivery` 已生成
- `release/AIST-FYP-delivery.zip` 已生成
- release package 内确认存在：
  - `project/backend/backend/static`
  - `project/backend/backend/run_backend.ps1`
  - `project/database/mysql`
  - `project/database/mongo`
  - `Quickstart.md`
- release package 内确认不存在：
  - `.git`
  - `.env`
  - `frontend/node_modules`
  - `frontend/dist`

### Backend runtime
- local port 3306 可连接
- local port 27017 可连接
- backend 在默认 console 编码条件下 startup 失败
- backend 在 `PYTHONIOENCODING=utf-8` 条件下可启动
- `/docs` 返回 `200`
- `/api/v1/mongo-upstream/status` 正常返回
- `/api/v1/data-reception/mqtt/status` 正常返回
- `/api/v1/data-reception/tcp/status` 正常返回

## 当前已发现的真实问题
这部分不是“猜测风险”，而是这轮验证中直接发现的问题。

### 1. Backend startup 存在 console encoding 问题
在当前 Windows console 编码环境下，backend startup 期间会因为打印中文 / emoji 文本触发 `UnicodeEncodeError`，导致应用启动失败。

当前确认现象：
- 原始启动会失败
- 设置 `PYTHONIOENCODING=utf-8` 后可启动

这说明 backend runtime 对当前 console encoding 有依赖，后续如果要稳态运行，应该把 startup log 输出改成不依赖当前 shell code page。

### 2. `/health` 当前返回 404
这也是已直接验证到的行为。

当前判断原因是：
- `app.main` 中的 SPA catch-all route `/{full_path:path}` 注册在 `/health` 之前
- 请求 `/health` 时先被 catch-all 命中
- 因为 static 下不存在对应文件，最终返回 404

这不影响 `/docs` 与现有 API prefix 路径，但会影响把 `/health` 当作 standard health check 的场景。

## 仍未完成的验证
以下项目没有在本轮中做 full end-to-end fresh run，因此不要误认为已经完全验过：

- 用全新 external environment 做完整 fresh run
- MySQL schema / table 层级的数据正确性逐表验收
- Mongo JSON import 后的业务页面联动验收
- MQTT 实际消息流从设备端到页面端的 full path 验证
- TCP data reception 的实数据注入与 event side effect 验证

换句话说：

- “结构、脚本、构建、主要 status endpoints” 已验证
- “全链路业务联调” 还没有在这轮里完整验收

## Push branch 前 final checklist
- `git status` 中的大量删除 / 新增是否符合本次 cleanup 目标
- active repo 内没有 `.env`
- active repo 内没有 `node_modules`、`dist`、`venv`、`.venv`
- source repo 的 `backend/backend/static` 只保留 placeholder 文件
- `release/AIST-FYP-delivery` 与 zip 已生成
- `database/mysql` 与 `database/mongo` 都在
- docs 集合完整
- branch name 使用 `codex/Lin-saved-cleanup-release`

## 建议阅读顺序
如果后端工程师要快速接手，建议按这个顺序看：

1. `README.md`
2. `docs/setup.md`
3. `docs/data.md`
4. `docs/release.md`
5. 本文档 `docs/Lin-saved-handoff.md`
6. `docs/archive.md`

## 结论
这次整理已经把 `Lin-saved` 版本收敛成一个更清晰的 source repo，并且补上了可重复执行的 release packaging flow。

如果目标是“建立一个新的 GitHub branch version 并让后端工程师能看懂这次到底发生了什么”，那么当前状态已经足够进入 branch / commit / push 阶段。

需要特别记住的只有两件事：

- `backend/backend` 与 `frontend` 才是唯一 active code path
- backend 当前有两个已验证问题：console encoding startup failure 与 `/health` 404
