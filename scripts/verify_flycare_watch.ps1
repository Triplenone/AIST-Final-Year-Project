param(
    [string]$DeviceId = "ESP32_48CA43A42298",
    [string]$SerialPort = "COM5",
    [int]$BaudRate = 115200,
    [int]$Seconds = 45,
    [switch]$WaitForPhysicalSOS,
    [switch]$WaitForValidHeartRate,
    [switch]$WaitForValidSpO2,
    [switch]$RunHeartRateCalibration,
    [string]$HeartRateLedBrightness = "",
    [switch]$RunHeartRateSensorCheck,
    [switch]$RunHeartRateSweep,
    [int]$HeartRateSweepWindowSeconds = 4,
    [switch]$RunNavMenuConfirm,
    [switch]$RunNavMenuAutoConfirm,
    [switch]$AutoClearSOS,
    [switch]$AutoHandleSosEvents,
    [string]$BaseUrl = "http://127.0.0.1:8000"
)

$ErrorActionPreference = "Stop"

function Invoke-ApiJson {
    param([string]$Url)
    try {
        return Invoke-RestMethod -Uri $Url -TimeoutSec 5
    } catch {
        return [pscustomobject]@{ error = $_.Exception.Message; url = $Url }
    }
}

function Read-SerialChunk {
    param([System.IO.Ports.SerialPort]$Port)
    try {
        return $Port.ReadExisting()
    } catch {
        return ""
    }
}

function Read-SerialForDuration {
    param([System.IO.Ports.SerialPort]$Port, [double]$DurationSeconds)

    $buffer = [System.Text.StringBuilder]::new()
    $deadline = (Get-Date).AddSeconds($DurationSeconds)
    while ((Get-Date) -lt $deadline) {
        $chunk = Read-SerialChunk -Port $Port
        if ($chunk.Length -gt 0) {
            [void]$buffer.Append($chunk)
        }
        Start-Sleep -Milliseconds 200
    }
    return $buffer.ToString()
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

function Get-EventIds {
    param($Events)
    return @((Get-CollectionItems $Events) | ForEach-Object { $_.event_id })
}

function Get-CollectionItems {
    param($Value)
    if ($null -eq $Value) { return @() }
    if ($Value -is [array]) { return @($Value) }
    if ($Value.PSObject.Properties.Name -contains "value") {
        return @($Value.value)
    }
    return @($Value)
}

function Select-TargetEvents {
    param(
        $Events,
        $MysqlDeviceId
    )

    $items = @(Get-CollectionItems $Events)
    $targetItems = if ($MysqlDeviceId) {
        @($items | Where-Object { "$($_.trigger_device_id)" -eq "$MysqlDeviceId" })
    } else {
        $items
    }

    return [pscustomobject]@{
        value = $targetItems
        Count = $targetItems.Count
        globalCount = $items.Count
        filteredByMysqlDeviceId = $MysqlDeviceId
    }
}

function Get-HeartRateDiagnostics {
    param(
        [string]$SerialOutput,
        $FinalStatus,
        [bool]$ValidHeartRateObserved,
        [bool]$ValidSpO2Observed
    )

    $culture = [System.Globalization.CultureInfo]::InvariantCulture
    $summary = [ordered]@{
        classification = "not_measured"
        electricalPresent = $null
        opticalContact = $null
        partId = $null
        expectedPartId = "0x15"
        revision = $null
        temperatureC = $null
        recentSample = $null
        contactThreshold = $null
        lastIr = $null
        lastRed = $null
        maxObservedIr = $null
        maxObservedIrLed = $null
        maxContactPct = $null
        maxContactPctLed = $null
        maxSaturationPct = $null
        calibrationWindows = @()
    }

    foreach ($line in ($SerialOutput -split "`r?`n")) {
        if ($line -match '^\[HRSENSOR\] part_id=0x(?<part>[0-9A-Fa-f]+) expected=0x(?<expected>[0-9A-Fa-f]+) revision=0x(?<revision>[0-9A-Fa-f]+) temp_c=(?<temp>-?\d+(?:\.\d+)?) led=0x(?<led>[0-9A-Fa-f]+) recent=(?<recent>\w+) ir=(?<ir>-?\d+) red=(?<red>-?\d+) threshold=(?<threshold>\d+) contact=(?<contact>\w+)') {
            $partId = "0x$($Matches.part.ToUpperInvariant())"
            $summary.partId = $partId
            $summary.expectedPartId = "0x$($Matches.expected.ToUpperInvariant())"
            $summary.revision = "0x$($Matches.revision.ToUpperInvariant())"
            $summary.temperatureC = [double]::Parse($Matches.temp, $culture)
            $summary.recentSample = $Matches.recent -eq "yes"
            $summary.lastIr = [int64]$Matches.ir
            $summary.lastRed = [int64]$Matches.red
            $summary.contactThreshold = [int64]$Matches.threshold
            $summary.opticalContact = $Matches.contact -eq "yes"
            $summary.electricalPresent = $partId -eq $summary.expectedPartId
            continue
        }

        if ($line -match '^\[HRCAL\] window_ms=(?<window>\d+) led=0x(?<led>[0-9A-Fa-f]+) samples=(?<samples>\d+) threshold=(?<threshold>\d+) ir_min=(?<irMin>-?\d+) ir_avg=(?<irAvg>-?\d+(?:\.\d+)?) ir_max=(?<irMax>-?\d+) red_min=(?<redMin>-?\d+) red_avg=(?<redAvg>-?\d+(?:\.\d+)?) red_max=(?<redMax>-?\d+) contact_samples=(?<contactSamples>\d+) contact_pct=(?<contactPct>\d+(?:\.\d+)?) saturated_samples=(?<saturatedSamples>\d+) saturated_pct=(?<saturatedPct>\d+(?:\.\d+)?)') {
            $led = "0x$($Matches.led.ToUpperInvariant())"
            $window = [ordered]@{
                windowMs = [int]$Matches.window
                led = $led
                samples = [int]$Matches.samples
                threshold = [int64]$Matches.threshold
                irMin = [int64]$Matches.irMin
                irAvg = [double]::Parse($Matches.irAvg, $culture)
                irMax = [int64]$Matches.irMax
                redMin = [int64]$Matches.redMin
                redAvg = [double]::Parse($Matches.redAvg, $culture)
                redMax = [int64]$Matches.redMax
                contactSamples = [int]$Matches.contactSamples
                contactPct = [double]::Parse($Matches.contactPct, $culture)
                saturatedSamples = [int]$Matches.saturatedSamples
                saturatedPct = [double]::Parse($Matches.saturatedPct, $culture)
            }

            $summary.calibrationWindows += [pscustomobject]$window
            if ($null -eq $summary.contactThreshold) {
                $summary.contactThreshold = $window.threshold
            }
            if ($null -eq $summary.maxObservedIr -or $window.irMax -gt $summary.maxObservedIr) {
                $summary.maxObservedIr = $window.irMax
                $summary.maxObservedIrLed = $led
            }
            if ($null -eq $summary.maxContactPct -or $window.contactPct -gt $summary.maxContactPct) {
                $summary.maxContactPct = $window.contactPct
                $summary.maxContactPctLed = $led
            }
            if ($null -eq $summary.maxSaturationPct -or $window.saturatedPct -gt $summary.maxSaturationPct) {
                $summary.maxSaturationPct = $window.saturatedPct
            }
        }
    }

    $finalHr = $FinalStatus.sensors.heart_rate
    $finalSpo2 = $FinalStatus.sensors.spo2
    $finalHrValid = $finalHr -and $finalHr.valid -eq $true -and [int]$finalHr.bpm -gt 0
    $finalSpo2Valid = $finalSpo2 -and $finalSpo2.valid -eq $true -and [int]$finalSpo2.percentage -ge 70 -and [int]$finalSpo2.percentage -le 100

    if (($ValidHeartRateObserved -or $finalHrValid) -and ($ValidSpO2Observed -or $finalSpo2Valid)) {
        $summary.classification = "valid_vitals_observed"
    } elseif ($summary.electricalPresent -eq $false) {
        $summary.classification = "sensor_identity_unexpected"
    } elseif ($summary.electricalPresent -eq $true -and
        ($summary.opticalContact -eq $false -or
         ($null -ne $summary.contactThreshold -and $null -ne $summary.maxObservedIr -and $summary.maxObservedIr -le $summary.contactThreshold) -or
         ($null -ne $summary.maxContactPct -and $summary.maxContactPct -le 0))) {
        $summary.classification = "optical_contact_missing"
    } elseif ($summary.electricalPresent -eq $true) {
        $summary.classification = "sensor_present_needs_pulse_stabilization"
    } elseif ($summary.calibrationWindows.Count -gt 0) {
        $summary.classification = "calibration_without_sensor_identity"
    }

    return [pscustomobject]$summary
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$logRoot = Join-Path $repoRoot "logs"
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null

$base = $BaseUrl.TrimEnd("/")
$startedAt = Get-Date
$deadline = $startedAt.AddSeconds($Seconds)
$encodedDeviceId = [System.Uri]::EscapeDataString($DeviceId)

$report = [ordered]@{
    timestamp = $startedAt.ToString("s")
    deviceId = $DeviceId
    baseUrl = $base
    serialPort = $SerialPort
    waitForPhysicalSOS = [bool]$WaitForPhysicalSOS
    waitForValidHeartRate = [bool]$WaitForValidHeartRate
    waitForValidSpO2 = [bool]$WaitForValidSpO2
    runHeartRateCalibration = [bool]$RunHeartRateCalibration
    heartRateLedBrightness = $HeartRateLedBrightness
    runHeartRateSensorCheck = [bool]$RunHeartRateSensorCheck
    runHeartRateSweep = [bool]$RunHeartRateSweep
    heartRateSweepWindowSeconds = $HeartRateSweepWindowSeconds
    runNavMenuConfirm = [bool]($RunNavMenuConfirm -or $RunNavMenuAutoConfirm)
    runNavMenuAutoConfirm = [bool]($RunNavMenuConfirm -or $RunNavMenuAutoConfirm)
    health = $null
    mqttStatus = $null
    baselineStatus = $null
    baselineSos = $null
    mysqlDeviceId = $null
    baselineUnhandledEvents = $null
    serialOutput = ""
    physicalSosObserved = $(if ($WaitForPhysicalSOS) { $false } else { $null })
    validHeartRateObserved = $(if ($WaitForValidHeartRate) { $false } else { $null })
    validSpO2Observed = $(if ($WaitForValidSpO2) { $false } else { $null })
    finalStatus = $null
    finalSos = $null
    finalUnhandledEvents = $null
    heartRateDiagnostics = $null
    handledSosEvents = @()
    notes = @()
}

$report.health = Invoke-ApiJson "$base/health"
$report.mqttStatus = Invoke-ApiJson "$base/api/v1/data-reception/mqtt/status"
$report.baselineStatus = Invoke-ApiJson "$base/api/v1/mongo-upstream/latest?device_id=$encodedDeviceId&data_type=status_update"
$report.baselineSos = Invoke-ApiJson "$base/api/v1/mongo-upstream/latest?device_id=$encodedDeviceId&data_type=sos"
$report.mysqlDeviceId = $report.baselineStatus.mysql_device_id
$baselineUnhandledResponse = Invoke-ApiJson "$base/api/v1/events/?event_status=unhandled&limit=50"
$report.baselineUnhandledEvents = Select-TargetEvents -Events $baselineUnhandledResponse -MysqlDeviceId $report.mysqlDeviceId
$baselineEventIds = Get-EventIds $report.baselineUnhandledEvents
$baselineSosReceivedAt = $report.baselineSos.server_received_at

$serial = $null
try {
    $serial = Open-WatchSerial -Name $SerialPort -Baud $BaudRate
    Start-Sleep -Milliseconds 1000
    $null = Read-SerialChunk -Port $serial

    if (-not [string]::IsNullOrWhiteSpace($HeartRateLedBrightness)) {
        $serial.WriteLine("HRLED $HeartRateLedBrightness")
        $report.serialOutput += Read-SerialForDuration -Port $serial -DurationSeconds 3
        $report.notes += "Set MAX30102 LED brightness via HRLED $HeartRateLedBrightness."
    }

    foreach ($command in @("SOSSTATUS", "HRDEBUG")) {
        $serial.WriteLine($command)
        $report.serialOutput += Read-SerialForDuration -Port $serial -DurationSeconds 2
    }

    if ($RunHeartRateSensorCheck) {
        $serial.WriteLine("HRSENSOR")
        $report.serialOutput += Read-SerialForDuration -Port $serial -DurationSeconds 3
        $report.notes += "Ran HRSENSOR MAX30102 identity and die-temperature check."
    }

    if ($RunNavMenuConfirm -or $RunNavMenuAutoConfirm) {
        Write-Host "Running NAVPICK/NAVNEXT idle auto-confirm smoke test..."
        $serial.WriteLine("NAVPICK")
        $report.serialOutput += Read-SerialForDuration -Port $serial -DurationSeconds 1
        $serial.WriteLine("NAVNEXT")
        $report.serialOutput += Read-SerialForDuration -Port $serial -DurationSeconds 1
        $report.serialOutput += Read-SerialForDuration -Port $serial -DurationSeconds 7
        $report.notes += "Ran NAVPICK/NAVNEXT idle auto-confirm menu smoke test."
    }

    if ($WaitForPhysicalSOS) {
        $report.notes += "Waiting for physical SOS/BOOT long press. Current firmware requires holding SOS/BOOT for 3 seconds."
        Write-Host "Waiting up to $Seconds seconds for physical SOS/BOOT long press on $DeviceId..."
    }

    if ($WaitForValidHeartRate) {
        $report.notes += "Waiting for latest status payload with heart_rate.valid=true and bpm>0."
        Write-Host "Waiting up to $Seconds seconds for valid heart-rate payload on $DeviceId..."
    }

    if ($WaitForValidSpO2) {
        $report.notes += "Waiting for latest status payload with spo2.valid=true and percentage in range."
        Write-Host "Waiting up to $Seconds seconds for valid SpO2 payload on $DeviceId..."
    }

    while (
        (Get-Date) -lt $deadline -and
        (($WaitForPhysicalSOS -and -not $report.physicalSosObserved) -or
         ($WaitForValidHeartRate -and -not $report.validHeartRateObserved) -or
         ($WaitForValidSpO2 -and -not $report.validSpO2Observed))
    ) {
        if ($WaitForPhysicalSOS -and -not $report.physicalSosObserved) {
            $latestSos = Invoke-ApiJson "$base/api/v1/mongo-upstream/latest?device_id=$encodedDeviceId&data_type=sos"
            $events = Invoke-ApiJson "$base/api/v1/events/?event_status=unhandled&limit=50"
            $newSosEvents = @((Get-CollectionItems $events) | Where-Object {
                $_.event_type -eq "sos" -and
                (-not $report.mysqlDeviceId -or $_.trigger_device_id -eq $report.mysqlDeviceId) -and
                $_.event_id -notin $baselineEventIds
            })
            $newSosPayload = $latestSos.sos -and
                $latestSos.sos.active -eq $true -and
                $latestSos.server_received_at -ne $baselineSosReceivedAt -and
                @("Button", "ButtonLong") -contains [string]$latestSos.sos.trigger_method

            if ($newSosEvents.Count -gt 0 -or $newSosPayload) {
                $report.physicalSosObserved = $true
                $report.notes += "Physical SOS observed via backend payload or new unhandled event."
            }
        }

        if ($WaitForValidHeartRate -and -not $report.validHeartRateObserved) {
            $latestStatus = Invoke-ApiJson "$base/api/v1/mongo-upstream/latest?device_id=$encodedDeviceId&data_type=status_update"
            $hr = $latestStatus.sensors.heart_rate
            if ($hr -and $hr.valid -eq $true -and [int]$hr.bpm -gt 0) {
                $report.validHeartRateObserved = $true
                $report.notes += "Valid live heart rate observed: bpm=$($hr.bpm)."
            }
        }

        if ($WaitForValidSpO2 -and -not $report.validSpO2Observed) {
            $latestStatus = Invoke-ApiJson "$base/api/v1/mongo-upstream/latest?device_id=$encodedDeviceId&data_type=status_update"
            $spo2 = $latestStatus.sensors.spo2
            if ($spo2 -and $spo2.valid -eq $true -and [int]$spo2.percentage -ge 70 -and [int]$spo2.percentage -le 100) {
                $report.validSpO2Observed = $true
                $report.notes += "Valid live SpO2 observed: percentage=$($spo2.percentage)."
            }
        }

        if ((-not $WaitForPhysicalSOS -or $report.physicalSosObserved) -and
            (-not $WaitForValidHeartRate -or $report.validHeartRateObserved) -and
            (-not $WaitForValidSpO2 -or $report.validSpO2Observed)) {
            break
        }

        Start-Sleep -Seconds 2
    }

    $report.serialOutput += Read-SerialChunk -Port $serial

    if ($RunHeartRateCalibration -or ($WaitForValidHeartRate -and -not $report.validHeartRateObserved)) {
        $report.runHeartRateCalibration = $true
        $serial.WriteLine("HRCAL")
        $report.serialOutput += Read-SerialForDuration -Port $serial -DurationSeconds 16
        $report.notes += "Ran HRCAL raw MAX30102 sampling."
    }

    if ($RunHeartRateSweep) {
        $windowMs = [Math]::Max(1000, [Math]::Min(15000, $HeartRateSweepWindowSeconds * 1000))
        $readSeconds = [Math]::Ceiling(($windowMs * 4 / 1000) + 12)
        $serial.WriteLine("HRSWEEP $windowMs")
        $report.serialOutput += Read-SerialForDuration -Port $serial -DurationSeconds $readSeconds
        $report.notes += "Ran HRSWEEP MAX30102 LED sweep with ${windowMs}ms windows."
    }

    if ($AutoClearSOS) {
        $serial.WriteLine("SOSOFF")
        Start-Sleep -Seconds 3
        $report.serialOutput += Read-SerialChunk -Port $serial
        $report.notes += "Sent SOSOFF because AutoClearSOS was enabled."
    }
} catch {
    $report.notes += "Serial check failed: $($_.Exception.Message)"
} finally {
    if ($serial -and $serial.IsOpen) {
        $serial.Close()
        $serial.Dispose()
    }
}

if ($AutoHandleSosEvents) {
    $eventsToHandle = @((Get-CollectionItems (Invoke-ApiJson "$base/api/v1/events/?event_status=unhandled&limit=50")) | Where-Object {
        $_.event_type -eq "sos" -and
        $_.event_id -notin $baselineEventIds -and
        (-not $report.mysqlDeviceId -or "$($_.trigger_device_id)" -eq "$($report.mysqlDeviceId)")
    })
    foreach ($event in $eventsToHandle) {
        $remark = [System.Uri]::EscapeDataString("Physical SOS verification cleared")
        $handled = Invoke-ApiJson "$base/api/v1/events/$($event.event_id)/handle?event_status=false_alarm&remark=$remark"
        $report.handledSosEvents += $handled
    }
}

$report.finalStatus = Invoke-ApiJson "$base/api/v1/mongo-upstream/latest?device_id=$encodedDeviceId&data_type=status_update"
$report.finalSos = Invoke-ApiJson "$base/api/v1/mongo-upstream/latest?device_id=$encodedDeviceId&data_type=sos"
$report.finalUnhandledEvents = Select-TargetEvents `
    -Events (Invoke-ApiJson "$base/api/v1/events/?event_status=unhandled&limit=50") `
    -MysqlDeviceId $report.mysqlDeviceId
$report.heartRateDiagnostics = Get-HeartRateDiagnostics `
    -SerialOutput $report.serialOutput `
    -FinalStatus $report.finalStatus `
    -ValidHeartRateObserved ([bool]$report.validHeartRateObserved) `
    -ValidSpO2Observed ([bool]$report.validSpO2Observed)

$reportJson = [pscustomobject]$report | ConvertTo-Json -Depth 12
$statusPath = Join-Path $logRoot "flycare-watch-verification.json"
$timestampedPath = Join-Path $logRoot ("flycare-watch-verification-{0}.json" -f $startedAt.ToString("yyyyMMdd-HHmmss"))
$reportJson | Set-Content -Path $statusPath -Encoding UTF8
$reportJson | Set-Content -Path $timestampedPath -Encoding UTF8
$reportJson
Write-Host "Verification written to $statusPath"
Write-Host "Timestamped verification written to $timestampedPath"

if (($WaitForPhysicalSOS -and -not $report.physicalSosObserved) -or
    ($WaitForValidHeartRate -and -not $report.validHeartRateObserved) -or
    ($WaitForValidSpO2 -and -not $report.validSpO2Observed)) {
    exit 2
}
