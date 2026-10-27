param(
  [string]$CredentialFile = "",
  [switch]$SkipAuth
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$expectedDatabase = "fixoku_test_commerce_r96p_final2_mvoiuzes_706c05"
$expectedPort = 55432
$expectedAppOrigin = "http://127.0.0.1:5276"
$expectedSnapshotHash = "0FEC9EE90631F63DF841098D690F0E0D7094C9B754F12F2C99ED7693AF1CA5ED"
$snapshotManifest = Join-Path $repo "r96p-final2-clean\R96P_FINAL_2_SNAPSHOT_MANIFEST.tsv"

if (-not $CredentialFile) {
  $CredentialFile = if ($env:R96P_TEST_CREDENTIAL_FILE) { $env:R96P_TEST_CREDENTIAL_FILE } else { Join-Path $env:LOCALAPPDATA "Fixoku\r96p-final4\credentials.env" }
}

function Stop-R96P([string]$Code) {
  throw $Code
}

function Read-KeyValueFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { Stop-R96P "R96P_CREDENTIAL_FILE_MISSING" }
  $values = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = ([string]$line).Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    $match = [regex]::Match($trimmed, '^([A-Z][A-Z0-9_]*)=(.*)$')
    if (-not $match.Success) { Stop-R96P "R96P_CREDENTIAL_FILE_FORMAT_INVALID" }
    $values[$match.Groups[1].Value] = $match.Groups[2].Value
  }
  return $values
}

function Set-ProcessEnvironment([hashtable]$Values) {
  foreach ($key in $Values.Keys) { Set-Item -Path ("Env:{0}" -f $key) -Value ([string]$Values[$key]) }
}

function Assert-DisposableDatabase([string]$Value, [string]$Name) {
  try { $parsed = [Uri]$Value } catch { Stop-R96P ("{0}_INVALID" -f $Name) }
  if ($parsed.Scheme -notin @("postgres", "postgresql") -or $parsed.Host -ne "127.0.0.1" -or [int]$parsed.Port -ne $expectedPort -or $parsed.AbsolutePath -ne ("/" + $expectedDatabase)) { Stop-R96P ("{0}_TARGET_INVALID" -f $Name) }
  if ($parsed.AbsolutePath -match '(?i)prod|production|neon|fixoku_platform_dev|fixoku_owner_local') { Stop-R96P ("{0}_PRODUCTION_TARGET" -f $Name) }
}

function Get-LoopbackListenerPid([int]$Port) {
  foreach ($line in @(netstat -ano -p tcp 2>$null | Select-String ("^\s*TCP\s+127\.0\.0\.1:{0}\s+\S+\s+LISTENING\s+(\d+)\s*$" -f $Port))) {
    $match = [regex]::Match([string]$line, ("TCP\s+127\.0\.0\.1:{0}\s+\S+\s+LISTENING\s+(\d+)" -f $Port))
    if ($match.Success) { return [int]$match.Groups[1].Value }
  }
  return $null
}

function Assert-R96PContainer {
  $docker = (Get-Command docker.exe -ErrorAction Stop).Source
  $raw = @(& $docker inspect --format '{{json .}}' "fixoku-owner-local-pg-20261019" 2>$null)
  if ($LASTEXITCODE -ne 0 -or $raw.Count -eq 0) { Stop-R96P "R96P_DISPOSABLE_CONTAINER_MISSING" }
  try { $container = (($raw -join "`n") | ConvertFrom-Json) } catch { Stop-R96P "R96P_DISPOSABLE_CONTAINER_METADATA_INVALID" }
  if ($container.Name.Trim("/") -ne "fixoku-owner-local-pg-20261019") { Stop-R96P "R96P_DISPOSABLE_CONTAINER_NAME_INVALID" }
  if ($container.State.Status -ne "running") { Stop-R96P "R96P_DISPOSABLE_CONTAINER_NOT_RUNNING" }
  if ($container.Config.Labels.'com.fixoku.owner-local.scope' -ne "owner-local-persistent" -or $container.Config.Labels.'com.fixoku.owner-local.port' -ne "55432") { Stop-R96P "R96P_DISPOSABLE_CONTAINER_LABEL_INVALID" }
  $binding = @($container.HostConfig.PortBindings.'5432/tcp') | Where-Object { $_.HostIp -eq "127.0.0.1" -and $_.HostPort -eq "55432" }
  if (-not $binding) { Stop-R96P "R96P_DISPOSABLE_CONTAINER_PORT_INVALID" }
}

if (-not (Test-Path -LiteralPath (Join-Path $repo "package.json") -PathType Leaf) -or -not (Test-Path -LiteralPath (Join-Path $repo "vite.config.js") -PathType Leaf)) { Stop-R96P "R96P_SOURCE_ROOT_INVALID" }
if ((Get-Content -LiteralPath (Join-Path $repo "package.json") -Raw) -notmatch '"name"\s*:\s*"fixoku-site"') { Stop-R96P "R96P_SOURCE_IDENTITY_INVALID" }
if (-not (Test-Path -LiteralPath $snapshotManifest -PathType Leaf)) { Stop-R96P "R96P_SNAPSHOT_MANIFEST_MISSING" }
if ((Get-FileHash -LiteralPath $snapshotManifest -Algorithm SHA256).Hash -ne $expectedSnapshotHash) { Stop-R96P "R96P_SNAPSHOT_MANIFEST_HASH_MISMATCH" }

$credentials = Read-KeyValueFile $CredentialFile
foreach ($required in @("DATABASE_URL", "TEST_DATABASE_URL", "BETTER_AUTH_SECRET", "TEST_SEED_PASSWORD")) {
  if (-not $credentials.ContainsKey($required) -or -not $credentials[$required]) { Stop-R96P ("R96P_CREDENTIAL_REQUIRED_{0}" -f $required) }
}
if ($credentials.DATABASE_URL -ne $credentials.TEST_DATABASE_URL) { Stop-R96P "R96P_DATABASE_TARGET_MISMATCH" }
Assert-DisposableDatabase $credentials.DATABASE_URL "DATABASE_URL"
Assert-DisposableDatabase $credentials.TEST_DATABASE_URL "TEST_DATABASE_URL"
Assert-R96PContainer
if ([string]$credentials.BETTER_AUTH_SECRET -match '(?i)change_me|production|neon' -or $credentials.BETTER_AUTH_SECRET.Length -lt 32) { Stop-R96P "R96P_AUTH_SECRET_INVALID" }

$fullCredentialPath = (Resolve-Path -LiteralPath $CredentialFile).Path
if ($fullCredentialPath.StartsWith($repo, [StringComparison]::OrdinalIgnoreCase)) { Stop-R96P "R96P_CREDENTIAL_FILE_MUST_BE_OUTSIDE_SOURCE" }

$referencePid = Get-LoopbackListenerPid 5196
$referenceState = if ($referencePid) { "LISTENING_PID_$referencePid" } else { "NOT_LISTENING" }
$busyPid = Get-LoopbackListenerPid 5276
if ($busyPid) { Stop-R96P ("R96P_PORT_5276_BUSY_PID_{0}" -f $busyPid) }

$r96bMediaRoot = Join-Path $env:USERPROFILE ".codex\worktrees\r96b-panel-media-integration\paytr-kolaygelsin-integration-024g\private"
$runtime = @{
  DATABASE_URL = $credentials.DATABASE_URL
  TEST_DATABASE_URL = $credentials.TEST_DATABASE_URL
  BETTER_AUTH_SECRET = $credentials.BETTER_AUTH_SECRET
  TEST_SEED_PASSWORD = $credentials.TEST_SEED_PASSWORD
  APP_ORIGIN = $expectedAppOrigin
  BETTER_AUTH_URL = $expectedAppOrigin
  FIXOKU_LOCAL_ORIGIN = $expectedAppOrigin
  NODE_ENV = "development"
  FIXOKU_SKIP_LOCAL_ENV = "1"
  LOCAL_REVIEW_MODE = "1"
  VITE_LOCAL_REVIEW_MODE = "1"
  VITE_R96P_FINAL2_FIXTURE = "1"
  FIXOKU_DEV_LOGIN_ENABLED = "0"
  FIXOKU_REQUIRE_PRIVILEGED_2FA = "0"
  FIXOKU_OWNER_REQUIRE_PRIVILEGED_2FA = "0"
  PAYTR_ENABLED = "0"
  SHIPPING_PROVIDER = "DISABLED"
  EMAIL_PROVIDER = "DISABLED"
  DIGITAL_STORAGE_PROVIDER = "LOCAL"
  DIGITAL_STORAGE_ROOT = $r96bMediaRoot
  BETTER_AUTH_TEST_MAIL_SINK = "1"
  FIXOKU_LOCAL_REVIEW_ERSIN_EMAIL = "owner.r96p.final2@example.test"
  FIXOKU_LOCAL_REVIEW_SUPER_ADMIN_EMAIL = "admin.r96p.final2@example.test"
  FIXOKU_LOCAL_REVIEW_OZLEM_EMAIL = "trainer.ozlem.r96p.final2@example.test"
  FIXOKU_LOCAL_REVIEW_ELIF_EMAIL = "elif.r96p.final2@example.test"
  FIXOKU_LOCAL_REVIEW_HATICE_EMAIL = "student.r96p.final2@example.test"
}
Set-ProcessEnvironment $runtime

$node = (Get-Command node.exe -ErrorAction Stop).Source
$verifyOutput = @(& $node (Join-Path $repo "scripts\verify-r96p-disposable-runtime.mjs") 2>&1)
if ($LASTEXITCODE -ne 0) { Stop-R96P "R96P_DISPOSABLE_DB_CHECK_FAILED" }

$logPath = Join-Path $env:TEMP ("fixoku-r96p-final4-5276-{0}.log" -f $PID)
$errorPath = Join-Path $env:TEMP ("fixoku-r96p-final4-5276-{0}.err.log" -f $PID)
$server = $null
try {
  $server = Start-Process -FilePath $node -ArgumentList @("node_modules/vite/bin/vite.js", "--configLoader", "native", "--host", "127.0.0.1", "--port", "5276", "--strictPort") -WorkingDirectory $repo -RedirectStandardOutput $logPath -RedirectStandardError $errorPath -WindowStyle Hidden -PassThru
  $ready = $false
  for ($attempt = 0; $attempt -lt 120; $attempt++) {
    if ($server.HasExited) { Stop-R96P "R96P_VITE_EXITED" }
    try {
      $rootResponse = Invoke-WebRequest -Uri ($expectedAppOrigin + "/yerel-inceleme") -UseBasicParsing -TimeoutSec 2
      if ($rootResponse.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { Stop-R96P "R96P_VITE_HEALTH_FAILED" }

  if (-not $SkipAuth) {
    & $node (Join-Path $repo "scripts\test-r96p-local-review-http.mjs") *> $null
    if ($LASTEXITCODE -ne 0) { Stop-R96P "R96P_LOCAL_REVIEW_AUTH_FAILED" }
  }

  Write-Host ("R96P_REFERENCE_5196={0}" -f $referenceState)
  Write-Host "R96P_RUNTIME_PORT=5276"
  Write-Host ("R96P_MEDIA_ROOT={0}" -f $runtime.DIGITAL_STORAGE_ROOT)
  Write-Host "R96P_RUNTIME_HEALTH=PASS"
  Write-Host ("R96P_AUTH_CHECK={0}" -f ($(if ($SkipAuth) { "SKIPPED" } else { "PASS" })))
  Write-Host "R96P_DATABASE=DISPOSABLE_VERIFIED"
  Write-Host ("R96P_VITE_PID={0}" -f $server.Id)
  Write-Host "R96P_RUNTIME_READY=YES"
  Write-Host "The 5276 process is left running. No existing process was stopped."
} catch {
  if ($server -and -not $server.HasExited) {
    $owned = Get-Process -Id $server.Id -ErrorAction SilentlyContinue
    if ($owned -and $owned.ProcessName -eq "node") { Stop-Process -Id $server.Id -ErrorAction SilentlyContinue }
  }
  throw
} finally {
  Remove-Item -LiteralPath $logPath,$errorPath -Force -ErrorAction SilentlyContinue
}
