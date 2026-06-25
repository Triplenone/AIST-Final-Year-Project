param(
  [switch]$OpenBrowser,
  [string]$ServerHost = "192.168.1.232",
  [int]$FrontendPort = 5173,
  [int]$BackendPort = 8000,
  [string]$Route = "/position",
  [switch]$SkipBackend,
  [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptRoot
$FrontendDir = Join-Path $RepoRoot "frontend"
$BackendDir = Join-Path $RepoRoot "backend\backend"
$LogDir = Join-Path $RepoRoot "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Test-LocalPortListening {
  param([int]$Port)
  try {
    $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop
    return [bool]$listeners
  } catch {
    return $false
  }
}

function Start-HiddenPowerShell {
  param(
    [string]$WorkingDirectory,
    [string]$Command,
    [string]$Name
  )
  $logPath = Join-Path $LogDir "$Name.log"
  $arguments = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-Command",
    "Set-Location -LiteralPath '$WorkingDirectory'; $Command *> '$logPath'"
  )
  Start-Process -FilePath "powershell.exe" -ArgumentList $arguments -WindowStyle Hidden -PassThru
}

$started = @()

if (-not $SkipBackend) {
  if (Test-LocalPortListening -Port $BackendPort) {
    Write-Host "Backend already listening on local port $BackendPort."
  } else {
    $backendProcess = Start-HiddenPowerShell `
      -WorkingDirectory $BackendDir `
      -Command "python -m uvicorn app.main:app --host 0.0.0.0 --port $BackendPort" `
      -Name "elderly-backend"
    $started += @{ name = "backend"; pid = $backendProcess.Id; port = $BackendPort }
    Write-Host "Started backend on local port $BackendPort (PID $($backendProcess.Id))."
  }
}

if (-not $SkipFrontend) {
  if (Test-LocalPortListening -Port $FrontendPort) {
    Write-Host "Frontend already listening on local port $FrontendPort."
  } else {
    $frontendProcess = Start-HiddenPowerShell `
      -WorkingDirectory $FrontendDir `
      -Command "npm.cmd run dev -- --host 0.0.0.0 --port $FrontendPort" `
      -Name "elderly-frontend"
    $started += @{ name = "frontend"; pid = $frontendProcess.Id; port = $FrontendPort }
    Write-Host "Started frontend on local port $FrontendPort (PID $($frontendProcess.Id))."
  }
}

$targetUrl = "http://$ServerHost`:$FrontendPort$Route"
$status = [ordered]@{
  scenario = "elderly_care"
  compatibility_launcher = "start_flycare_offline_demo.ps1"
  note = "FlyCare in this filename is historical compatibility only; final demo route is elderly-care Indoor positioning."
  target_url = $targetUrl
  local_frontend_port = $FrontendPort
  local_backend_port = $BackendPort
  started = $started
  router_validation = "skipped_by_design"
}
$statusPath = Join-Path $LogDir "elderly-offline-demo-status.json"
$status | ConvertTo-Json -Depth 5 | Set-Content -Path $statusPath -Encoding UTF8

Write-Host "Offline demo target: $targetUrl"
Write-Host "Status written to $statusPath"
Write-Host "Router/IP validation is intentionally skipped by this launcher."

if ($OpenBrowser) {
  Start-Process $targetUrl
}
