$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# R77D read-only receipt for the already-migrated persistent Owner database.
# This script never applies migrations, creates/restores databases, imports
# documents, changes approval state, or reads credentials/secrets.
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$container = "fixoku-owner-local-pg-20261019"
$database = "fixoku_owner_local"
$dbUser = "fixoku_owner_local"
$sourcePath = Join-Path $repo "src\platform\admin\legal-owner-documents-v10.json"
$apiPath = Join-Path $repo "api\admin\owner-legal-approval.js"
$authPath = Join-Path $repo "src\server\auth\authorization.js"
$docker = $null
$dbStatus = "BLOCKED"
$dbError = $null

function Read-LegalSource([string]$Path) {
  try { $parsed = Get-Content -Raw -Encoding UTF8 -LiteralPath $Path | ConvertFrom-Json } catch { throw "OWNER_LEGAL_SOURCE_JSON_INVALID" }
  if ($parsed -isnot [System.Array]) { throw "OWNER_LEGAL_SOURCE_ROOT_INVALID" }
  return @($parsed)
}

function Invoke-ReadonlySql([string]$Sql) {
  $wrapped = "BEGIN READ ONLY;`n" + $Sql + "`nROLLBACK;"
  $output = @(& $docker exec $container psql -U $dbUser -d $database -X -q -A -t -F "|" -v ON_ERROR_STOP=1 -c $wrapped 2>&1)
  if ($LASTEXITCODE -ne 0) { throw "OWNER_DB_READONLY_QUERY_FAILED" }
  return $output | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ }
}

try {
  $documents = Read-LegalSource $sourcePath
  $customer = @($documents | Where-Object { $_.internal -ne $true }).Count
  $internal = @($documents | Where-Object { $_.internal -eq $true }).Count
  $sourceMetadataValid = $true
  $sourceHashesValid = $true
  $sha = [Security.Cryptography.SHA256]::Create()
  foreach ($document in $documents) {
    $names = if ($null -eq $document) { @() } else { $document.PSObject.Properties.Name }
    if ($null -eq $document -or $names -notcontains "id" -or $names -notcontains "internal" -or $document.internal -isnot [bool] -or $names -notcontains "markdown") { $sourceMetadataValid = $false; continue }
    $expectedHash = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes([string]$document.markdown))) -replace "-", "").ToLowerInvariant()
    $suppliedHash = if ($document.internal -eq $true) { [string]$document.originalSha256 } else { [string]$document.contentSha256 }
    if ($expectedHash -ne $suppliedHash) { $sourceHashesValid = $false }
  }
  $sourceStatus = if ($documents.Count -eq 21 -and $customer -eq 16 -and $internal -eq 5 -and $sourceMetadataValid -and $sourceHashesValid) { "PASS" } else { "FAIL" }
} catch {
  $documents = @()
  $customer = 0
  $internal = 0
  $sourceMetadataValid = $false
  $sourceHashesValid = $false
  $sourceStatus = "BLOCKED"
  $dbError = ([string]$_.Exception.Message)
}

$apiText = Get-Content -Raw -Encoding UTF8 -LiteralPath $apiPath
$authText = Get-Content -Raw -Encoding UTF8 -LiteralPath $authPath
$ownerApiSourceGuard = if ($apiText -match 'requireMembership\(principal,\s*"OWNER"\)') { "PASS" } else { "FAIL" }
$twoFactorSourceGuard = if ($authText -match "privilegedTwoFactorRequired") { "PASS" } else { "FAIL" }
$evidenceSourceGuard = if ($apiText -match "LEGAL_REVIEW_EVIDENCE_REQUIRED" -and $apiText -match "LEGAL_EVIDENCE_REQUIRED") { "PASS" } else { "FAIL" }
$publicationSourceGuard = if ($apiText -match "LEGAL_PUBLICATION_BLOCKED_P0" -and $apiText -match 'nextStatus === "PUBLISHED"') { "PASS" } else { "FAIL" }

try {
  $docker = (Get-Command docker.exe -ErrorAction Stop).Source
  $inspect = @(& $docker inspect $container 2>&1)
  if ($LASTEXITCODE -ne 0 -or $inspect.Count -eq 0) { throw "OWNER_CONTAINER_UNAVAILABLE" }
  $identity = ([string](Invoke-ReadonlySql "select current_database();")).Trim()
  if ($identity -ne $database) { throw "OWNER_DATABASE_IDENTITY_MISMATCH" }
  $ledger = [int](([string](Invoke-ReadonlySql "select count(*) from drizzle.__drizzle_migrations;")).Trim())
  $legalTables = [int](([string](Invoke-ReadonlySql "select count(*) from information_schema.tables where table_schema='public' and table_name in ('owner_legal_document_versions','owner_legal_document_decisions','owner_legal_document_events','owner_vat_decisions','owner_vat_decision_events','order_legal_snapshots','trainer_order_legal_snapshots');")).Trim())
  $triggers = [int](([string](Invoke-ReadonlySql "select count(*) from pg_trigger where not tgisinternal and tgname in ('owner_legal_document_versions_immutable','owner_legal_document_events_immutable','owner_vat_decision_events_immutable','order_legal_snapshots_immutable','trainer_order_legal_snapshots_immutable');")).Trim())
  $import = ([string](Invoke-ReadonlySql "select count(*) || '|' || count(*) filter (where scope='CUSTOMER') || '|' || count(*) filter (where scope='INTERNAL') || '|' || count(*) filter (where scope='INTERNAL' and status='PUBLISHED') from owner_legal_document_versions;")).Trim().Split('|')
  $dbTotal = [int]$import[0]
  $dbCustomer = [int]$import[1]
  $dbInternal = [int]$import[2]
  $dbInternalPublished = [int]$import[3]
  $dbStatus = if ($ledger -eq 42 -and $legalTables -eq 7 -and $triggers -eq 5 -and $dbInternalPublished -eq 0) { "PASS_READONLY" } else { "FAIL" }
} catch {
  $dbStatus = "BLOCKED"
  $dbError = ([string]$_.Exception.Message)
  $identity = "UNVERIFIED"
  $ledger = "UNVERIFIED"
  $legalTables = "UNVERIFIED"
  $triggers = "UNVERIFIED"
  $dbTotal = "UNVERIFIED"
  $dbCustomer = "UNVERIFIED"
  $dbInternal = "UNVERIFIED"
  $dbInternalPublished = "UNVERIFIED"
}

$importStatus = if ($dbTotal -eq 0) { "NOT_IMPORTED_INITIAL_STATE" } elseif ($dbTotal -eq 21 -and $dbCustomer -eq 16 -and $dbInternal -eq 5) { "PASS_21_16_5" } elseif ($dbTotal -is [int]) { "FAIL_SCOPE_OR_COUNT" } else { "UNVERIFIED" }
Write-Host ("R77D_SOURCE_SCHEMA=" + $sourceStatus)
Write-Host ("R77D_SOURCE_DOCUMENT_TOTAL=" + $documents.Count)
Write-Host ("R77D_SOURCE_CUSTOMER_DOCUMENTS=" + $customer)
Write-Host ("R77D_SOURCE_INTERNAL_DOCUMENTS=" + $internal)
Write-Host ("R77D_SOURCE_METADATA=" + ($(if ($sourceMetadataValid) { "PASS" } else { "FAIL" })))
Write-Host ("R77D_SOURCE_HASH=" + ($(if ($sourceHashesValid) { "PASS" } else { "FAIL" })))
Write-Host ("R77D_LOCAL_DATABASE_IDENTITY=" + $identity)
Write-Host ("R77D_MIGRATION_LEDGER=" + ($(if ($ledger -eq 42) { "42/42" } else { $ledger })))
Write-Host ("R77D_LEGAL_TABLES=" + $legalTables)
Write-Host ("R77D_IMMUTABLE_TRIGGERS=" + $triggers)
Write-Host ("R77D_IMPORTED_DOCUMENTS=" + $importStatus)
Write-Host ("R77D_IMPORTED_COUNTS=" + "$dbTotal/$dbCustomer/$dbInternal")
Write-Host ("R77D_INTERNAL_PUBLISHED=" + $dbInternalPublished)
Write-Host ("R77D_OWNER_API_SOURCE_GUARD=" + $ownerApiSourceGuard)
Write-Host ("R77D_2FA_SOURCE_GUARD=" + $twoFactorSourceGuard)
Write-Host ("R77D_LEGAL_EVIDENCE_SOURCE_GUARD=" + $evidenceSourceGuard)
Write-Host ("R77D_PUBLICATION_SOURCE_GUARD=" + $publicationSourceGuard)
Write-Host "R77D_UNAUTHORIZED_OWNER_API_RUNTIME=UNVERIFIED_READONLY_COMMAND"
Write-Host "R77D_OWNER_2FA_RUNTIME=UNVERIFIED_READONLY_COMMAND"
Write-Host "R77D_APPROVED_WITHOUT_EVIDENCE_RUNTIME=UNVERIFIED_READONLY_COMMAND"
Write-Host "R77D_DATABASE_MUTATION=NONE"
Write-Host "R77D_MIGRATION_APPLY=NONE"
Write-Host "R77D_PUBLICATION_MUTATION=NONE"
if ($dbError) { Write-Host ("R77D_DB_READONLY_NOTE=" + $dbError) }
Write-Host ("RESULT=" + ($(if ($sourceStatus -eq "PASS" -and $dbStatus -eq "PASS_READONLY") { "PASS_SOURCE_AND_READONLY_DB" } elseif ($sourceStatus -eq "PASS") { "PARTIAL_SOURCE_DB_BLOCKED" } else { "STOP_SOURCE_INVALID" })))
