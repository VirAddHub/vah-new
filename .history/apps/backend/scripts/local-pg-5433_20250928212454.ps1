<#
  Ensures local dev uses Homebrew Postgres on port 5433.
  This script does NOT change your system. It only verifies and prints next steps.
#>
Write-Host "🔎 Checking Postgres on 5433..."
$pg = "/opt/homebrew/opt/postgresql@16/bin/psql"
$createdb = "/opt/homebrew/opt/postgresql@16/bin/createdb"
if (-Not (Test-Path $pg)) {
  Write-Host "❌ psql not found at $pg"
  Write-Host "➡️  Install with: brew install postgresql@16"
  exit 1
}
# Clear PG* env that can force TCP/SSL
Get-ChildItem Env:PG* | ForEach-Object { Remove-Item "Env:$($_.Name)" } | Out-Null
# Try to talk to UNIX socket on port 5433
$cmd = "$pg -h /tmp -p 5433 -d postgres -c `"select 'ok' as ready;`""
$p = Start-Process -FilePath bash -ArgumentList "-lc", $cmd -PassThru -NoNewWindow -Wait
if ($p.ExitCode -ne 0) {
  Write-Host "❌ Could not reach Postgres on 5433 via /tmp socket."
  Write-Host "If you have EnterpriseDB Postgres on 5432, keep it; run Homebrew Postgres 16 on 5433:"
  Write-Host "  brew services stop postgresql@16"
  Write-Host "  Add 'port = 5433' to /opt/homebrew/var/postgresql@16/postgresql.conf"
  Write-Host "  rm -f /opt/homebrew/var/postgresql@16/postmaster.pid"
  Write-Host "  brew services start postgresql@16"
  Write-Host "Then re-run: pwsh apps/backend/scripts/local-pg-5433.ps1"
  exit 1
}
Write-Host "✅ Postgres reachable on 5433."
# Create DB if missing
$dbName = "test"
$checkDb = "$pg -h /tmp -p 5433 -tAc `"SELECT 1 FROM pg_database WHERE datname='$dbName';`" postgres"
$out = & bash -lc $checkDb
if ($out.Trim() -ne "1") {
  Write-Host "🛠  Creating DB '$dbName'..."
  $mk = "$createdb -h /tmp -p 5433 $dbName"
 & bash -lc $mk
  if ($LASTEXITCODE -ne 0) { Write-Host "❌ createdb failed"; exit 1 }
}
Write-Host "📌 Use this DATABASE_URL locally:"
Write-Host "    postgresql://libanadan@localhost:5433/test"
