param(
    [string]$BrokerHost = "192.168.1.232",
    [int]$Port = 1883,
    [string]$DeviceId = "",
    [string[]]$AliasDeviceId = @(),
    [string]$MosquittoPubPath = "C:\Program Files\Mosquitto\mosquitto_pub.exe",
    [switch]$Retain,
    [int]$RepeatSeconds = 0,
    [int]$MaxPublishes = 1
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $MosquittoPubPath)) {
    throw "mosquitto_pub not found: $MosquittoPubPath"
}

if ($RepeatSeconds -lt 0) {
    throw "RepeatSeconds must be >= 0"
}
if ($MaxPublishes -lt 0) {
    throw "MaxPublishes must be >= 0. Use 0 for continuous mode."
}
if ($RepeatSeconds -eq 0 -and $MaxPublishes -eq 0) {
    $MaxPublishes = 1
}

$singaporeTz = [System.TimeZoneInfo]::FindSystemTimeZoneById("Singapore Standard Time")
$defaultTargets = @(
    "ESP32_000048CA43A42298", # NG WAI LUN
    "ESP32_48CA43A42298",     # NG WAI LUN alias
    "ESP32_0000C8292A04A7AC", # WONG KA MING
    "ESP32_00005CFA7AD4DB1C", # WONG KA MING alias
    "ESP32_0000A022A443CA48", # HO CHI WAI
    "ESP32_00008C292A04A7AC", # MA KA WAI
    "ESP32_00009022A443CA48", # YIP MAN LING
    "ESP32_0000E03948D4DB1C", # LEE KA YAN
    "ESP32_1CDBD44839E0"      # LEE KA YAN alias
)

$explicitTargets = @($DeviceId) + @($AliasDeviceId | Where-Object { $_ -and $_.Trim().Length -gt 0 })
$explicitTargets = @($explicitTargets | Where-Object { $_ -and $_.Trim().Length -gt 0 })
$targets = if ($explicitTargets.Count -gt 0) { $explicitTargets } else { $defaultTargets }
$targets = $targets | Select-Object -Unique

function Publish-FlyCareTimeOnce {
    $nowUtc = [DateTimeOffset]::UtcNow
    $nowSingapore = [System.TimeZoneInfo]::ConvertTime($nowUtc, $singaporeTz)
    $epoch = $nowUtc.ToUnixTimeSeconds()

    $payloadObject = [ordered]@{
        command_type = "time_sync"
        source = "server_pc"
        timezone = "Asia/Singapore"
        epoch = $epoch
        iso_singapore = $nowSingapore.ToString("yyyy-MM-ddTHH:mm:sszzz")
    }
    $payload = $payloadObject | ConvertTo-Json -Compress

    $tempPayload = Join-Path $env:TEMP ("flycare-time-sync-{0}.json" -f ([Guid]::NewGuid().ToString("N")))
    try {
        [System.IO.File]::WriteAllText($tempPayload, $payload, [System.Text.UTF8Encoding]::new($false))

        foreach ($target in $targets) {
            $topic = "smartwatch/$target/time"
            $args = @("-h", $BrokerHost, "-p", [string]$Port, "-t", $topic, "-f", $tempPayload, "-q", "1")
            if ($Retain) {
                $args += "-r"
            }
            & $MosquittoPubPath @args
            if ($LASTEXITCODE -ne 0) {
                throw "mosquitto_pub failed for $topic with exit code $LASTEXITCODE"
            }
            Write-Host "Published Singapore time to $topic epoch=$epoch"
        }
    } finally {
        Remove-Item -LiteralPath $tempPayload -Force -ErrorAction SilentlyContinue
    }
}

$publishCount = 0
while ($true) {
    $publishCount += 1
    try {
        Publish-FlyCareTimeOnce
    } catch {
        if ($RepeatSeconds -le 0) {
            throw
        }
        Write-Warning ("Time publish attempt {0} failed: {1}" -f $publishCount, $_.Exception.Message)
    }

    if ($RepeatSeconds -le 0) {
        break
    }
    if ($MaxPublishes -gt 0 -and $publishCount -ge $MaxPublishes) {
        break
    }

    Start-Sleep -Seconds $RepeatSeconds
}
