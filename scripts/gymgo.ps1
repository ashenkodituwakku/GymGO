<#
.SYNOPSIS
    Start GymGO on this computer.

.DESCRIPTION
    Finds the GymGO checkout (cloning it on first run), makes sure pnpm is
    available and installs dependencies when they are missing or out of date.

    Then it starts two things together:
      - the GymGO server, which keeps accounts, saved gyms and reviews in a
        database file on this computer (free, nothing to sign up for);
      - the GymGO app, which opens in your browser so you can use it on this
        PC, and prints a QR code so you can open it on your phone with Expo Go.

    Both reload when files change. Press Ctrl+C to stop both.

.PARAMETER Path
    Where the checkout lives. Defaults to a GymGO folder in your home
    directory. Cloned there if it does not exist yet.

.PARAMETER Tunnel
    For a phone that is not on the same Wi-Fi as this computer. Slower, and
    Expo may ask to install a helper. The phone then shows the gyms from the
    app's offline copy; signing in needs the same Wi-Fi.

.PARAMETER NoBrowser
    Do not open a browser window.

.PARAMETER Update
    Pull the latest commits before starting.

.PARAMETER OldWebsite
    Start the older Next.js website instead of the app.

.PARAMETER Port
    Old website only: port to serve on. Defaults to 3000.

.EXAMPLE
    gymgo
    gymgo -Update
    gymgo -Tunnel
    gymgo -NoBrowser
    gymgo -OldWebsite
#>
[CmdletBinding()]
param(
    [string] $Path = (Join-Path $HOME 'GymGO'),
    [switch] $Tunnel,
    [switch] $NoBrowser,
    [switch] $Update,
    [switch] $OldWebsite,
    [ValidateRange(1, 65535)]
    [int] $Port = 3000
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepoUrl = 'https://github.com/ashenkodituwakku/GymGO.git'
$Branch = 'claude/friendly-johnson-9rzxrj'
# node:sqlite, which the server's database uses, needs 22.13 or newer.
$MinNode = [version]'22.13.0'
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

    # --- The app and its server ----------------------------------------------
    if (-not $OldWebsite) {
        Write-Host ''
        Write-Host '  Starting GymGO: the server and the app' -ForegroundColor White
        Write-Host ''
        if (-not $NoBrowser) {
            Write-Host '  On this PC: the app opens in your browser at http://localhost:8081'
        } else {
            Write-Host '  On this PC: open http://localhost:8081 in your browser'
        }
        Write-Host ''
        Write-Host '  On your phone:' -ForegroundColor White
        Write-Host '    1. Install "Expo Go" from the App Store or Google Play.'
        Write-Host '    2. Join the same Wi-Fi as this computer.'
        Write-Host '    3. When the QR code appears below, scan it:'
        Write-Host '         iPhone  - with the Camera app'
        Write-Host '         Android - with the scanner inside Expo Go'
        Write-Host ''
        Write-Host '  If Windows asks whether Node.js may use the network, allow it on' -ForegroundColor DarkGray
        Write-Host '  private networks, or the phone cannot reach this computer.' -ForegroundColor DarkGray
        Write-Host '  Phone cannot connect? Stop with Ctrl+C and run: gymgo -Tunnel' -ForegroundColor DarkGray
        Write-Host '  Ctrl+C stops everything.' -ForegroundColor DarkGray
        Write-Host ''

        $devArgs = @((Join-Path $Path 'scripts/dev.mjs'))
        if ($NoBrowser) { $devArgs += '--no-browser' }
        if ($Tunnel) { $devArgs += '--tunnel' }
        & node @devArgs
        return
    }

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
        Stop-WithError "Something else is already using port $Port." "Start on another port with: gymgo -OldWebsite -Port $($Port + 1)"
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
