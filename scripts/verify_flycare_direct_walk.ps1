param(
    [string]$DeviceId = "ESP32_48CA43A42298",
    [string]$BrokerHost = "192.168.1.232",
    [int]$MqttPort = 1883,
    [int]$Seconds = 180,
    [string]$MosquittoSub = "",
    [string]$LogPath = "",
    [string]$AnalyzeLogPath = "",
    [int]$MinLocationCount = 10,
    [int]$MaxCustomerRun = 1,
    [double]$MaxCustomerSharePercent = 10.0,
    [double]$MinYRangeMeters = 2.5,
    [switch]$RequireGate,
    [switch]$AllowSerialBridge
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$logRoot = Join-Path $repoRoot "logs"
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null

if ([string]::IsNullOrWhiteSpace($MosquittoSub)) {
    $candidate = "C:\Program Files\Mosquitto\mosquitto_sub.exe"
    $MosquittoSub = if (Test-Path $candidate) { $candidate } else { "mosquitto_sub.exe" }
}

function Test-SerialBridgeRunning {
    $processes = @(
        Get-CimInstance Win32_Process |
            Where-Object { $_.CommandLine -match "bridge_flycare_serial\.ps1" }
    )
    return $processes
}

function Get-NearestZone {
    param([double]$X, [double]$Y)

    $zones = @(
        [pscustomobject]@{ name = "Check-in"; x = 7.6; y = 14.6 },
        [pscustomobject]@{ name = "Security Check"; x = 6.6; y = 10.4 },
        [pscustomobject]@{ name = "Customer Services"; x = 6.2; y = 4.0 },
        [pscustomobject]@{ name = "Toilet"; x = 1.6; y = 2.2 },
        [pscustomobject]@{ name = "Gate 10"; x = 8.0; y = 1.8 },
        [pscustomobject]@{ name = "Gate 11"; x = 4.4; y = 1.8 }
    )

    $nearest = $zones |
        ForEach-Object {
            $dist = [Math]::Sqrt([Math]::Pow($X - $_.x, 2) + [Math]::Pow($Y - $_.y, 2))
            [pscustomobject]@{ name = $_.name; distance = $dist }
        } |
        Sort-Object distance |
        Select-Object -First 1

    return $nearest
}

function Read-WalkPoints {
    param(
        [string]$Path,
        [string]$ExpectedDeviceId
    )

    $points = New-Object System.Collections.Generic.List[object]
    $statusCount = 0
    $locationCount = 0
    $topicPattern = [Regex]::Escape("smartwatch/$ExpectedDeviceId/")

    foreach ($line in (Get-Content -Path $Path -ErrorAction SilentlyContinue)) {
        if ($line -notmatch "^$topicPattern(status|location)\s+\{") {
            continue
        }

        $topic = ($line -split "\s+", 2)[0]
        $jsonText = $line.Substring($line.IndexOf("{"))
        try {
            $json = $jsonText | ConvertFrom-Json
        } catch {
            continue
        }

        if ($topic -like "*/status") {
            $statusCount++
            continue
        }

        if ($topic -like "*/location") {
            $locationCount++
            $x = [double]$json.location.x
            $y = [double]$json.location.y
            $nearest = Get-NearestZone -X $x -Y $y
            $points.Add([pscustomobject]@{
                index = $locationCount
                x = [Math]::Round($x, 2)
                y = [Math]::Round($y, 2)
                nearest = $nearest.name
                nearestDistance = [Math]::Round($nearest.distance, 2)
                quality = [string]$json.location.quality
                beaconCount = [int]$json.location.beacon_count
            })
        }
    }

    $pointArray = @($points | ForEach-Object { $_ })

    return [pscustomobject]@{
        statusCount = $statusCount
        locationCount = $locationCount
        points = $pointArray
    }
}

function Measure-WalkPoints {
    param($Points)

    if (-not $Points -or @($Points).Count -eq 0) {
        return [pscustomobject]@{
            minX = $null; maxX = $null; minY = $null; maxY = $null
            yRange = 0.0; nearestCounts = @(); maxCustomerRun = 0
            customerSharePercent = 0.0; gateSeen = $false
            first = @(); last = @()
        }
    }

    $xs = @($Points | ForEach-Object { [double]$_.x })
    $ys = @($Points | ForEach-Object { [double]$_.y })
    $nearestCounts = @(
        $Points |
            Group-Object nearest |
            Sort-Object Count -Descending |
            ForEach-Object { [pscustomobject]@{ name = $_.Name; count = $_.Count } }
    )

    $maxCustomerRun = 0
    $currentCustomerRun = 0
    foreach ($point in $Points) {
        if ($point.nearest -eq "Customer Services") {
            $currentCustomerRun++
            if ($currentCustomerRun -gt $maxCustomerRun) {
                $maxCustomerRun = $currentCustomerRun
            }
        } else {
            $currentCustomerRun = 0
        }
    }

    $customerCount = @($Points | Where-Object { $_.nearest -eq "Customer Services" }).Count
    $gateSeen = @($Points | Where-Object { $_.nearest -eq "Gate 10" -or $_.nearest -eq "Gate 11" }).Count -gt 0
    $minY = ($ys | Measure-Object -Minimum).Minimum
    $maxY = ($ys | Measure-Object -Maximum).Maximum

    return [pscustomobject]@{
        minX = ($xs | Measure-Object -Minimum).Minimum
        maxX = ($xs | Measure-Object -Maximum).Maximum
        minY = $minY
        maxY = $maxY
        yRange = [Math]::Round($maxY - $minY, 2)
        nearestCounts = $nearestCounts
        maxCustomerRun = $maxCustomerRun
        customerSharePercent = [Math]::Round((100.0 * $customerCount / @($Points).Count), 1)
        gateSeen = $gateSeen
        first = @($Points | Select-Object -First 8)
        last = @($Points | Select-Object -Last 8)
    }
}

$startedAt = Get-Date
$serialBridgeProcesses = @(Test-SerialBridgeRunning)
if ($serialBridgeProcesses.Count -gt 0 -and -not $AllowSerialBridge) {
    $details = $serialBridgeProcesses | Select-Object ProcessId, CommandLine
    $result = [pscustomobject]@{
        timestamp = $startedAt.ToString("s")
        status = "fail"
        reason = "serial_bridge_running"
        evidence = "COM5 serial bridge is running; this cannot prove direct Wi-Fi MQTT."
        serialBridgeProcesses = $details
    }
    $result | ConvertTo-Json -Depth 8
    exit 2
}

if ([string]::IsNullOrWhiteSpace($AnalyzeLogPath)) {
    if ([string]::IsNullOrWhiteSpace($LogPath)) {
        $LogPath = Join-Path $logRoot ("direct-mqtt-walk-{0}.log" -f $startedAt.ToString("yyyyMMdd-HHmmss"))
    }

    Write-Host "Direct MQTT walk capture: ${BrokerHost}:$MqttPort for $Seconds seconds"
    Write-Host "Move the watch through Check-in/Security toward Gate 10 or Gate 11 now."
    & $MosquittoSub -h $BrokerHost -p $MqttPort -t "smartwatch/#" -v -R -W $Seconds *> $LogPath
    $AnalyzeLogPath = $LogPath
}

$capture = Read-WalkPoints -Path $AnalyzeLogPath -ExpectedDeviceId $DeviceId
$metrics = Measure-WalkPoints -Points $capture.points

$failures = New-Object System.Collections.Generic.List[string]
if ($capture.locationCount -lt $MinLocationCount) {
    $failures.Add("location_count_below_$MinLocationCount")
}
if ($metrics.maxCustomerRun -gt $MaxCustomerRun) {
    $failures.Add("customer_run_gt_$MaxCustomerRun")
}
if ($metrics.customerSharePercent -gt $MaxCustomerSharePercent) {
    $failures.Add("customer_share_gt_$MaxCustomerSharePercent")
}
if ($metrics.yRange -lt $MinYRangeMeters) {
    $failures.Add("y_range_below_$MinYRangeMeters")
}
if ($RequireGate -and -not $metrics.gateSeen) {
    $failures.Add("gate_not_seen")
}

$status = if ($failures.Count -eq 0) { "pass" } else { "fail" }
$report = [pscustomobject]@{
    timestamp = $startedAt.ToString("s")
    status = $status
    failures = @($failures)
    directMqtt = [pscustomobject]@{
        brokerHost = $BrokerHost
        port = $MqttPort
        deviceId = $DeviceId
        logPath = $AnalyzeLogPath
        statusCount = $capture.statusCount
        locationCount = $capture.locationCount
        serialBridgeRunning = $serialBridgeProcesses.Count -gt 0
    }
    thresholds = [pscustomobject]@{
        minLocationCount = $MinLocationCount
        maxCustomerRun = $MaxCustomerRun
        maxCustomerSharePercent = $MaxCustomerSharePercent
        minYRangeMeters = $MinYRangeMeters
        requireGate = [bool]$RequireGate
    }
    metrics = $metrics
}

$reportPath = Join-Path $logRoot ("direct-walk-report-{0}.json" -f $startedAt.ToString("yyyyMMdd-HHmmss"))
$report | ConvertTo-Json -Depth 12 | Set-Content -Path $reportPath -Encoding UTF8
$report | Add-Member -NotePropertyName reportPath -NotePropertyValue $reportPath -Force
$report | ConvertTo-Json -Depth 12

if ($status -ne "pass") {
    exit 2
}
