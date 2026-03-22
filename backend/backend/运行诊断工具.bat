@echo off
REM 诊断工具运行脚本 - Windows批处理文件
REM 直接使用虚拟环境中的Python运行诊断工具

echo ========================================
echo 设备ID诊断工具
echo ========================================
echo.

REM 检查虚拟环境是否存在
if not exist "..\venv\Scripts\python.exe" (
    echo ❌ 错误：虚拟环境不存在
    echo 请先创建虚拟环境：python -m venv ..\venv
    echo 然后安装依赖：..\venv\Scripts\pip.exe install -r ..\requirements.txt
    pause
    exit /b 1
)

REM 检查SQLAlchemy是否安装
echo 检查虚拟环境...
..\venv\Scripts\python.exe -c "import sqlalchemy" >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：虚拟环境中未安装依赖
    echo 正在安装依赖...
    ..\venv\Scripts\pip.exe install -r ..\requirements.txt
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

REM 运行诊断工具（直接使用虚拟环境中的Python）
echo.
echo 正在运行诊断工具...
echo.

REM 优先使用英文名称的脚本
if exist "check_device_id.py" (
    ..\venv\Scripts\python.exe check_device_id.py
) else (
    ..\venv\Scripts\python.exe 诊断工具-检查设备ID.py
)

echo.
echo ========================================
pause

