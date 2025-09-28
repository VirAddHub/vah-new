Param(
    [string]$DatabaseUrl = "postgresql://libanadan@localhost:5433/test",
    [string]$Port = "8080"
)
$ErrorActionPreference = "Stop"
$repo = (Resolve-Path "$PSScriptRoot/../../..").Path
Set-Location $repo
$env:PORT = $Port
$env:DISABLE_SQLITE = "true"
$env:DATABASE_URL = $DatabaseUrl
Write-Host "▶️  Starting backend on http://localhost:$Port"
node apps/backend/dist/server/index.js
