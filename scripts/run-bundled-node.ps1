param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string] $ScriptPath,
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $ScriptArguments
)

$bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if (-not (Test-Path -LiteralPath $bundledNode -PathType Leaf)) {
  throw "Bundled Node runtime not found under the current user profile."
}

& $bundledNode $ScriptPath @ScriptArguments
exit $LASTEXITCODE
