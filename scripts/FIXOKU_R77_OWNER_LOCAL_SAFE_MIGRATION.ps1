param(
  [switch]$Apply,
  [switch]$PathGuardTest
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# FIXOKU R77: local Owner PostgreSQL backup, restore proof, migration preflight,
# and an explicitly bounded 0040 -> 0041 application.  This script never reads
# or writes a remote database and never imports legal documents or creates an
# approval record.  Use -Apply only from the intended local Owner worktree.

$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$initialWorkingDirectory = (Get-Location).Path
Set-Location -LiteralPath $repo

$expectedContainer = "fixoku-owner-local-pg-20261019"
$expectedVolume = "fixoku-owner-local-pgdata-20261019"
$expectedPort = 55432
$expectedDatabase = "fixoku_owner_local"
$expectedUser = "fixoku_owner_local"
$expectedHost = "127.0.0.1"
$migration0040 = "0040_r64_child_identity_isolation"
$migration0041 = "0041_owner_legal_vat_approval"
$requiredMigrations = @($migration0040, $migration0041)
$backupRoot = Join-Path (Join-Path $env:LOCALAPPDATA "Fixoku") "owner-local\backups"
$runId = ((Get-Date).ToUniversalTime().ToString("yyyyMMdd_HHmmss") + "_" + ([guid]::NewGuid().ToString("N").Substring(0, 12))).ToLowerInvariant()
$containerTempFiles = New-Object System.Collections.Generic.List[string]
$hostTempFiles = New-Object System.Collections.Generic.List[string]
$restoreDatabase = $null
$docker = $null
$backupPath = $null
$backupHash = $null
$backupSize = $null
$backupVerified = $false
$restoreVerified = $false
$preflightPassed = $false
$migrationResult = "NOT_RUN"
$identityResult = "NOT_CHECKED"
$ledgerResult = "NOT_CHECKED"
$ledgerVerified = $false
$currentDatabaseVerified = $false
$pathEncodingPassed = $false
$worktreeGuardPassed = $false
$unicodePathPassed = $false
$panelResult = "NOT_CHECKED"
$productionUntouched = "YES"
$stopReason = $null
$envValues = @{}
$sourceEntries = @()
$ledgerRows = @()
$appliedCount = 0
$pendingTags = @()

function Stop-R77([string]$Code) {
  throw ("R77_STOP:" + $Code)
}

function Normalize-WorktreePath([string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path)) { Stop-R77 "WORKTREE_PATH_EMPTY" }
  try { $full = [IO.Path]::GetFullPath($Path) } catch { Stop-R77 "WORKTREE_PATH_INVALID" }
  $full = $full.Replace([IO.Path]::AltDirectorySeparatorChar, [IO.Path]::DirectorySeparatorChar)
  $root = [IO.Path]::GetPathRoot($full)
  if ($root -and $full.Length -gt $root.Length) { $full = $full.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar) }
  return $full
}

function Assert-WorktreePaths([string]$InvocationPath, [string]$ExpectedPath, [string]$GitPath) {
  $expected = Normalize-WorktreePath $ExpectedPath
  if (-not (Test-Path -LiteralPath $expected -PathType Container)) { Stop-R77 "WORKTREE_ROOT_MISSING" }
  $invocation = Normalize-WorktreePath $InvocationPath
  $comparer = [StringComparer]::OrdinalIgnoreCase
  if (-not $comparer.Equals($invocation, $expected)) { Stop-R77 "WORKTREE_INVOCATION_PATH_MISMATCH" }
  if ($GitPath) {
    $gitTop = Normalize-WorktreePath $GitPath
    if (-not $comparer.Equals($gitTop, $expected)) { Stop-R77 "WORKTREE_PATH_MISMATCH" }
  }
  return $expected
}

function Invoke-GitUtf8 {
  $git = (Get-Command git.exe -ErrorAction Stop).Source
  $startInfo = New-Object Diagnostics.ProcessStartInfo
  $startInfo.FileName = $git
  $startInfo.Arguments = '-c core.quotepath=false rev-parse --show-toplevel'
  $startInfo.WorkingDirectory = $repo
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  try {
    $startInfo.StandardOutputEncoding = New-Object Text.UTF8Encoding($false)
    $startInfo.StandardErrorEncoding = New-Object Text.UTF8Encoding($false)
  } catch { Stop-R77 "GIT_UTF8_ENCODING_UNAVAILABLE" }
  $startInfo.EnvironmentVariables["LC_ALL"] = "C.UTF-8"
  $process = New-Object Diagnostics.Process
  $process.StartInfo = $startInfo
  try {
    if (-not $process.Start()) { Stop-R77 "GIT_START_FAILED" }
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { Stop-R77 "GIT_REV_PARSE_FAILED" }
    return $stdout.Trim()
  } finally {
    $process.Dispose()
  }
}

function Read-KeyValueFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { Stop-R77 "ENV_LOCAL_MISSING" }
  $values = @{}
  $lineNumber = 0
  foreach ($line in Get-Content -LiteralPath $Path) {
    $lineNumber++
    $trimmed = ([string]$line).Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    $match = [regex]::Match($trimmed, '^([A-Z][A-Z0-9_]*)=(.*)$')
    if (-not $match.Success) { Stop-R77 ("ENV_LOCAL_FORMAT_INVALID:" + $lineNumber) }
    $values[$match.Groups[1].Value] = $match.Groups[2].Value
  }
  return $values
}

function Invoke-External([string]$FilePath, [string[]]$Arguments) {
  $previousErrorAction = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = @(& $FilePath @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorAction
  }
  if ($exitCode -ne 0) {
    $diagnostic = (($output | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ }) -join " ")
    if ($diagnostic.Length -gt 220) { $diagnostic = $diagnostic.Substring(0, 220) }
    if ($diagnostic -match '(?i)(password|postgres(?:ql)?://|secret|token|key)') { $diagnostic = "external command failed" }
    Stop-R77 ("EXTERNAL_COMMAND_FAILED:" + $exitCode + ":" + $diagnostic)
  }
  return @($output | ForEach-Object { [string]$_ })
}

function Invoke-Docker([string[]]$Arguments) {
  return ,@(Invoke-External -FilePath $docker -Arguments $Arguments)
}

function Invoke-ContainerPsql([string]$Database, [string]$Sql) {
  $wrapped = "BEGIN READ ONLY;`n" + $Sql + "`nROLLBACK;"
  $lines = @(Invoke-Docker @("exec", $expectedContainer, "psql", "-U", $expectedUser, "-d", $Database, "-X", "-q", "-A", "-t", "-F", "|", "-v", "ON_ERROR_STOP=1", "-c", $wrapped))
  # Keep even one native stdout line as an array; otherwise PowerShell turns
  # $row[0] into the first character of the scalar line.
  return ,$lines
}

function Invoke-ContainerPsqlWrite([string]$Database, [string]$Sql) {
  return ,@(Invoke-Docker @("exec", $expectedContainer, "psql", "-U", $expectedUser, "-d", $Database, "-X", "-q", "-A", "-t", "-F", "|", "-v", "ON_ERROR_STOP=1", "-c", $Sql))
}

function Quote-Identifier([string]$Value) {
  return '"' + $Value.Replace('"', '""') + '"'
}

function Protect-PrivatePath([string]$Path) {
  $full = [IO.Path]::GetFullPath($Path)
  if (-not (Test-Path -LiteralPath $full)) { Stop-R77 "PRIVATE_PATH_MISSING" }
  try {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $acl = Get-Acl -LiteralPath $full
    $acl.SetAccessRuleProtection($true, $false)
    foreach ($rule in @($acl.Access)) { [void]$acl.RemoveAccessRule($rule) }
    $inheritance = [Security.AccessControl.InheritanceFlags]::None
    $propagation = [Security.AccessControl.PropagationFlags]::None
    if ((Get-Item -LiteralPath $full).PSIsContainer) {
      $inheritance = [Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit
    }
    $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity, "FullControl", $inheritance, $propagation, "Allow")
    $acl.AddAccessRule($rule)
    Set-Acl -LiteralPath $full -AclObject $acl
  } catch {
    Stop-R77 "BACKUP_PATH_ACL_PROTECTION_FAILED"
  }
}

function Read-SourceMigrations {
  $journalPath = Join-Path $repo "drizzle\migrations\meta\_journal.json"
  if (-not (Test-Path -LiteralPath $journalPath -PathType Leaf)) { Stop-R77 "SOURCE_JOURNAL_MISSING" }
  $journal = Get-Content -Raw -LiteralPath $journalPath | ConvertFrom-Json
  $entries = @($journal.entries | Sort-Object { [int]$_.idx })
  if ($entries.Count -eq 0) { Stop-R77 "SOURCE_JOURNAL_EMPTY" }
  $seen = @{}
  $result = New-Object System.Collections.Generic.List[object]
  $expectedIndex = 0
  foreach ($entry in $entries) {
    if ([int]$entry.idx -ne $expectedIndex) { Stop-R77 "SOURCE_JOURNAL_INDEX_INVALID" }
    $expectedIndex++
    $tag = [string]$entry.tag
    if ($seen.ContainsKey($tag)) { Stop-R77 "SOURCE_JOURNAL_DUPLICATE_TAG" }
    $seen[$tag] = $true
    $file = Join-Path $repo ("drizzle\migrations\" + $tag + ".sql")
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { Stop-R77 ("SOURCE_MIGRATION_FILE_MISSING:" + $tag) }
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToLowerInvariant()
    [void]$result.Add([pscustomobject]@{ Index = [int]$entry.idx; Tag = $tag; When = [string]$entry.when; Hash = $hash; File = $file })
  }
  $sqlFiles = @(Get-ChildItem -LiteralPath (Join-Path $repo "drizzle\migrations") -File -Filter "*.sql" | Where-Object { $_.Name -match '^\d{4}_.+\.sql$' })
  if ($sqlFiles.Count -ne $result.Count) { Stop-R77 "SOURCE_MIGRATION_FILE_COUNT_MISMATCH" }
  $index0040 = @($result | Where-Object { $_.Tag -eq $migration0040 })
  $index0041 = @($result | Where-Object { $_.Tag -eq $migration0041 })
  if ($index0040.Count -ne 1 -or $index0041.Count -ne 1 -or $index0041[0].Index -ne ($index0040[0].Index + 1)) { Stop-R77 "SOURCE_0040_0041_ORDER_INVALID" }
  return @($result)
}

function Parse-LedgerRows([string[]]$Lines) {
  $rows = New-Object System.Collections.Generic.List[object]
  foreach ($line in $Lines) {
    $text = ([string]$line).Trim()
    if (-not $text) { continue }
    $parts = $text.Split('|')
    if ($parts.Count -ne 3) { Stop-R77 "DATABASE_LEDGER_FORMAT_INVALID" }
    [void]$rows.Add([pscustomobject]@{ Id = $parts[0]; Hash = $parts[1].ToLowerInvariant(); When = $parts[2] })
  }
  return @($rows)
}

function Assert-SourceLedger([object[]]$Rows) {
  if ($Rows.Count -gt $sourceEntries.Count) { Stop-R77 "DATABASE_LEDGER_AHEAD_OF_SOURCE" }
  for ($i = 0; $i -lt $Rows.Count; $i++) {
    if ($Rows[$i].Hash -ne $sourceEntries[$i].Hash -or $Rows[$i].When -ne $sourceEntries[$i].When) {
      Stop-R77 ("DATABASE_LEDGER_SOURCE_MISMATCH:" + $sourceEntries[$i].Tag)
    }
  }
  $script:appliedCount = $Rows.Count
  $script:pendingTags = @($sourceEntries | Select-Object -Skip $Rows.Count | ForEach-Object { $_.Tag })
  if (@($pendingTags | Where-Object { $requiredMigrations -notcontains $_ }).Count -gt 0) { Stop-R77 "OUT_OF_SCOPE_MIGRATION_PENDING" }
  $script:ledgerResult = "PASS_PREFIX_" + $Rows.Count + "/" + $sourceEntries.Count
  $script:ledgerVerified = $true
}

function Assert-LocalDatabaseIdentity {
  $databaseUrl = [string]$envValues.DATABASE_URL
  if (-not $databaseUrl) { Stop-R77 "DATABASE_URL_MISSING" }
  try { $uri = [Uri]$databaseUrl } catch { Stop-R77 "DATABASE_URL_INVALID" }
  if ($uri.Scheme -notin @("postgres", "postgresql")) { Stop-R77 "DATABASE_PROTOCOL_FORBIDDEN" }
  if ($uri.Host -ne $expectedHost) { Stop-R77 "DATABASE_HOST_NOT_LOOPBACK" }
  if ([int]$uri.Port -ne $expectedPort) { Stop-R77 "DATABASE_PORT_INVALID" }
  if ($uri.AbsolutePath -ne ("/" + $expectedDatabase)) { Stop-R77 "DATABASE_NAME_INVALID" }
  if ($uri.Query -or $uri.Fragment) { Stop-R77 "DATABASE_URL_QUERY_FORBIDDEN" }
  if ([string]$envValues.TEST_DATABASE_URL -ne $databaseUrl) { Stop-R77 "TEST_DATABASE_TARGET_MISMATCH" }
  $script:identityResult = "ENV_LOOPBACK_TARGET_" + $expectedHost + ":" + $expectedPort + "/" + $expectedDatabase
}

function Assert-ExecutionEnvironment {
  if ([string]$env:NODE_ENV -eq "production" -or [string]$env:VERCEL -or [string]$env:VERCEL_ENV) {
    Stop-R77 "PRODUCTION_OR_VERCEL_EXECUTION_FORBIDDEN"
  }
}

function Assert-CurrentDatabaseIdentity {
  # Docker exec psql normally uses the PostgreSQL Unix socket.  inet_server_port()
  # is connection-transport metadata and may be NULL for that socket connection.
  # current_setting('port') is the server's configured port; host-port binding
  # remains a separate Docker identity check in Assert-ContainerIdentity.
  $row = Invoke-ContainerPsql $expectedDatabase "select current_database() || '|' || current_setting('port');"
  $parts = ([string]$row[0]).Trim().Split('|')
  if ($parts.Count -ne 2 -or $parts[0] -ne $expectedDatabase -or $parts[1] -ne "5432") { Stop-R77 "CURRENT_DATABASE_IDENTITY_MISMATCH" }
  $script:currentDatabaseVerified = $true
  $script:identityResult = "PASS_LOOPBACK_" + $expectedHost + ":" + $expectedPort + "/" + $parts[0] + ";SERVER_CONFIGURED_PORT=" + $parts[1]
}

function Assert-ContainerIdentity {
  $raw = Invoke-Docker @("inspect", $expectedContainer)
  if ($raw.Count -eq 0) { Stop-R77 "OWNER_CONTAINER_MISSING" }
  try { $metadata = ($raw -join "`n" | ConvertFrom-Json) } catch { Stop-R77 "OWNER_CONTAINER_METADATA_INVALID" }
  if ($metadata.Name.Trim("/") -ne $expectedContainer) { Stop-R77 "OWNER_CONTAINER_NAME_INVALID" }
  if ($metadata.State.Status -ne "running") { Stop-R77 "OWNER_CONTAINER_NOT_RUNNING" }
  if ($metadata.Config.Labels.'com.fixoku.owner-local.scope' -ne "owner-local-persistent") { Stop-R77 "OWNER_CONTAINER_SCOPE_INVALID" }
  if ($metadata.Config.Labels.'com.fixoku.owner-local.port' -ne [string]$expectedPort) { Stop-R77 "OWNER_CONTAINER_PORT_LABEL_INVALID" }
  $bindingProperty = $metadata.NetworkSettings.Ports.PSObject.Properties["5432/tcp"]
  if ($null -eq $bindingProperty -or @($bindingProperty.Value).Count -ne 1) { Stop-R77 "OWNER_CONTAINER_PORT_BINDING_MISSING" }
  $binding = @($bindingProperty.Value)[0]
  if ($binding.HostIP -ne $expectedHost -or $binding.HostPort -ne [string]$expectedPort) { Stop-R77 "OWNER_CONTAINER_NOT_LOOPBACK" }
  $mount = @($metadata.Mounts | Where-Object { $_.Type -eq "volume" -and $_.Name -eq $expectedVolume -and $_.Destination -eq "/var/lib/postgresql" })
  if ($mount.Count -ne 1) { Stop-R77 "OWNER_CONTAINER_VOLUME_INVALID" }
}

function Assert-Worktree {
  [void](Assert-WorktreePaths $initialWorkingDirectory $repo $null)
  $top = Invoke-GitUtf8
  [void](Assert-WorktreePaths (Get-Location).Path $repo $top)
  $script:pathEncodingPassed = $top -match "[^\x00-\x7F]"
  $script:unicodePathPassed = $pathEncodingPassed
  $script:worktreeGuardPassed = $true
  if (-not (Test-Path -LiteralPath (Join-Path $repo "drizzle\migrations\0040_r64_child_identity_isolation.sql"))) { Stop-R77 "WORKTREE_SOURCE_MISSING" }
}

function Get-RelationNames {
  $rows = Invoke-ContainerPsql $expectedDatabase @'
select table_name from information_schema.tables where table_schema='public' order by table_name;
'@
  return @($rows | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ })
}

function Get-ColumnNames([string]$Table) {
  $rows = Invoke-ContainerPsql $expectedDatabase ("select column_name from information_schema.columns where table_schema='public' and table_name='" + $Table.Replace("'", "''") + "' order by ordinal_position;")
  return @($rows | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ })
}

function Assert-Preflight([bool]$Has0040, [bool]$Has0041) {
  $relations = Get-RelationNames
  foreach ($required in @("enrollments", "r6_training_group_participants", "r6_student_child_profiles", "student_profiles", "platform_users")) {
    if ($relations -notcontains $required) { Stop-R77 ("PREFLIGHT_TABLE_MISSING:" + $required) }
  }
  $enrollmentColumns = Get-ColumnNames "enrollments"
  $participantColumns = Get-ColumnNames "r6_training_group_participants"
  foreach ($required in @("student_user_id", "training_program_id")) { if ($enrollmentColumns -notcontains $required) { Stop-R77 ("PREFLIGHT_COLUMN_MISSING:enrollments:" + $required) } }
  foreach ($required in @("training_group_id", "student_user_id")) { if ($participantColumns -notcontains $required) { Stop-R77 ("PREFLIGHT_COLUMN_MISSING:participants:" + $required) } }

  $childColumn = $enrollmentColumns -contains "beneficiary_child_profile_id"
  if ($Has0040 -and -not $childColumn) { Stop-R77 "PREFLIGHT_0040_COLUMN_MISSING_AFTER_LEDGER" }
  $duplicateSql = if ($childColumn) {
    "select count(*) from (select student_user_id,training_program_id,coalesce(beneficiary_child_profile_id,'00000000-0000-0000-0000-000000000000'::uuid) from enrollments group by student_user_id,training_program_id,coalesce(beneficiary_child_profile_id,'00000000-0000-0000-0000-000000000000'::uuid) having count(*) > 1) d;"
  } else {
    "select count(*) from (select student_user_id,training_program_id from enrollments group by student_user_id,training_program_id having count(*) > 1) d;"
  }
  $duplicateEnrollments = [int](([string](Invoke-ContainerPsql $expectedDatabase $duplicateSql)[0]).Trim())
  if ($duplicateEnrollments -ne 0) { Stop-R77 "PREFLIGHT_DUPLICATE_ENROLLMENT" }

  $participantIdentity = if (($participantColumns -contains "child_profile_id") -and ($participantColumns -contains "student_profile_id")) { "coalesce(child_profile_id,student_profile_id,student_user_id)" } else { "student_user_id" }
  $duplicateParticipants = [int](([string](Invoke-ContainerPsql $expectedDatabase ("select count(*) from (select training_group_id," + $participantIdentity + " from r6_training_group_participants group by training_group_id," + $participantIdentity + " having count(*) > 1) d;"))[0]).Trim())
  if ($duplicateParticipants -ne 0) { Stop-R77 "PREFLIGHT_DUPLICATE_GROUP_PARTICIPANT" }

  if ($childColumn) {
    $orphanEnrollments = [int](([string](Invoke-ContainerPsql $expectedDatabase "select count(*) from enrollments e left join r6_student_child_profiles c on c.id=e.beneficiary_child_profile_id where e.beneficiary_child_profile_id is not null and c.id is null;")[0]).Trim())
    if ($orphanEnrollments -ne 0) { Stop-R77 "PREFLIGHT_ORPHAN_ENROLLMENT_CHILD" }
  }
  $orphanChildren = [int](([string](Invoke-ContainerPsql $expectedDatabase "select count(*) from r6_student_child_profiles c left join platform_users u on u.id=c.owner_user_id left join student_profiles sp on sp.id=c.legacy_student_profile_id where u.id is null or (c.legacy_student_profile_id is not null and sp.id is null);")[0]).Trim())
  if ($orphanChildren -ne 0) { Stop-R77 "PREFLIGHT_ORPHAN_CHILD_PROFILE" }
  if (($participantColumns -contains "child_profile_id") -and ($participantColumns -contains "student_profile_id")) {
    $orphanParticipants = [int](([string](Invoke-ContainerPsql $expectedDatabase "select count(*) from r6_training_group_participants p left join r6_student_child_profiles c on c.id=p.child_profile_id where p.child_profile_id is not null and c.id is null;")[0]).Trim())
    if ($orphanParticipants -ne 0) { Stop-R77 "PREFLIGHT_ORPHAN_GROUP_PARTICIPANT" }
  }

  $legalObjects = @("owner_legal_document_versions", "owner_legal_document_decisions", "owner_legal_document_events", "owner_vat_decisions", "owner_vat_decision_events", "order_legal_snapshots", "trainer_order_legal_snapshots")
  $existingLegal = @($legalObjects | Where-Object { $relations -contains $_ })
  if (-not $Has0041 -and $existingLegal.Count -gt 0) { Stop-R77 "PREFLIGHT_PARTIAL_0041_OBJECTS" }
  if ($Has0041 -and $existingLegal.Count -ne $legalObjects.Count) { Stop-R77 "PREFLIGHT_0041_OBJECTS_INCOMPLETE" }
  $script:preflightPassed = $true
  $script:ledgerResult = $ledgerResult + ";DUPLICATES=0;ORPHANS=0"
}

function New-BackupAndVerify {
  if (-not $env:LOCALAPPDATA) { Stop-R77 "LOCALAPPDATA_MISSING" }
  $repoPrefix = $repo.TrimEnd('\\') + '\\'
  if ([IO.Path]::GetFullPath($backupRoot).StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase)) { Stop-R77 "BACKUP_PATH_INSIDE_WORKTREE" }
  New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
  Protect-PrivatePath $backupRoot
  $backupDir = Join-Path $backupRoot ("r77-" + $runId)
  New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
  Protect-PrivatePath $backupDir
  $script:backupPath = Join-Path $backupDir ("owner-" + $expectedDatabase + "-" + $runId + ".dump")
  $containerDump = "/tmp/fixoku-r77-" + $runId + ".dump"
  $containerTempFiles.Add($containerDump)
  try {
    [void](Invoke-Docker @("exec", $expectedContainer, "pg_dump", "--format=custom", "--file", $containerDump, "-U", $expectedUser, "-d", $expectedDatabase))
    [void](Invoke-Docker @("cp", ($expectedContainer + ":" + $containerDump), $backupPath))
  } finally {
    try { [void](Invoke-Docker @("exec", $expectedContainer, "rm", "-f", $containerDump)) } catch { }
  }
  if (-not (Test-Path -LiteralPath $backupPath -PathType Leaf)) { Stop-R77 "BACKUP_FILE_MISSING" }
  $file = Get-Item -LiteralPath $backupPath
  if ($file.Length -le 0) { Stop-R77 "BACKUP_FILE_EMPTY" }
  $script:backupSize = [int64]$file.Length
  Protect-PrivatePath $backupPath
  $script:backupHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $backupPath).Hash.ToLowerInvariant()
  $containerList = "/tmp/fixoku-r77-" + $runId + ".list"
  $containerTempFiles.Add($containerList)
  try {
    [void](Invoke-Docker @("cp", $backupPath, ($expectedContainer + ":" + $containerList)))
    $list = Invoke-Docker @("exec", $expectedContainer, "pg_restore", "--list", $containerList)
    if (@($list | Where-Object { ([string]$_).Trim() -and -not ([string]$_).Trim().StartsWith(";") }).Count -eq 0) { Stop-R77 "BACKUP_ARCHIVE_LIST_EMPTY" }
  } finally {
    try { [void](Invoke-Docker @("exec", $expectedContainer, "rm", "-f", $containerList)) } catch { }
  }
  $script:backupVerified = $true
}

function Restore-BackupAndVerify {
  if (-not $backupVerified) { Stop-R77 "RESTORE_BEFORE_BACKUP_VERIFICATION" }
  $safeName = "fixoku_r77_restore_" + $runId.Replace("-", "_")
  if ($safeName.Length -gt 63) { $safeName = $safeName.Substring(0, 63) }
  $script:restoreDatabase = $safeName
  $quoted = Quote-Identifier $restoreDatabase
  Invoke-ContainerPsqlWrite "postgres" ("CREATE DATABASE " + $quoted + ";") | Out-Null
  $containerDump = "/tmp/fixoku-r77-restore-" + $runId + ".dump"
  $containerTempFiles.Add($containerDump)
  try {
    [void](Invoke-Docker @("cp", $backupPath, ($expectedContainer + ":" + $containerDump)))
    [void](Invoke-Docker @("exec", $expectedContainer, "pg_restore", "--exit-on-error", "--single-transaction", "--no-owner", "--no-acl", "-U", $expectedUser, "-d", $restoreDatabase, $containerDump))
    $identity = Invoke-ContainerPsql $restoreDatabase "select current_database();"
    if (([string]$identity[0]).Trim() -ne $restoreDatabase) { Stop-R77 "RESTORE_DATABASE_IDENTITY_MISMATCH" }
    $counts = Invoke-ContainerPsql $restoreDatabase "select (select count(*) from information_schema.tables where table_schema='public') || '|' || (select count(*) from drizzle.__drizzle_migrations) || '|' || (select count(*) from platform_users);"
    $parts = ([string]$counts[0]).Trim().Split('|')
    if ($parts.Count -ne 3 -or [int]$parts[0] -le 0 -or [int]$parts[1] -ne $ledgerRows.Count -or [int]$parts[2] -lt 0) { Stop-R77 "RESTORE_PARITY_CHECK_FAILED" }
    $script:restoreVerified = $true
  } finally {
    try { [void](Invoke-Docker @("exec", $expectedContainer, "rm", "-f", $containerDump)) } catch { }
    try {
      if ($restoreDatabase) {
        if ($restoreDatabase -notmatch '^fixoku_r77_restore_[a-z0-9_]+$') { throw "RESTORE_DATABASE_NAME_GUARD_FAILED" }
        Invoke-ContainerPsqlWrite "postgres" ("select pg_terminate_backend(pid) from pg_stat_activity where datname='" + $restoreDatabase + "' and pid <> pg_backend_pid(); drop database if exists " + $quoted + ";") | Out-Null
      }
    } catch { }
  }
}

function Apply-Migration([object]$Migration) {
  $hostFile = Join-Path $env:TEMP ("fixoku-r77-" + $runId + "-" + $Migration.Tag + ".sql")
  $hostTempFiles.Add($hostFile)
  $sql = [IO.File]::ReadAllText($Migration.File)
  $combined = "BEGIN;`n" + $sql + "`nINSERT INTO drizzle.__drizzle_migrations (hash,created_at) VALUES ('" + $Migration.Hash + "'," + $Migration.When + ");`nCOMMIT;`n"
  [IO.File]::WriteAllText($hostFile, $combined, (New-Object Text.UTF8Encoding($false)))
  $containerFile = "/tmp/fixoku-r77-" + $runId + "-" + $Migration.Tag + ".sql"
  $containerTempFiles.Add($containerFile)
  try {
    [void](Invoke-Docker @("cp", $hostFile, ($expectedContainer + ":" + $containerFile)))
    [void](Invoke-Docker @("exec", $expectedContainer, "psql", "-U", $expectedUser, "-d", $expectedDatabase, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", $containerFile))
  } finally {
    try { [void](Invoke-Docker @("exec", $expectedContainer, "rm", "-f", $containerFile)) } catch { }
  }
}

function Assert-PostMigrationSchema {
  $column = Invoke-ContainerPsql $expectedDatabase "select data_type from information_schema.columns where table_schema='public' and table_name='enrollments' and column_name='beneficiary_child_profile_id';"
  if (([string]$column[0]).Trim() -ne "uuid") { Stop-R77 "POST_0040_CHILD_COLUMN_INVALID" }
  $fk = [int](([string](Invoke-ContainerPsql $expectedDatabase "select count(*) from pg_constraint where conrelid='public.enrollments'::regclass and contype='f' and confrelid='public.r6_student_child_profiles'::regclass and pg_get_constraintdef(oid) ilike '%beneficiary_child_profile_id%';")[0]).Trim())
  $indexCount = [int](([string](Invoke-ContainerPsql $expectedDatabase "select count(*) from pg_indexes where schemaname='public' and indexname in ('enrollments_beneficiary_program_uq','r6_training_group_participants_uq');")[0]).Trim())
  if ($fk -lt 1 -or $indexCount -ne 2) { Stop-R77 "POST_0040_CONSTRAINT_INDEX_INVALID" }
  $legalTables = @("owner_legal_document_versions", "owner_legal_document_decisions", "owner_legal_document_events", "owner_vat_decisions", "owner_vat_decision_events", "order_legal_snapshots", "trainer_order_legal_snapshots")
  foreach ($table in $legalTables) {
    $exists = [int](([string](Invoke-ContainerPsql $expectedDatabase ("select count(*) from information_schema.tables where table_schema='public' and table_name='" + $table + "';"))[0]).Trim())
    if ($exists -ne 1) { Stop-R77 ("POST_0041_TABLE_MISSING:" + $table) }
  }
  $triggerCount = [int](([string](Invoke-ContainerPsql $expectedDatabase "select count(*) from pg_trigger where not tgisinternal and tgname in ('owner_legal_document_versions_immutable','owner_legal_document_events_immutable','owner_vat_decision_events_immutable','order_legal_snapshots_immutable','trainer_order_legal_snapshots_immutable');")[0]).Trim())
  if ($triggerCount -ne 5) { Stop-R77 "POST_0041_TRIGGER_INVALID" }
  $script:migrationResult = "PASS_SCHEMA_0040_0041"
}

function Read-LegalV10Documents([string]$Path) {
  try { $parsed = Get-Content -Raw -Encoding UTF8 -LiteralPath $Path | ConvertFrom-Json } catch { Stop-R77 "OWNER_LEGAL_SOURCE_JSON_INVALID" }
  if ($parsed -isnot [System.Array]) { Stop-R77 "OWNER_LEGAL_SOURCE_ROOT_INVALID" }
  $documents = @($parsed)
  if ($documents.Count -eq 0) { Stop-R77 "OWNER_LEGAL_SOURCE_DOCUMENTS_EMPTY" }
  $invalid = @($documents | Where-Object {
      if ($null -eq $_) { return $true }
      $names = $_.PSObject.Properties.Name
      $names -notcontains "id" -or $names -notcontains "internal" -or
      $_.internal -isnot [bool] -or $names -notcontains "markdown" -or
      $names -notcontains "sourceVersion" -or $names -notcontains "publicationStatus" -or
      ($names -notcontains "contentSha256" -and $names -notcontains "originalSha256")
    })
  if ($invalid.Count -gt 0) { Stop-R77 "OWNER_LEGAL_SOURCE_METADATA_INVALID" }
  $duplicateIds = @($documents | Group-Object id | Where-Object { $_.Count -gt 1 })
  if ($duplicateIds.Count -gt 0) { Stop-R77 "OWNER_LEGAL_SOURCE_DUPLICATE_DOCUMENT_KEY" }
  $sha = [Security.Cryptography.SHA256]::Create()
  foreach ($document in $documents) {
    $expectedHash = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes([string]$document.markdown))) -replace "-", "").ToLowerInvariant()
    $suppliedHash = if ($document.internal -eq $true) { [string]$document.originalSha256 } else { [string]$document.contentSha256 }
    if ($expectedHash -ne $suppliedHash) { Stop-R77 ("OWNER_LEGAL_SOURCE_HASH_INVALID:" + $document.id) }
  }
  return $documents
}

function Assert-OwnerPanelReadiness {
  $legalUi = Join-Path $repo "src\platform\admin\LegalPreparationPage.tsx"
  $approvalApi = Join-Path $repo "api\admin\owner-legal-approval.js"
  $legalJson = Join-Path $repo "src\platform\admin\legal-owner-documents-v10.json"
  if (-not (Test-Path -LiteralPath $legalUi) -or -not (Test-Path -LiteralPath $approvalApi) -or -not (Test-Path -LiteralPath $legalJson)) { Stop-R77 "OWNER_LEGAL_PANEL_SOURCE_MISSING" }
  $documents = @(Read-LegalV10Documents $legalJson)
  $customer = @($documents | Where-Object { $_.internal -ne $true }).Count
  $internal = @($documents | Where-Object { $_.internal -eq $true }).Count
  if ($documents.Count -ne 21 -or $customer -ne 16 -or $internal -ne 5) { Stop-R77 "OWNER_LEGAL_DOCUMENT_SPLIT_INVALID" }
  $uiText = Get-Content -Raw -LiteralPath $legalUi
  $apiText = Get-Content -Raw -LiteralPath $approvalApi
  if ($uiText -notmatch "DB durumunu yenile" -or $uiText -notmatch "Owner olarak APPROVED yap" -or $uiText -notmatch "BLOCKED_P0" -or $apiText -notmatch 'requireMembership\(principal,\s*"OWNER"\)') { Stop-R77 "OWNER_LEGAL_PANEL_GUARDS_MISSING" }
  $dbRows = Invoke-ContainerPsql $expectedDatabase "select count(*) || '|' || count(*) filter (where scope='CUSTOMER') || '|' || count(*) filter (where scope='INTERNAL') || '|' || count(*) filter (where scope='INTERNAL' and status='PUBLISHED') from owner_legal_document_versions;"
  $parts = ([string]$dbRows[0]).Trim().Split('|')
  if ($parts.Count -ne 4 -or [int]$parts[3] -ne 0) { Stop-R77 "OWNER_INTERNAL_PUBLICATION_GUARD_FAILED" }
  $script:panelResult = "PASS_ROUTE_SOURCE_CUSTOMER_16_INTERNAL_5_DB_ROWS_" + $parts[0] + "_REAL_APPROVAL_BLOCKED_NO_LEGAL_EVIDENCE"
}

function Invoke-PathGuardTest {
  $turkce = -join ([char[]](0x0054, 0x00FC, 0x0072, 0x006B, 0x00E7, 0x0065))
  $bosluk = -join ([char[]](0x0062, 0x006F, 0x015F, 0x006C, 0x0075, 0x006B))
  $agency = "Seslendirme Ajans" + [char]0x0131
  $unicodeName = "R77A " + $turkce + " Unicode " + $bosluk
  $tempRoot = Join-Path $env:TEMP ("fixoku-r77a-" + [guid]::NewGuid().ToString("N"))
  $unicodePath = Join-Path $tempRoot $unicodeName
  $wrongPath = Join-Path $tempRoot "R77A-Wrong-Worktree"
  $result = "PASS"
  try {
    New-Item -ItemType Directory -Path $unicodePath -Force | Out-Null
    New-Item -ItemType Directory -Path $wrongPath -Force | Out-Null
    $gitTop = Invoke-GitUtf8
    if ($gitTop -notmatch [regex]::Escape($agency)) { $result = "FAIL" }
    [void](Assert-WorktreePaths $unicodePath ($unicodePath + "\\") ($unicodePath + "/"))
    try {
      [void](Assert-WorktreePaths $wrongPath $unicodePath $unicodePath)
      $result = "FAIL"
    } catch {
      if (([string]$_.Exception.Message) -notmatch "WORKTREE_INVOCATION_PATH_MISMATCH") { $result = "FAIL" }
    }
    if ($unicodePath -notmatch [regex]::Escape($unicodeName) -or $gitTop -notmatch [regex]::Escape($agency)) { $result = "FAIL" }
    Write-Host ("PATH_ENCODING=" + ($(if ($gitTop -match [regex]::Escape($agency)) { "PASS" } else { "FAIL" })))
    Write-Host ("WORKTREE_GUARD=" + ($(if ($result -eq "PASS") { "PASS" } else { "FAIL" })))
    Write-Host ("UNICODE_PATH=" + ($(if ($result -eq "PASS") { "PASS" } else { "FAIL" })))
    Write-Host "DATABASE_MUTATION=NONE"
    Write-Host ("R77_READY_TO_RERUN=" + ($(if ($result -eq "PASS") { "YES" } else { "NO" })))
    Write-Host ("RESULT=" + $result)
    if ($result -ne "PASS") { exit 1 }
  } finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}

if ($PathGuardTest) { Invoke-PathGuardTest; exit 0 }

try {
  Assert-Worktree
  Assert-ExecutionEnvironment
  $envValues = Read-KeyValueFile (Join-Path $repo ".env.local")
  Assert-LocalDatabaseIdentity
  $docker = (Get-Command docker.exe -ErrorAction Stop).Source
  Assert-ContainerIdentity
  Assert-CurrentDatabaseIdentity
  $sourceEntries = Read-SourceMigrations
  $ledgerLines = Invoke-ContainerPsql $expectedDatabase "select id,hash,created_at::text from drizzle.__drizzle_migrations order by created_at,id;"
  $ledgerRows = Parse-LedgerRows $ledgerLines
  Assert-SourceLedger $ledgerRows

  if ($Apply) {
    New-BackupAndVerify
    Restore-BackupAndVerify
    if (-not $restoreVerified) { Stop-R77 "RESTORE_NOT_VERIFIED" }
    $has0040 = $appliedCount -ge 41
    $has0041 = $appliedCount -ge 42
    Assert-Preflight $has0040 $has0041
    foreach ($tag in $pendingTags) {
      if ($requiredMigrations -notcontains $tag) { Stop-R77 "MIGRATION_SCOPE_INVALID" }
      $migration = @($sourceEntries | Where-Object { $_.Tag -eq $tag })[0]
      Apply-Migration $migration
    }
    $postLedger = Parse-LedgerRows (Invoke-ContainerPsql $expectedDatabase "select id,hash,created_at::text from drizzle.__drizzle_migrations order by created_at,id;")
    Assert-SourceLedger $postLedger
    if ($postLedger.Count -ne $sourceEntries.Count) { Stop-R77 "POST_MIGRATION_LEDGER_INCOMPLETE" }
    Assert-PostMigrationSchema
  } else {
    $has0040 = $appliedCount -ge 41
    $has0041 = $appliedCount -ge 42
    Assert-Preflight $has0040 $has0041
    $migrationResult = "PREVIEW_ONLY_NOT_APPLIED"
  }
  if ($has0041) { Assert-OwnerPanelReadiness }
  else { $panelResult = "BLOCKED_MIGRATION_0041_PENDING" }
} catch {
  $stopReason = ([string]$_.Exception.Message)
  if ($stopReason -match '(?i)(password|postgres(?:ql)?://|secret|token|key)') { $stopReason = "R77_STOP:UNEXPECTED_FAILURE" }
  elseif ($stopReason -notmatch '^R77_STOP:') { $stopReason = "R77_STOP:UNEXPECTED_FAILURE:" + $_.Exception.GetType().Name }
  if ($migrationResult -eq "NOT_RUN" -and $stopReason -match 'RESTORE|BACKUP|PREFLIGHT|DATABASE|CONTAINER|LEDGER|SOURCE') { $migrationResult = "BLOCKED_BEFORE_MIGRATION" }
} finally {
  foreach ($file in @($hostTempFiles)) { Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue }
  if ($docker) {
    foreach ($file in @($containerTempFiles)) { try { [void](& $docker exec $expectedContainer rm -f $file 2>$null) } catch { } }
  }
}

if ($stopReason) {
  $identityResult = if ($identityResult -eq "NOT_CHECKED") { "BLOCKED" } else { $identityResult }
  $migrationResult = if ($migrationResult -eq "NOT_RUN") { "BLOCKED" } else { $migrationResult }
  $panelResult = if ($panelResult -eq "NOT_CHECKED") { "BLOCKED" } else { $panelResult }
}

Write-Host ("R77_LOCAL_DATABASE_IDENTITY=" + ($(if ($currentDatabaseVerified) { $identityResult } else { "BLOCKED_CURRENT_DATABASE_UNVERIFIED" })))
Write-Host ("PATH_ENCODING=" + ($(if ($pathEncodingPassed) { "PASS" } else { "FAIL" })))
Write-Host ("WORKTREE_GUARD=" + ($(if ($worktreeGuardPassed) { "PASS" } else { "FAIL" })))
Write-Host ("UNICODE_PATH=" + ($(if ($unicodePathPassed) { "PASS" } else { "FAIL" })))
Write-Host ("R77_BACKUP_CREATED=" + ($(if ($backupVerified) { "PASS" } elseif (-not $Apply) { "PREVIEW_NOT_RUN" } else { "BLOCKED" })))
Write-Host ("R77_BACKUP_SHA256=" + ($(if ($backupHash) { $backupHash } else { "UNAVAILABLE" })))
Write-Host ("R77_RESTORE_VERIFIED=" + ($(if ($restoreVerified) { "PASS" } elseif (-not $Apply) { "PREVIEW_NOT_RUN" } else { "BLOCKED" })))
Write-Host ("R77_MIGRATION_PREFLIGHT=" + ($(if ($preflightPassed) { "PASS" } else { "BLOCKED" })))
Write-Host ("R77_0040_STATUS=" + ($(if (-not $ledgerVerified) { "BLOCKED_NOT_VERIFIED" } elseif ($appliedCount -ge 41) { "APPLIED" } else { "PENDING" })))
Write-Host ("R77_0041_STATUS=" + ($(if (-not $ledgerVerified) { "BLOCKED_NOT_VERIFIED" } elseif ($appliedCount -ge 42) { "APPLIED" } else { "PENDING" })))
Write-Host ("R77_MIGRATION_RESULT=" + $migrationResult)
Write-Host ("R77_OWNER_LEGAL_PANEL=" + $panelResult)
Write-Host "R77_PUBLICATION_GUARD=BLOCKED_P0_NO_REAL_LEGAL_APPROVAL"
Write-Host ("R77_PRODUCTION_UNTOUCHED=" + $productionUntouched)
Write-Host ("R77_POWERSHELL_COMMAND=powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\FIXOKU_R77_OWNER_LOCAL_SAFE_MIGRATION.ps1 -Apply")
if ($backupPath) { Write-Host ("R77_BACKUP_PATH=" + $backupPath) }
Write-Host ("R77_BACKUP_SIZE_BYTES=" + ($(if ($backupSize) { $backupSize } else { "UNAVAILABLE" })))
Write-Host "R77_OWNER_PANEL_COMMAND=powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-owner-local.ps1 -Verify"
Write-Host ("R77_MIGRATION_LEDGER=" + ($(if (-not $ledgerVerified) { "UNAVAILABLE" } else { "APPLIED_PREFIX_" + $appliedCount + "/" + $sourceEntries.Count + ";PENDING=" + (($pendingTags -join ",") -replace '^$', 'NONE') })))
Write-Host ("R77_READY_TO_RERUN=" + ($(if ($worktreeGuardPassed -and $pathEncodingPassed) { "YES" } else { "NO" })))
if ($stopReason) { Write-Host ("R77_STOP_REASON=" + $stopReason) }
Write-Host ("RESULT=" + ($(if ($stopReason) { "STOP" } elseif ($Apply) { "PASS_LOCAL_ONLY" } else { "READY_FOR_APPLY" })))

if ($stopReason) { exit 1 }
