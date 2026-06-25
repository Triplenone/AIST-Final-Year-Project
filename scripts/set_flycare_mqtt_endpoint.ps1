param(
    [ValidateSet("AutoLan", "OfflineLan", "Cloud", "Custom")]
    [string]$Mode = "AutoLan",

    [string]$BrokerHost,
    [int]$MqttPort = 1883,
    [string]$ServerHost,
    [int]$ServerPort = 8001,
    [string]$TopicRoot,
    [string]$Million1BrokerHost,
    [string]$TripleNoneBrokerHost,
    [string]$CloudBrokerHost = "broker.emqx.io",
    [string]$CloudTopicRoot = "flycare-demo-20260614/smartwatch",
    [string[]]$DemoSsids = @("MILLION1", "Triple-None"),
    [switch]$RequireDemoSsid,
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendEnvPath = Join-Path $repoRoot "backend\backend\.env"
$backendEnvExamplePath = Join-Path $repoRoot "backend\backend\.env.example"
$firmwareConfigPath = Join-Path $repoRoot "firmware\Config.h"
$logRoot = Join-Path $repoRoot "logs"
$statusPath = Join-Path $logRoot "flycare-mqtt-endpoint.json"

function Get-ActiveWifiSsid {
    try {
        $output = @(netsh wlan show interfaces 2>$null)
        if ($LASTEXITCODE -ne 0) {
            return $null
        }
    } catch {
        return $null
    }

    foreach ($line in $output) {
        if ($line -match "^\s*SSID\s+:\s*(.+?)\s*$") {
            return $Matches[1].Trim()
        }
    }
    return $null
}

function Get-ActiveLanIPv4 {
    $configs = @(Get-NetIPConfiguration -ErrorAction Stop | Where-Object {
        $_.IPv4Address -and $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq "Up"
    })

    $preferred = $configs | Sort-Object `
        @{ Expression = { if ($_.InterfaceAlias -match "Wi-?Fi|WLAN|Wireless") { 0 } else { 1 } } }, `
        InterfaceMetric | Select-Object -First 1

    if (-not $preferred) {
        throw "No active IPv4 interface with a default gateway was found."
    }

    return [pscustomobject]@{
        interfaceAlias = $preferred.InterfaceAlias
        ipv4 = $preferred.IPv4Address.IPAddress
        gateway = $preferred.IPv4DefaultGateway.NextHop
        ssid = Get-ActiveWifiSsid
    }
}

function Set-EnvValue {
    param(
        [string[]]$Lines,
        [string]$Name,
        [string]$Value
    )

    $pattern = "^$([regex]::Escape($Name))="
    $updated = $false
    $out = foreach ($line in $Lines) {
        if ($line -match $pattern) {
            $updated = $true
            "$Name=$Value"
        } else {
            $line
        }
    }

    if (-not $updated) {
        $out += "$Name=$Value"
    }

    return $out
}

function Set-ConfigDefine {
    param(
        [string]$Text,
        [string]$Name,
        [string]$Value,
        [switch]$IsString
    )

    $escapedName = [regex]::Escape($Name)
    if ($IsString) {
        $replacement = "#define $Name `"$Value`""
        $pattern = "(?m)^#define\s+$escapedName\s+`"[^`"]*`""
    } else {
        $replacement = "#define $Name $Value"
        $pattern = "(?m)^#define\s+$escapedName\s+\d+"
    }

    if ([regex]::IsMatch($Text, $pattern)) {
        return [regex]::Replace($Text, $pattern, $replacement)
    }

    $idx = $Text.LastIndexOf("#endif")
    if ($idx -ge 0) {
        return $Text.Insert($idx, "$replacement$([Environment]::NewLine)")
    }
    return $Text + [Environment]::NewLine + $replacement + [Environment]::NewLine
}

function Get-ConfigStringDefine {
    param(
        [string]$Text,
        [string]$Name
    )

    $escapedName = [regex]::Escape($Name)
    $match = [regex]::Match($Text, "(?m)^#define\s+$escapedName\s+`"([^`"]*)`"")
    if ($match.Success) {
        return $match.Groups[1].Value
    }
    return $null
}

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Value
    )

    $encoding = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, $Value, $encoding)
}

if (-not (Test-Path $backendEnvPath)) {
    if (Test-Path $backendEnvExamplePath) {
        Copy-Item -LiteralPath $backendEnvExamplePath -Destination $backendEnvPath -Force
    } else {
        New-Item -ItemType File -Path $backendEnvPath -Force | Out-Null
    }
}
if (-not (Test-Path $firmwareConfigPath)) {
    throw "Missing firmware config file: $firmwareConfigPath"
}

$active = Get-ActiveLanIPv4
$configText = Get-Content -Path $firmwareConfigPath -Raw

if ($RequireDemoSsid -and $active.ssid -notin $DemoSsids) {
    $ssidLabel = if ($active.ssid) { $active.ssid } else { "<unknown>" }
    throw "Active Wi-Fi SSID '$ssidLabel' is not one of the demo SSIDs: $($DemoSsids -join ', '). Run from an Administrator shell with Location enabled if SSID detection is blocked, or omit -RequireDemoSsid."
}

switch ($Mode) {
    "AutoLan" {
        $effectiveBrokerHost = if ($BrokerHost) { $BrokerHost } else { $active.ipv4 }
        $effectiveServerHost = if ($ServerHost) { $ServerHost } else { $effectiveBrokerHost }
        $effectiveTopicRoot = if ($TopicRoot) { $TopicRoot.Trim("/") } else { "smartwatch" }
        $networkNote = "Local LAN mode requires the PC and watch to be on the same SSID/subnet and not blocked by AP isolation."
    }
    "OfflineLan" {
        $effectiveBrokerHost = if ($BrokerHost) { $BrokerHost } else { $active.ipv4 }
        $effectiveServerHost = if ($ServerHost) { $ServerHost } else { $effectiveBrokerHost }
        $effectiveTopicRoot = if ($TopicRoot) { $TopicRoot.Trim("/") } else { "smartwatch" }
        $networkNote = "Offline LAN mode uses the PC as the local backend/MQTT host. The watch must join the same SSID/subnet as the PC; MILLION1 remains the firmware's first Wi-Fi candidate and Triple-None is fallback."
    }
    "Cloud" {
        $effectiveBrokerHost = if ($BrokerHost) { $BrokerHost } else { $CloudBrokerHost }
        $effectiveServerHost = if ($ServerHost) { $ServerHost } else { $active.ipv4 }
        $effectiveTopicRoot = if ($TopicRoot) { $TopicRoot.Trim("/") } else { $CloudTopicRoot.Trim("/") }
        $networkNote = "Cloud MQTT mode allows backend and watch to use different Wi-Fi networks if both have internet access. Use a private authenticated broker for production."
    }
    "Custom" {
        if (-not $BrokerHost) {
            throw "Custom mode requires -BrokerHost."
        }
        $effectiveBrokerHost = $BrokerHost
        $effectiveServerHost = if ($ServerHost) { $ServerHost } else { $active.ipv4 }
        $effectiveTopicRoot = if ($TopicRoot) { $TopicRoot.Trim("/") } else { "smartwatch" }
        $networkNote = "Custom mode writes exactly the supplied broker host; verify routing from both backend and watch."
    }
}

$existingMillion1Broker = Get-ConfigStringDefine -Text $configText -Name "MQTT_BROKER_MILLION1"
$existingTripleNoneBroker = Get-ConfigStringDefine -Text $configText -Name "MQTT_BROKER_TRIPLE_NONE"

$effectiveMillion1Broker = if ($Million1BrokerHost) {
    $Million1BrokerHost
} elseif ($active.ssid -eq "MILLION1") {
    $effectiveBrokerHost
} elseif ($existingMillion1Broker) {
    $existingMillion1Broker
} else {
    $effectiveBrokerHost
}

$effectiveTripleNoneBroker = if ($TripleNoneBrokerHost) {
    $TripleNoneBrokerHost
} elseif ($active.ssid -eq "Triple-None") {
    $effectiveBrokerHost
} elseif ($existingTripleNoneBroker) {
    $existingTripleNoneBroker
} else {
    $effectiveBrokerHost
}

$effectiveFallback1Broker = if ($Mode -eq "Cloud") { $CloudBrokerHost } else { "" }
$serverUrl = "http://$effectiveServerHost`:$ServerPort/api/v1/data-reception/receive"

$envLines = Get-Content -Path $backendEnvPath
$envLines = Set-EnvValue -Lines $envLines -Name "MQTT_BROKER" -Value $effectiveBrokerHost
$envLines = Set-EnvValue -Lines $envLines -Name "MQTT_PORT" -Value ([string]$MqttPort)
$envLines = Set-EnvValue -Lines $envLines -Name "MQTT_TOPIC_ROOT" -Value $effectiveTopicRoot
$envLines = Set-EnvValue -Lines $envLines -Name "FLYCARE_FLIGHT_DOWNLINK_TOPIC_TEMPLATE" -Value "$effectiveTopicRoot/{device_id}/flight"
$envLines = Set-EnvValue -Lines $envLines -Name "FLYCARE_REMINDER_DOWNLINK_TOPIC_TEMPLATE" -Value "$effectiveTopicRoot/{device_id}/reminder"
$envLines = Set-EnvValue -Lines $envLines -Name "FLYCARE_LEGACY_FLIGHT_TOPIC" -Value "$effectiveTopicRoot/flight"

$configText = Set-ConfigDefine -Text $configText -Name "SERVER_URL" -Value $serverUrl -IsString
$configText = Set-ConfigDefine -Text $configText -Name "MQTT_BROKER" -Value $effectiveBrokerHost -IsString
$configText = Set-ConfigDefine -Text $configText -Name "MQTT_BROKER_MILLION1" -Value $effectiveMillion1Broker -IsString
$configText = Set-ConfigDefine -Text $configText -Name "MQTT_BROKER_TRIPLE_NONE" -Value $effectiveTripleNoneBroker -IsString
$configText = Set-ConfigDefine -Text $configText -Name "MQTT_BROKER_FALLBACK_1" -Value $effectiveFallback1Broker -IsString
$configText = Set-ConfigDefine -Text $configText -Name "MQTT_BROKER_FALLBACK_2" -Value "" -IsString
$configText = Set-ConfigDefine -Text $configText -Name "MQTT_PORT" -Value ([string]$MqttPort)
$configText = Set-ConfigDefine -Text $configText -Name "MQTT_TOPIC_ROOT" -Value $effectiveTopicRoot -IsString

$status = [pscustomobject]@{
    timestamp = (Get-Date).ToString("s")
    mode = $Mode
    activeInterface = $active.interfaceAlias
    activeSsid = $active.ssid
    activeIPv4 = $active.ipv4
    activeGateway = $active.gateway
    mqttBroker = $effectiveBrokerHost
    mqttBrokerMillion1 = $effectiveMillion1Broker
    mqttBrokerTripleNone = $effectiveTripleNoneBroker
    mqttBrokerFallback1 = $effectiveFallback1Broker
    mqttPort = $MqttPort
    mqttTopicRoot = $effectiveTopicRoot
    serverPort = $ServerPort
    flightDownlinkTopicTemplate = "$effectiveTopicRoot/{device_id}/flight"
    reminderDownlinkTopicTemplate = "$effectiveTopicRoot/{device_id}/reminder"
    serverUrl = $serverUrl
    backendEnvPath = $backendEnvPath
    firmwareConfigPath = $firmwareConfigPath
    note = $networkNote
    whatIf = [bool]$WhatIf
}

if ($WhatIf) {
    $status | ConvertTo-Json -Depth 6
    return
}

Write-Utf8NoBom -Path $backendEnvPath -Value (($envLines -join [Environment]::NewLine) + [Environment]::NewLine)
Write-Utf8NoBom -Path $firmwareConfigPath -Value $configText
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
Write-Utf8NoBom -Path $statusPath -Value (($status | ConvertTo-Json -Depth 6) + [Environment]::NewLine)
$status | ConvertTo-Json -Depth 6
Write-Host "Updated MQTT endpoint. Restart backend and recompile/upload firmware for the watch to use the new endpoint."
Write-Host "Status written to $statusPath"
