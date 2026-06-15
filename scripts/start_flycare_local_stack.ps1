param(
    [switch]$Elevate,
    [switch]$NoPause,
    [switch]$RestartApps,
    [switch]$RestartMqtt
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
    Start-HiddenProcess `
        -FilePath $FilePath `
        -ArgumentList $ArgumentList `
        -WorkingDirectory $WorkingDirectory `
        -OutLog $OutLog `
        -ErrLog $ErrLog | Out-Null
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
    Stop-PortListeners -Ports @(8000, 5173) -Reason "RestartApps"
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
$pythonExe = Join-Path $backendRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
}

Start-ProcessIfPortFree `
    -Port 8000 `
    -Name "Backend" `
    -FilePath $pythonExe `
    -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" `
    -WorkingDirectory $backendRoot `
    -OutLog (Join-Path $logRoot "backend-local.out.log") `
    -ErrLog (Join-Path $logRoot "backend-local.err.log") | Out-Null

Start-ProcessIfPortFree `
    -Port 5173 `
    -Name "Frontend" `
    -FilePath "cmd.exe" `
    -ArgumentList "/c npm run dev -- --host 0.0.0.0 --port 5173" `
    -WorkingDirectory $frontendRoot `
    -OutLog (Join-Path $logRoot "frontend-local.out.log") `
    -ErrLog (Join-Path $logRoot "frontend-local.err.log") | Out-Null

Start-Sleep -Seconds 3

$health = Invoke-RestJsonWithRetry "http://127.0.0.1:8000/health"
$mqttStatus = Invoke-RestJsonWithRetry "http://127.0.0.1:8000/api/v1/data-reception/mqtt/status"

$ports = 1883, 3306, 5173, 8000, 27017 | ForEach-Object { Get-PortStatus -Port $_ }

$status = [pscustomobject]@{
    timestamp = (Get-Date).ToString("s")
    repoRoot = $repoRoot
    isAdmin = $isAdmin
    startedServices = $startedServices
    ports = $ports
    lanIPv4 = @(Get-ActiveIPv4Addresses)
    mqttLanListener = Test-PortHasLanListener -Port 1883
    health = $health
    mqttStatus = $mqttStatus
}

$statusPath = Join-Path $logRoot "flycare-local-stack-status.json"
$status | ConvertTo-Json -Depth 8 | Set-Content -Path $statusPath -Encoding UTF8
$status | ConvertTo-Json -Depth 8
Write-Host "Status written to $statusPath"

if (-not $NoPause) {
    Read-Host "Press Enter to close"
}
