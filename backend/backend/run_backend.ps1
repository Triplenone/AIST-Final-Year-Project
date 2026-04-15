# 使用本目录 venv 的 Python 启动后端。
# 不加 --reload：Windows 下 reload 子进程会误用系统 Python，导致 No module named 'pymongo'。需要热重载可改回 --reload 并排查多 Python 环境。
$venvPython = Join-Path $PSScriptRoot "venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "Error: venv not found. Run: python -m venv venv" -ForegroundColor Red
    exit 1
}
& $venvPython -m uvicorn app.main:app --host 0.0.0.0 --port 8000
