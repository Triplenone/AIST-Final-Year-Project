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

$launcher = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "start_flycare_offline_demo.ps1"
& $launcher `
  -ServerHost $ServerHost `
  -FrontendPort $FrontendPort `
  -BackendPort $BackendPort `
  -Route $Route `
  -OpenBrowser:$OpenBrowser `
  -SkipBackend:$SkipBackend `
  -SkipFrontend:$SkipFrontend
