param(
    [int]$Minutes = 20,
    [int]$PollSeconds = 2,
    [string]$BaseUrl = "http://127.0.0.1:8001",
    [string]$BrokerHost = "192.168.1.232",
    [int]$BrokerPort = 1883,
    [string]$DeviceId = "ESP32_0000E03948D4DB1C",
    [string]$AliasDeviceId = "ESP32_1CDBD44839E0",
    [switch]$AllowSerialBridge,
    [switch]$RunAudit
)

$ErrorActionPreference = "Continue"

function Get-IsoNow {
    return (Get-Date).ToUniversalTime().ToString("o")
}

function Write-TextSection {
    param([string]$Path, [string]$Title, [scriptblock]$Body)

    "`n===== $Title =====" | Out-File -FilePath $Path -Append -Encoding utf8
    try {
        & $Body 2>&1 | Out-File -FilePath $Path -Append -Encoding utf8
    } catch {
        "ERROR: $($_.Exception.Message)" | Out-File -FilePath $Path -Append -Encoding utf8
    }
}

function Write-JsonLine {
    param([string]$Path, [object]$Value)
    ($Value | ConvertTo-Json -Depth 40 -Compress) | Out-File -FilePath $Path -Append -Encoding utf8
}

function Invoke-ApiSample {
    param([string]$Url)

    try {
        return [ordered]@{
            ok = $true
            url = $Url
            data = Invoke-RestMethod -Uri $Url -TimeoutSec 4
        }
    } catch {
        return [ordered]@{
            ok = $false
            url = $Url
            error = $_.Exception.Message
        }
    }
}

if ($Minutes -lt 0) { throw "Minutes must be >= 0" }
if ($PollSeconds -lt 1) { throw "PollSeconds must be >= 1" }

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logsRoot = Join-Path $repoRoot "logs"
$outputDir = Join-Path $logsRoot "elderly-offline-demo-$timestamp"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$preflightLog = Join-Path $outputDir "preflight.txt"
$apiSamplesLog = Join-Path $outputDir "api-samples.jsonl"
$mqttLog = Join-Path $outputDir "mqtt-smartwatch.log"
$mqttErrLog = Join-Path $outputDir "mqtt-smartwatch.err.log"
$eventsLog = Join-Path $outputDir "manual-observations.md"
$summaryPath = Join-Path $outputDir "summary.json"
$auditLog = Join-Path $outputDir "audit.txt"

@"
# ElderlyCare Offline Demo Manual Observations

Recorder folder: $outputDir
Started UTC: $(Get-IsoNow)

Fill these while testing, or leave blank and rely on MQTT/API evidence:

| Time | Step | Physical watch result | Browser /flycare result | Admin result | Notes |
|---|---|---|---|---|---|
| | Startup / Online | | | | |
| | Home -> Map -> Health-Reminder pages | | | | |
| | Real HR / SpO2 or admin simulated fallback | | | | |
| | Medication reminder publish | | | | |
| | Physical SOS long press trigger | | | | |
| | SOS long press clear | | | | |
| | Admin FALL trigger | | | | |
| | FALL long press clear | | | | |
| | Smart location walk | | | | |

"@ | Out-File -FilePath $eventsLog -Encoding utf8

"ElderlyCare offline demo recorder" | Out-File -FilePath $preflightLog -Encoding utf8
"OutputDir: $outputDir" | Out-File -FilePath $preflightLog -Append -Encoding utf8
"Started UTC: $(Get-IsoNow)" | Out-File -FilePath $preflightLog -Append -Encoding utf8
"BaseUrl: $BaseUrl" | Out-File -FilePath $preflightLog -Append -Encoding utf8
"Broker: $BrokerHost`:$BrokerPort" | Out-File -FilePath $preflightLog -Append -Encoding utf8
"DeviceId: $DeviceId" | Out-File -FilePath $preflightLog -Append -Encoding utf8
"AliasDeviceId: $AliasDeviceId" | Out-File -FilePath $preflightLog -Append -Encoding utf8

Write-TextSection $preflightLog "git branch" { git branch --show-current }
Write-TextSection $preflightLog "git HEAD" { git rev-parse --short HEAD; git rev-parse HEAD }
Write-TextSection $preflightLog "git status" { git status -sb; git status --short --untracked-files=all }
Write-TextSection $preflightLog "stack status file" {
    $statusPath = Join-Path $repoRoot "logs\flycare-local-stack-status.json"
    if (Test-Path $statusPath) { Get-Content $statusPath } else { "missing: $statusPath" }
}
Write-TextSection $preflightLog "ports" {
    Test-NetConnection $BrokerHost -Port $BrokerPort
    Test-NetConnection ([Uri]$BaseUrl).Host -Port ([Uri]$BaseUrl).Port
}

$bridgeProcesses = @(Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -match "bridge_(flycare|elderly)_serial\.ps1"
})
if ($bridgeProcesses.Count -gt 0) {
    $bridgeProcesses | Select-Object ProcessId, CommandLine | ConvertTo-Json -Depth 5 |
        Out-File -FilePath (Join-Path $outputDir "serial-bridge-processes.json") -Encoding utf8
    if (-not $AllowSerialBridge) {
        [ordered]@{
            started_at = Get-IsoNow
            output_dir = $outputDir
            result = "blocked"
            reason = "serial bridge process is running; direct Wi-Fi MQTT proof would be polluted"
            bridge_process_count = $bridgeProcesses.Count
        } | ConvertTo-Json -Depth 10 | Out-File -FilePath $summaryPath -Encoding utf8
        Write-Error "Serial bridge is running. Stop bridge_flycare_serial.ps1 first, or rerun with -AllowSerialBridge only for fallback evidence. Output: $outputDir"
        exit 2
    }
}

$mosquittoSub = "C:\Program Files\Mosquitto\mosquitto_sub.exe"
if (-not (Test-Path $mosquittoSub)) { $mosquittoSub = "mosquitto_sub.exe" }

$mqttProcess = $null
try {
    $mqttArgs = @("-h", $BrokerHost, "-p", "$BrokerPort", "-t", "smartwatch/#", "-v", "-R")
    "Starting MQTT capture: $mosquittoSub $($mqttArgs -join ' ')" |
        Out-File -FilePath $preflightLog -Append -Encoding utf8
    $mqttProcess = Start-Process `
        -FilePath $mosquittoSub `
        -ArgumentList $mqttArgs `
        -RedirectStandardOutput $mqttLog `
        -RedirectStandardError $mqttErrLog `
        -WindowStyle Hidden `
        -PassThru

    $endAt = (Get-Date).AddMinutes($Minutes)
    $sampleIndex = 0
    do {
        $sampleIndex += 1
        $capturedAt = Get-IsoNow
        $sample = [ordered]@{
            index = $sampleIndex
            captured_at = $capturedAt
            base_url = $BaseUrl
            broker = "$BrokerHost`:$BrokerPort"
            endpoints = [ordered]@{}
        }

        foreach ($id in @($DeviceId, $AliasDeviceId)) {
            $key = if ($id -eq $DeviceId) { "canonical" } else { "alias" }
            $sample.endpoints["latest_$key"] = Invoke-ApiSample "$BaseUrl/api/v1/mongo-upstream/latest?device_id=$id&exclude_data_type=flight"
            $sample.endpoints["location_$key"] = Invoke-ApiSample "$BaseUrl/api/v1/mongo-upstream/location/latest?device_id=$id"
            $sample.endpoints["vitals_$key"] = Invoke-ApiSample "$BaseUrl/api/v1/mongo-upstream/vitals/latest?device_id=$id"
            $sample.endpoints["reminder_$key"] = Invoke-ApiSample "$BaseUrl/api/v1/mongo-upstream/reminder/latest?device_id=$id"
        }
        $sample.endpoints.health = Invoke-ApiSample "$BaseUrl/health"
        $sample.endpoints.mqtt_status = Invoke-ApiSample "$BaseUrl/api/v1/data-reception/mqtt/status"
        $sample.endpoints.mongo_status = Invoke-ApiSample "$BaseUrl/api/v1/mongo-upstream/status"
        $sample.endpoints.sos_unhandled = Invoke-ApiSample "$BaseUrl/api/v1/events/?event_type=sos&event_status=unhandled&limit=20"
        $sample.endpoints.fall_unhandled = Invoke-ApiSample "$BaseUrl/api/v1/events/?event_type=fall&event_status=unhandled&limit=20"
        $sample.endpoints.presets = Invoke-ApiSample "$BaseUrl/api/v1/flycare-admin/presets"

        Write-JsonLine $apiSamplesLog $sample
        Write-Host ("[{0}] sample {1} written" -f (Get-Date -Format "HH:mm:ss"), $sampleIndex)

        if ((Get-Date) -lt $endAt) { Start-Sleep -Seconds $PollSeconds }
    } while ((Get-Date) -lt $endAt)
}
finally {
    if ($mqttProcess -and -not $mqttProcess.HasExited) {
        Stop-Process -Id $mqttProcess.Id -Force -ErrorAction SilentlyContinue
    }
}

if ($RunAudit) {
    try {
        powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repoRoot "scripts\audit_elderly_goal.ps1") -BaseUrl $BaseUrl 2>&1 |
            Out-File -FilePath $auditLog -Encoding utf8
    } catch {
        "Audit failed: $($_.Exception.Message)" | Out-File -FilePath $auditLog -Encoding utf8
    }
}

$mqttText = ""
if (Test-Path $mqttLog) {
    $mqttText = [string](Get-Content -Raw $mqttLog)
    if ($null -eq $mqttText) { $mqttText = "" }
}

$summary = [ordered]@{
    finished_at = Get-IsoNow
    output_dir = $outputDir
    base_url = $BaseUrl
    broker = "$BrokerHost`:$BrokerPort"
    device_id = $DeviceId
    alias_device_id = $AliasDeviceId
    duration_minutes = $Minutes
    serial_bridge_allowed = [bool]$AllowSerialBridge
    mqtt_counts = [ordered]@{
        status = ([regex]::Matches($mqttText, "/status ")).Count
        location = ([regex]::Matches($mqttText, "/location ")).Count
        vitals = ([regex]::Matches($mqttText, "/vitals ")).Count
        reminder = ([regex]::Matches($mqttText, "/reminder ")).Count
        alert = ([regex]::Matches($mqttText, "/alert ")).Count
        sos = ([regex]::Matches($mqttText, "/sos ")).Count
        fall = ([regex]::Matches($mqttText, "/fall ")).Count
        time = ([regex]::Matches($mqttText, "/time ")).Count
        flight = ([regex]::Matches($mqttText, "/flight ")).Count
    }
    files = [ordered]@{
        preflight = $preflightLog
        mqtt = $mqttLog
        mqtt_error = $mqttErrLog
        api_samples = $apiSamplesLog
        manual_observations = $eventsLog
        audit = $(if ($RunAudit) { $auditLog } else { $null })
    }
}
$summary | ConvertTo-Json -Depth 20 | Out-File -FilePath $summaryPath -Encoding utf8

Write-Host ""
Write-Host "ElderlyCare offline demo capture complete."
Write-Host "OutputDir: $outputDir"
Write-Host "Summary: $summaryPath"
