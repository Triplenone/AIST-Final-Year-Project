param(
    [switch]$Elevate,
    [switch]$NoPause,
    [switch]$RestartApps,
    [switch]$RestartMqtt,
    [switch]$StartSerialBridge,
    [switch]$RestartSerialBridge,
    [string]$SerialPort = "COM5",
    [int]$BackendPort = 8001,
    [switch]$StartLegacyBackend8000
)

$ErrorActionPreference = "Stop"

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-PortListen {
    param([int]$Port)
    try {
        if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop) {
            return $true
        }
    } catch {
        $netstat = & netstat -ano 2>$null | Select-String -Pattern "[:.]$Port\s+.*LISTENING"
        return [bool]$netstat
    }
    return $false
}

function Get-PortStatus {
    param([int]$Port)

    try {
        $connections = @(Get-NetTCPConnection -LocalPort $Port -ErrorAction Stop)
        if ($connections.Count -gt 0) {
            return [pscustomobject]@{
                port = $Port
                listen = [bool]($connections | Where-Object State -eq "Listen")
                states = @($connections | ForEach-Object { $_.State.ToString() } | Select-Object -Unique)
                owningPids = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
            }
        }
    } catch {
        # Fall back below. Some local PowerShell environments fail the NetTCP cmdlets
        # when duplicate Path/PATH process variables are present.
    }

    $rows = @(& netstat -ano 2>$null | Select-String -Pattern "[:.]$Port\s" | ForEach-Object {
        $parts = ($_.Line.Trim() -split "\s+")
        if ($parts.Count -ge 5) {
            [pscustomobject]@{
                state = $parts[3]
                pid = [int]$parts[4]
            }
        }
    })

    return [pscustomobject]@{
        port = $Port
        listen = [bool]($rows | Where-Object state -eq "LISTENING")
        states = @($rows | ForEach-Object { $_.state } | Select-Object -Unique)
        owningPids = @($rows | ForEach-Object { $_.pid } | Select-Object -Unique)
    }
}

function Get-NetstatListenRows {
    param([int]$Port)

    return @(& netstat -ano 2>$null | Select-String -Pattern "[:.]$Port\s+.*LISTENING" | ForEach-Object {
        $parts = ($_.Line.Trim() -split "\s+")
        if ($parts.Count -ge 5) {
            $address = $parts[1]
            $localAddress = $address
            if ($address -match "^\[(.+)\]:(\d+)$") {
                $localAddress = $matches[1]
            } elseif ($address -match "^(.+):(\d+)$") {
                $localAddress = $matches[1]
            }
            [pscustomobject]@{
                localAddress = $localAddress
                localAddressPort = $address
                pid = [int]$parts[4]
            }
        }
    })
}

function Get-ActiveIPv4Addresses {
    return @(& ipconfig 2>$null | Select-String -Pattern "IPv4" | ForEach-Object {
        if ($_.Line -match ":\s*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)") {
            $matches[1]
        }
    } | Where-Object {
        $_ -and $_ -notlike "127.*" -and $_ -notlike "169.254*"
    })
}

function Test-PortHasLanListener {
    param([int]$Port)

    $lanAddresses = @(Get-ActiveIPv4Addresses)
    $rows = @(Get-NetstatListenRows -Port $Port)
    return [bool]($rows | Where-Object {
        $_.localAddress -eq "0.0.0.0" -or
        $_.localAddress -eq "::" -or
        $lanAddresses -contains $_.localAddress
    })
}

function Stop-LocalhostOnlyMosquitto {
    $rows = @(Get-NetstatListenRows -Port 1883)
    if ($rows.Count -eq 0 -or (Test-PortHasLanListener -Port 1883)) {
        return
    }

    foreach ($processId in @($rows | Select-Object -ExpandProperty pid -Unique)) {
        try {
            $process = Get-Process -Id $processId -ErrorAction Stop
            if ($process.ProcessName -ieq "mosquitto") {
                Write-Warning "Mosquitto is only listening on localhost; stopping PID $processId so FlyCare can start LAN MQTT."
                Stop-Process -Id $processId -Force -ErrorAction Stop
            } else {
                Write-Warning "Port 1883 is occupied by $($process.ProcessName) PID $processId, not stopping it automatically."
            }
        } catch {
            Write-Warning "Could not inspect/stop PID $processId on port 1883: $($_.Exception.Message)"
        }
    }

    Start-Sleep -Seconds 1
}

function Stop-PortListeners {
    param(
        [int[]]$Ports,
        [string]$Reason
    )

    foreach ($port in $Ports) {
        $rows = @(Get-NetstatListenRows -Port $port)
        foreach ($processId in @($rows | Select-Object -ExpandProperty pid -Unique | Where-Object { $_ -and $_ -ne 0 })) {
            try {
                $process = Get-Process -Id $processId -ErrorAction Stop
                Write-Warning "Stopping PID $processId ($($process.ProcessName)) on port $port for $Reason."
                Stop-Process -Id $processId -Force -ErrorAction Stop
            } catch {
                Write-Warning "Could not stop PID $processId on port ${port}: $($_.Exception.Message)"
                try {
                    $taskkillOutput = & taskkill.exe /PID $processId /T /F 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        Write-Warning "Stopped PID $processId with taskkill fallback."
                    } else {
                        Write-Warning "taskkill fallback failed for PID ${processId}: $taskkillOutput"
                    }
                } catch {
                    Write-Warning "taskkill fallback errored for PID ${processId}: $($_.Exception.Message)"
                }
            }
        }
    }

    Start-Sleep -Seconds 1
}

function Invoke-RestJsonWithRetry {
    param(
        [string]$Url,
        [int]$Attempts = 10,
        [int]$DelaySeconds = 2
    )

    $lastError = $null
    for ($i = 0; $i -lt $Attempts; $i++) {
        try {
            return Invoke-RestMethod $Url -TimeoutSec 5
        } catch {
            $lastError = $_.Exception.Message
            Start-Sleep -Seconds $DelaySeconds
        }
    }

    return @{ error = $lastError }
}

function Test-HealthyResponse {
    param($Value)
    return $Value -and
        $Value.PSObject.Properties.Name -contains "status" -and
        $Value.status -eq "healthy"
}

function Test-MqttConnectedResponse {
    param($Value)
    return $Value -and
        $Value.PSObject.Properties.Name -contains "connected" -and
        $Value.connected -eq $true
}

function Get-BackendCandidate {
    param([int]$Port)

    $baseUrl = "http://127.0.0.1:$Port"
    $health = Invoke-RestJsonWithRetry "$baseUrl/health" -Attempts 3 -DelaySeconds 1
    $mqttStatus = Invoke-RestJsonWithRetry "$baseUrl/api/v1/data-reception/mqtt/status" -Attempts 3 -DelaySeconds 1

    return [pscustomobject]@{
        port = $Port
        baseUrl = $baseUrl
        healthy = Test-HealthyResponse $health
        mqttConnected = Test-MqttConnectedResponse $mqttStatus
        health = $health
        mqttStatus = $mqttStatus
    }
}

function Start-HiddenProcess {
    param(
        [string]$FilePath,
        [string]$ArgumentList,
        [string]$WorkingDirectory,
        [string]$OutLog,
        [string]$ErrLog
    )

    $quotedFilePath = if ($FilePath -match "\s") { "`"$FilePath`"" } else { $FilePath }
    $command = "`"$quotedFilePath $ArgumentList > `"$OutLog`" 2> `"$ErrLog`"`""

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = "cmd.exe"
    $startInfo.Arguments = "/s /c $command"
    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden

    $process = [System.Diagnostics.Process]::Start($startInfo)
    return $process.Id
}

function Start-DetachedProcess {
    param(
        [string]$FilePath,
        [string]$ArgumentList,
        [string]$WorkingDirectory
    )

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $FilePath
    $startInfo.Arguments = $ArgumentList
    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden

    $process = [System.Diagnostics.Process]::Start($startInfo)
    return $process.Id
}

function Start-MinimizedConsoleProcess {
    param(
        [string]$FilePath,
        [string]$ArgumentList,
        [string]$WorkingDirectory
    )

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $FilePath
    $startInfo.Arguments = $ArgumentList
    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.UseShellExecute = $true
    $startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Minimized

    $process = [System.Diagnostics.Process]::Start($startInfo)
    return $process.Id
}

function Get-SerialBridgeStatePath {
    param([string]$RepoRoot)
    return (Join-Path $RepoRoot "logs\flycare-serial-bridge-process.json")
}

function Get-SerialBridgeState {
    param([string]$RepoRoot)

    $statePath = Get-SerialBridgeStatePath -RepoRoot $RepoRoot
    if (-not (Test-Path $statePath)) {
        return $null
    }

    try {
        return Get-Content -Path $statePath -Raw | ConvertFrom-Json
    } catch {
        Write-Warning "Could not read serial bridge state ${statePath}: $($_.Exception.Message)"
        return $null
    }
}

function Get-SerialBridgeProcesses {
    param([string]$RepoRoot)

    $processes = @()
    $state = Get-SerialBridgeState -RepoRoot $RepoRoot
    if ($state -and $state.processId) {
        try {
            $process = Get-Process -Id ([int]$state.processId) -ErrorAction Stop
            $processes += [pscustomobject]@{
                ProcessId = $process.Id
                CommandLine = "pid-file"
                LogPath = $state.logPath
                StdoutLog = $state.stdoutLog
                StderrLog = $state.stderrLog
                Source = "pid-file"
            }
        } catch {
            Write-Warning "Serial bridge pid-file process $($state.processId) is not running."
        }
    }

    $bridgeScript = Join-Path $RepoRoot "scripts\bridge_flycare_serial.ps1"
    try {
        $processes += @(Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object {
            $_.CommandLine -and
            $_.CommandLine -match [regex]::Escape("bridge_flycare_serial.ps1") -and
            $_.CommandLine -match [regex]::Escape($bridgeScript)
        } | Select-Object ProcessId, CommandLine, @{Name = "LogPath"; Expression = { $null } }, @{Name = "StdoutLog"; Expression = { $null } }, @{Name = "StderrLog"; Expression = { $null } }, @{Name = "Source"; Expression = { "cim" } })
    } catch {
        Write-Warning "Could not inspect serial bridge processes: $($_.Exception.Message)"
    }

    return @($processes | Sort-Object ProcessId -Unique)
}

function Stop-SerialBridgeProcesses {
    param([string]$RepoRoot)

    foreach ($processInfo in (Get-SerialBridgeProcesses -RepoRoot $RepoRoot)) {
        try {
            Write-Warning "Stopping serial bridge PID $($processInfo.ProcessId)."
            $taskkillOutput = & taskkill.exe /PID $processInfo.ProcessId /T /F 2>&1
            if ($LASTEXITCODE -ne 0) {
                throw "taskkill failed: $taskkillOutput"
            }
        } catch {
            Write-Warning "Could not stop serial bridge PID $($processInfo.ProcessId): $($_.Exception.Message)"
            try {
                Stop-Process -Id $processInfo.ProcessId -Force -ErrorAction Stop
                Write-Warning "Stopped serial bridge PID $($processInfo.ProcessId) with Stop-Process fallback."
            } catch {
                Write-Warning "Stop-Process fallback errored for serial bridge PID $($processInfo.ProcessId): $($_.Exception.Message)"
            }
        }
    }

    $statePath = Get-SerialBridgeStatePath -RepoRoot $RepoRoot
    if (Test-Path $statePath) {
        Remove-Item -LiteralPath $statePath -Force
    }
}

function Start-SerialBridgeProcess {
    param(
        [string]$RepoRoot,
        [string]$SerialPort,
        [string]$LogPath
    )

    $bridgeScript = Join-Path $RepoRoot "scripts\bridge_flycare_serial.ps1"
    $stdoutLog = "$LogPath.stdout.log"
    $stderrLog = "$LogPath.stderr.log"
    $command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$bridgeScript`" -SerialPort $SerialPort -LogPath `"$LogPath`" > `"$stdoutLog`" 2> `"$stderrLog`""

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = "cmd.exe"
    $startInfo.Arguments = "/s /c `"$command`""
    $startInfo.WorkingDirectory = $RepoRoot
    $startInfo.UseShellExecute = $true
    $startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Minimized

    $process = [System.Diagnostics.Process]::Start($startInfo)

    $state = [ordered]@{
        processId = $process.Id
        serialPort = $SerialPort
        logPath = $LogPath
        stdoutLog = $stdoutLog
        stderrLog = $stderrLog
        startedAt = (Get-Date).ToString("s")
    }
    $statePath = Get-SerialBridgeStatePath -RepoRoot $RepoRoot
    $state | ConvertTo-Json -Depth 4 | Set-Content -Path $statePath -Encoding UTF8
    return [pscustomobject]$state
}

function Start-ServiceIfPresent {
    param([string[]]$Names)
    foreach ($name in $Names) {
        $service = Get-Service -Name $name -ErrorAction SilentlyContinue
        if (-not $service) {
            continue
        }
        if ($service.Status -ne "Running") {
            Start-Service -Name $service.Name
            $service.WaitForStatus("Running", "00:00:20")
        }
        return $service.Name
    }
    return $null
}

function Start-ProcessIfPortFree {
    param(
        [int]$Port,
        [string]$Name,
        [string]$FilePath,
        [string]$ArgumentList,
        [string]$WorkingDirectory,
        [string]$OutLog,
        [string]$ErrLog
    )

    if (Test-PortListen -Port $Port) {
        Write-Host "$Name already listening on port $Port"
        return $false
    }

    Write-Host "Starting $Name on port $Port"
    $quotedFilePath = if ($FilePath -match "\s") { "`"$FilePath`"" } else { $FilePath }
    Start-MinimizedConsoleProcess `
        -FilePath "cmd.exe" `
        -ArgumentList "/k `"$quotedFilePath $ArgumentList > $OutLog 2> $ErrLog`"" `
        -WorkingDirectory $WorkingDirectory | Out-Null
    return $true
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = $PSCommandPath

if ($Elevate -and -not (Test-IsAdmin)) {
    $args = @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-File", "`"$scriptPath`"",
        "-NoPause"
    )
    if ($RestartApps) {
        $args += "-RestartApps"
    }
    if ($RestartMqtt) {
        $args += "-RestartMqtt"
    }
    if ($StartSerialBridge) {
        $args += "-StartSerialBridge"
    }
    if ($RestartSerialBridge) {
        $args += "-RestartSerialBridge"
    }
    if ($SerialPort) {
        $args += "-SerialPort"
        $args += $SerialPort
    }
    $args += "-BackendPort"
    $args += $BackendPort
    if ($StartLegacyBackend8000) {
        $args += "-StartLegacyBackend8000"
    }
    Start-Process -FilePath "powershell.exe" -ArgumentList $args -Verb RunAs
    Write-Host "Requested elevated PowerShell. Accept the UAC prompt, then read logs/flycare-local-stack-status.json."
    return
}

$logRoot = Join-Path $repoRoot "logs"
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null

$isAdmin = Test-IsAdmin
Write-Host "FlyCare local stack"
Write-Host "Repo: $repoRoot"
Write-Host "Administrator: $isAdmin"

if ($RestartMqtt) {
    Stop-PortListeners -Ports @(1883) -Reason "RestartMqtt"
}

if ($RestartApps) {
    Stop-PortListeners -Ports @(8000, 8001, 5173) -Reason "RestartApps"
}

if ($RestartSerialBridge) {
    Stop-SerialBridgeProcesses -RepoRoot $repoRoot
    Start-Sleep -Seconds 1
}

$startedServices = [ordered]@{}
if ($isAdmin) {
    $startedServices["mysql"] = Start-ServiceIfPresent -Names @("MySQL84", "MySQL80", "MySQL", "mysql")
    $startedServices["mongodb"] = Start-ServiceIfPresent -Names @("MongoDB", "mongodb")
} else {
    Write-Warning "Not running as Administrator; Windows services will only be checked, not started."
}

$mosquittoExe = "C:\Program Files\Mosquitto\mosquitto.exe"
$mosquittoConfig = Join-Path $repoRoot "infra\mosquitto\local-windows.conf"
Stop-LocalhostOnlyMosquitto
if (-not (Test-PortHasLanListener -Port 1883) -and -not (Test-PortListen -Port 1883) -and (Test-Path $mosquittoExe) -and (Test-Path $mosquittoConfig)) {
    Write-Host "Starting Mosquitto on port 1883"
    Start-DetachedProcess `
        -FilePath $mosquittoExe `
        -ArgumentList "-c `"$mosquittoConfig`" -v" `
        -WorkingDirectory $repoRoot | Out-Null
}

$backendRoot = Join-Path $repoRoot "backend\backend"
$frontendRoot = Join-Path $repoRoot "frontend"
$pythonExe = Join-Path $repoRoot "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = Join-Path $backendRoot ".venv\Scripts\python.exe"
}
if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
}

Start-ProcessIfPortFree `
    -Port $BackendPort `
    -Name "Backend" `
    -FilePath $pythonExe `
    -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port $BackendPort" `
    -WorkingDirectory $backendRoot `
    -OutLog (Join-Path $logRoot ("backend-{0}.out.log" -f $BackendPort)) `
    -ErrLog (Join-Path $logRoot ("backend-{0}.err.log" -f $BackendPort)) | Out-Null

if ($StartLegacyBackend8000 -and $BackendPort -ne 8000) {
    Start-ProcessIfPortFree `
        -Port 8000 `
        -Name "Legacy Backend" `
        -FilePath $pythonExe `
        -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000" `
        -WorkingDirectory $backendRoot `
        -OutLog (Join-Path $logRoot "backend-8000.out.log") `
        -ErrLog (Join-Path $logRoot "backend-8000.err.log") | Out-Null
}

$npmCmd = "C:\Program Files\nodejs\npm.cmd"
if (-not (Test-Path $npmCmd)) {
    $npmCmd = "npm.cmd"
}

if (Test-PortListen -Port 5173) {
    Write-Host "Frontend already listening on port 5173"
} else {
    Write-Host "Starting Frontend on port 5173"
    Start-MinimizedConsoleProcess `
        -FilePath "cmd.exe" `
        -ArgumentList "/k `"`"$npmCmd`" run dev -- --host 0.0.0.0 --port 5173`"" `
        -WorkingDirectory $frontendRoot | Out-Null
}

$serialBridge = [ordered]@{
    requested = [bool]($StartSerialBridge -or $RestartSerialBridge)
    serialPort = $SerialPort
    running = $false
    pids = @()
    startedPid = $null
    logPath = $null
    stdoutLog = $null
    stderrLog = $null
}
if ($StartSerialBridge -or $RestartSerialBridge) {
    $existingBridge = @(Get-SerialBridgeProcesses -RepoRoot $repoRoot)
    if ($existingBridge.Count -eq 0) {
        $bridgeLogPath = Join-Path $logRoot ("flycare-serial-bridge-live-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
        Write-Host "Starting serial bridge on $SerialPort"
        $startedBridge = Start-SerialBridgeProcess -RepoRoot $repoRoot -SerialPort $SerialPort -LogPath $bridgeLogPath
        Start-Sleep -Seconds 2
        $serialBridge["startedPid"] = $startedBridge.processId
        $serialBridge["logPath"] = $startedBridge.logPath
        $serialBridge["stdoutLog"] = $startedBridge.stdoutLog
        $serialBridge["stderrLog"] = $startedBridge.stderrLog
    } else {
        Write-Host "Serial bridge already running: $(@($existingBridge | Select-Object -ExpandProperty ProcessId) -join ', ')"
    }

    $bridgeProcesses = @(Get-SerialBridgeProcesses -RepoRoot $repoRoot)
    $serialBridge["running"] = $bridgeProcesses.Count -gt 0
    $serialBridge["pids"] = @($bridgeProcesses | Select-Object -ExpandProperty ProcessId)
    $firstBridge = $bridgeProcesses | Select-Object -First 1
    if ($firstBridge) {
        if (-not $serialBridge["logPath"]) {
            $serialBridge["logPath"] = if ($firstBridge.LogPath) { $firstBridge.LogPath } else { "existing" }
        }
        if (-not $serialBridge["stdoutLog"] -and $firstBridge.StdoutLog) {
            $serialBridge["stdoutLog"] = $firstBridge.StdoutLog
        }
        if (-not $serialBridge["stderrLog"] -and $firstBridge.StderrLog) {
            $serialBridge["stderrLog"] = $firstBridge.StderrLog
        }
    }
}

Start-Sleep -Seconds 3

$backendCandidates = @()
$candidatePorts = @($BackendPort)
if ($StartLegacyBackend8000 -or (Test-PortListen -Port 8000)) {
    $candidatePorts += 8000
}
if ((Test-PortListen -Port 8001) -and ($BackendPort -ne 8001)) {
    $candidatePorts += 8001
}
foreach ($candidatePort in @($candidatePorts | Select-Object -Unique)) {
    if (Test-PortListen -Port $candidatePort) {
        $backendCandidates += Get-BackendCandidate -Port $candidatePort
    }
}
$activeBackend = $backendCandidates |
    Where-Object { $_.healthy -and $_.mqttConnected } |
    Select-Object -First 1
if (-not $activeBackend) {
    $activeBackend = $backendCandidates |
        Where-Object { $_.healthy } |
        Select-Object -First 1
}
if (-not $activeBackend) {
    $activeBackend = $backendCandidates | Select-Object -First 1
}

$health = $activeBackend.health
$mqttStatus = $activeBackend.mqttStatus

$ports = 1883, 3306, 5173, 8000, 8001, 27017 | ForEach-Object { Get-PortStatus -Port $_ }

$status = [pscustomobject]@{
    timestamp = (Get-Date).ToString("s")
    repoRoot = $repoRoot
    isAdmin = $isAdmin
    backendPort = $BackendPort
    startLegacyBackend8000 = [bool]$StartLegacyBackend8000
    startedServices = $startedServices
    ports = $ports
    lanIPv4 = @(Get-ActiveIPv4Addresses)
    mqttLanListener = Test-PortHasLanListener -Port 1883
    activeBackend = [pscustomobject]@{
        port = $activeBackend.port
        baseUrl = $activeBackend.baseUrl
        healthy = $activeBackend.healthy
        mqttConnected = $activeBackend.mqttConnected
    }
    backendCandidates = $backendCandidates
    health = $health
    mqttStatus = $mqttStatus
    serialBridge = [pscustomobject]$serialBridge
}

$statusPath = Join-Path $logRoot "flycare-local-stack-status.json"
$status | ConvertTo-Json -Depth 8 | Set-Content -Path $statusPath -Encoding UTF8
$status | ConvertTo-Json -Depth 8
Write-Host "Status written to $statusPath"

if (-not $NoPause) {
    Read-Host "Press Enter to close"
}
