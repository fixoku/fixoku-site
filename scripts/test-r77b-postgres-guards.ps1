$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repo = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $PSScriptRoot "FIXOKU_R77_OWNER_LOCAL_SAFE_MIGRATION.ps1"
$source = Get-Content -Raw -LiteralPath $runner
$failures = New-Object System.Collections.Generic.List[string]

function Assert-R77B([bool]$Condition, [string]$Code) {
  if (-not $Condition) { [void]$failures.Add($Code) }
}

function Normalize-TestLines([object[]]$Lines) {
  $normalized = @($Lines | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ })
  return ,$normalized
}

function Assert-ExpectedDatabase([string]$Database) {
  if ($Database -ne "fixoku_owner_local") { throw "WRONG_DATABASE_REJECTED" }
}

function Assert-ExpectedContainer([string]$Name, [string]$HostIp, [string]$HostPort) {
  if ($Name -ne "fixoku-owner-local-pg-20261019") { throw "WRONG_CONTAINER_REJECTED" }
  if ($HostIp -ne "127.0.0.1" -or $HostPort -ne "55432") { throw "WRONG_HOST_PORT_REJECTED" }
}

try {
  Assert-R77B ($source.Contains("StandardOutputEncoding")) "UTF8_PROCESS_ENCODING_MISSING"
  Assert-R77B ($source.Contains("core.quotepath=false")) "GIT_QUOTEPATH_GUARD_MISSING"
  Assert-R77B ($source.Contains("current_setting('port')")) "POSTGRES_CONFIGURED_PORT_GUARD_MISSING"
  Assert-R77B ($source -notmatch '(?m)^\s*\$row\s*=.*inet_server_port\(\)') "SOCKET_TRANSPORT_PORT_USED_AS_IDENTITY"
  Assert-R77B ($source.Contains('return ,$lines')) "PSQL_RESULT_ARRAY_GUARD_MISSING"

  $socket = Normalize-TestLines @("fixoku_owner_local|5432")
  $tcp = Normalize-TestLines @("127.0.0.1|55432")
  $many = Normalize-TestLines @("one", "two", "three")
  Assert-R77B ($socket.GetType().IsArray -and $socket.Count -eq 1 -and $socket[0] -eq "fixoku_owner_local|5432") "SOCKET_SINGLE_ROW_NORMALIZATION_FAILED"
  Assert-R77B ($tcp.GetType().IsArray -and $tcp.Count -eq 1 -and $tcp[0] -eq "127.0.0.1|55432") "TCP_BINDING_SINGLE_ROW_NORMALIZATION_FAILED"
  Assert-R77B ($many.GetType().IsArray -and $many.Count -eq 3 -and $many[0] -eq "one" -and $many[2] -eq "three") "MULTI_ROW_NORMALIZATION_FAILED"

  Assert-ExpectedDatabase "fixoku_owner_local"
  try { Assert-ExpectedDatabase "postgres"; [void]$failures.Add("WRONG_DATABASE_ACCEPTED") } catch { }
  Assert-ExpectedContainer "fixoku-owner-local-pg-20261019" "127.0.0.1" "55432"
  try { Assert-ExpectedContainer "wrong-container" "127.0.0.1" "55432"; [void]$failures.Add("WRONG_CONTAINER_ACCEPTED") } catch { }
  try { Assert-ExpectedContainer "fixoku-owner-local-pg-20261019" "0.0.0.0" "55432"; [void]$failures.Add("WRONG_BINDING_ACCEPTED") } catch { }
  try { Assert-ExpectedContainer "fixoku-owner-local-pg-20261019" "127.0.0.1" "5432"; [void]$failures.Add("WRONG_PORT_ACCEPTED") } catch { }

  Assert-R77B ($source.Contains("RESTORE_DATABASE_IDENTITY_MISMATCH")) "RESTORE_IDENTITY_GUARD_MISSING"
  Assert-R77B ($source.Contains("DATABASE_LEDGER_FORMAT_INVALID") -and $source.Contains("DATABASE_LEDGER_SOURCE_MISMATCH")) "LEDGER_GUARD_MISSING"
  Assert-R77B ($source.Contains("OWNER_CONTAINER_NAME_INVALID") -and $source.Contains("OWNER_CONTAINER_NOT_LOOPBACK")) "CONTAINER_GUARD_MISSING"
  Assert-R77B ($source.Contains("DATABASE_NAME_INVALID") -and $source.Contains("DATABASE_HOST_NOT_LOOPBACK")) "DATABASE_GUARD_MISSING"

  $unicodeOutput = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "test-r77a-worktree-guard.ps1") 2>&1)
  $unicodeExit = $LASTEXITCODE
  Assert-R77B ($unicodeExit -eq 0 -and ($unicodeOutput -join "`n") -match "PATH_ENCODING=PASS" -and ($unicodeOutput -join "`n") -match "WRONG_DIRECTORY_GUARD=PASS") "UNICODE_WORKTREE_REGRESSION_FAILED"
} catch {
  [void]$failures.Add("R77B_TEST_UNEXPECTED_FAILURE:" + $_.Exception.Message)
}

Write-Host ("R77B_ROOT_CAUSE=" + ($(if ($failures -notcontains "UTF8_PROCESS_ENCODING_MISSING" -and $failures -notcontains "SOCKET_TRANSPORT_PORT_USED_AS_IDENTITY") { "PASS" } else { "FAIL" })))
Write-Host ("POSTGRES_SOCKET_HANDLING=" + ($(if ($failures -notcontains "POSTGRES_CONFIGURED_PORT_GUARD_MISSING" -and $failures -notcontains "SOCKET_TRANSPORT_PORT_USED_AS_IDENTITY") { "PASS" } else { "FAIL" })))
Write-Host ("POWERSHELL_RESULT_NORMALIZATION=" + ($(if ($failures.Count -eq 0) { "PASS" } else { "FAIL" })))
Write-Host ("OWNER_DATABASE_IDENTITY_GUARD=" + ($(if ($failures -notcontains "DATABASE_GUARD_MISSING" -and $failures -notcontains "WRONG_DATABASE_ACCEPTED") { "PASS" } else { "FAIL" })))
Write-Host ("RESTORE_IDENTITY_GUARD=" + ($(if ($failures -notcontains "RESTORE_IDENTITY_GUARD_MISSING") { "PASS" } else { "FAIL" })))
Write-Host ("LEDGER_PARSING_GUARD=" + ($(if ($failures -notcontains "LEDGER_GUARD_MISSING" -and $failures -notcontains "SOCKET_SINGLE_ROW_NORMALIZATION_FAILED" -and $failures -notcontains "MULTI_ROW_NORMALIZATION_FAILED") { "PASS" } else { "FAIL" })))
Write-Host ("WRONG_DATABASE_REJECTION=" + ($(if ($failures -notcontains "WRONG_DATABASE_ACCEPTED" -and $failures -notcontains "WRONG_CONTAINER_ACCEPTED" -and $failures -notcontains "WRONG_BINDING_ACCEPTED" -and $failures -notcontains "WRONG_PORT_ACCEPTED") { "PASS" } else { "FAIL" })))
Write-Host ("UNICODE_WORKTREE_REGRESSION=" + ($(if ($failures -notcontains "UNICODE_WORKTREE_REGRESSION_FAILED") { "PASS" } else { "FAIL" })))
Write-Host "DATABASE_MUTATION=NONE"
Write-Host ("R77_READY_TO_RERUN=" + ($(if ($failures.Count -eq 0) { "YES" } else { "NO" })))
if ($failures.Count -gt 0) { Write-Host ("R77B_FAILURES=" + ($failures -join ",")) }
Write-Host ("RESULT=" + ($(if ($failures.Count -eq 0) { "PASS" } else { "FAIL" })))
if ($failures.Count -gt 0) { exit 1 }
