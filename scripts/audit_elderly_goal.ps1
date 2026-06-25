param(
    [string]$BaseUrl = "http://127.0.0.1:8001",
    [string]$BrokerHost = "192.168.1.232",
    [int]$BrokerPort = 1883,
    [string]$DeviceId = "ESP32_0000E03948D4DB1C",
    [string]$AliasDeviceId = "ESP32_1CDBD44839E0",
    [int]$MysqlDeviceId = 9,
    [int]$FreshnessMinutes = 5,
    [switch]$AllowMissingReminder
)

$ErrorActionPreference = "Continue"

function Invoke-ApiJson {
    param([string]$Url)

    try {
        return [pscustomobject]@{
            ok = $true
            value = Invoke-RestMethod -Uri $Url -TimeoutSec 5
            error = $null
        }
    } catch {
        return [pscustomobject]@{
            ok = $false
            value = $null
            error = $_.Exception.Message
        }
    }
}

function New-AuditCheck {
    param([string]$Name, [string]$Status, [string]$Evidence, $Details = $null)
    return [pscustomobject]@{
        name = $Name
        status = $Status
        evidence = $Evidence
        details = $Details
    }
}

function Get-CollectionItems {
    param($Value)
    if ($null -eq $Value) { return @() }
    if ($Value -is [array]) { return @($Value) }
    if ($Value.PSObject.Properties.Name -contains "items") { return @($Value.items) }
    if ($Value.PSObject.Properties.Name -contains "value") { return @($Value.value) }
    return @($Value)
}

function Get-ServerReceivedAgeMinutes {
    param($Value)
    if (-not $Value -or -not ($Value.PSObject.Properties.Name -contains "server_received_at")) { return $null }
    try {
        $receivedAt = [DateTimeOffset]::Parse([string]$Value.server_received_at, [System.Globalization.CultureInfo]::InvariantCulture)
        return ([DateTimeOffset]::Now - $receivedAt).TotalMinutes
    } catch {
        return $null
    }
}

function Test-LatestEndpoint {
    param(
        [string]$Name,
        [string]$Path,
        [switch]$Optional
    )

    foreach ($id in @($DeviceId, $AliasDeviceId)) {
        $response = Invoke-ApiJson "$BaseUrl$Path`?device_id=$id"
        if (-not $response.ok) {
            continue
        }
        if ($response.value.found -eq $true -and $response.value.item) {
            $age = Get-ServerReceivedAgeMinutes $response.value.item
            $fresh = $null -eq $age -or $age -le $FreshnessMinutes
            return New-AuditCheck $Name $(if ($fresh) { "pass" } else { "fail" }) `
                "$Name found for $id; age_minutes=$(if ($null -eq $age) { 'unknown' } else { $age.ToString('0.0') })" `
                $response.value.item
        }
    }

    return New-AuditCheck $Name $(if ($Optional) { "warn" } else { "fail" }) "$Name not found for $DeviceId or $AliasDeviceId"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$logsRoot = Join-Path $repoRoot "logs"
New-Item -ItemType Directory -Force -Path $logsRoot | Out-Null
$jsonPath = Join-Path $logsRoot "elderly-goal-audit.json"
$mdPath = Join-Path $logsRoot "elderly-goal-audit.md"

$checks = New-Object System.Collections.Generic.List[object]

$configText = Get-Content -Path (Join-Path $repoRoot "firmware\Config.h") -Raw
$dataTransmitterText = Get-Content -Path (Join-Path $repoRoot "firmware\DataTransmitter.cpp") -Raw
$firmwareOk = $configText -match '#define\s+DEVICE_ID\s+"ESP32_0000E03948D4DB1C"' -and
              $configText -match '#define\s+CLOCK_DEVICE_LABEL\s+"LEE KA YAN"' -and
              $configText -match '#define\s+ENABLE_FLIGHT_ARRIVAL_TARGET\s+0' -and
              $dataTransmitterText -match '/reminder' -and
              $dataTransmitterText -notmatch 'subscribe\(\(topicBase \+ "/flight"\)'
$checks.Add((New-AuditCheck "firmware_elderly_contract" $(if ($firmwareOk) { "pass" } else { "fail" }) "DEVICE_ID LEE, reminder downlink, and no final /flight subscription"))

$health = Invoke-ApiJson "$BaseUrl/health"
$checks.Add((New-AuditCheck "backend_health" $(if ($health.ok) { "pass" } else { "fail" }) $(if ($health.ok) { "GET /health ok" } else { $health.error }) $health.value))

$mqttStatus = Invoke-ApiJson "$BaseUrl/api/v1/data-reception/mqtt/status"
$mqttOk = $mqttStatus.ok -and $mqttStatus.value.connected -eq $true
$checks.Add((New-AuditCheck "backend_mqtt" $(if ($mqttOk) { "pass" } else { "fail" }) "Expected MQTT connected to $BrokerHost`:$BrokerPort" $mqttStatus.value))

$presets = Invoke-ApiJson "$BaseUrl/api/v1/flycare-admin/presets"
$presetItems = if ($presets.ok) { @(Get-CollectionItems $presets.value.items) } else { @() }
$leePreset = @($presetItems | Where-Object { $_.device_id -eq $DeviceId -or $_.mysql_device_id -eq $MysqlDeviceId } | Select-Object -First 1)
$airportLocationLabels = @($presetItems | Where-Object {
    $rawLocation = $_.deploy_location
    $label = if ($null -eq $rawLocation) { "" } else { [string]$rawLocation }
    $label -match "Gate|Security|Check-in|Customer Services|Immigration"
})
$presetOk = $presets.ok -and
            $presetItems.Count -eq 6 -and
            $leePreset.Count -gt 0 -and
            @($leePreset[0].alias_device_ids) -contains $AliasDeviceId -and
            $airportLocationLabels.Count -eq 0
$checks.Add((New-AuditCheck "demo_presets" $(if ($presetOk) { "pass" } else { "fail" }) "Expected six ElderlyCare demo users, LEE alias $AliasDeviceId, and no airport deploy labels" $presets.value))

$checks.Add((Test-LatestEndpoint -Name "latest_location" -Path "/api/v1/mongo-upstream/location/latest"))
$checks.Add((Test-LatestEndpoint -Name "latest_vitals" -Path "/api/v1/mongo-upstream/vitals/latest"))
$checks.Add((Test-LatestEndpoint -Name "latest_reminder" -Path "/api/v1/mongo-upstream/reminder/latest" -Optional:$AllowMissingReminder))

$sosEvents = Invoke-ApiJson "$BaseUrl/api/v1/events/?event_type=sos&limit=20"
$fallEvents = Invoke-ApiJson "$BaseUrl/api/v1/events/?event_type=fall&limit=20"
$checks.Add((New-AuditCheck "event_api" $(if ($sosEvents.ok -and $fallEvents.ok) { "pass" } else { "fail" }) "SOS/FALL event APIs reachable" @{ sos = $sosEvents.value; fall = $fallEvents.value }))

$checkItems = @($checks.ToArray())
$failed = @($checkItems | Where-Object { $_.status -eq "fail" })
$overall = if ($failed.Count -eq 0) { "pass" } else { "fail" }

$result = [pscustomobject]@{
    audited_at = (Get-Date).ToUniversalTime().ToString("o")
    overallStatus = $overall
    base_url = $BaseUrl
    broker = "$BrokerHost`:$BrokerPort"
    device_id = $DeviceId
    alias_device_id = $AliasDeviceId
    mysql_device_id = $MysqlDeviceId
    freshness_minutes = $FreshnessMinutes
    checks = $checkItems
}

$result | ConvertTo-Json -Depth 30 | Out-File -FilePath $jsonPath -Encoding utf8

$lines = @(
    "# ElderlyCare Goal Audit",
    "",
    "- Overall: $overall",
    "- BaseUrl: $BaseUrl",
    "- Broker: $BrokerHost`:$BrokerPort",
    "- Device: $DeviceId / alias $AliasDeviceId",
    "",
    "| Check | Status | Evidence |",
    "|---|---|---|"
)
foreach ($check in $checkItems) {
    $lines += "| $($check.name) | $($check.status) | $($check.evidence -replace '\|','/') |"
}
$lines | Out-File -FilePath $mdPath -Encoding utf8

$result | ConvertTo-Json -Depth 30
Write-Host ""
Write-Host "Audit JSON: $jsonPath"
Write-Host "Audit Markdown: $mdPath"
if ($overall -ne "pass") { exit 1 }
