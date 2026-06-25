param(
    [string]$BrokerHost = "192.168.1.232",
    [int]$BrokerPort = 1883,
    [string]$DeviceId = "ESP32_0000E03948D4DB1C",
    [string]$AliasDeviceId = "ESP32_1CDBD44839E0",
    [int]$Seconds = 120,
    [string]$LogPath = "",
    [switch]$AllowSerialBridge,
    [switch]$RequireReminder,
    [switch]$RequireAlert,
    [switch]$RequireSos,
    [switch]$RequireFall
)

$ErrorActionPreference = "Continue"

if ($Seconds -lt 1) { throw "Seconds must be >= 1" }

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$logsRoot = Join-Path $repoRoot "logs"
New-Item -ItemType Directory -Force -Path $logsRoot | Out-Null
if ([string]::IsNullOrWhiteSpace($LogPath)) {
    $LogPath = Join-Path $logsRoot ("elderly-direct-mqtt-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
}
$summaryPath = [System.IO.Path]::ChangeExtension($LogPath, ".summary.json")

$bridgeProcesses = @(Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -match "bridge_(flycare|elderly)_serial\.ps1"
})
if ($bridgeProcesses.Count -gt 0 -and -not $AllowSerialBridge) {
    $summary = [ordered]@{
        result = "blocked"
        reason = "serial bridge process is running; direct Wi-Fi MQTT proof would be polluted"
        bridge_process_count = $bridgeProcesses.Count
    }
    $summary | ConvertTo-Json -Depth 10 | Out-File -FilePath $summaryPath -Encoding utf8
    $summary | ConvertTo-Json -Depth 10
    exit 2
}

$mosquittoSub = "C:\Program Files\Mosquitto\mosquitto_sub.exe"
if (-not (Test-Path $mosquittoSub)) { $mosquittoSub = "mosquitto_sub.exe" }

$args = @(
    "-h", $BrokerHost,
    "-p", "$BrokerPort",
    "-t", "smartwatch/#",
    "-v",
    "-R",
    "-W", "$Seconds"
)

Write-Host "Capturing direct MQTT for $Seconds second(s): $mosquittoSub $($args -join ' ')"
& $mosquittoSub @args 2>&1 | Tee-Object -FilePath $LogPath | Out-Host
$exitCode = $LASTEXITCODE

$text = if (Test-Path $LogPath) { [string](Get-Content -Raw $LogPath) } else { "" }
if ($null -eq $text) { $text = "" }
$devicePattern = [regex]::Escape($DeviceId) + "|" + [regex]::Escape($AliasDeviceId)

function Count-Topic {
    param([string]$Suffix)
    return ([regex]::Matches($text, "smartwatch/($devicePattern)/$Suffix\s")).Count
}

$counts = [ordered]@{
    status = Count-Topic "status"
    location = Count-Topic "location"
    vitals = Count-Topic "vitals"
    reminder = Count-Topic "reminder"
    alert = Count-Topic "alert"
    sos = Count-Topic "sos"
    fall = Count-Topic "fall"
    time = Count-Topic "time"
    flight = Count-Topic "flight"
}

$failures = New-Object System.Collections.Generic.List[string]
if ($counts.status -lt 1) { $failures.Add("missing /status") }
if ($counts.location -lt 1) { $failures.Add("missing /location") }
if ($counts.vitals -lt 1) { $failures.Add("missing /vitals") }
if ($RequireReminder -and $counts.reminder -lt 1) { $failures.Add("missing /reminder") }
if ($RequireAlert -and $counts.alert -lt 1) { $failures.Add("missing /alert") }
if ($RequireSos -and $counts.sos -lt 1) { $failures.Add("missing /sos") }
if ($RequireFall -and $counts.fall -lt 1) { $failures.Add("missing /fall") }

$summary = [ordered]@{
    captured_at = (Get-Date).ToUniversalTime().ToString("o")
    result = $(if ($failures.Count -eq 0) { "pass" } else { "fail" })
    broker = "$BrokerHost`:$BrokerPort"
    device_id = $DeviceId
    alias_device_id = $AliasDeviceId
    seconds = $Seconds
    mosquitto_exit_code = $exitCode
    serial_bridge_allowed = [bool]$AllowSerialBridge
    counts = $counts
    failures = @($failures)
    log = $LogPath
}

$summary | ConvertTo-Json -Depth 20 | Out-File -FilePath $summaryPath -Encoding utf8
$summary | ConvertTo-Json -Depth 20
Write-Host ""
Write-Host "Direct MQTT log: $LogPath"
Write-Host "Summary: $summaryPath"
if ($failures.Count -gt 0) { exit 1 }
