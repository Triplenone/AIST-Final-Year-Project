param(
    [string]$DeviceId = "ESP32_48CA43A42298",
    [string]$SerialPort = "COM5",
    [int]$HeartRateSeconds = 45,
    [int]$SosSeconds = 45,
    [switch]$SkipHeartRate,
    [switch]$SkipSos
)

$ErrorActionPreference = "Continue"

$repoRoot = Split-Path -Parent $PSScriptRoot
$logRoot = Join-Path $repoRoot "logs"
$verifier = Join-Path $PSScriptRoot "verify_flycare_watch.ps1"
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null

function Get-LatestVerifierReport {
    param([datetime]$After)

    $report = Get-ChildItem -Path $logRoot -Filter "flycare-watch-verification-*.json" -File |
        Where-Object { $_.LastWriteTime -ge $After } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $report) {
        return $null
    }
    return $report.FullName
}

$startedAt = Get-Date
$results = [ordered]@{
    timestamp = $startedAt.ToString("s")
    deviceId = $DeviceId
    serialPort = $SerialPort
    heartRate = $null
    sos = $null
}

if (-not $SkipHeartRate) {
    Write-Host "Step 1/2: Wear the watch firmly, cover the MAX30102 window, keep the wrist still."
    Write-Host "Running HR/SpO2 verifier for $HeartRateSeconds seconds..."
    $hrStart = Get-Date
    & powershell -NoProfile -ExecutionPolicy Bypass -File $verifier `
        -DeviceId $DeviceId `
        -SerialPort $SerialPort `
        -Seconds $HeartRateSeconds `
        -RunHeartRateSensorCheck `
        -RunHeartRateSweep `
        -HeartRateSweepWindowSeconds 3 `
        -HeartRateLedBrightness 0xFF `
        -WaitForValidHeartRate `
        -WaitForValidSpO2 `
        -AutoClearSOS `
        -AutoHandleSosEvents
    $hrExit = $LASTEXITCODE
    $hrReport = Get-LatestVerifierReport -After $hrStart
    $results.heartRate = [ordered]@{
        exitCode = $hrExit
        reportPath = $hrReport
    }
}

if (-not $SkipSos) {
    Write-Host "Step 2/2: During the verifier window, hold SOS/BOOT for 3 seconds."
    Write-Host "Running physical SOS long-press verifier for $SosSeconds seconds..."
    $sosStart = Get-Date
    & powershell -NoProfile -ExecutionPolicy Bypass -File $verifier `
        -DeviceId $DeviceId `
        -SerialPort $SerialPort `
        -Seconds $SosSeconds `
        -WaitForPhysicalSOS `
        -AutoClearSOS `
        -AutoHandleSosEvents
    $sosExit = $LASTEXITCODE
    $sosReport = Get-LatestVerifierReport -After $sosStart
    $results.sos = [ordered]@{
        exitCode = $sosExit
        reportPath = $sosReport
    }
}

$summaryPath = Join-Path $logRoot ("flycare-physical-blockers-summary-{0}.json" -f $startedAt.ToString("yyyyMMdd-HHmmss"))
[pscustomobject]$results | ConvertTo-Json -Depth 8 | Set-Content -Path $summaryPath -Encoding UTF8
Write-Host "Physical blocker summary written to $summaryPath"
[pscustomobject]$results | ConvertTo-Json -Depth 8

if (($results.heartRate -and $results.heartRate.exitCode -ne 0) -or
    ($results.sos -and $results.sos.exitCode -ne 0)) {
    exit 2
}
