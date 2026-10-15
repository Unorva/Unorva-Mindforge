param(
    [string]$ProjectRoot = (Join-Path $PSScriptRoot '..'),
    [ValidateSet(5173, 5174)]
    [int]$FrontendPort = 5173,
    [string]$MavenCommand,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = [IO.Path]::GetFullPath($ProjectRoot)
$backendDirectory = Join-Path $ProjectRoot 'backend/mindforge-server'
$frontendDirectory = Join-Path $ProjectRoot 'apps/web/mindforge-web'
$runDirectory = Join-Path $ProjectRoot '.local/run'
$frontendUrl = "http://127.0.0.1:$FrontendPort"
$backendUrl = 'http://127.0.0.1:8080'

function Test-ListeningPort([int]$Port) {
    $client = [Net.Sockets.TcpClient]::new()
    try {
        $connection = $client.ConnectAsync('127.0.0.1', $Port)
        return ($connection.Wait(500) -and $client.Connected)
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Test-BackendReady {
    try {
        $response = Invoke-WebRequest "$backendUrl/v3/api-docs" -UseBasicParsing -TimeoutSec 3
        $document = $response.Content | ConvertFrom-Json
        return ($document.paths.PSObject.Properties.Name -contains '/auth/login' -and
            $document.paths.PSObject.Properties.Name -contains '/users/me')
    } catch {
        return $false
    }
}

function Test-FrontendReady {
    try {
        $response = Invoke-WebRequest $frontendUrl -UseBasicParsing -TimeoutSec 3
        return ($response.StatusCode -eq 200 -and
            $response.Content -match '<title>mindforge-web</title>' -and
            $response.Content -match '/@vite/client')
    } catch {
        return $false
    }
}

function ConvertTo-ShellLiteral([string]$Value) {
    return "'" + $Value.Replace("'", "''") + "'"
}

function Start-BackgroundService([string]$Name, [string]$Command) {
    $shellPath = Join-Path $PSHOME 'powershell.exe'
    if (Test-Path -LiteralPath (Join-Path $PSHOME 'pwsh.exe')) {
        $shellPath = Join-Path $PSHOME 'pwsh.exe'
    }
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Command))
    $process = Start-Process -FilePath $shellPath -WindowStyle Hidden -PassThru `
        -ArgumentList @('-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $encoded) `
        -RedirectStandardOutput (Join-Path $runDirectory "$Name.log") `
        -RedirectStandardError (Join-Path $runDirectory "$Name.error.log")
    Set-Content -LiteralPath (Join-Path $runDirectory "$Name.pid") -Value $process.Id -Encoding ASCII
    return $process
}

if (-not (Test-Path -LiteralPath (Join-Path $backendDirectory 'pom.xml')) -or
    -not (Test-Path -LiteralPath (Join-Path $frontendDirectory 'package.json'))) {
    throw "Project directories were not found under $ProjectRoot"
}
[IO.Directory]::CreateDirectory($runDirectory) | Out-Null
$startLock = $null
try {
    try {
        $startLock = [IO.File]::Open((Join-Path $runDirectory 'start.lock'),
            [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
    } catch {
        throw 'Another Mindforge launcher is running. Wait for it to finish.'
    }

    $backendReady = Test-BackendReady
    $frontendReady = Test-FrontendReady
    $backendProcess = $null
    $frontendProcess = $null

    if (-not $backendReady) {
        if (Test-ListeningPort 8080) {
            throw 'Port 8080 is occupied by a service that is not a ready Mindforge backend.'
        }
        Get-Command java.exe -ErrorAction Stop | Out-Null
        if (-not $MavenCommand) {
            $maven = Get-Command mvn.cmd -ErrorAction SilentlyContinue
            if ($maven) {
                $MavenCommand = $maven.Source
            } elseif ($env:MAVEN_HOME) {
                $MavenCommand = Join-Path $env:MAVEN_HOME 'bin/mvn.cmd'
            }
        }
        if (-not $MavenCommand -or -not (Test-Path -LiteralPath $MavenCommand)) {
            throw 'Maven was not found. Add Maven to PATH or provide -MavenCommand with the full mvn.cmd path.'
        }
        $secretPath = Join-Path $backendDirectory '.local/application-secrets.yml'
        if (-not (Test-Path -LiteralPath $secretPath) -and -not $env:MINDFORGE_AI_ENCRYPTION_KEY) {
            # Use a child shell because Initialize-LocalSecrets.ps1 calls exit.
            $initializationScript = Join-Path $PSScriptRoot 'Initialize-LocalSecrets.ps1'
            & (Join-Path $PSHOME $(if (Test-Path (Join-Path $PSHOME 'pwsh.exe')) { 'pwsh.exe' } else { 'powershell.exe' })) `
                -NoProfile -ExecutionPolicy Bypass -File $initializationScript -BackendDirectory $backendDirectory
            if ($LASTEXITCODE -ne 0) { throw 'Could not initialize local encryption configuration.' }
        }
        Write-Host "Starting backend at $backendUrl ..."
        $command = "Set-Location -LiteralPath $(ConvertTo-ShellLiteral $backendDirectory); " +
            "`$env:SPRING_PROFILES_ACTIVE = 'dev'; `$env:SERVER_ADDRESS = '127.0.0.1'; `$env:SERVER_PORT = '8080'; " +
            "& $(ConvertTo-ShellLiteral $MavenCommand) --batch-mode --no-transfer-progress '-Dmaven.test.skip=true' spring-boot:run; exit `$LASTEXITCODE"
        $backendProcess = Start-BackgroundService 'backend' $command
    } else {
        Write-Host 'Backend is already running; reusing it.'
    }

    if (-not $frontendReady) {
        if (Test-ListeningPort $FrontendPort) {
            throw "Port $FrontendPort is occupied. Try -FrontendPort 5174 or free the port."
        }
        $npmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source
        if (-not (Test-Path -LiteralPath (Join-Path $frontendDirectory 'node_modules/.bin/vite.cmd'))) {
            Push-Location $frontendDirectory
            try {
                & $npmCommand ci
                if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
            } finally {
                Pop-Location
            }
        }
        Write-Host "Starting frontend at $frontendUrl ..."
        $command = "Set-Location -LiteralPath $(ConvertTo-ShellLiteral $frontendDirectory); " +
            "`$env:API_PROXY_TARGET = '$backendUrl'; `$env:VITE_ENABLE_MOCKS = 'false'; " +
            "& $(ConvertTo-ShellLiteral $npmCommand) run dev -- --host 127.0.0.1 --port $FrontendPort --strictPort; exit `$LASTEXITCODE"
        $frontendProcess = Start-BackgroundService 'frontend' $command
    } else {
        Write-Host 'Frontend is already running; reusing it.'
    }

    $deadline = [DateTime]::UtcNow.AddMinutes(3)
    while ([DateTime]::UtcNow -lt $deadline) {
        if (-not $backendReady) { $backendReady = Test-BackendReady }
        if (-not $frontendReady) { $frontendReady = Test-FrontendReady }
        if ($backendReady -and $frontendReady) { break }
        foreach ($process in @($backendProcess, $frontendProcess)) {
            if ($null -ne $process -and $process.HasExited) {
                throw "A service exited during startup. Check the logs in $runDirectory"
            }
        }
        Start-Sleep -Seconds 2
    }
    if (-not $backendReady -or -not $frontendReady) {
        throw "Startup timed out. Backend ready: $backendReady; frontend ready: $frontendReady. Logs: $runDirectory"
    }

    Write-Host "`nMindforge is ready." -ForegroundColor Green
    Write-Host "Frontend: $frontendUrl"
    Write-Host "Backend:  $backendUrl"
    Write-Host "Logs:     $runDirectory"
    Write-Host 'Services run in the background and stay running when this window closes.'
    if (-not $NoBrowser) { Start-Process $frontendUrl }
} finally {
    if ($null -ne $startLock) { $startLock.Dispose() }
}
