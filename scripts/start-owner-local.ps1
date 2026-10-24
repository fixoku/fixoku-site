param(
  [switch]$Verify
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repo = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repo

$containerName = "fixoku-owner-local-pg-20261019"
$expectedPort = 55432
$expectedOrigin = "http://127.0.0.1:5173"
$envPath = Join-Path $repo ".env.local"
$credentialPath = Join-Path (Join-Path $env:LOCALAPPDATA "Fixoku\owner-local") "credentials.env"

function Read-KeyValueFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "LOCAL_ENV_FILE_MISSING" }
  $values = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = ([string]$line).Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    $match = [regex]::Match($trimmed, '^([A-Z][A-Z0-9_]*)=(.*)$')
    if (-not $match.Success) { throw "LOCAL_ENV_FORMAT_INVALID" }
    $values[$match.Groups[1].Value] = $match.Groups[2].Value
  }
  return $values
}

function Set-ProcessEnvironment([hashtable]$Values) {
  foreach ($key in $Values.Keys) {
    Set-Item -Path ("Env:{0}" -f $key) -Value ([string]$Values[$key])
  }
}

function Invoke-Redacted([string]$FilePath, [string[]]$Arguments) {
  $output = @(& $FilePath @Arguments 2>&1)
  $code = $LASTEXITCODE
  foreach ($line in $output) {
    $safe = ([string]$line) -replace '(?i)(postgres(?:ql)?://)[^@\s"]+@', '$1[REDACTED]@'
    Write-Host $safe
  }
  if ($code -ne 0) { throw "LOCAL_COMMAND_FAILED:$code" }
}

function Invoke-Verification {
  $logPath = Join-Path $env:TEMP ("fixoku-owner-local-start-" + $PID + ".log")
  $errorPath = Join-Path $env:TEMP ("fixoku-owner-local-start-" + $PID + ".err.log")
  $process = $null
  try {
    if (Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) { throw "LOCAL_APP_PORT_5173_BUSY_DO_NOT_KILL_EXISTING_PROCESS" }
    $process = Start-Process -FilePath (Get-Command node.exe -ErrorAction Stop).Source -ArgumentList @("node_modules/vite/bin/vite.js", "--mode", "test", "--host", "127.0.0.1", "--port", "5173", "--strictPort") -WorkingDirectory $repo -RedirectStandardOutput $logPath -RedirectStandardError $errorPath -WindowStyle Hidden -PassThru
    $ready = $false
    for ($attempt = 0; $attempt -lt 120; $attempt++) {
      if ($process.HasExited) { throw "LOCAL_VITE_EXITED" }
      try { $response = Invoke-WebRequest -Uri ($expectedOrigin + "/") -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -lt 500) { $ready = $true; break } } catch { }
      Start-Sleep -Milliseconds 500
    }
    if (-not $ready) { throw "LOCAL_VITE_NOT_READY" }
    & (Get-Command node.exe -ErrorAction Stop).Source "scripts/verify-owner-local.mjs"
    if ($LASTEXITCODE -ne 0) { throw "OWNER_LOCAL_VERIFY_FAILED" }
  } finally {
    if ($process) {
      $processInfo = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $process.Id) -ErrorAction SilentlyContinue
      if ($processInfo -and $processInfo.Name -eq "node.exe" -and $processInfo.CommandLine -like "*node_modules/vite/bin/vite.js*--port 5173*" -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
    }
    Remove-Item -LiteralPath $logPath,$errorPath -Force -ErrorAction SilentlyContinue
  }
}

$values = Read-KeyValueFile $envPath
foreach ($required in @("DATABASE_URL", "TEST_DATABASE_URL", "BETTER_AUTH_SECRET", "FIXOKU_LOCAL_ORIGIN", "FIXOKU_OWNER_LOCAL_CONTAINER", "FIXOKU_OWNER_LOCAL_DB_PORT")) {
  if (-not $values.ContainsKey($required) -or -not $values[$required]) { throw "LOCAL_ENV_REQUIRED:$required" }
}
$credentials = Read-KeyValueFile $credentialPath
foreach ($required in @("FIXOKU_OWNER_TEST_EMAIL", "FIXOKU_OWNER_TEST_PASSWORD", "FIXOKU_OWNER_TEST_NAME")) {
  if (-not $credentials.ContainsKey($required) -or -not $credentials[$required]) { throw "OWNER_LOCAL_CREDENTIAL_REQUIRED:$required" }
}

$database = [Uri]$values.DATABASE_URL
if ($database.Scheme -ne "postgresql" -or $database.Host -ne "127.0.0.1" -or [int]$database.Port -ne $expectedPort -or $database.AbsolutePath -ne "/fixoku_owner_local") { throw "LOCAL_DATABASE_TARGET_INVALID" }
if ($values.TEST_DATABASE_URL -ne $values.DATABASE_URL) { throw "LOCAL_TEST_DATABASE_TARGET_INVALID" }
if ($values.FIXOKU_LOCAL_ORIGIN -ne $expectedOrigin) { throw "LOCAL_ORIGIN_INVALID" }
if ($values.FIXOKU_OWNER_LOCAL_CONTAINER -ne $containerName) { throw "LOCAL_CONTAINER_NAME_INVALID" }
if ([int]$values.FIXOKU_OWNER_LOCAL_DB_PORT -ne $expectedPort) { throw "LOCAL_DATABASE_PORT_INVALID" }
if ($values.BETTER_AUTH_SECRET.Length -lt 32) { throw "LOCAL_AUTH_SECRET_WEAK" }

Set-ProcessEnvironment $values
$env:APP_ORIGIN = $null
$env:BETTER_AUTH_URL = $null
$env:FIXOKU_SKIP_LOCAL_ENV = "1"
$env:NODE_ENV = "development"
$env:LOCAL_REVIEW_MODE = "1"
$env:VITE_LOCAL_REVIEW_MODE = "1"
$env:FIXOKU_LOCAL_OWNER_REVIEW = "1"
$env:VITE_LOCAL_OWNER_REVIEW = "1"
$env:VITE_LOCAL_OWNER_NAME = $credentials.FIXOKU_OWNER_TEST_NAME
$env:FIXOKU_LOCAL_OWNER_EMAIL = $credentials.FIXOKU_OWNER_TEST_EMAIL
$env:FIXOKU_LOCAL_OWNER_PASSWORD = $credentials.FIXOKU_OWNER_TEST_PASSWORD
$env:FIXOKU_LOCAL_OWNER_NAME = $credentials.FIXOKU_OWNER_TEST_NAME
$env:FIXOKU_LOCAL_OWNER_TOTP_URI = $credentials.FIXOKU_OWNER_TEST_TOTP_URI
$env:FIXOKU_OWNER_CREDENTIAL_FILE = $credentialPath
$env:FIXOKU_REQUIRE_PRIVILEGED_2FA = "1"
$env:FIXOKU_DEV_LOGIN_ENABLED = "0"

$docker = (Get-Command docker -ErrorAction Stop).Source
$metadata = @(& $docker inspect --format '{{json .}}' $containerName 2>$null)
if ($LASTEXITCODE -ne 0 -or $metadata.Count -eq 0) { throw "LOCAL_POSTGRES_CONTAINER_MISSING_RUN_SETUP" }
$container = ($metadata -join "`n" | ConvertFrom-Json)
$labels = $container.Config.Labels
if ($labels.'com.fixoku.owner-local.scope' -ne "owner-local-persistent" -or $labels.'com.fixoku.owner-local.port' -ne [string]$expectedPort) { throw "LOCAL_POSTGRES_CONTAINER_IDENTITY_INVALID" }
if ($container.Name.Trim("/") -ne $containerName) { throw "LOCAL_POSTGRES_CONTAINER_NAME_INVALID" }
if ($container.State.Status -ne "running") {
  & $docker start $containerName | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "LOCAL_POSTGRES_START_FAILED" }
}

$ready = $false
for ($attempt = 0; $attempt -lt 60; $attempt++) {
  & $docker exec $containerName pg_isready -U fixoku_owner_local -d fixoku_owner_local *> $null
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  Start-Sleep -Milliseconds 500
}
if (-not $ready) { throw "LOCAL_POSTGRES_NOT_READY" }

$migrationCount = ((& $docker exec $containerName psql -U fixoku_owner_local -d fixoku_owner_local -tAc "select count(*) from drizzle.__drizzle_migrations" 2>$null) -join "").Trim()
if ($LASTEXITCODE -ne 0 -or $migrationCount -ne "42") { throw ("LOCAL_MIGRATION_LEDGER_INVALID:" + $migrationCount) }

if ($Verify) {
  Invoke-Verification
  exit 0
}

Write-Host "FIXOKU local Owner environment ready at $expectedOrigin"
Write-Host "Login: $expectedOrigin/seniseviim"
Write-Host "Owner legal panel: $expectedOrigin/panel/owner/yasal-hazirlik"
Write-Host "Credentials are stored outside Git at $credentialPath"
Write-Host "Press Ctrl+C to stop Vite. The PostgreSQL container remains persistent and loopback-only."

& (Get-Command npm.cmd -ErrorAction Stop).Source "run" "dev" "--" "--host" "127.0.0.1" "--port" "5173" "--strictPort"
exit $LASTEXITCODE
