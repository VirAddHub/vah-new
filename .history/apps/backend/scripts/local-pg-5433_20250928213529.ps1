<#
  Ensures local dev uses PostgreSQL on port 5432.
  This script does NOT change your system. It only verifies and prints next steps.
#>
Write-Host "🔎 Checking Postgres on 5432..."
$pg = "/opt/homebrew/opt/postgresql@16/bin/psql"
$createdb = "/opt/homebrew/opt/postgresql@16/bin/createdb"
if (-Not (Test-Path $pg)) {
  Write-Host "❌ psql not found at $pg"
  Write-Host "➡️  Install PostgreSQL 17 or update the path in this script"
  exit 1
}
# Clear PG* env that can force TCP/SSL
Get-ChildItem Env:PG* | ForEach-Object { Remove-Item "Env:$($_.Name)" } | Out-Null
# Try to connect to PostgreSQL
$cmd = "$pg -h localhost -p 5432 -U libanadan -d postgres -c 'select 1 as ready;'"
$result = & bash -c $cmd
if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Could not reach Postgres on 5432."
  Write-Host "Try starting PostgreSQL 17:"
  Write-Host "  sudo /Library/PostgreSQL/17/bin/pg_ctl -D /Library/PostgreSQL/17/data start"
  Write-Host "Or install Homebrew PostgreSQL:"
  Write-Host "  brew install postgresql@16"
  Write-Host "  brew services start postgresql@16"
  Write-Host "Then re-run: pwsh apps/backend/scripts/local-pg-5433.ps1"
  exit 1
}
Write-Host "✅ Postgres reachable on 5432."
# Create DB if missing
$dbName = "test"
$checkDb = "$pg -h localhost -p 5432 -U libanadan -tAc 'SELECT 1 FROM pg_database WHERE datname=$dbName;' postgres"
$out = & bash -c $checkDb
if ($out.Trim() -ne "1") {
  Write-Host "🛠  Creating DB '$dbName'..."
  $mk = "$createdb -h localhost -p 5432 -U libanadan $dbName"
 & bash -c $mk
  if ($LASTEXITCODE -ne 0) { Write-Host "❌ createdb failed"; exit 1 }
}
Write-Host "📌 Use this DATABASE_URL locally:"
Write-Host "    postgresql://libanadan@localhost:5432/test"
