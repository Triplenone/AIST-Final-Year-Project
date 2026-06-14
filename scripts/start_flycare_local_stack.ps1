param(
    [switch]$Elevate,
    [switch]$NoPause
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

function Start-HiddenProcess {
    param(
        [string]$FilePath,
        [string]$ArgumentList,
        [string]$WorkingDirectory,
        [string]$OutLog,
        [string]$ErrLog
    )

    $quotedFilePath = if ($FilePath -match "\s") { "`"$FilePath`"" } else { $FilePath }
    $command = "$quotedFilePath $ArgumentList > `"$OutLog`" 2> `"$ErrLog`""

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = "cmd.exe"
    $startInfo.Arguments = "/c $command"
    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true

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

$startedServices = [ordered]@{}
if ($isAdmin) {
    $startedServices["mysql"] = Start-ServiceIfPresent -Names @("MySQL84", "MySQL80", "MySQL", "mysql")
    $startedServices["mongodb"] = Start-ServiceIfPresent -Names @("MongoDB", "mongodb")
    $startedServices["mosquitto"] = Start-ServiceIfPresent -Names @("mosquitto", "Mosquitto")
} else {
    Write-Warning "Not running as Administrator; Windows services will only be checked, not started."
}

$mosquittoExe = "C:\Program Files\Mosquitto\mosquitto.exe"
$mosquittoConfig = Join-Path $repoRoot "infra\mosquitto\local-windows.conf"
if (-not (Test-PortListen -Port 1883) -and (Test-Path $mosquittoExe) -and (Test-Path $mosquittoConfig)) {
    Start-ProcessIfPortFree `
        -Port 1883 `
        -Name "Mosquitto" `
        -FilePath $mosquittoExe `
        -ArgumentList "-c `"$mosquittoConfig`"" `
        -WorkingDirectory $repoRoot `
        -OutLog (Join-Path $logRoot "mosquitto-local.out.log") `
        -ErrLog (Join-Path $logRoot "mosquitto-local.err.log") | Out-Null
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

$health = $null
$mqttStatus = $null
try {
    $health = Invoke-RestMethod "http://127.0.0.1:8000/health" -TimeoutSec 5
} catch {
    $health = @{ error = $_.Exception.Message }
}

try {
    $mqttStatus = Invoke-RestMethod "http://127.0.0.1:8000/api/v1/data-reception/mqtt/status" -TimeoutSec 5
} catch {
    $mqttStatus = @{ error = $_.Exception.Message }
}

$ports = 1883, 3306, 5173, 8000, 27017 | ForEach-Object { Get-PortStatus -Port $_ }

$status = [pscustomobject]@{
    timestamp = (Get-Date).ToString("s")
    repoRoot = $repoRoot
    isAdmin = $isAdmin
    startedServices = $startedServices
    ports = $ports
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
