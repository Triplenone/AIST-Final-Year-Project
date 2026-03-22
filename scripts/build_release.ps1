$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$outputRoot = Join-Path $repoRoot "release"
$packageName = "AIST-FYP-delivery"
$stageRoot = Join-Path $outputRoot $packageName
$projectRoot = Join-Path $stageRoot "project"
$frontendRoot = Join-Path $repoRoot "frontend"
$frontendDist = Join-Path $frontendRoot "dist"
$quickStartTemplate = Join-Path $repoRoot "scripts\\release\\quickstart.template.md"
$releaseStatic = Join-Path $projectRoot "backend\\backend\\static"
$zipPath = Join-Path $outputRoot "$packageName.zip"

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Script,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    Write-Host "==> $Label"
    & $Script
}

Invoke-Step -Label "Prepare output directory" -Script {
    if (Test-Path $stageRoot) {
        Remove-Item -Recurse -Force $stageRoot
    }
    if (Test-Path $zipPath) {
        Remove-Item -Force $zipPath
    }
    New-Item -ItemType Directory -Force -Path $projectRoot | Out-Null
}

Invoke-Step -Label "Install frontend dependencies if needed" -Script {
    Push-Location $frontendRoot
    try {
        if (-not (Test-Path (Join-Path $frontendRoot "node_modules"))) {
            npm install
            if ($LASTEXITCODE -ne 0) {
                throw "npm install failed."
            }
        }
    }
    finally {
        Pop-Location
    }
}

Invoke-Step -Label "Build frontend" -Script {
    Push-Location $frontendRoot
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "npm run build failed."
        }
    }
    finally {
        Pop-Location
    }
}

Invoke-Step -Label "Copy clean project snapshot" -Script {
    & robocopy $repoRoot $projectRoot /E /NFL /NDL /NJH /NJS /NP `
        /XD .git release node_modules dist .venv venv `
        /XF .env *.zip *.msi *.exe *.webm | Out-Null
    $code = $LASTEXITCODE
    if ($code -gt 7) {
        throw "robocopy failed with exit code $code"
    }
}

Invoke-Step -Label "Inject built static assets into release backend" -Script {
    if (-not (Test-Path $releaseStatic)) {
        New-Item -ItemType Directory -Force -Path $releaseStatic | Out-Null
    }

    Get-ChildItem -Force $releaseStatic | ForEach-Object {
        if ($_.Name -ne ".gitkeep") {
            Remove-Item -Recurse -Force $_.FullName
        }
    }

    Copy-Item -Path (Join-Path $frontendDist "*") -Destination $releaseStatic -Recurse -Force
}

Invoke-Step -Label "Write release quick start" -Script {
    Copy-Item -Path $quickStartTemplate -Destination (Join-Path $stageRoot "Quickstart.md") -Force
}

Invoke-Step -Label "Create zip package" -Script {
    Compress-Archive -Path (Join-Path $stageRoot "*") -DestinationPath $zipPath -Force
}

Write-Host ""
Write-Host "Release ready:"
Write-Host "  Folder: $stageRoot"
Write-Host "  Zip:    $zipPath"
