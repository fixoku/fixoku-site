$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repo = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repo

$containerName = "fixoku-owner-local-pg-20261019"
$volumeName = "fixoku-owner-local-pgdata-20261019"
$hostPort = 55432
$dbName = "fixoku_owner_local"
$dbUser = "fixoku_owner_local"
$origin = "http://127.0.0.1:5173"
$envPath = Join-Path $repo ".env.local"
$credentialDir = Join-Path $env:LOCALAPPDATA "Fixoku\owner-local"
$credentialPath = Join-Path $credentialDir "credentials.env"
$node = (Get-Command node.exe -ErrorAction Stop).Source
$docker = (Get-Command docker -ErrorAction Stop).Source
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$serverProcess = $null
$serverLog = Join-Path $env:TEMP ("fixoku-owner-local-vite-" + $PID + ".log")
$serverErrorLog = Join-Path $env:TEMP ("fixoku-owner-local-vite-" + $PID + ".err.log")

function New-Token([int]$byteCount) {
  $bytes = New-Object byte[] $byteCount
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

function Read-KeyValueFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return @{} }
  $values = @{}
  $lineNumber = 0
  foreach ($line in Get-Content -LiteralPath $Path) {
    $lineNumber++
    $trimmed = ([string]$line).Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    $match = [regex]::Match($trimmed, '^([A-Z][A-Z0-9_]*)=(.*)$')
    if (-not $match.Success) { throw ("LOCAL_ENV_FORMAT_INVALID:" + $Path + ":" + $lineNumber) }
    $values[$match.Groups[1].Value] = $match.Groups[2].Value
  }
  return $values
}

function Write-KeyValueFile([string]$Path, [hashtable]$Values) {
  $lines = @("# FIXOKU local-only Owner environment; ignored by Git")
  foreach ($entry in $Values.GetEnumerator() | Sort-Object Key) { $lines += ("{0}={1}" -f $entry.Key, $entry.Value) }
  [System.IO.File]::WriteAllLines($Path, $lines, [System.Text.UTF8Encoding]::new($false))
}

function Set-ProcessEnvironment([hashtable]$Values) {
  foreach ($key in $Values.Keys) { Set-Item -Path ("Env:{0}" -f $key) -Value ([string]$Values[$key]) }
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

function Assert-Container([object]$Metadata) {
  if ($Metadata.Name.Trim("/") -ne $containerName) { throw "LOCAL_CONTAINER_NAME_INVALID" }
  $labels = $Metadata.Config.Labels
  if ($labels.'com.fixoku.owner-local.scope' -ne "owner-local-persistent") { throw "LOCAL_CONTAINER_SCOPE_INVALID" }
  if ($labels.'com.fixoku.owner-local.port' -ne [string]$hostPort) { throw "LOCAL_CONTAINER_PORT_LABEL_INVALID" }
  $portProperty = $Metadata.NetworkSettings.Ports.PSObject.Properties['5432/tcp']
  if ($null -eq $portProperty -or @($portProperty.Value).Count -ne 1) { throw "LOCAL_CONTAINER_PORT_BINDING_INVALID" }
  $binding = @($portProperty.Value)[0]
  if ($binding.HostIP -ne "127.0.0.1" -or $binding.HostPort -ne [string]$hostPort) { throw "LOCAL_CONTAINER_LOOPBACK_BINDING_INVALID" }
  $mount = @($Metadata.Mounts | Where-Object { $_.Type -eq "volume" -and $_.Name -eq $volumeName -and $_.Destination -eq "/var/lib/postgresql" })
  if ($mount.Count -ne 1) { throw "LOCAL_CONTAINER_VOLUME_INVALID" }
}

function Wait-Postgres {
  for ($attempt = 0; $attempt -lt 120; $attempt++) {
    & $docker exec $containerName pg_isready -U $dbUser -d $dbName *> $null
    if ($LASTEXITCODE -eq 0) { return }
    Start-Sleep -Milliseconds 500
  }
  throw "LOCAL_POSTGRES_NOT_READY"
}

function Protect-CredentialFile([string]$Path) {
  $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  $acl = Get-Acl -LiteralPath $Path
  $acl.SetAccessRuleProtection($true, $false)
  $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($identity, "FullControl", "Allow")
  $acl.SetAccessRule($rule)
  Set-Acl -LiteralPath $Path -AclObject $acl
}

$existingEnv = Read-KeyValueFile $envPath
$fresh = $existingEnv.Count -eq 0
if ($fresh) {
  $dbPassword = New-Token 36
  $authSecret = New-Token 48
  $ownerEmail = "owner.local.test@example.test"
  $ownerPassword = "OwnerLocal-" + (New-Token 24)
  $existingEnv = @{
    DATABASE_URL = "postgresql://" + $dbUser + ":" + $dbPassword + "@127.0.0.1:" + $hostPort + "/" + $dbName
    TEST_DATABASE_URL = "postgresql://" + $dbUser + ":" + $dbPassword + "@127.0.0.1:" + $hostPort + "/" + $dbName
    BETTER_AUTH_SECRET = $authSecret
    FIXOKU_LOCAL_ORIGIN = $origin
    FIXOKU_OWNER_LOCAL_CONTAINER = $containerName
    FIXOKU_OWNER_LOCAL_DB_PORT = [string]$hostPort
    EMAIL_PROVIDER = "DISABLED"
    BETTER_AUTH_TEST_MAIL_SINK = "1"
    PAYTR_ENABLED = "0"
    SHIPPING_PROVIDER = "DISABLED"
    DIGITAL_STORAGE_PROVIDER = "LOCAL"
    PROFILE_MEDIA_PROVIDER = "LOCAL"
    FIXOKU_DEV_LOGIN_ENABLED = "0"
  }
  Write-KeyValueFile $envPath $existingEnv
  New-Item -ItemType Directory -Path $credentialDir -Force | Out-Null
  $credentialLines = @(
    "FIXOKU_OWNER_TEST_EMAIL=$ownerEmail",
    "FIXOKU_OWNER_TEST_PASSWORD=$ownerPassword",
    "FIXOKU_OWNER_TEST_NAME=Local Test Owner"
  )
  [System.IO.File]::WriteAllLines($credentialPath, $credentialLines, [System.Text.UTF8Encoding]::new($false))
  Protect-CredentialFile $credentialPath
} elseif (-not (Test-Path -LiteralPath $credentialPath -PathType Leaf)) {
  throw "OWNER_LOCAL_CREDENTIAL_FILE_MISSING"
}

$database = [Uri]$existingEnv.DATABASE_URL
if ($database.Scheme -ne "postgresql" -or $database.Host -ne "127.0.0.1" -or [int]$database.Port -ne $hostPort -or $database.AbsolutePath -ne "/" + $dbName) { throw "LOCAL_DATABASE_TARGET_INVALID" }
if ($existingEnv.TEST_DATABASE_URL -ne $existingEnv.DATABASE_URL) { throw "LOCAL_TEST_DATABASE_TARGET_INVALID" }
if ($existingEnv.BETTER_AUTH_SECRET.Length -lt 32) { throw "LOCAL_AUTH_SECRET_WEAK" }

Set-ProcessEnvironment $existingEnv
$env:APP_ORIGIN = $null
$env:BETTER_AUTH_URL = $null
$env:FIXOKU_SKIP_LOCAL_ENV = "1"
$env:NODE_ENV = "development"
$env:LOCAL_REVIEW_MODE = "0"
$env:FIXOKU_REQUIRE_PRIVILEGED_2FA = "1"
$env:BETTER_AUTH_TEST_MAIL_SINK = "1"
$env:FIXOKU_OWNER_CREDENTIAL_FILE = $credentialPath

$image = "postgres:18.4"
$imageJson = @(& $docker image inspect $image --format '{{json .}}' 2>$null)
if ($LASTEXITCODE -ne 0 -or $imageJson.Count -eq 0) { throw "OFFICIAL_POSTGRES_IMAGE_MISSING_NO_PULL" }
$imageMetadata = ($imageJson -join [Environment]::NewLine | ConvertFrom-Json)
if ($imageMetadata.Id -ne "sha256:a02db8cac496f15b094798a38254f14d6e00741f709360e5e00bb6668ea31636") { throw "OFFICIAL_POSTGRES_IMAGE_DIGEST_CHANGED" }
if ($imageMetadata.Config.Env -notcontains "PGDATA=/var/lib/postgresql/18/docker") { throw "POSTGRES_PGDATA_LAYOUT_INVALID" }

$existingContainerIds = @(@(& $docker ps -a --filter ("name=^/" + $containerName + "$") --format "{{.ID}}" 2>$null) | Where-Object { $_ })
if ($existingContainerIds.Count -gt 0) {
  $containerJson = @(& $docker inspect --format '{{json .}}' $containerName)
  $metadata = ($containerJson -join [Environment]::NewLine | ConvertFrom-Json)
  Assert-Container $metadata
} else {
  $existingVolumes = @(@(& $docker volume ls --filter ("name=^" + $volumeName + "$") --format "{{.Name}}" 2>$null) | Where-Object { $_ })
  if ($existingVolumes.Count -gt 0) {
    $volumeJson = @(& $docker volume inspect $volumeName)
    $volume = ($volumeJson -join [Environment]::NewLine | ConvertFrom-Json)[0]
    if ($volume.Labels.'com.fixoku.owner-local.scope' -ne "owner-local-persistent") { throw "LOCAL_VOLUME_IDENTITY_INVALID" }
  } else {
    & $docker volume create --label "com.fixoku.owner-local.scope=owner-local-persistent" --label ("com.fixoku.owner-local.container=" + $containerName) $volumeName | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "LOCAL_VOLUME_CREATE_FAILED" }
  }
  $temporaryDockerEnv = Join-Path $env:TEMP ("fixoku-owner-local-postgres-" + $PID + ".env")
  $dbPassword = $database.UserInfo.Split(":", 2)[1]
  $dbPassword = [Uri]::UnescapeDataString($dbPassword)
  @("POSTGRES_USER=$dbUser", "POSTGRES_PASSWORD=$dbPassword", "POSTGRES_DB=$dbName") | Set-Content -LiteralPath $temporaryDockerEnv -Encoding ascii
  try {
    $publish = "127.0.0.1:" + $hostPort + ":5432"
    $mount = "type=volume,source=" + $volumeName + ",target=/var/lib/postgresql"
    $id = (& $docker run --detach --name $containerName --restart unless-stopped --label "com.fixoku.owner-local.scope=owner-local-persistent" --label ("com.fixoku.owner-local.port=" + $hostPort) --label "com.fixoku.owner-local.worktree=paytr-kolaygelsin-integration-024g" --publish $publish --mount $mount --env-file $temporaryDockerEnv $image | Select-Object -Last 1).Trim()
    if ($LASTEXITCODE -ne 0 -or $id -notmatch '^[0-9a-f]{64}$') { throw "LOCAL_CONTAINER_CREATE_FAILED" }
  } finally {
    Remove-Item -LiteralPath $temporaryDockerEnv -Force -ErrorAction SilentlyContinue
  }
  $metadata = ((& $docker inspect --format '{{json .}}' $containerName) -join [Environment]::NewLine | ConvertFrom-Json)
  Assert-Container $metadata
}

if ($metadata.State.Status -ne "running") {
  & $docker start $containerName | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "LOCAL_CONTAINER_START_FAILED" }
}
Wait-Postgres
Invoke-Redacted $npm @("run", "db:migrate")

$ownerMarker = @(@(& $docker exec $containerName psql -U $dbUser -d $dbName -tAc "select 1 from platform_memberships where role='OWNER' and status='ACTIVE' limit 1" 2>$null) | Where-Object { ([string]$_).Trim() -eq "1" })
$ownerExists = $ownerMarker.Count -gt 0
if (-not $ownerExists) {
  $credentials = Read-KeyValueFile $credentialPath
  $env:FIXOKU_OWNER_BOOTSTRAP = "1"
  $env:FIXOKU_OWNER_BOOTSTRAP_CONFIRM = "I_UNDERSTAND"
  $env:FIXOKU_OWNER_BOOTSTRAP_EMAIL = $credentials.FIXOKU_OWNER_TEST_EMAIL
  $env:FIXOKU_OWNER_BOOTSTRAP_PASSWORD = $credentials.FIXOKU_OWNER_TEST_PASSWORD
  $env:FIXOKU_OWNER_BOOTSTRAP_NAME = $credentials.FIXOKU_OWNER_TEST_NAME
  Invoke-Redacted $node @("scripts/bootstrap-owner.mjs")
  $env:FIXOKU_OWNER_BOOTSTRAP = $null
  $env:FIXOKU_OWNER_BOOTSTRAP_CONFIRM = $null
  $env:FIXOKU_OWNER_BOOTSTRAP_EMAIL = $null
  $env:FIXOKU_OWNER_BOOTSTRAP_PASSWORD = $null
  $env:FIXOKU_OWNER_BOOTSTRAP_NAME = $null
}

$listener = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($listener) { throw "LOCAL_APP_PORT_5173_BUSY_DO_NOT_KILL_EXISTING_PROCESS" }

try {
  $serverProcess = Start-Process -FilePath $node -ArgumentList @("node_modules/vite/bin/vite.js", "--mode", "test", "--host", "127.0.0.1", "--port", "5173", "--strictPort") -WorkingDirectory $repo -RedirectStandardOutput $serverLog -RedirectStandardError $serverErrorLog -WindowStyle Hidden -PassThru
  $ready = $false
  for ($attempt = 0; $attempt -lt 120; $attempt++) {
    if ($serverProcess.HasExited) { throw "LOCAL_VITE_EXITED" }
    try { $response = Invoke-WebRequest -Uri ($origin + "/") -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -lt 500) { $ready = $true; break } } catch { }
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw "LOCAL_VITE_NOT_READY" }
  & $node "scripts/verify-owner-local.mjs"
  if ($LASTEXITCODE -ne 0) { throw "OWNER_LOCAL_BROWSER_VERIFY_FAILED" }
  Write-Host "OWNER_LOCAL_SETUP=PASS"
  Write-Host ("Persistent container: " + $containerName)
  Write-Host ("Loopback PostgreSQL port: " + $hostPort)
  Write-Host ("Owner credentials file: " + $credentialPath)
} finally {
  if ($serverProcess) {
    $processInfo = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $serverProcess.Id) -ErrorAction SilentlyContinue
    if ($processInfo -and $processInfo.Name -eq "node.exe" -and $processInfo.CommandLine -like "*node_modules/vite/bin/vite.js*--port 5173*" -and -not $serverProcess.HasExited) { Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue }
  }
  Remove-Item -LiteralPath $serverLog,$serverErrorLog -Force -ErrorAction SilentlyContinue
}
