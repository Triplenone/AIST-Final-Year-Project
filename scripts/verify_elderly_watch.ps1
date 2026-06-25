param(
    [string]$DeviceId = "ESP32_0000E03948D4DB1C",
    [string]$SerialPort = "COM5",
    [int]$BaudRate = 115200,
    [int]$Seconds = 90,
    [string]$LogPath = "",
    [switch]$RunHeartRateSensorCheck,
    [switch]$SendReminderDownlink,
    [switch]$SendFallDownlink,
    [switch]$SendFallClearDownlink
)

$ErrorActionPreference = "Stop"

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

function Write-SerialCommand {
    param([System.IO.Ports.SerialPort]$Port, [string]$Command)

    $Port.WriteLine($Command)
    "[command] $Command" | Tee-Object -FilePath $LogPath -Append | Out-Host
}

function Write-Downlink {
    param(
        [System.IO.Ports.SerialPort]$Port,
        [string]$Topic,
        [object]$Payload
    )

    $json = $Payload | ConvertTo-Json -Depth 20 -Compress
    Write-SerialCommand -Port $Port -Command "FLYCARE_DOWNLINK $Topic $json"
}

if ($Seconds -lt 1) { throw "Seconds must be >= 1" }

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$logsRoot = Join-Path $repoRoot "logs"
New-Item -ItemType Directory -Force -Path $logsRoot | Out-Null
if ([string]::IsNullOrWhiteSpace($LogPath)) {
    $LogPath = Join-Path $logsRoot ("elderly-watch-serial-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
}
$summaryPath = [System.IO.Path]::ChangeExtension($LogPath, ".summary.json")

$serial = $null
$buffer = [System.Text.StringBuilder]::new()
try {
    "[$((Get-Date).ToString("s"))] elderly watch verify start port=$SerialPort baud=$BaudRate device=$DeviceId seconds=$Seconds" |
        Tee-Object -FilePath $LogPath -Append | Out-Host
    $serial = Open-WatchSerial -Name $SerialPort -Baud $BaudRate
    Start-Sleep -Milliseconds 1000
    $null = $serial.ReadExisting()

    Write-SerialCommand -Port $serial -Command "SOSSTATUS"
    Start-Sleep -Milliseconds 500
    Write-SerialCommand -Port $serial -Command "HRDEBUG"
    if ($RunHeartRateSensorCheck) {
        Start-Sleep -Milliseconds 500
        Write-SerialCommand -Port $serial -Command "HRSENSOR"
    }

    if ($SendReminderDownlink) {
        Start-Sleep -Milliseconds 500
        Write-Downlink -Port $serial -Topic "smartwatch/$DeviceId/reminder" -Payload ([ordered]@{
            command_type = "reminder"
            data_type = "reminder"
            command_id = "serial-reminder-$([guid]::NewGuid().ToString("N").Substring(0, 8))"
            issued_at = (Get-Date).ToUniversalTime().ToString("o")
            device_id = $DeviceId
            reminder = [ordered]@{
                type = "medication"
                medicine_name = "Metformin"
                dosage = "500 mg"
                scheduled_time = "08:00"
                priority = "normal"
                message = "Please take Metformin 500 mg at 08:00."
            }
            medicine_name = "Metformin"
            dosage = "500 mg"
            scheduled_time = "08:00"
            priority = "normal"
            message = "Please take Metformin 500 mg at 08:00."
        })
    }

    if ($SendFallDownlink) {
        Start-Sleep -Milliseconds 500
        Write-Downlink -Port $serial -Topic "smartwatch/$DeviceId/alert" -Payload ([ordered]@{
            command_type = "alert"
            data_type = "alert"
            command_id = "serial-fall-$([guid]::NewGuid().ToString("N").Substring(0, 8))"
            event_type = "fall"
            action = "activate"
            title = "Fall"
            message = "Fall alert"
            severity = "critical"
            issued_at = (Get-Date).ToUniversalTime().ToString("o")
        })
    }

    if ($SendFallClearDownlink) {
        Start-Sleep -Seconds 4
        Write-Downlink -Port $serial -Topic "smartwatch/$DeviceId/alert" -Payload ([ordered]@{
            command_type = "alert"
            data_type = "alert"
            command_id = "serial-fall-clear-$([guid]::NewGuid().ToString("N").Substring(0, 8))"
            event_type = "fall"
            action = "clear"
            title = "Fall"
            message = "Fall cleared"
            severity = "info"
            issued_at = (Get-Date).ToUniversalTime().ToString("o")
        })
    }

    $deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $chunk = $serial.ReadExisting()
            if ($chunk.Length -gt 0) {
                [void]$buffer.Append($chunk)
                $chunk | Out-File -FilePath $LogPath -Append -Encoding utf8
            }
        } catch {
            "[read-error] $($_.Exception.Message)" | Out-File -FilePath $LogPath -Append -Encoding utf8
        }
        Start-Sleep -Milliseconds 200
    }
}
finally {
    if ($serial -and $serial.IsOpen) { $serial.Close() }
}

$text = $buffer.ToString()
$summary = [ordered]@{
    finished_at = (Get-Date).ToUniversalTime().ToString("o")
    device_id = $DeviceId
    serial_port = $SerialPort
    seconds = $Seconds
    log = $LogPath
    counts = [ordered]@{
        hr_debug = ([regex]::Matches($text, "\[HR")).Count
        reminder = ([regex]::Matches($text, "\[Reminder\]")).Count
        alert_downlink = ([regex]::Matches($text, "\[AlertDownlink\]")).Count
        sos = ([regex]::Matches($text, "\[SOS\]|SOSSTATUS")).Count
        fall = ([regex]::Matches($text, "\[FALL\]|\[FallDetection\]|Fall")).Count
        uplink_status = ([regex]::Matches($text, "/status")).Count
        uplink_vitals = ([regex]::Matches($text, "/vitals")).Count
        uplink_sos = ([regex]::Matches($text, "/sos")).Count
        uplink_fall = ([regex]::Matches($text, "/fall")).Count
        crash = ([regex]::Matches($text, "Guru|panic|Backtrace|abort|stack overflow")).Count
    }
    sent = [ordered]@{
        reminder_downlink = [bool]$SendReminderDownlink
        fall_downlink = [bool]$SendFallDownlink
        fall_clear_downlink = [bool]$SendFallClearDownlink
    }
}

$summary | ConvertTo-Json -Depth 20 | Out-File -FilePath $summaryPath -Encoding utf8
$summary | ConvertTo-Json -Depth 20
Write-Host ""
Write-Host "Serial log: $LogPath"
Write-Host "Summary: $summaryPath"
if ($summary.counts.crash -gt 0) { exit 1 }
