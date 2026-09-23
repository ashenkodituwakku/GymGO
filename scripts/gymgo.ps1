<#
.SYNOPSIS
    Start GymGO on this computer.

.DESCRIPTION
    Finds the GymGO checkout (cloning it on first run), makes sure pnpm is
    available, installs dependencies when they are missing or out of date,
    starts the development server with the demo dataset and development
    sign-in, and opens the browser once the server answers.

    The dev server recompiles on every file save. Press Ctrl+C to stop it.

.PARAMETER Path
    Where the checkout lives. Defaults to a GymGO folder in your home
    directory. Cloned there if it does not exist yet.

.PARAMETER Port
    Port to serve on. Defaults to 3000.

.PARAMETER Update
    Pull the latest commits before starting.

.PARAMETER NoBrowser
    Do not open a browser window.

.EXAMPLE
    gymgo
    gymgo -Update
    gymgo -Port 3001 -NoBrowser
#>
[CmdletBinding()]
param(
    [string] $Path = (Join-Path $HOME 'GymGO'),
    [ValidateRange(1, 65535)]
    [int] $Port = 3000,
    [switch] $Update,
    [switch] $NoBrowser
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepoUrl = 'https://github.com/ashenkodituwakku/GymGO.git'
$Branch = 'claude/friendly-johnson-9rzxrj'
$MinNode = [version]'20.9.0'
$PnpmVersion = '10.33.0'

# Output markers are plain ASCII on purpose. Windows PowerShell 5.1 reads a
# script without a byte-order mark as Windows-1252, and the UTF-8 bytes of a
# tick mark decode to a curly quote that it treats as the end of a string:
# one decorative character made the whole script fail to parse. Keep this
# file ASCII; a test in apps/web enforces it.
function Write-Step([string] $Message) {
    Write-Host "  >  $Message" -ForegroundColor Cyan
}

function Write-Done([string] $Message) {
    Write-Host "  OK $Message" -ForegroundColor Green
}

function Stop-WithError([string] $Message, [string] $Fix) {
    Write-Host ''
    Write-Host "  !! $Message" -ForegroundColor Red
    if ($Fix) { Write-Host "    $Fix" -ForegroundColor Yellow }
    Write-Host ''
    exit 1
}

function Test-PortOpen([int] $PortNumber) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $client.Connect('127.0.0.1', $PortNumber)
        return $true
    } catch {
        return $false
    } finally {
        # Close() rather than Dispose(): public on every .NET Framework that
        # Windows PowerShell 5.1 runs on.
        $client.Close()
    }
}

Write-Host ''
Write-Host '  GymGO' -ForegroundColor White
Write-Host ''

# --- Node --------------------------------------------------------------------
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Stop-WithError 'Node.js is not installed.' `
        'Install the LTS release with: winget install OpenJS.NodeJS.LTS   (then open a new terminal)'
}
$nodeVersion = [version]((& node --version).TrimStart('v'))
if ($nodeVersion -lt $MinNode) {
    Stop-WithError "Node.js $nodeVersion is too old; GymGO needs $MinNode or newer." `
        'Update with: winget upgrade OpenJS.NodeJS.LTS'
}
Write-Done "Node.js $nodeVersion"

# --- Checkout ----------------------------------------------------------------
if (-not (Test-Path (Join-Path $Path 'package.json'))) {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Stop-WithError 'Git is not installed, so the project cannot be downloaded.' `
            'Install it with: winget install Git.Git   (then open a new terminal)'
    }
    Write-Step "Downloading GymGO into $Path"
    & git clone --branch $Branch $RepoUrl $Path
    if ($LASTEXITCODE -ne 0) {
        Stop-WithError 'The download failed.' 'Check you are signed in to GitHub and have access to the repository.'
    }
} elseif ($Update) {
    Write-Step 'Pulling the latest changes'
    & git -C $Path pull --ff-only
    if ($LASTEXITCODE -ne 0) {
        Stop-WithError 'Could not update cleanly.' "You may have local edits in $Path. Commit or stash them, then try again."
    }
}
Write-Done "Project at $Path"

# --- pnpm ----------------------------------------------------------------------
# Prefer an installed pnpm. Otherwise run it through Corepack, which needs no
# administrator rights when invoked this way (unlike `corepack enable`), and
# fall back to npx on Node versions that no longer ship Corepack.
$env:COREPACK_ENABLE_DOWNLOAD_PROMPT = '0'
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    $PnpmCommand = @('pnpm')
} elseif (Get-Command corepack -ErrorAction SilentlyContinue) {
    $PnpmCommand = @('corepack', 'pnpm')
} else {
    $PnpmCommand = @('npx', '--yes', "pnpm@$PnpmVersion")
}

function Invoke-Pnpm {
    param([Parameter(ValueFromRemainingArguments = $true)] [string[]] $Arguments)
    $exe = $PnpmCommand[0]
    $prefix = @($PnpmCommand | Select-Object -Skip 1)
    & $exe @prefix @Arguments
}

Push-Location $Path
$savedEnv = @{
    GYMGO_DATA_SOURCE  = $env:GYMGO_DATA_SOURCE
    GYMGO_AUTH_ADAPTER = $env:GYMGO_AUTH_ADAPTER
}
$opener = $null

try {
    # --- Dependencies ------------------------------------------------------------
    $lockfile = Join-Path $Path 'pnpm-lock.yaml'
    $installMarker = Join-Path $Path 'node_modules/.modules.yaml'
    # -Force because .modules.yaml is a dotfile, which Get-Item skips as hidden.
    $needsInstall = -not (Test-Path -LiteralPath $installMarker) -or
        ((Get-Item -LiteralPath $lockfile -Force).LastWriteTimeUtc -gt
            (Get-Item -LiteralPath $installMarker -Force).LastWriteTimeUtc)

    if ($needsInstall) {
        Write-Step 'Installing dependencies (first run takes a minute)'
        Invoke-Pnpm install --frozen-lockfile
        if ($LASTEXITCODE -ne 0) { Stop-WithError 'Installing dependencies failed.' 'Scroll up for the error from pnpm.' }
    }
    Write-Done 'Dependencies ready'

    # --- Port --------------------------------------------------------------------
    $url = "http://localhost:$Port"
    if (Test-PortOpen $Port) {
        $alreadyGymGo = $false
        try {
            $probe = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
            $alreadyGymGo = $probe.Content -match 'GymGO'
        } catch { }

        if ($alreadyGymGo) {
            Write-Done "GymGO is already running at $url"
            if (-not $NoBrowser) { Start-Process $url }
            return
        }
        Stop-WithError "Something else is already using port $Port." "Start on another port with: gymgo -Port $($Port + 1)"
    }

    # --- Open the browser once the server answers -------------------------------
    # The first request compiles the page, so each probe allows a generous
    # timeout. Runs as a background job so the server can hold the console.
    if (-not $NoBrowser) {
        $opener = Start-Job -ArgumentList $url -ScriptBlock {
            param($target)
            for ($attempt = 0; $attempt -lt 90; $attempt++) {
                try {
                    Invoke-WebRequest -Uri $target -UseBasicParsing -TimeoutSec 60 | Out-Null
                    Start-Process $target
                    return
                } catch {
                    Start-Sleep -Seconds 1
                }
            }
        }
    }

    # --- Serve -------------------------------------------------------------------
    $env:GYMGO_DATA_SOURCE = 'demo'
    $env:GYMGO_AUTH_ADAPTER = 'local-dev'

    Write-Host ''
    Write-Host "  GymGO is starting at $url" -ForegroundColor White
    Write-Host '  It recompiles on every save. Press Ctrl+C to stop.' -ForegroundColor DarkGray
    Write-Host ''

    Invoke-Pnpm --filter '@gymgo/web' exec next dev --port $Port
} finally {
    if ($opener) { Remove-Job $opener -Force -ErrorAction SilentlyContinue }
    # Put the caller's environment back exactly as it was: restore values that
    # existed, remove ones that did not.
    foreach ($name in @($savedEnv.Keys)) {
        if ($null -eq $savedEnv[$name]) {
            Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue
        } else {
            Set-Item -Path "Env:$name" -Value $savedEnv[$name]
        }
    }
    Pop-Location
}
