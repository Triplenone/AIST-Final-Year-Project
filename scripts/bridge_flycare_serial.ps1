param(
    [string]$SerialPort = "COM5",
    [int]$BaudRate = 115200,
    [string]$BaseUrl = "",
    [ValidateSet("Mqtt", "Http")]
    [string]$Transport = "Mqtt",
    [string]$MqttBrokerHost = "",
    [int]$MqttPort = 0,
    [string]$MosquittoPub = "",
    [int]$Seconds = 0,
    [string]$LogPath = "",
    [switch]$SmokeTest
)

$ErrorActionPreference = "Stop"

function Resolve-BridgeBaseUrl {
    param([string]$RequestedBaseUrl)

    if (-not [string]::IsNullOrWhiteSpace($RequestedBaseUrl)) {
        return $RequestedBaseUrl.TrimEnd("/")
    }

    $repoRoot = Split-Path -Parent $PSScriptRoot
    $stackPath = Join-Path $repoRoot "logs\flycare-local-stack-status.json"
    if (Test-Path $stackPath) {
        try {
            $stack = Get-Content -Path $stackPath -Raw | ConvertFrom-Json
            if ($stack.activeBackend -and $stack.activeBackend.baseUrl -and $stack.activeBackend.mqttConnected -eq $true) {
                return ([string]$stack.activeBackend.baseUrl).TrimEnd("/")
            }
        } catch {
            Write-Warning "Could not read activeBackend from ${stackPath}: $($_.Exception.Message)"
        }
    }

    return "http://127.0.0.1:8000"
}

function Resolve-MqttSettings {
    param(
        [string]$RequestedHost,
        [int]$RequestedPort,
        [string]$RequestedPub
    )

    $repoRoot = Split-Path -Parent $PSScriptRoot
    $hostValue = $RequestedHost
    $portValue = $RequestedPort
    $pubValue = $RequestedPub

    $stackPath = Join-Path $repoRoot "logs\flycare-local-stack-status.json"
    if (Test-Path $stackPath) {
        try {
            $stack = Get-Content -Path $stackPath -Raw | ConvertFrom-Json
            if ([string]::IsNullOrWhiteSpace($hostValue) -and $stack.mqttStatus -and $stack.mqttStatus.broker) {
                $hostValue = [string]$stack.mqttStatus.broker
            }
            if ($portValue -le 0 -and $stack.mqttStatus -and $stack.mqttStatus.port) {
                $portValue = [int]$stack.mqttStatus.port
            }
        } catch {
            Write-Warning "Could not read MQTT settings from ${stackPath}: $($_.Exception.Message)"
        }
    }

    if ([string]::IsNullOrWhiteSpace($hostValue)) { $hostValue = "127.0.0.1" }
    if ($portValue -le 0) { $portValue = 1883 }
    if ([string]::IsNullOrWhiteSpace($pubValue)) {
        $candidate = "C:\Program Files\Mosquitto\mosquitto_pub.exe"
        $pubValue = if (Test-Path $candidate) { $candidate } else { "mosquitto_pub.exe" }
    }

    return [pscustomobject]@{
        host = $hostValue
        port = $portValue
        pub = $pubValue
    }
}

function Open-WatchSerial {
    param([string]$Name, [int]$Baud)

    $port = [System.IO.Ports.SerialPort]::new(
        $Name,
        $Baud,
        [System.IO.Ports.Parity]::None,
        8,
        [System.IO.Ports.StopBits]::One
    )
    $port.NewLine = "`n"
    $port.ReadTimeout = 500
    $port.WriteTimeout = 1000
    $port.DtrEnable = $false
    $port.RtsEnable = $false
    $port.Open()
    return $port
}

function Send-Uplink {
    param(
        [string]$Base,
        $Mqtt,
        [string]$Mode,
        [string]$Topic,
        $Payload
    )

    $payloadJson = $Payload | ConvertTo-Json -Depth 20 -Compress
    if ($Mode -eq "Mqtt") {
        $payloadJson | & $Mqtt.pub -h $Mqtt.host -p $Mqtt.port -q 1 -t $Topic -s
        if ($LASTEXITCODE -ne 0) {
            throw "mosquitto_pub failed with exit code $LASTEXITCODE"
        }
        return [pscustomobject]@{
            status = "ok"
            transport = "mqtt"
            topic = $Topic
            broker = "$($Mqtt.host):$($Mqtt.port)"
            data_type = $Payload.data_type
            mongo = $null
        }
    }

    $body = [ordered]@{
        topic = $Topic
        payload = $Payload
        source = "serial_bridge"
    } | ConvertTo-Json -Depth 20 -Compress

    return Invoke-RestMethod `
        -Method Post `
        -Uri "$Base/api/v1/mongo-upstream/serial-ingest" `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 5
}

function Parse-UplinkLine {
    param([string]$Line)

    $match = [regex]::Match($Line, '^FLYCARE_UPLINK\s+(\S+)\s+(\{.*\})\s*$')
    if (-not $match.Success) {
        return $null
    }

    try {
        $payload = $match.Groups[2].Value | ConvertFrom-Json
        return [pscustomobject]@{
            topic = $match.Groups[1].Value
            payload = $payload
        }
    } catch {
        Write-Warning "Invalid FLYCARE_UPLINK JSON: $($_.Exception.Message)"
        return $null
    }
}

$base = Resolve-BridgeBaseUrl -RequestedBaseUrl $BaseUrl
$mqtt = Resolve-MqttSettings -RequestedHost $MqttBrokerHost -RequestedPort $MqttPort -RequestedPub $MosquittoPub
$repoRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($LogPath)) {
    $logRoot = Join-Path $repoRoot "logs"
    New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
    $LogPath = Join-Path $logRoot ("flycare-serial-bridge-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
}

if ($SmokeTest) {
    $payload = [ordered]@{
        device_id = "ESP32_SERIAL_BRIDGE_SMOKE"
        timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
        data_type = "status_update"
        location = @{
            current = @{
                x = 0
                y = 0
                accuracy = 0
                quality = "smoke"
                beacon_count = 0
                beacons = @()
            }
            target = @{
                active = $false
                x = 0
                y = 0
                name = ""
                distance = 0
                direction = "none"
                bearing = 0
                eta = 0
            }
        }
        fall_detection = @{
            state = 0
            state_description = "Normal"
            confidence = 0
            is_fall_confirmed = $false
            impact_force = 0
            direction = "none"
            fall_time = 0
        }
        sos = @{
            active = $false
            trigger_method = "none"
            trigger_time = 0
            trigger_count = 0
            duration = 0
        }
        sensors = @{
            heart_rate = @{ bpm = 0; confidence = 0; timestamp = 0; valid = $false }
            spo2 = @{ percentage = 0; confidence = 0; timestamp = 0; valid = $false }
        }
        system = @{
            battery = @{ level = 0; voltage = 0; charging = $false }
        }
    }
    $result = Send-Uplink -Base $base -Mqtt $mqtt -Mode $Transport -Topic "smartwatch/ESP32_SERIAL_BRIDGE_SMOKE/status" -Payload $payload
    $result | ConvertTo-Json -Depth 10
    return
}

$deadline = if ($Seconds -gt 0) { (Get-Date).AddSeconds($Seconds) } else { $null }
$serial = $null
$sent = 0
$parsed = 0
$startedAt = Get-Date

try {
    "[$($startedAt.ToString("s"))] bridge start port=$SerialPort baud=$BaudRate transport=$Transport base=$base mqtt=$($mqtt.host):$($mqtt.port)" |
        Tee-Object -FilePath $LogPath -Append | Out-Host
    $serial = Open-WatchSerial -Name $SerialPort -Baud $BaudRate
    Start-Sleep -Milliseconds 1000
    $null = $serial.ReadExisting()

    while ($true) {
        if ($deadline -and (Get-Date) -ge $deadline) {
            break
        }

        try {
            $line = $serial.ReadLine()
        } catch [System.TimeoutException] {
            continue
        }

        $line = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        $uplink = Parse-UplinkLine -Line $line
        if (-not $uplink) {
            continue
        }

        $parsed++
        try {
            $result = Send-Uplink -Base $base -Mqtt $mqtt -Mode $Transport -Topic $uplink.topic -Payload $uplink.payload
            $sent++
            "[serial] ok transport=$Transport topic=$($uplink.topic) data_type=$($result.data_type)" |
                Tee-Object -FilePath $LogPath -Append | Out-Host
        } catch {
            "[serial] post failed topic=$($uplink.topic): $($_.Exception.Message)" |
                Tee-Object -FilePath $LogPath -Append | Out-Host
        }
    }
} finally {
    if ($serial -and $serial.IsOpen) {
        $serial.Close()
    }
    $endedAt = Get-Date
    "[$($endedAt.ToString("s"))] bridge stop parsed=$parsed sent=$sent log=$LogPath" |
        Tee-Object -FilePath $LogPath -Append | Out-Host
}
