$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# FIXOKU R81: one-time, operator-run Production Owner bootstrap.
# This wrapper deliberately calls the existing scripts/bootstrap-owner.mjs
# mechanism. It never reads .env.local, never runs migrations, and never
# writes a password, DATABASE_URL, or BETTER_AUTH_SECRET to disk or output.

$repo = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repo

$expectedOwnerEmail = "ersin@fixoku.com"
$expectedOwnerName = "Ersin USTA"
$expectedDatabase = "neondb"
$expectedRole = "neondb_owner"
$expectedMigrationCount = 42
$expectedOrigin = "https://fixoku.com"
$expectedProductionNeonHost = "ep-wispy-poetry-bara3s2n.c-8.eu-central-1.aws.neon.tech"
$productionNeonHost = $expectedProductionNeonHost
$node = (Get-Command node.exe -ErrorAction Stop).Source

$markerDirectory = Join-Path $env:LOCALAPPDATA "Fixoku\owner-production-bootstrap"
$markerPath = Join-Path $markerDirectory "first-owner-ersin-usta.json"
$lockPath = Join-Path $markerDirectory "run.lock"
$preflightPath = Join-Path $repo ("scripts\.r81-owner-preflight-" + $PID + ".mjs")
$postflightPath = Join-Path $repo ("scripts\.r81-owner-postflight-" + $PID + ".mjs")
$writeStarted = $false
$lockCreated = $false
$transientKeys = @(
  "FIXOKU_SKIP_LOCAL_ENV", "DATABASE_URL", "BETTER_AUTH_SECRET", "APP_ORIGIN",
  "BETTER_AUTH_URL", "NODE_ENV", "VERCEL_ENV", "FIXOKU_OWNER_BOOTSTRAP",
  "FIXOKU_OWNER_BOOTSTRAP_CONFIRM", "FIXOKU_OWNER_BOOTSTRAP_EMAIL",
  "FIXOKU_OWNER_BOOTSTRAP_PASSWORD", "FIXOKU_OWNER_BOOTSTRAP_NAME", "EMAIL_PROVIDER",
  "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_PASSWORD", "SMTP_FROM",
  "MAIL_FROM", "SMTP_SECURE", "BETTER_AUTH_TEST_MAIL_SINK", "EMAIL_TEST_MODE",
  "LOCAL_REVIEW_MODE", "FIXOKU_LOCAL_OWNER_REVIEW", "FIXOKU_DEV_LOGIN_ENABLED",
  "FIXOKU_PRODUCTION_DATABASE_URL", "FIXOKU_PRODUCTION_BETTER_AUTH_SECRET",
  "FIXOKU_PRODUCTION_SMTP_PASS", "FIXOKU_PRODUCTION_SMTP_HOST",
  "FIXOKU_PRODUCTION_SMTP_PORT", "FIXOKU_PRODUCTION_SMTP_USER",
  "FIXOKU_PRODUCTION_SMTP_FROM", "FIXOKU_PRODUCTION_SMTP_SECURE"
)
$originalEnvironment = @{}

function Save-Environment([string[]]$Keys) {
  foreach ($key in $Keys) {
    $item = Get-Item -Path ("Env:{0}" -f $key) -ErrorAction SilentlyContinue
    $originalEnvironment[$key] = if ($null -eq $item) { $null } else { [string]$item.Value }
  }
}

function Restore-Environment {
  foreach ($key in $transientKeys) {
    $old = $originalEnvironment[$key]
    if ($null -eq $old) { Remove-Item -Path ("Env:{0}" -f $key) -ErrorAction SilentlyContinue }
    else { Set-Item -Path ("Env:{0}" -f $key) -Value $old }
  }
}

function Read-SecretText([string]$Prompt) {
  $secure = Read-Host -Prompt $Prompt -AsSecureString
  $pointer = [IntPtr]::Zero
  try {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    $secure.Dispose()
  }
}

function Read-CopiedCredential([string]$Label) {
  # V4 uses a single masked form. No clipboard API is ever called.
  throw "R81_GUI_CREDENTIAL_MISSING:$Label"
}


function Show-R81CredentialForm {
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing
  [System.Windows.Forms.Application]::EnableVisualStyles()

  $form = New-Object System.Windows.Forms.Form
  $form.Text = 'FIXOKU - Ersin USTA Production Owner Kurulumu'
  $form.StartPosition = 'CenterScreen'
  $form.Size = [System.Drawing.Size]::new(800,710)
  $form.MinimumSize = [System.Drawing.Size]::new(720,680)
  $form.BackColor = [System.Drawing.Color]::White
  $form.Font = [System.Drawing.Font]::new('Segoe UI',10)
  $form.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::Font
  $form.MaximizeBox = $false

  $scroll = New-Object System.Windows.Forms.Panel
  $scroll.Dock = [System.Windows.Forms.DockStyle]::Fill
  $scroll.AutoScroll = $true
  $scroll.AutoScrollMinSize = [System.Drawing.Size]::new(775,670)
  $form.Controls.Add($scroll)

  function Make-Label([string]$caption,[int]$top,[bool]$strong=$false) {
    $l = New-Object System.Windows.Forms.Label
    $l.Text = $caption
    $l.Location = [System.Drawing.Point]::new(25,$top)
    $l.Size = [System.Drawing.Size]::new(745,26)
    if ($strong) { $l.Font = [System.Drawing.Font]::new('Segoe UI',10,[System.Drawing.FontStyle]::Bold) }
    $scroll.Controls.Add($l)
    return $l
  }
  function Make-Input([string]$caption,[int]$top) {
    $null = Make-Label $caption $top $true
    $t = New-Object System.Windows.Forms.TextBox
    $t.Location = [System.Drawing.Point]::new(25,($top+27))
    $t.Size = [System.Drawing.Size]::new(735,31)
    $t.UseSystemPasswordChar = $true
    $t.Anchor = [System.Windows.Forms.AnchorStyles]'Top,Left,Right'
    $scroll.Controls.Add($t)
    return $t
  }

  $title = Make-Label 'FIXOKU | ILK PRODUCTION OWNER' 18 $true
  $title.Font = [System.Drawing.Font]::new('Segoe UI',15,[System.Drawing.FontStyle]::Bold)
  $null = Make-Label 'Hesap: ersin@fixoku.com   |   Neon: main / neondb   |   2FA korunacak' 60

  $neonBox = Make-Input '1. Neon DIRECT baglanti adresi (Connection string)' 100
  $authBox = Make-Input '2. Vercel Production BETTER_AUTH_SECRET (mevcut)' 173
  $smtpBox = Make-Input '3. Resend SMTP_PASS (mevcut API anahtari)' 246
  $passBox = Make-Input '4. Ersin icin yeni Owner parolasi (en az 12 karakter)' 319
  $againBox = Make-Input '5. Owner parolasini tekrar yazin' 392

  $smtpInfo = Make-Label 'SMTP: smtp.resend.com | Port: 465 | Kullanici: resend | Gonderici: bildirim@fixoku.com' 469
  $smtpInfo.ForeColor = [System.Drawing.Color]::FromArgb(55,65,81)

  $agreed = New-Object System.Windows.Forms.CheckBox
  $agreed.Location = [System.Drawing.Point]::new(25,507)
  $agreed.Size = [System.Drawing.Size]::new(735,46)
  $agreed.Text = 'Bu degerlerin mevcut Vercel Production ortamiyla ayni oldugunu dogruladim.'
  $scroll.Controls.Add($agreed)

  $errorLine = Make-Label '' 556
  $errorLine.Size = [System.Drawing.Size]::new(735,42)
  $errorLine.ForeColor = [System.Drawing.Color]::FromArgb(165,35,35)

  $abort = New-Object System.Windows.Forms.Button
  $abort.Text = 'Iptal'
  $abort.Location = [System.Drawing.Point]::new(467,604)
  $abort.Size = [System.Drawing.Size]::new(110,38)
  $abort.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
  $scroll.Controls.Add($abort)

  $next = New-Object System.Windows.Forms.Button
  $next.Text = 'On kontrole devam'
  $next.Location = [System.Drawing.Point]::new(589,604)
  $next.Size = [System.Drawing.Size]::new(172,38)
  $next.BackColor = [System.Drawing.Color]::FromArgb(32,67,158)
  $next.ForeColor = [System.Drawing.Color]::White
  $next.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $scroll.Controls.Add($next)
  $form.AcceptButton = $next
  $form.CancelButton = $abort

  $next.Add_Click({
    $errorLine.Text = ''
    $urlText = $neonBox.Text.Trim()
    if (-not ($urlText.StartsWith('postgresql://') -or $urlText.StartsWith('postgres://'))) {
      $errorLine.Text = 'Neon: postgresql:// ile baslayan Connection string girin (psql komutu degil).'
      return
    }
    try { $u = [Uri]$urlText } catch { $errorLine.Text = 'Neon DATABASE_URL gecersiz.'; return }
    if ($u.Host.ToLowerInvariant() -ne 'ep-wispy-poetry-bara3s2n.c-8.eu-central-1.aws.neon.tech' -or $u.AbsolutePath -ne '/neondb') {
      $errorLine.Text = 'STOP: Neon Production host / veritabani eslesmiyor.'
      return
    }
    if ($authBox.Text.Trim().Length -lt 32) { $errorLine.Text = 'BETTER_AUTH_SECRET en az 32 karakter olmali.'; return }
    if ([string]::IsNullOrWhiteSpace($smtpBox.Text)) { $errorLine.Text = 'SMTP_PASS bos olamaz.'; return }
    if ($passBox.Text.Length -lt 12) { $errorLine.Text = 'Owner parolasi en az 12 karakter olmali.'; return }
    if ($passBox.Text -cne $againBox.Text) { $errorLine.Text = 'Owner parolalari ayni degil.'; return }
    if (-not $agreed.Checked) { $errorLine.Text = 'Production ayarlarini dogruladiginizi isaretleyin.'; return }
    $form.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $form.Close()
  })

  try {
    $choice = $form.ShowDialog()
    if ($choice -ne [System.Windows.Forms.DialogResult]::OK) { throw 'R81_OPERATOR_CANCELLED_NO_WRITE' }
    return [pscustomobject]@{
      databaseUrl = $neonBox.Text.Trim()
      authSecret = $authBox.Text.Trim()
      smtpPass = $smtpBox.Text.Trim()
      ownerPassword = $passBox.Text
    }
  } finally {
    $neonBox.Clear()
    $authBox.Clear()
    $smtpBox.Clear()
    $passBox.Clear()
    $againBox.Clear()
    $form.Dispose()
  }
}

function Set-TransientEnvironment([hashtable]$Values) {
  foreach ($entry in $Values.GetEnumerator()) {
    if ($null -eq $entry.Value) { Remove-Item -Path ("Env:{0}" -f $entry.Key) -ErrorAction SilentlyContinue }
    else { Set-Item -Path ("Env:{0}" -f $entry.Key) -Value ([string]$entry.Value) }
  }
}

function Redact-Output([object[]]$Lines) {
  foreach ($line in $Lines) {
    $safe = ([string]$line) -replace '(?i)(postgres(?:ql)?://)[^@\s"'']+@', '$1[REDACTED]@'
    $safe = $safe -replace '(?i)(BETTER_AUTH_SECRET|FIXOKU_OWNER_BOOTSTRAP_PASSWORD|password=)[^\s,;"'']+', '$1=[REDACTED]'
    Write-Host $safe
  }
}

function Invoke-NodeJsonFile([string]$Path) {
  $previousErrorAction = $ErrorActionPreference
  try {
    # Node/pg can emit a non-fatal SSL warning on stderr. PowerShell 5.1
    # promotes native stderr to a terminating error under Stop, so capture
    # it as data and rely on the process exit code below.
    $ErrorActionPreference = "Continue"
    $lines = @(& $node $Path 2>&1)
    $code = $LASTEXITCODE
  } finally { $ErrorActionPreference = $previousErrorAction }
  if ($code -ne 0) {
    Redact-Output $lines
    throw ("R81_NODE_READONLY_CHECK_FAILED:{0}" -f $code)
  }
  $jsonLine = @($lines | Where-Object { ([string]$_).Trim().StartsWith("{") } | Select-Object -Last 1)
  if ($jsonLine.Count -ne 1) {
    Redact-Output $lines
    throw "R81_NODE_JSON_RESULT_MISSING"
  }
  try { return (([string]$jsonLine[0]).Trim() | ConvertFrom-Json) }
  catch {
    Redact-Output $lines
    throw "R81_NODE_JSON_RESULT_INVALID"
  }
}

function Write-Marker([string]$State, [string]$Reason = "") {
  New-Item -ItemType Directory -Path $markerDirectory -Force | Out-Null
  $marker = [ordered]@{
    version = 1
    state = $State
    ownerEmail = $expectedOwnerEmail
    database = $expectedDatabase
    neonHost = $productionNeonHost
    origin = $expectedOrigin
    updatedAtUtc = [DateTime]::UtcNow.ToString("o")
  }
  if ($Reason) { $marker.reason = $Reason }
  [IO.File]::WriteAllText($markerPath, (($marker | ConvertTo-Json -Compress) + [Environment]::NewLine), [Text.UTF8Encoding]::new($false))
}

function Assert-ProductionDatabaseUrl([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { throw "R81_PRODUCTION_DATABASE_URL_REQUIRED" }
  try { $uri = [Uri]$Value } catch { throw "R81_PRODUCTION_DATABASE_URL_INVALID" }
  if ($uri.Scheme -notin @("postgres", "postgresql")) { throw "R81_PRODUCTION_DATABASE_SCHEME_INVALID" }
  if ([string]::IsNullOrWhiteSpace($productionNeonHost)) { throw "R81_PRODUCTION_NEON_HOST_REQUIRED" }
  if ($uri.Host -notmatch '(?i)(^|\.)neon\.tech$') { throw "R81_NEON_HOST_REQUIRED" }
  if ($uri.Host -match '(?i)(staging|preview|dev|test|local)') { throw "R81_STAGING_OR_NONPRODUCTION_HOST_REJECTED" }
  if ($uri.Host.ToLowerInvariant() -ne $productionNeonHost.ToLowerInvariant()) { throw "R81_PRODUCTION_NEON_HOST_MISMATCH" }
  if ($uri.Host -match '^(?i:localhost|127\.0\.0\.1|0\.0\.0\.0)$') { throw "R81_LOOPBACK_DATABASE_REJECTED" }
  if ($uri.AbsolutePath -ne "/$expectedDatabase") { throw "R81_DATABASE_NAME_IN_URL_INVALID" }
  if ([string]::IsNullOrWhiteSpace($uri.UserInfo)) { throw "R81_DATABASE_CREDENTIALS_REQUIRED" }
  $sslMode = $null
  $sslModeParts = @($uri.Query.TrimStart("?").Split("&", [System.StringSplitOptions]::RemoveEmptyEntries) | Where-Object { $_.Split("=", 2)[0].ToLowerInvariant() -eq "sslmode" })
  if ($sslModeParts.Count -ne 1) { throw "R81_DATABASE_SSLMODE_DUPLICATE_OR_MISSING" }
  foreach ($part in $sslModeParts) {
    $pair = $part.Split("=", 2)
    if ($pair[0].ToLowerInvariant() -eq "sslmode") { $sslMode = if ($pair.Count -eq 2) { [Uri]::UnescapeDataString($pair[1]) } else { "" }; break }
  }
  if ($sslMode -and $sslMode.ToLowerInvariant() -notin @("require", "verify-full")) { throw "R81_DATABASE_SSLMODE_INVALID" }
  if (-not $sslMode) { throw "R81_DATABASE_SSLMODE_REQUIRED" }
  return $uri.AbsoluteUri
}

function Set-ProductionSmtpEnvironment {
  $provider = [string]$env:FIXOKU_PRODUCTION_EMAIL_PROVIDER
  if ([string]::IsNullOrWhiteSpace($provider)) { $provider = "SMTP" }
  if ($provider.Trim().ToUpperInvariant() -in @("DISABLED", "TEST")) { throw "R81_PRODUCTION_SMTP_DISABLED_OR_TEST" }
  $smtpHost = [string]$env:FIXOKU_PRODUCTION_SMTP_HOST
  if ([string]::IsNullOrWhiteSpace($smtpHost)) { $smtpHost = Read-Host "Production SMTP host (ornegin smtp.resend.com)" }
  $portText = [string]$env:FIXOKU_PRODUCTION_SMTP_PORT
  if ([string]::IsNullOrWhiteSpace($portText)) { $portText = Read-Host "Production SMTP port (465 veya 587)" }
  $user = [string]$env:FIXOKU_PRODUCTION_SMTP_USER
  if ([string]::IsNullOrWhiteSpace($user)) { $user = Read-Host "Production SMTP user" }
  $pass = [string]$env:FIXOKU_PRODUCTION_SMTP_PASS
  if ([string]::IsNullOrWhiteSpace($pass)) { $pass = Read-CopiedCredential "Production SMTP_PASS" }
  $from = [string]$env:FIXOKU_PRODUCTION_SMTP_FROM
  if ([string]::IsNullOrWhiteSpace($from)) { $from = Read-Host "Production SMTP sender (ornegin bildirim@fixoku.com)" }
  $secure = [string]$env:FIXOKU_PRODUCTION_SMTP_SECURE
  if ([string]::IsNullOrWhiteSpace($secure)) { $secure = if ($portText -eq "465") { "true" } else { "false" } }
  $port = 0
  if (-not [int]::TryParse($portText, [Globalization.NumberStyles]::Integer, [Globalization.CultureInfo]::InvariantCulture, [ref]$port) -or $port -lt 1 -or $port -gt 65535) { throw "R81_PRODUCTION_SMTP_PORT_INVALID" }
  if ([string]::IsNullOrWhiteSpace($smtpHost) -or $smtpHost -match '(?i)^(localhost|127\.0\.0\.1|0\.0\.0\.0)$') { throw "R81_PRODUCTION_SMTP_HOST_INVALID" }
  if ([string]::IsNullOrWhiteSpace($user) -or [string]::IsNullOrWhiteSpace($pass) -or [string]::IsNullOrWhiteSpace($from) -or $from -match '[\r\n]') { throw "R81_PRODUCTION_SMTP_IDENTITY_INVALID" }
  if ($secure.ToLowerInvariant() -notin @("true", "false") -or ($port -eq 465 -and $secure.ToLowerInvariant() -ne "true")) { throw "R81_PRODUCTION_SMTP_TLS_INVALID" }
  Set-TransientEnvironment @{ EMAIL_PROVIDER = if ($provider) { $provider } else { "SMTP" }; SMTP_HOST = $smtpHost; SMTP_PORT = [string]$port; SMTP_USER = $user; SMTP_PASS = $pass; SMTP_PASSWORD = $null; SMTP_FROM = $from; MAIL_FROM = $from; SMTP_SECURE = $secure.ToLowerInvariant() }
}

function Assert-Preflight([object]$Value) {
  if ($Value.database -ne $expectedDatabase) { throw ("R81_DATABASE_IDENTITY_REJECTED:{0}" -f $Value.database) }
  if ($Value.role -ne $expectedRole) { throw ("R81_DATABASE_ROLE_REJECTED:{0}" -f $Value.role) }
  if ([int]$Value.sourceJournalCount -ne $expectedMigrationCount -or [int]$Value.migrationFiles -ne $expectedMigrationCount -or [int]$Value.ledgerRows -ne $expectedMigrationCount) { throw "R81_MIGRATION_COUNT_NOT_42_42" }
  if (-not [bool]$Value.migrationHashesMatch -or -not [bool]$Value.migrationTimestampsMatch -or -not [bool]$Value.journalSourceTagsMatch) { throw "R81_MIGRATION_PARITY_FAILED" }
  if ([int]$Value.activeOwnerCount -ne 0) { throw "R81_ACTIVE_OWNER_ALREADY_EXISTS" }
  if ([int]$Value.authEmailCount -ne 0 -or [int]$Value.platformEmailCount -ne 0) { throw "R81_OWNER_EMAIL_ALREADY_IN_USE" }
}

function Assert-Postflight([object]$Value, [object]$Before) {
  if ($Value.database -ne $expectedDatabase -or $Value.role -ne $expectedRole) { throw "R81_POST_DATABASE_IDENTITY_FAILED" }
  if ([int]$Value.authEmailCount -ne 1 -or -not [bool]$Value.authEmailVerified -or [int]$Value.credentialAccountCount -ne 1) { throw "R81_AUTH_ACCOUNT_VERIFICATION_FAILED" }
  if ([int]$Value.platformMappingCount -ne 1 -or $Value.platformAuthUserId -ne $Value.authUserId) { throw "R81_PLATFORM_MAPPING_FAILED" }
  if (-not [bool]$Value.platformEmailVerified) { throw "R81_PLATFORM_EMAIL_VERIFICATION_FAILED" }
  if ([int]$Value.activeOwnerCount -ne 1 -or [int]$Value.validOwnerCount -ne 1 -or [int]$Value.ersinOwnerMembershipCount -ne 1) { throw "R81_SINGLE_OWNER_MEMBERSHIP_FAILED" }
  if ([int]$Value.activeStudentMemberships -ne [int]$Before.activeStudentMemberships) { throw "R81_STUDENT_MEMBERSHIP_COUNT_CHANGED" }
  foreach ($name in @("trainingPrograms", "packages", "packageVersions", "packageComponents", "packageEntitlementDefinitions", "physicalProducts", "r6ProductStageScopes", "r6PackageComponentPricing", "trainerCompensationRules", "r6TrainerPackageQualificationMap", "presentations", "resources")) {
    if ([int]$Value.$name -ne [int]$Before.$name) { throw ("R81_CATALOG_COUNT_CHANGED:{0}" -f $name) }
  }
}

if (Test-Path -LiteralPath $markerPath -PathType Leaf) { throw ("R81_STOP_MARKER_PRESENT_DO_NOT_RERUN:{0}" -f $markerPath) }

try {
  Save-Environment $transientKeys
  Write-Host "R81_SINGLE_WINDOW=READY"
  Write-Host "R81_CLIPBOARD_API=DISABLED"
  $formData = Show-R81CredentialForm
  $ownerPasswordFromForm = [string]$formData.ownerPassword
  $env:FIXOKU_PRODUCTION_DATABASE_URL = [string]$formData.databaseUrl
  $env:FIXOKU_PRODUCTION_BETTER_AUTH_SECRET = [string]$formData.authSecret
  $env:FIXOKU_PRODUCTION_SMTP_PASS = [string]$formData.smtpPass
  $env:FIXOKU_PRODUCTION_SMTP_HOST = "smtp.resend.com"
  $env:FIXOKU_PRODUCTION_SMTP_PORT = "465"
  $env:FIXOKU_PRODUCTION_SMTP_USER = "resend"
  $env:FIXOKU_PRODUCTION_SMTP_FROM = "bildirim@fixoku.com"
  $env:FIXOKU_PRODUCTION_SMTP_SECURE = "true"
  $formData = $null
  Write-Host "R81_FORM=VALIDATED"
  Write-Host "R81_CREDENTIALS=MEMORY_ONLY"
  New-Item -ItemType Directory -Path $markerDirectory -Force | Out-Null
  try {
    $lockStream = [IO.File]::Open($lockPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    $lockCreated = $true
    $lockStream.Dispose()
  } catch { throw "R81_ANOTHER_RUN_OR_STALE_LOCK" }

  $databaseUrl = [string]$env:FIXOKU_PRODUCTION_DATABASE_URL
  if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    Write-Host "R81_NEON_CLIPBOARD_MODE=READY"
    Write-Host "Neon Connect: main / neondb / neondb_owner / Connection pooling OFF"
    Write-Host "Neon Connection string > Copy snippet secenegini kullanin."
    $databaseUrl = Read-CopiedCredential "Production DATABASE_URL"
  }
  # Independently pin the previously verified Neon Production direct host.
  # A supplied override must MATCH this known host; it cannot redefine it.
  $requestedHost = [string]$env:FIXOKU_PRODUCTION_NEON_HOST
  if (-not [string]::IsNullOrWhiteSpace($requestedHost) -and $requestedHost.Trim().ToLowerInvariant() -cne $expectedProductionNeonHost) { throw "R81_PRODUCTION_NEON_HOST_OVERRIDE_REJECTED" }
  $productionNeonHost = $expectedProductionNeonHost
  $databaseUrl = Assert-ProductionDatabaseUrl $databaseUrl

  $journalPath = Join-Path $repo "drizzle\migrations\meta\_journal.json"
  $migrationDirectory = Join-Path $repo "drizzle\migrations"
  $journal = Get-Content -Raw -LiteralPath $journalPath | ConvertFrom-Json
  $sqlFiles = @(Get-ChildItem -LiteralPath $migrationDirectory -File -Filter "*.sql" | Where-Object { $_.Name -match '^\d{4}_.+\.sql$' })
  if (@($journal.entries).Count -ne $expectedMigrationCount -or $sqlFiles.Count -ne $expectedMigrationCount) { throw "R81_SOURCE_MIGRATION_COUNT_NOT_42_42" }

  Set-TransientEnvironment @{ FIXOKU_SKIP_LOCAL_ENV = "1"; DATABASE_URL = $databaseUrl; NODE_ENV = "production"; APP_ORIGIN = $expectedOrigin; BETTER_AUTH_URL = $expectedOrigin; VERCEL_ENV = "production"; BETTER_AUTH_TEST_MAIL_SINK = $null; EMAIL_TEST_MODE = $null; LOCAL_REVIEW_MODE = $null; FIXOKU_LOCAL_OWNER_REVIEW = $null; FIXOKU_DEV_LOGIN_ENABLED = "0" }

  $preflightJs = @'
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { readMigrationFiles } from "drizzle-orm/migrator";

const root = process.cwd();
const email = process.env.FIXOKU_OWNER_BOOTSTRAP_EMAIL;
const migrationDir = path.join(root, "drizzle", "migrations");
const journal = JSON.parse(fs.readFileSync(path.join(migrationDir, "meta", "_journal.json"), "utf8"));
const sqlFiles = fs.readdirSync(migrationDir).filter((name) => /^\d{4}_.+\.sql$/u.test(name)).sort();
const source = readMigrationFiles({ migrationsFolder: migrationDir });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 10000 });
try {
  const identity = (await pool.query("select current_database() as database, current_user as role")).rows[0];
  const ledger = (await pool.query("select hash,created_at from drizzle.__drizzle_migrations order by created_at,id")).rows;
  const owner = (await pool.query("select count(*)::int as count from platform_memberships where role='OWNER' and status='ACTIVE'")).rows[0];
  const authEmail = (await pool.query('select count(*)::int as count from "user" where lower(email)=lower($1)', [email])).rows[0];
  const platformEmail = (await pool.query("select count(*)::int as count from platform_users where lower(email)=lower($1)", [email])).rows[0];
  const counts = (await pool.query(`select
    (select count(*)::int from platform_memberships where role='STUDENT' and status='ACTIVE') as "activeStudentMemberships",
    (select count(*)::int from training_programs) as "trainingPrograms",
    (select count(*)::int from packages) as "packages",
    (select count(*)::int from package_versions) as "packageVersions",
    (select count(*)::int from package_components) as "packageComponents",
    (select count(*)::int from package_entitlement_definitions) as "packageEntitlementDefinitions",
    (select count(*)::int from physical_products) as "physicalProducts",
    (select count(*)::int from r6_product_stage_scopes) as "r6ProductStageScopes",
    (select count(*)::int from r6_package_component_pricing) as "r6PackageComponentPricing",
    (select count(*)::int from trainer_compensation_rules) as "trainerCompensationRules",
    (select count(*)::int from r6_trainer_package_qualification_map) as "r6TrainerPackageQualificationMap",
    (select count(*)::int from presentations) as "presentations",
    (select count(*)::int from resources) as "resources"`)).rows[0];
  console.log(JSON.stringify({
    database: identity.database, role: identity.role, sourceJournalCount: journal.entries.length,
    migrationFiles: sqlFiles.length, ledgerRows: ledger.length,
    journalSourceTagsMatch: JSON.stringify(journal.entries.map((entry) => entry.tag)) === JSON.stringify(sqlFiles.map((name) => name.slice(0, -4))),
    migrationHashesMatch: ledger.length === source.length && ledger.every((row, index) => row.hash === source[index].hash),
    migrationTimestampsMatch: ledger.length === source.length && ledger.every((row, index) => Number(row.created_at) === source[index].folderMillis),
    activeOwnerCount: Number(owner.count), authEmailCount: Number(authEmail.count), platformEmailCount: Number(platformEmail.count), ...counts,
  }));
} finally { await pool.end(); }
'@
  Set-Content -LiteralPath $preflightPath -Value $preflightJs -Encoding utf8
  $env:FIXOKU_OWNER_BOOTSTRAP_EMAIL = $expectedOwnerEmail
  $before = Invoke-NodeJsonFile $preflightPath
  Assert-Preflight $before

  Write-Host ("R81_READONLY_PREFLIGHT=PASS database={0} role={1} migrations={2}/{2} activeOwners=0 emailConflict=0" -f $before.database, $before.role, $before.sourceJournalCount)

  $secret = [string]$env:FIXOKU_PRODUCTION_BETTER_AUTH_SECRET
  if ([string]::IsNullOrWhiteSpace($secret)) { $secret = Read-CopiedCredential "Production BETTER_AUTH_SECRET" }
  if ($secret.Length -lt 32) { throw "R81_BETTER_AUTH_SECRET_WEAK" }
  Set-ProductionSmtpEnvironment
  $password = [string]$ownerPasswordFromForm
  if ([string]::IsNullOrWhiteSpace($password) -or $password.Length -lt 12) { throw "R81_OWNER_PASSWORD_TOO_SHORT" }
  $confirm = Read-Host "Production Owner yazimini baslatmak icin I_UNDERSTAND yazin"
  if ($confirm -cne "I_UNDERSTAND") { throw "R81_EXPLICIT_CONFIRMATION_REQUIRED" }

  Set-TransientEnvironment @{
    BETTER_AUTH_SECRET = $secret
    FIXOKU_OWNER_BOOTSTRAP = "1"
    FIXOKU_OWNER_BOOTSTRAP_CONFIRM = "I_UNDERSTAND"
    FIXOKU_OWNER_BOOTSTRAP_EMAIL = $expectedOwnerEmail
    FIXOKU_OWNER_BOOTSTRAP_PASSWORD = $password
    FIXOKU_OWNER_BOOTSTRAP_NAME = $expectedOwnerName
  }
  Write-Marker "PENDING_DO_NOT_RERUN"
  $writeStarted = $true
  $previousErrorAction = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $bootstrapLines = @(& $node "scripts/bootstrap-owner.mjs" 2>&1)
    $bootstrapCode = $LASTEXITCODE
  } finally { $ErrorActionPreference = $previousErrorAction }
  if ($bootstrapCode -ne 0) {
    Redact-Output $bootstrapLines
    Write-Marker "FAILED_DO_NOT_RERUN" ("bootstrap-exit:{0}" -f $bootstrapCode)
    throw "R81_BOOTSTRAP_FAILED_DO_NOT_RERUN"
  }
  Redact-Output $bootstrapLines

  $postflightJs = @'
import pg from "pg";
const email = process.env.FIXOKU_OWNER_BOOTSTRAP_EMAIL;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 10000 });
try {
  const identity = (await pool.query("select current_database() as database, current_user as role")).rows[0];
  const auth = (await pool.query('select id,email,email_verified,two_factor_enabled from "user" where lower(email)=lower($1)', [email])).rows;
  const platform = (await pool.query("select id,auth_user_id,email,email_verified from platform_users where lower(email)=lower($1)", [email])).rows;
  const owners = (await pool.query("select m.user_id,m.scope_type,m.scope_id,u.auth_user_id,u.email from platform_memberships m join platform_users u on u.id=m.user_id where m.role='OWNER' and m.status='ACTIVE'")).rows;
  const a = auth[0]; const p = platform[0];
  const credential = a ? (await pool.query("select count(*)::int as count from account where user_id=$1 and provider_id='credential' and password is not null", [a.id])).rows[0] : { count: 0 };
  const counts = (await pool.query(`select
    (select count(*)::int from platform_memberships where role='STUDENT' and status='ACTIVE') as "activeStudentMemberships",
    (select count(*)::int from training_programs) as "trainingPrograms",
    (select count(*)::int from packages) as "packages",
    (select count(*)::int from package_versions) as "packageVersions",
    (select count(*)::int from package_components) as "packageComponents",
    (select count(*)::int from package_entitlement_definitions) as "packageEntitlementDefinitions",
    (select count(*)::int from physical_products) as "physicalProducts",
    (select count(*)::int from r6_product_stage_scopes) as "r6ProductStageScopes",
    (select count(*)::int from r6_package_component_pricing) as "r6PackageComponentPricing",
    (select count(*)::int from trainer_compensation_rules) as "trainerCompensationRules",
    (select count(*)::int from r6_trainer_package_qualification_map) as "r6TrainerPackageQualificationMap",
    (select count(*)::int from presentations) as "presentations",
    (select count(*)::int from resources) as "resources"`)).rows[0];
  console.log(JSON.stringify({ database: identity.database, role: identity.role, authEmailCount: auth.length, authUserId: a?.id || null, authEmailVerified: Boolean(a?.email_verified), twoFactorEnabled: Boolean(a?.two_factor_enabled), credentialAccountCount: Number(credential.count), platformMappingCount: platform.length, platformId: p?.id || null, platformAuthUserId: p?.auth_user_id || null, platformEmailVerified: Boolean(p?.email_verified), activeOwnerCount: owners.length, validOwnerCount: owners.filter((row) => row.scope_type === 'GLOBAL' && row.scope_id === null).length, ersinOwnerMembershipCount: owners.filter((row) => row.scope_type === 'GLOBAL' && row.scope_id === null && row.auth_user_id === a?.id && String(row.email).toLowerCase() === email.toLowerCase()).length, ...counts }));
} finally { await pool.end(); }
'@
  Set-Content -LiteralPath $postflightPath -Value $postflightJs -Encoding utf8
  $after = Invoke-NodeJsonFile $postflightPath
  Assert-Postflight $after $before
  Write-Marker "COMPLETED"
  Write-Host "R81_PRODUCTION_OWNER_BOOTSTRAP=PASS"
  Write-Host "R81_POSTFLIGHT=PASS auth-account platform-mapping single-active-owner production-identity"
  Write-Host ("R81_STOP_MARKER={0}" -f $markerPath)
} catch {
  if ($writeStarted) {
    try { Write-Marker "FAILED_DO_NOT_RERUN" "operator-review-required" } catch { }
  }
  throw
} finally {
  Remove-Item -LiteralPath $preflightPath,$postflightPath -Force -ErrorAction SilentlyContinue
  if ($lockCreated) { Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue }
  Restore-Environment
  $databaseUrl = $null
  $secret = $null
  $password = $null
  $ownerPasswordFromForm = $null
  $formData = $null
}
