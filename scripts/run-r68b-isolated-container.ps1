param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repo = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repo
$node = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$dockerCommand = Get-Command docker -ErrorAction Stop
$docker = $dockerCommand.Source
$containerName = $null
$containerId = $null
$runId = $null
$hostPort = $null
$sourceUrl = $null
$ownedVolumeNames = @()
$volumeRoot = $null
$unmanagedVolumeDetected = $false
$containerIdentityVerified = $false
$cleanupFailed = $false
$runnerExitCode = 1
$runnerOutput = @()

function New-RandomHex([int]$byteCount) {
  $bytes = New-Object byte[] $byteCount
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return (-join ($bytes | ForEach-Object { $_.ToString("x2") }))
}

function New-RandomPassword {
  $bytes = New-Object byte[] 36
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return [Convert]::ToBase64String($bytes)
}

function Invoke-DockerText([string[]]$Arguments) {
  $output = @(& $docker @Arguments 2>$null)
  if ($LASTEXITCODE -ne 0) { throw "R68B_DOCKER_COMMAND_FAILED" }
  return @($output | ForEach-Object { [string]$_ })
}

function Get-ProcessEnvironmentSnapshot([string[]]$Names) {
  $snapshot = @{}
  foreach ($name in $Names) {
    $value = [Environment]::GetEnvironmentVariable($name, "Process")
    $snapshot[$name] = @{ Present = $null -ne $value; Value = $value }
  }
  return $snapshot
}

function Restore-ProcessEnvironment($Snapshot) {
  foreach ($entry in $Snapshot.GetEnumerator()) {
    if ($entry.Value.Present) { [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value.Value, "Process") }
    else { [Environment]::SetEnvironmentVariable($entry.Key, $null, "Process") }
  }
}

function Set-ProcessEnvironment([string]$Name, [AllowNull()][string]$Value) {
  [Environment]::SetEnvironmentVariable($Name, $Value, "Process")
}

function Redact-Output([string]$Text) {
  if ($null -eq $Text) { return "" }
  return [regex]::Replace($Text, '(?i)(postgres(?:ql)?://)[^@\s"]+@', '$1[REDACTED]@')
}

function Get-OfficialPostgresImageInfo([string]$RequestedImage) {
  if ($RequestedImage -and $RequestedImage -notmatch '(?i)^postgres:(?:latest|[0-9]+(?:\.[0-9]+){0,2}(?:-[a-z0-9._-]+)?)$') {
    throw "R68B_OFFICIAL_POSTGRES_IMAGE_REQUIRED"
  }
  $images = @()
  if ($RequestedImage) {
    $images = @(Invoke-DockerText -Arguments @("image", "inspect", $RequestedImage, "--format", "{{json .}}"))
  }
  else {
    $images = @(Invoke-DockerText -Arguments @("image", "ls", "--format", "{{.Repository}}:{{.Tag}}") | Where-Object { $_ -match '(?i)^postgres:(?:latest|[0-9]+(?:\.[0-9]+){0,2}(?:-[a-z0-9._-]+)?)$' } | Sort-Object -Descending)
    if (@($images).Length -gt 0) { $RequestedImage = $images[0] }
    if ($RequestedImage) {
      $images = @(Invoke-DockerText -Arguments @("image", "inspect", $RequestedImage, "--format", "{{json .}}"))
    }
  }
  if (-not $RequestedImage -or @($images).Length -eq 0) { throw "R68B_LOCAL_OFFICIAL_POSTGRES_IMAGE_NOT_FOUND_NO_PULL" }
  $imageMetadata = ($images -join "`n") | ConvertFrom-Json
  $repoTags = @($imageMetadata.RepoTags)
  $repoDigests = @($imageMetadata.RepoDigests)
  if ($repoTags -notcontains $RequestedImage) { throw "R68B_POSTGRES_IMAGE_TAG_NOT_VERIFIED" }
  if (-not ($repoDigests | Where-Object { $_ -match '(?i)(?:docker\.io/|index\.docker\.io/)?(?:library/)?postgres@sha256:[0-9a-f]{64}$' })) {
    throw "R68B_POSTGRES_OFFICIAL_DIGEST_NOT_VERIFIED"
  }

  $imageEnv = @{}
  foreach ($entry in @($imageMetadata.Config.Env)) {
    $parts = @(([string]$entry) -split "=", 2)
    if ($parts.Length -eq 2) { $imageEnv[$parts[0]] = $parts[1] }
  }
  $pgMajor = 0
  if ($imageEnv.ContainsKey("PG_MAJOR") -and $imageEnv["PG_MAJOR"] -match '^[0-9]+$') {
    $pgMajor = [int]$imageEnv["PG_MAJOR"]
  }
  if ($pgMajor -lt 1) { throw "R68B_POSTGRES_MAJOR_NOT_VERIFIED" }
  if ($RequestedImage -match '^postgres:([0-9]+)') {
    if ([int]$Matches[1] -ne $pgMajor) { throw "R68B_POSTGRES_TAG_MAJOR_MISMATCH" }
  }

  if ($pgMajor -ge 18) {
    $expectedPgData = "/var/lib/postgresql/$pgMajor/docker"
    $expectedVolumeRoot = "/var/lib/postgresql"
  } else {
    $expectedPgData = "/var/lib/postgresql/data"
    $expectedVolumeRoot = "/var/lib/postgresql/data"
  }
  if ($imageEnv["PGDATA"] -ne $expectedPgData) { throw "R68B_POSTGRES_PGDATA_LAYOUT_UNVERIFIED" }
  if ($null -eq $imageMetadata.Config.Volumes) { throw "R68B_POSTGRES_VOLUME_LAYOUT_UNVERIFIED" }
  $declaredVolumes = @($imageMetadata.Config.Volumes.PSObject.Properties | ForEach-Object { $_.Name })
  if ($declaredVolumes -notcontains $expectedVolumeRoot) { throw "R68B_POSTGRES_VOLUME_LAYOUT_UNVERIFIED" }
  return [pscustomobject]@{
    Name = $RequestedImage
    Major = $pgMajor
    PgData = $expectedPgData
    VolumeRoot = $expectedVolumeRoot
    TmpfsPath = $expectedVolumeRoot
  }
}

function Invoke-HostTcpAuthentication([string]$NodePath, [string]$ConnectionString) {
  $probe = @'
import pg from "pg";
const raw = process.env.R68B_HOST_TCP_AUTH_URL || "";
const url = new URL(raw);
if (url.hostname !== "127.0.0.1" || url.pathname !== "/postgres") throw new Error("R68B_HOST_TCP_TARGET_INVALID");
const pool = new pg.Pool({ connectionString: raw, max: 1, connectionTimeoutMillis: 3000 });
try {
  const row = (await pool.query("select current_database() as database")).rows[0];
  if (row?.database !== "postgres") throw new Error("R68B_HOST_TCP_DATABASE_INVALID");
  process.stdout.write("R68B_HOST_TCP_AUTH_PASS\n");
} finally {
  await pool.end();
}
'@
  Set-ProcessEnvironment "R68B_HOST_TCP_AUTH_URL" $ConnectionString
  try {
    $probeOutput = @($probe | & $NodePath --input-type=module - 2>$null)
    if ($LASTEXITCODE -ne 0 -or -not ($probeOutput -contains "R68B_HOST_TCP_AUTH_PASS")) { throw "R68B_HOST_TCP_AUTH_FAILED" }
  } finally {
    Set-ProcessEnvironment "R68B_HOST_TCP_AUTH_URL" $null
  }
}

function Get-ContainerMetadata([string]$Id) {
  $json = ((Invoke-DockerText -Arguments @("inspect", "--format", "{{json .}}", $Id)) -join "`n")
  return ($json | ConvertFrom-Json)
}

$environmentNames = @(
  "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB", "R68B_HOST_TCP_AUTH_URL",
  "R68B_SOURCE_DATABASE_URL", "R68B_CONTAINER_NAME", "R68B_EXPECTED_PORT", "R68B_CONTAINER_ID",
  "R68B_ISOLATED_MODE", "R68B_RUN_LABEL_KEY", "R68B_RUN_LABEL_VALUE", "R68B_SCOPE_LABEL_VALUE",
  "NODE_ENV", "VERCEL", "VERCEL_ENV"
)
$environmentSnapshot = Get-ProcessEnvironmentSnapshot $environmentNames

try {
  if (-not (Test-Path -LiteralPath $node -PathType Leaf)) { throw "BUNDLED_NODE_NOT_FOUND" }
  $ostype = (Invoke-DockerText -Arguments @("info", "--format", "{{.OSType}}") | Select-Object -First 1).Trim()
  if ($ostype -ne "linux") { throw "DOCKER_LINUX_ENGINE_REQUIRED" }

  $postgresImageInfo = Get-OfficialPostgresImageInfo ([Environment]::GetEnvironmentVariable("R68B_POSTGRES_IMAGE", "Process"))
  $postgresImage = $postgresImageInfo.Name
  $volumeRoot = $postgresImageInfo.VolumeRoot
  $runId = New-RandomHex 12
  $containerName = "fixoku-r68b-$runId"
  $scopeLabelValue = "owner-approved-isolated"
  $labelKey = "com.fixoku.r68b.run-id"
  $existing = @(Invoke-DockerText -Arguments @("ps", "-a", "--filter", "name=^$containerName$", "--format", "{{.ID}}")) | Where-Object { $_.Trim() }
  if (@($existing).Length -ne 0) { throw "R68B_CONTAINER_NAME_COLLISION" }

  $temporaryUser = "r68b_test"
  $temporaryPassword = New-RandomPassword
  Set-ProcessEnvironment "POSTGRES_USER" $temporaryUser
  Set-ProcessEnvironment "POSTGRES_PASSWORD" $temporaryPassword
  Set-ProcessEnvironment "POSTGRES_DB" "postgres"
  try {
    $runOutput = @(Invoke-DockerText -Arguments @(
      "run", "--detach", "--name", $containerName,
      "--label", "$labelKey=$runId",
      "--label", "com.fixoku.r68b.scope=$scopeLabelValue",
      "--publish", "127.0.0.1::5432",
      "--tmpfs", "$($postgresImageInfo.TmpfsPath):rw,size=1g",
      "--env", "POSTGRES_USER",
      "--env", "POSTGRES_PASSWORD",
      "--env", "POSTGRES_DB=postgres",
      $postgresImage
    ))
  } finally {
    Set-ProcessEnvironment "POSTGRES_USER" $null
    Set-ProcessEnvironment "POSTGRES_PASSWORD" $null
    Set-ProcessEnvironment "POSTGRES_DB" $null
  }
  $containerId = ($runOutput | Select-Object -Last 1).Trim()
  if ($containerId -notmatch '^[0-9a-f]{64}$') { throw "R68B_CONTAINER_ID_UNAVAILABLE" }

  $metadata = Get-ContainerMetadata $containerId
  $labels = $metadata.Config.Labels
  $runLabel = $labels.PSObject.Properties[$labelKey].Value
  $scopeLabel = $labels.PSObject.Properties["com.fixoku.r68b.scope"].Value
  if ($metadata.Id -ne $containerId -or $metadata.Name.Trim("/") -ne $containerName -or $runLabel -ne $runId -or $scopeLabel -ne $scopeLabelValue) {
    throw "R68B_CONTAINER_ID_LABEL_MISMATCH"
  }
  $containerIdentityVerified = $true
  $volumeMounts = @($metadata.Mounts | Where-Object { $_.Type -eq "volume" })
  $unsafeVolumeMounts = @($volumeMounts | Where-Object { $_.Destination -ne $volumeRoot -or $_.Name -notmatch '^[0-9a-f]{64}$' })
  if (@($unsafeVolumeMounts).Length -gt 0) { $unmanagedVolumeDetected = $true; throw "R68B_UNSAFE_VOLUME_LAYOUT" }
  $ownedVolumeNames = @($volumeMounts | ForEach-Object { $_.Name })

  # Read the already-inspected JSON object rather than using a Docker Go
  # template containing nested quotes (Windows PowerShell can strip them).
  $portBindingsProperty = $metadata.NetworkSettings.Ports.PSObject.Properties['5432/tcp']
  if ($null -eq $portBindingsProperty) { throw "R68B_PUBLISHED_POSTGRES_PORT_NOT_FOUND" }
  $portBindings = @($portBindingsProperty.Value)
  if ($portBindings.Length -ne 1) { throw "R68B_PUBLISHED_POSTGRES_PORT_COUNT_INVALID" }
  $portBinding = $portBindings[0]
  if ($portBinding.HostIP -ne "127.0.0.1" -or $portBinding.HostPort -notmatch '^[1-9][0-9]{1,4}$' -or $portBinding.HostPort -eq "5433") { throw "R68B_DYNAMIC_LOOPBACK_PORT_INVALID" }
  $hostPort = [string]$portBinding.HostPort

  $encodedUser = [Uri]::EscapeDataString($temporaryUser)
  $encodedPassword = [Uri]::EscapeDataString($temporaryPassword)
  $sourceUrl = "postgresql://$encodedUser`:$encodedPassword@127.0.0.1:$hostPort/postgres"

  $ready = $false
  $deadline = [DateTime]::UtcNow.AddSeconds(60)
  while (-not $ready -and [DateTime]::UtcNow -lt $deadline) {
    try {
      Invoke-HostTcpAuthentication $node $sourceUrl
      $ready = $true
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $ready) { throw "R68B_HOST_TCP_AUTH_TIMEOUT" }

  Set-ProcessEnvironment "R68B_ISOLATED_MODE" "1"
  Set-ProcessEnvironment "R68B_SOURCE_DATABASE_URL" $sourceUrl
  Set-ProcessEnvironment "R68B_CONTAINER_NAME" $containerName
  Set-ProcessEnvironment "R68B_EXPECTED_PORT" $hostPort
  Set-ProcessEnvironment "R68B_CONTAINER_ID" $containerId
  Set-ProcessEnvironment "R68B_RUN_LABEL_KEY" $labelKey
  Set-ProcessEnvironment "R68B_RUN_LABEL_VALUE" $runId
  Set-ProcessEnvironment "R68B_SCOPE_LABEL_VALUE" $scopeLabelValue
  Set-ProcessEnvironment "NODE_ENV" $null
  Set-ProcessEnvironment "VERCEL" $null
  Set-ProcessEnvironment "VERCEL_ENV" $null
  $runnerOutput = @(& $node "scripts/run-r68b-disposable.mjs" 2>$null)
  $runnerExitCode = $LASTEXITCODE
  $runnerOutput | ForEach-Object { Write-Output (Redact-Output ([string]$_)) }
} catch {
  $runnerExitCode = 1
  Write-Host ("R68B_ERROR_LINE={0}" -f $_.InvocationInfo.ScriptLineNumber)
  Write-Host ("R68B_ERROR={0}" -f (Redact-Output $_.Exception.Message))
} finally {
  try {
    if ($containerId -and $containerIdentityVerified) {
      $current = Get-ContainerMetadata $containerId
      $currentLabels = $current.Config.Labels
      if ($current.Id -ne $containerId -or $current.Name.Trim("/") -ne $containerName -or $currentLabels.PSObject.Properties[$labelKey].Value -ne $runId -or $currentLabels.PSObject.Properties["com.fixoku.r68b.scope"].Value -ne "owner-approved-isolated") {
        throw "R68B_CLEANUP_ID_LABEL_MISMATCH"
      }
      $currentVolumeMounts = @($current.Mounts | Where-Object { $_.Type -eq "volume" })
      $volumeCleanupSafe = @($currentVolumeMounts).Length -eq @($ownedVolumeNames).Length
      foreach ($currentVolumeMount in $currentVolumeMounts) {
        if ($currentVolumeMount.Destination -ne $volumeRoot -or $currentVolumeMount.Name -notmatch '^[0-9a-f]{64}$' -or $ownedVolumeNames -notcontains $currentVolumeMount.Name) {
          $volumeCleanupSafe = $false
        }
      }
      $null = Invoke-DockerText -Arguments @("rm", "--force", $containerId)
      if (-not $volumeCleanupSafe -or $unmanagedVolumeDetected) {
        throw "R68B_UNSAFE_VOLUME_CLEANUP_REFUSED"
      }
      foreach ($volumeName in $ownedVolumeNames) {
        if ($volumeName) {
          $null = Invoke-DockerText -Arguments @("volume", "rm", $volumeName)
        }
      }
    } elseif ($containerId) {
      throw "R68B_CLEANUP_IDENTITY_UNVERIFIED"
    }
  } catch {
    $cleanupFailed = $true
    Write-Host "R68B_CONTAINER_CLEANUP=FAIL"
  } finally {
    Restore-ProcessEnvironment $environmentSnapshot
  }
}

if ($cleanupFailed) { $runnerExitCode = 1 }
exit $runnerExitCode
