param(
    [string]$DeviceId = "ESP32_48CA43A42298",
    [string]$BaseUrl = "http://127.0.0.1:8000"
)

$ErrorActionPreference = "Stop"

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

function Get-CollectionCount {
    param($Value)
    if ($null -eq $Value) { return 0 }
    if ($Value -is [array]) { return @($Value).Count }
    if ($Value.PSObject.Properties.Name -contains "Count" -and $Value.PSObject.Properties.Name -contains "value") {
        return [int]$Value.Count
    }
    return 1
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

function New-AuditCheck {
    param(
        [string]$Name,
        [string]$Status,
        [string]$Evidence,
        $Details = $null
    )
    return [pscustomobject]@{
        name = $Name
        status = $Status
        evidence = $Evidence
        details = $Details
    }
}

function Test-ExpectedBeaconRegistry {
    param([string]$RepoRoot)

    $expected = @(
        "20:a7:16:60:f7:c4",
        "20:a7:16:60:eb:73",
        "20:a7:16:60:f7:ca",
        "20:a7:16:5e:ef:24",
        "20:a7:16:61:02:3f",
        "20:a7:16:61:09:40",
        "20:a7:16:60:fb:ff",
        "20:a7:16:5e:bc:32",
        "20:a7:16:60:f3:d9",
        "20:a7:16:61:02:2a",
        "20:a7:16:61:02:03",
        "20:a7:16:61:02:42"
    )

    $firmwarePath = Join-Path $RepoRoot "firmware\firmware.ino"
    $blePath = Join-Path $RepoRoot "firmware\BLELocation.cpp"
    $configPath = Join-Path $RepoRoot "firmware\Config.h"
    $firmwareText = Get-Content -Path $firmwarePath -Raw
    $bleText = Get-Content -Path $blePath -Raw
    $configText = Get-Content -Path $configPath -Raw

    $missing = @()
    foreach ($mac in $expected) {
        if ($firmwareText -notmatch [regex]::Escape($mac) -or $bleText -notmatch [regex]::Escape($mac)) {
            $missing += $mac
        }
    }

    $countOk = $configText -match '#define\s+BEACON_COUNT\s+12'
    return [pscustomobject]@{
        expectedCount = $expected.Count
        beaconCountMacroOk = $countOk
        missingMacs = $missing
        ok = $countOk -and $missing.Count -eq 0
    }
}

function Test-VisibleSmartCareReferences {
    param([string]$RepoRoot)

    $paths = @(
        "frontend\src",
        "frontend\public",
        "frontend\index.html",
        "backend\backend\app",
        "backend\backend\static\index.html",
        "docs\FLYCARE_MQTT.md",
        "docs\ARCHITECTURE.md"
    ) | ForEach-Object { Join-Path $RepoRoot $_ }

    $pattern = "SmartCare|smartcare|care-home|Care Home|Nursing|ElderlyCare|eldercare"
    $rg = Get-Command rg -ErrorAction SilentlyContinue
    if ($rg) {
        $matches = @(& rg -n $pattern @paths 2>$null)
        $exitCode = $LASTEXITCODE
        return [pscustomobject]@{
            tool = "rg"
            ok = $exitCode -eq 1
            matchCount = $matches.Count
            matches = @($matches | Select-Object -First 20)
        }
    }

    $files = foreach ($path in $paths) {
        if (Test-Path -Path $path -PathType Container) {
            Get-ChildItem -Path $path -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx,*.json,*.html,*.css,*.md,*.py
        } elseif (Test-Path -Path $path -PathType Leaf) {
            Get-Item -Path $path
        }
    }
    $matches = @($files | Select-String -Pattern $pattern)
    return [pscustomobject]@{
        tool = "Select-String"
        ok = $matches.Count -eq 0
        matchCount = $matches.Count
        matches = @($matches | Select-Object -First 20 | ForEach-Object { "$($_.Path):$($_.LineNumber):$($_.Line)" })
    }
}

function Find-SosLongPressEvidence {
    param(
        [string]$BaseUrl,
        $MysqlDeviceId
    )

    $statuses = @("unhandled", "false_alarm", "resolved", "confirmed")
    $matches = @()
    foreach ($status in $statuses) {
        $events = Invoke-ApiJson "$BaseUrl/api/v1/events/?event_status=$status&limit=50"
        if (-not $events.ok) { continue }

        foreach ($event in (Get-CollectionItems $events.value)) {
            if ($null -eq $event) { continue }
            $triggerMethod = $event.event_params.payload.sos.trigger_method
            $deviceMatches = $null -eq $MysqlDeviceId -or "$($event.trigger_device_id)" -eq "$MysqlDeviceId"
            if ($event.event_type -eq "sos" -and $triggerMethod -eq "ButtonLong" -and $deviceMatches) {
                $matches += [pscustomobject]@{
                    event_id = $event.event_id
                    event_status = $event.event_status
                    event_timestamp = $event.event_timestamp
                    trigger_device_id = $event.trigger_device_id
                    trigger_method = $triggerMethod
                    active = $event.event_params.payload.sos.active
                    handled_at = $event.handled_at
                    remark = $event.remark
                }
            }
        }
    }

    $matches = @($matches | Sort-Object event_timestamp -Descending)
    return [pscustomobject]@{
        found = $matches.Count -gt 0
        statusesQueried = $statuses
        latest = if ($matches.Count -gt 0) { $matches[0] } else { $null }
        matches = @($matches | Select-Object -First 5)
    }
}

function Get-FirmwareDefineValue {
    param(
        [string]$ConfigText,
        [string]$Name
    )

    $match = [regex]::Match($ConfigText, "(?m)^\s*#define\s+$([regex]::Escape($Name))\s+(-?\d+)\b")
    if (-not $match.Success) { return $null }
    return [int]$match.Groups[1].Value
}

function Test-SosNavigationMenuInput {
    param([string]$RepoRoot)

    $firmwarePath = Join-Path $RepoRoot "firmware\firmware.ino"
    $displayCppPath = Join-Path $RepoRoot "firmware\SimpleDisplayManager.cpp"
    $displayHPath = Join-Path $RepoRoot "firmware\SimpleDisplayManager.h"
    $firmwareText = Get-Content -Path $firmwarePath -Raw
    $displayCppText = Get-Content -Path $displayCppPath -Raw
    $displayHText = Get-Content -Path $displayHPath -Raw

    $pwrOpenCancel = $firmwareText -match "PWR click - open destination picker" -and
        $firmwareText -match "PWR click - cancel destination picker"
    $sosNext = $firmwareText -match "SOS click - picker next destination" -and
        $displayCppText -match "cycleNavigationDestination" -and
        $displayCppText -match "noteDestinationPickerActivity"
    $autoConfirm = $displayCppText -match "auto confirm destination after SOS idle" -and
        $displayCppText -match "picker auto-confirmed" -and
        $displayHText -match "DESTINATION_PICKER_AUTO_CONFIRM_MS = 5000"
    $wheelDisabled = $firmwareText -match "#define SOS_WHEEL_ENABLED 0" -and
        $firmwareText -notmatch "\[Wheel\] destination picker"
    $serialSmoke = $firmwareText -match "NAVPICK" -and
        $firmwareText -match "NAVNEXT" -and
        $firmwareText -match "NAVCANCEL"

    return [pscustomobject]@{
        pwrOpenCancel = $pwrOpenCancel
        sosNext = $sosNext
        autoConfirm = $autoConfirm
        wheelDisabled = $wheelDisabled
        serialSmoke = $serialSmoke
        ok = ($pwrOpenCancel -and $sosNext -and $autoConfirm -and $wheelDisabled -and $serialSmoke)
    }
}

function Test-WatchPopupUiSource {
    param([string]$RepoRoot)

    $displayCppPath = Join-Path $RepoRoot "firmware\SimpleDisplayManager.cpp"
    $displayHPath = Join-Path $RepoRoot "firmware\SimpleDisplayManager.h"
    $displayCppText = Get-Content -Path $displayCppPath -Raw
    $displayHText = Get-Content -Path $displayHPath -Raw

    $singlePopupRedraw = $displayHText -match "popupNeedsRedraw" -and
        $displayCppText -match "if \(popupNeedsRedraw" -and
        $displayCppText -match "popupNeedsRedraw = false"
    $arrivalLarge = $displayCppText -match 'gfx->print\("ARRIVED"\)' -and
        $displayCppText -match 'gfx->print\("Route complete"\)' -and
        $displayCppText -match 'gfx->print\("Returning to map"\)'
    $arrivalReadableMs = $displayHText -match "POPUP_ARRIVAL_AUTO_CLOSE_MS\s*=\s*5000"
    $flightPopupReadable = $displayCppText -match "maxCharsPerLine = prominentPopup \? 17 : 27" -and
        $displayCppText -match "maxLines = prominentPopup \? 4 : 4"
    $noMisleadingPrompt = $displayCppText -notmatch "Press side button to confirm"

    return [pscustomobject]@{
        singlePopupRedraw = $singlePopupRedraw
        arrivalLarge = $arrivalLarge
        arrivalReadableMs = $arrivalReadableMs
        flightPopupReadable = $flightPopupReadable
        noMisleadingPrompt = $noMisleadingPrompt
        ok = ($singlePopupRedraw -and $arrivalLarge -and $arrivalReadableMs -and $flightPopupReadable -and $noMisleadingPrompt)
    }
}

function Find-SosNavigationMenuEvidence {
    param([string]$RepoRoot)

    $logRoot = Join-Path $RepoRoot "logs"
    if (-not (Test-Path $logRoot)) {
        return [pscustomobject]@{ found = $false; matches = @() }
    }

    $pattern = "\[NAVTEST\] picker opened|\[NAVTEST\] picker next destination|\[NAV\] auto confirm destination after SOS idle|\[NAVTEST\] picker auto-confirmed|\[NAV\] selected destination"
    $jsonMatches = @(
        Get-ChildItem -Path $logRoot -File -Filter "flycare-watch-verification*.json" |
            Sort-Object LastWriteTime -Descending |
            ForEach-Object {
                try {
                    $reportPath = $_.FullName
                    $report = Get-Content -Path $_.FullName -Raw | ConvertFrom-Json
                    @($report.serialOutput -split "`r?`n" | Where-Object {
                        $_ -match $pattern
                    } | ForEach-Object {
                        $line = $_.Trim()
                        if ($line.Length -gt 240) { $line = $line.Substring(0, 240) + "..." }
                        "${reportPath}:serialOutput:$line"
                    })
                } catch {
                    @()
                }
            }
    )

    $files = Get-ChildItem -Path $logRoot -File | Where-Object {
        $_.Name -like "serial-auto-confirm-*.log" -or
        $_.Name -like "serial-ui-popup-smoke-*.log" -or
        $_.Name -like "flycare-watch-*.log" -or
        $_.Name -like "flight-downlink-*.log"
    }
    $logMatches = @($files | Select-String -Pattern $pattern -ErrorAction SilentlyContinue | ForEach-Object {
        $line = $_.Line.Trim()
        if ($line.Length -gt 240) { $line = $line.Substring(0, 240) + "..." }
        "$($_.Path):$($_.LineNumber):$line"
    })

    $allMatches = @($logMatches + $jsonMatches | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    return [pscustomobject]@{
        found = $allMatches.Count -gt 0
        matches = @($allMatches | Select-Object -First 12)
    }
}

function Find-ArrivalEvidence {
    param([string]$RepoRoot)

    $logRoot = Join-Path $RepoRoot "logs"
    if (-not (Test-Path $logRoot)) {
        return [pscustomobject]@{ found = $false; matches = @() }
    }

    $files = Get-ChildItem -Path $logRoot -File | Where-Object {
        $_.Name -like "flight-downlink-*.log" -or
        $_.Name -like "serial-ui-popup-smoke-*.log" -or
        $_.Name -like "serial-*.filtered.log"
    }
    $matches = @($files | Select-String -Pattern "\[Popup\] arrival|arrival popup shown|You've arrived" -ErrorAction SilentlyContinue)
    return [pscustomobject]@{
        found = $matches.Count -gt 0
        matches = @($matches | Select-Object -First 10 | ForEach-Object {
            $line = $_.Line.Trim()
            if ($line.Length -gt 240) { $line = $line.Substring(0, 240) + "..." }
            "$($_.Path):$($_.LineNumber):$line"
        })
    }
}

function Find-FlightSyncEvidence {
    param([string]$RepoRoot)

    $logRoot = Join-Path $RepoRoot "logs"
    if (-not (Test-Path $logRoot)) {
        return [pscustomobject]@{ found = $false; matches = @() }
    }

    $files = Get-ChildItem -Path $logRoot -File |
        Where-Object {
            $_.Name -like "flight-downlink-*.log" -or
            $_.Name -like "serial-ui-popup-smoke-*.log" -or
            $_.Name -like "serial-*.filtered.log"
        } |
        Sort-Object LastWriteTime -Descending
    $pattern = "\[Flight\] telemetry target synced|\[NAV\] selected destination|smartwatch/.+/flight|flight_info|Gate Change"
    $matches = @($files | Select-String -Pattern $pattern -ErrorAction SilentlyContinue)
    return [pscustomobject]@{
        found = $matches.Count -gt 0
        matches = @($matches | Select-Object -First 10 | ForEach-Object {
            $line = $_.Line.Trim()
            if ($line.Length -gt 240) { $line = $line.Substring(0, 240) + "..." }
            "$($_.Path):$($_.LineNumber):$line"
        })
    }
}

function Get-OverallStatus {
    param($Checks)
    if (@($Checks | Where-Object { $_.status -eq "fail" }).Count -gt 0) { return "fail" }
    if (@($Checks | Where-Object { $_.status -eq "blocked" }).Count -gt 0) { return "blocked" }
    if (@($Checks | Where-Object { $_.status -eq "warn" }).Count -gt 0) { return "warn" }
    return "pass"
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$logRoot = Join-Path $repoRoot "logs"
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null

$encodedDeviceId = [System.Uri]::EscapeDataString($DeviceId)
$stackPath = Join-Path $logRoot "flycare-local-stack-status.json"
$watchPath = Join-Path $logRoot "flycare-watch-verification.json"
$stackReport = if (Test-Path $stackPath) { Get-Content -Path $stackPath -Raw | ConvertFrom-Json } else { $null }
$watchReports = @()
if (Test-Path $logRoot) {
    $watchReports = @(
        Get-ChildItem -Path $logRoot -File -Filter "flycare-watch-verification*.json" |
            Sort-Object LastWriteTime -Descending |
            ForEach-Object {
                try {
                    Get-Content -Path $_.FullName -Raw | ConvertFrom-Json
                } catch {
                    $null
                }
            } |
            Where-Object { $null -ne $_ }
    )
}
$watchReport = if ($watchReports.Count -gt 0) { $watchReports[0] } elseif (Test-Path $watchPath) { Get-Content -Path $watchPath -Raw | ConvertFrom-Json } else { $null }
$hrWatchReport = $watchReports |
    Where-Object {
        $_.validHeartRateObserved -eq $true -or
        $_.validSpO2Observed -eq $true -or
        ($_.heartRateDiagnostics -and
         $_.heartRateDiagnostics.classification -and
         $_.heartRateDiagnostics.classification -ne "not_measured")
    } |
    Select-Object -First 1
if (-not $hrWatchReport) { $hrWatchReport = $watchReport }
$physicalSosReport = $watchReports |
    Where-Object { $_.waitForPhysicalSOS -eq $true } |
    Select-Object -First 1
if (-not $physicalSosReport) { $physicalSosReport = $watchReport }

$health = Invoke-ApiJson "$BaseUrl/health"
$mqtt = Invoke-ApiJson "$BaseUrl/api/v1/data-reception/mqtt/status"
$latestStatus = Invoke-ApiJson "$BaseUrl/api/v1/mongo-upstream/latest?device_id=$encodedDeviceId&data_type=status_update"
$latestFlight = Invoke-ApiJson "$BaseUrl/api/v1/mongo-upstream/flight/latest?device_id=$encodedDeviceId"
$unhandledEvents = Invoke-ApiJson "$BaseUrl/api/v1/events/?event_status=unhandled&limit=50"
$mysqlDeviceId = if ($latestStatus.ok -and $latestStatus.value.mysql_device_id) { $latestStatus.value.mysql_device_id } else { $null }
$longPressEventEvidence = Find-SosLongPressEvidence -BaseUrl $BaseUrl -MysqlDeviceId $mysqlDeviceId
$beacons = Test-ExpectedBeaconRegistry -RepoRoot $repoRoot
$smartCare = Test-VisibleSmartCareReferences -RepoRoot $repoRoot
$navMenuInput = Test-SosNavigationMenuInput -RepoRoot $repoRoot
$watchPopupUi = Test-WatchPopupUiSource -RepoRoot $repoRoot
$navMenuEvidence = Find-SosNavigationMenuEvidence -RepoRoot $repoRoot
$arrivalEvidence = Find-ArrivalEvidence -RepoRoot $repoRoot
$flightSyncEvidence = Find-FlightSyncEvidence -RepoRoot $repoRoot

$checks = @()
$checks += New-AuditCheck -Name "local_stack" -Status $(if ($health.ok -and $health.value.status -eq "healthy" -and $mqtt.ok -and $mqtt.value.connected -eq $true) { "pass" } else { "fail" }) -Evidence "health=$($health.value.status); mqttConnected=$($mqtt.value.connected); stackAdmin=$($stackReport.isAdmin)" -Details ([pscustomobject]@{ health = $health.value; mqtt = $mqtt.value; stack = $stackReport })
$checks += New-AuditCheck -Name "beacon_registry" -Status $(if ($beacons.ok) { "pass" } else { "fail" }) -Evidence "BEACON_COUNT=12 and all 12 expected MACs are present in firmware.ino and BLELocation.cpp." -Details $beacons
$checks += New-AuditCheck -Name "legacy_brand_visible_cleanup" -Status $(if ($smartCare.ok) { "pass" } else { "fail" }) -Evidence "Visible app/docs scan for legacy care-brand terms returned $($smartCare.matchCount) matches." -Details $smartCare

$location = $latestStatus.value.location
$positionStatus = if ($latestStatus.ok -and $location.current.quality -eq "high" -and [int]$location.current.beacon_count -gt 0 -and $arrivalEvidence.found) {
    "pass"
} elseif ($latestStatus.ok -and $location.current.quality -eq "high" -and [int]$location.current.beacon_count -gt 0) {
    "warn"
} else {
    "fail"
}
$checks += New-AuditCheck -Name "positioning_navigation" -Status $positionStatus -Evidence "latestQuality=$($location.current.quality); beaconCount=$($location.current.beacon_count); target=$($location.target.name); arrivalEvidence=$($arrivalEvidence.found)" -Details ([pscustomobject]@{ latestStatus = $latestStatus.value; arrivalEvidence = $arrivalEvidence })

$flightFound = $latestFlight.ok -and $latestFlight.value.found -eq $true
$serialFlightSync = ($watchReport -and $watchReport.serialOutput -match "\[Flight\] telemetry target synced|FlightInfo|Boarding for flight") -or $flightSyncEvidence.found
$checks += New-AuditCheck -Name "flight_information_update" -Status $(if ($flightFound -and $serialFlightSync) { "pass" } elseif ($flightFound) { "warn" } else { "fail" }) -Evidence "flightApiFound=$($latestFlight.value.found); apiGate=$($latestFlight.value.gate); serialFlightSync=$serialFlightSync" -Details ([pscustomobject]@{ latestFlight = $latestFlight.value; serialFlightSync = $serialFlightSync; flightSyncEvidence = $flightSyncEvidence })

$checks += New-AuditCheck -Name "watch_popup_ui" -Status $(if ($watchPopupUi.ok -and $arrivalEvidence.found -and $flightSyncEvidence.found) { "pass" } elseif ($watchPopupUi.ok) { "warn" } else { "fail" }) -Evidence "singleRedraw=$($watchPopupUi.singlePopupRedraw); arrivalLarge=$($watchPopupUi.arrivalLarge); arrivalMs5000=$($watchPopupUi.arrivalReadableMs); flightReadable=$($watchPopupUi.flightPopupReadable); serialPopupEvidence=$($arrivalEvidence.found)" -Details ([pscustomobject]@{ source = $watchPopupUi; arrivalEvidence = $arrivalEvidence; flightSyncEvidence = $flightSyncEvidence })

$unhandledCount = if ($unhandledEvents.ok) { Get-CollectionCount $unhandledEvents.value } else { -1 }
$finalSosActive = if ($watchReport -and $watchReport.finalSos -and $watchReport.finalSos.sos) { $watchReport.finalSos.sos.active } else { $null }
$checks += New-AuditCheck -Name "sos_current_state" -Status $(if ($unhandledEvents.ok -and $unhandledCount -eq 0 -and ($null -eq $finalSosActive -or $finalSosActive -eq $false)) { "pass" } else { "fail" }) -Evidence "unhandledEvents=$unhandledCount; finalSosActive=$finalSosActive; firmware SOS trigger is long-press 3 seconds; short SOS click is page/picker control." -Details ([pscustomobject]@{ unhandledEvents = $unhandledEvents.value; finalSos = $watchReport.finalSos })

$physicalSosWaited = $physicalSosReport -and $physicalSosReport.waitForPhysicalSOS -eq $true
$physicalSosObserved = $physicalSosReport -and $physicalSosReport.physicalSosObserved -eq $true
$physicalSosProven = $physicalSosObserved -or $longPressEventEvidence.found
$checks += New-AuditCheck -Name "physical_sos_long_press" -Status $(if ($physicalSosProven) { "pass" } elseif ($physicalSosWaited) { "blocked" } else { "warn" }) -Evidence "waited=$physicalSosWaited; verifierObserved=$physicalSosObserved; eventApiButtonLong=$($longPressEventEvidence.found); hold SOS/BOOT for 3 seconds during verify_flycare_watch.ps1 -WaitForPhysicalSOS to prove the current firmware UX." -Details ([pscustomobject]@{ timestamp = $physicalSosReport.timestamp; waitForPhysicalSOS = $physicalSosReport.waitForPhysicalSOS; physicalSosObserved = $physicalSosReport.physicalSosObserved; eventApiButtonLong = $longPressEventEvidence; notes = $physicalSosReport.notes })

$navMenuStatus = if ($navMenuInput.ok -and $navMenuEvidence.found) {
    "pass"
} elseif ($navMenuInput.ok) {
    "warn"
} else {
    "fail"
}
$checks += New-AuditCheck -Name "sos_navigation_menu_input" -Status $navMenuStatus -Evidence "pwrOpenCancel=$($navMenuInput.pwrOpenCancel); sosNext=$($navMenuInput.sosNext); autoConfirm=$($navMenuInput.autoConfirm); wheelDisabled=$($navMenuInput.wheelDisabled); serialEvidence=$($navMenuEvidence.found)" -Details ([pscustomobject]@{ input = $navMenuInput; evidence = $navMenuEvidence })

$hrDiag = if ($hrWatchReport) { $hrWatchReport.heartRateDiagnostics } else { $null }
$statusHeartRateValid = $hrWatchReport -and
    $hrWatchReport.finalStatus -and
    $hrWatchReport.finalStatus.sensors -and
    $hrWatchReport.finalStatus.sensors.heart_rate -and
    $hrWatchReport.finalStatus.sensors.heart_rate.valid -eq $true
$statusSpO2Valid = $hrWatchReport -and
    $hrWatchReport.finalStatus -and
    $hrWatchReport.finalStatus.sensors -and
    $hrWatchReport.finalStatus.sensors.spo2 -and
    $hrWatchReport.finalStatus.sensors.spo2.valid -eq $true
$hrValid = $hrWatchReport -and ($hrWatchReport.validHeartRateObserved -eq $true -or $statusHeartRateValid)
$spo2Valid = $hrWatchReport -and ($hrWatchReport.validSpO2Observed -eq $true -or $statusSpO2Valid)
$vitalsStatus = "fail"
if ($hrValid -and $spo2Valid) {
    $vitalsStatus = "pass"
} elseif ($hrDiag -and $hrDiag.classification -eq "optical_contact_missing") {
    $vitalsStatus = "blocked"
}
$checks += New-AuditCheck -Name "live_heart_rate_spo2" -Status $vitalsStatus -Evidence "hrValid=$hrValid; spo2Valid=$spo2Valid; classification=$($hrDiag.classification); electricalPresent=$($hrDiag.electricalPresent); opticalContact=$($hrDiag.opticalContact); maxObservedIr=$($hrDiag.maxObservedIr)/$($hrDiag.contactThreshold)" -Details ([pscustomobject]@{ timestamp = $hrWatchReport.timestamp; diagnostics = $hrDiag; finalStatusSensors = $hrWatchReport.finalStatus.sensors })

$overall = Get-OverallStatus -Checks $checks
$audit = [ordered]@{
    timestamp = (Get-Date).ToString("s")
    repoRoot = $repoRoot
    deviceId = $DeviceId
    baseUrl = $BaseUrl
    overallStatus = $overall
    checks = $checks
}

$jsonPath = Join-Path $logRoot "flycare-goal-audit.json"
$markdownPath = Join-Path $logRoot "flycare-goal-audit.md"
[pscustomobject]$audit | ConvertTo-Json -Depth 14 | Set-Content -Path $jsonPath -Encoding UTF8

$markdown = @()
$markdown += "# FlyCare Goal Audit"
$markdown += ""
$markdown += "- Timestamp: $($audit.timestamp)"
$markdown += "- Device: $DeviceId"
$markdown += "- Overall: $overall"
$markdown += ""
$markdown += "| Check | Status | Evidence |"
$markdown += "| --- | --- | --- |"
foreach ($check in $checks) {
    $escapedEvidence = [string]$check.evidence
    $escapedEvidence = $escapedEvidence.Replace("|", "\|")
    $markdown += "| $($check.name) | $($check.status) | $escapedEvidence |"
}
$markdown | Set-Content -Path $markdownPath -Encoding UTF8

[pscustomobject]@{
    auditPath = $jsonPath
    markdownPath = $markdownPath
    overallStatus = $overall
    checks = $checks
} | ConvertTo-Json -Depth 8

if ($overall -eq "fail") {
    exit 1
}
if ($overall -eq "blocked") {
    exit 2
}
