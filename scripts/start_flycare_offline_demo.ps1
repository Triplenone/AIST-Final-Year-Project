param(
    [string]$BrokerHost = "192.168.1.232",
    [int]$BrokerPort = 1883,
    [string]$BaseUrl = "http://127.0.0.1:8001",
    [string]$FrontendUrl = "http://192.168.1.232:5173/flycare",
    [string]$AdminUrl = "http://192.168.1.232:5173/admin",
    [int]$RecorderMinutes = 20,
    [int]$TimeRepeatSeconds = 10,
    [switch]$SkipRecorder,
    [switch]$SkipTimeBroadcaster,
    [switch]$OpenBrowser,
    [switch]$ElevateStack,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Join-CommandLine {
    param([string[]]$Arguments)

    return ($Arguments | ForEach-Object {
        if ($_ -match '[\s"]') {
            '"' + ($_ -replace '"', '\"') + '"'
        } else {
            $_
        }
    }) -join " "
}

function Start-FlyCarePowerShell {
    param(
        [string]$Title,
        [string]$ScriptPath,
        [string[]]$ScriptArguments,
        [System.Diagnostics.ProcessWindowStyle]$WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Normal
    )

    $args = @(
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-NoExit",
        "-File",
        $ScriptPath
    ) + $ScriptArguments

    if ($DryRun) {
        Write-Host "[DRYRUN] $Title`: powershell $(Join-CommandLine $args)"
        return $null
    }

    return Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList $args `
        -WorkingDirectory $repoRoot `
        -WindowStyle $WindowStyle `
        -PassThru
}

if ($RecorderMinutes -lt 0) {
    throw "RecorderMinutes must be >= 0"
}
if ($TimeRepeatSeconds -lt 1) {
    throw "TimeRepeatSeconds must be >= 1"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$launchLog = Join-Path $repoRoot "logs\flycare-offline-demo-launcher-$timestamp.json"
New-Item -ItemType Directory -Force -Path (Join-Path $repoRoot "logs") | Out-Null

$stackScript = Join-Path $repoRoot "scripts\start_flycare_local_stack.ps1"
$timeScript = Join-Path $repoRoot "scripts\publish_flycare_time.ps1"
$recorderScript = Join-Path $repoRoot "scripts\record_flycare_offline_demo.ps1"

$stackArgs = @(
    "-NoPause",
    "-RestartMqtt",
    "-RestartApps"
)
if ($ElevateStack) {
    $stackArgs = @("-Elevate") + $stackArgs
}

Write-Host "FlyCare offline demo launcher"
Write-Host "Repo: $repoRoot"
Write-Host "Broker: $BrokerHost`:$BrokerPort"
Write-Host "Backend: $BaseUrl"
Write-Host "Frontend: $FrontendUrl"
Write-Host "Admin: $AdminUrl"
Write-Host ""

if ($DryRun) {
    Write-Host "[DRYRUN] stack: powershell $(Join-CommandLine (@('-NoProfile','-ExecutionPolicy','Bypass','-File',$stackScript) + $stackArgs))"
} else {
    Write-Host "Starting local stack..."
    & powershell -NoProfile -ExecutionPolicy Bypass -File $stackScript @stackArgs
}

$timeProcess = $null
if (-not $SkipTimeBroadcaster) {
    $timeArgs = @(
        "-BrokerHost", $BrokerHost,
        "-Port", [string]$BrokerPort,
        "-RepeatSeconds", [string]$TimeRepeatSeconds,
        "-MaxPublishes", "0"
    )
    $timeProcess = Start-FlyCarePowerShell `
        -Title "time broadcaster" `
        -ScriptPath $timeScript `
        -ScriptArguments $timeArgs `
        -WindowStyle ([System.Diagnostics.ProcessWindowStyle]::Minimized)
}

$recorderProcess = $null
if (-not $SkipRecorder) {
    $recorderArgs = @(
        "-Minutes", [string]$RecorderMinutes,
        "-BrokerHost", $BrokerHost,
        "-BrokerPort", [string]$BrokerPort,
        "-BaseUrl", $BaseUrl
    )
    $recorderProcess = Start-FlyCarePowerShell `
        -Title "offline recorder" `
        -ScriptPath $recorderScript `
        -ScriptArguments $recorderArgs `
        -WindowStyle ([System.Diagnostics.ProcessWindowStyle]::Normal)
}

if ($OpenBrowser) {
    if ($DryRun) {
        Write-Host "[DRYRUN] open browser: $FrontendUrl"
        Write-Host "[DRYRUN] open browser: $AdminUrl"
    } else {
        Start-Process $FrontendUrl | Out-Null
        Start-Process $AdminUrl | Out-Null
    }
}

$result = [ordered]@{
    started_at = (Get-Date).ToUniversalTime().ToString("o")
    repo = [string]$repoRoot
    broker = "$BrokerHost`:$BrokerPort"
    base_url = $BaseUrl
    frontend_url = $FrontendUrl
    admin_url = $AdminUrl
    dry_run = [bool]$DryRun
    stack_args = $stackArgs
    time_broadcaster = [ordered]@{
        skipped = [bool]$SkipTimeBroadcaster
        repeat_seconds = $TimeRepeatSeconds
        pid = $(if ($timeProcess) { $timeProcess.Id } else { $null })
    }
    recorder = [ordered]@{
        skipped = [bool]$SkipRecorder
        minutes = $RecorderMinutes
        pid = $(if ($recorderProcess) { $recorderProcess.Id } else { $null })
    }
}

$result | ConvertTo-Json -Depth 20 | Out-File -FilePath $launchLog -Encoding utf8

Write-Host ""
Write-Host "FlyCare offline demo launcher done."
Write-Host "Launcher log: $launchLog"
if ($timeProcess) {
    Write-Host "Time broadcaster PID: $($timeProcess.Id)"
}
if ($recorderProcess) {
    Write-Host "Recorder PID: $($recorderProcess.Id)"
}
Write-Host "Frontend: $FrontendUrl"
Write-Host "Admin: $AdminUrl"
Write-Host "Backend check: $BaseUrl/api/v1/data-reception/mqtt/status"
