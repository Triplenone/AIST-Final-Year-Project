# Copy frontend/dist -> backend/backend/static (run after npm run build)
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendDist = Join-Path $repoRoot "frontend\dist"
$staticRoot = Join-Path $repoRoot "backend\backend\static"

if (-not (Test-Path $frontendDist)) {
    throw "Missing frontend/dist. Run: cd frontend && npm run build"
}

Write-Host "==> Sync dist -> $staticRoot"
if (-not (Test-Path $staticRoot)) {
    New-Item -ItemType Directory -Force -Path $staticRoot | Out-Null
}

Get-ChildItem -Force $staticRoot | ForEach-Object {
    if ($_.Name -in @('.gitkeep', 'README.md')) {
        return
    }
    Remove-Item -Recurse -Force $_.FullName
}

Copy-Item -Path (Join-Path $frontendDist "*") -Destination $staticRoot -Recurse -Force

Write-Host "Done. Static assets are in backend/backend/static"
