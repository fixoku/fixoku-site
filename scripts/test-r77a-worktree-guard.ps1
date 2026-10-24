$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repo = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $PSScriptRoot "FIXOKU_R77_OWNER_LOCAL_SAFE_MIGRATION.ps1"
$output = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runner -PathGuardTest 2>&1)
$exitCode = $LASTEXITCODE
$text = $output -join "`n"
if ($exitCode -ne 0 -or $text -notmatch "PATH_ENCODING=PASS" -or $text -notmatch "WORKTREE_GUARD=PASS" -or $text -notmatch "UNICODE_PATH=PASS" -or $text -notmatch "DATABASE_MUTATION=NONE" -or $text -notmatch "R77_READY_TO_RERUN=YES" -or $text -notmatch "RESULT=PASS") {
  Write-Host $text
  exit 1
}
$wrongRoot = Join-Path $env:TEMP ("fixoku-r77a-wrong-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $wrongRoot -Force | Out-Null
try {
  Push-Location -LiteralPath $wrongRoot
  try {
    $wrongOutput = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runner 2>&1)
    $wrongExitCode = $LASTEXITCODE
  } finally {
    Pop-Location
  }
} finally {
  Remove-Item -LiteralPath $wrongRoot -Recurse -Force -ErrorAction SilentlyContinue
}
$wrongText = $wrongOutput -join "`n"
if ($wrongExitCode -eq 0 -or $wrongText -notmatch "WORKTREE_INVOCATION_PATH_MISMATCH" -or $wrongText -notmatch "RESULT=STOP") {
  Write-Host $text
  Write-Host $wrongText
  exit 1
}
Write-Host $text
Write-Host "WRONG_DIRECTORY_GUARD=PASS"
