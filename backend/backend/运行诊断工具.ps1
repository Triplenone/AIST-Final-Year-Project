# 诊断工具运行脚本 - PowerShell版本
# 直接使用虚拟环境中的Python运行诊断工具

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "设备ID诊断工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查虚拟环境是否存在
$venvPython = "..\venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "❌ 错误：虚拟环境不存在" -ForegroundColor Red
    Write-Host "请先创建虚拟环境：python -m venv ..\venv" -ForegroundColor Yellow
    Write-Host "然后安装依赖：..\venv\Scripts\pip.exe install -r ..\requirements.txt" -ForegroundColor Yellow
    Read-Host "按Enter键退出"
    exit 1
}

# 检查SQLAlchemy是否安装
Write-Host "检查虚拟环境..." -ForegroundColor Yellow
$checkResult = & $venvPython -c "import sqlalchemy; print('OK')" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 错误：虚拟环境中未安装依赖" -ForegroundColor Red
    Write-Host "正在安装依赖..." -ForegroundColor Yellow
    & "..\venv\Scripts\pip.exe" install -r "..\requirements.txt"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 依赖安装失败" -ForegroundColor Red
        Read-Host "按Enter键退出"
        exit 1
    }
}

# 运行诊断工具（直接使用虚拟环境中的Python）
Write-Host ""
Write-Host "正在运行诊断工具..." -ForegroundColor Yellow
Write-Host ""

# 优先使用英文名称的脚本
$scriptFile = "check_device_id.py"
if (-not (Test-Path $scriptFile)) {
    $scriptFile = "诊断工具-检查设备ID.py"
}

& $venvPython $scriptFile

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Read-Host "按Enter键退出"

