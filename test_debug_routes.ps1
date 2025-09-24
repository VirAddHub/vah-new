# Test Debug Routes - Should be public and not require auth
Write-Host "🔍 TESTING DEBUG ROUTES" -ForegroundColor Green
Write-Host "=======================" -ForegroundColor Green
Write-Host ""

$api = "https://vah-api-staging.onrender.com"

# Test 1: Debug ping (should be 200, no auth required)
Write-Host "1. Testing /_debug/ping..." -ForegroundColor Yellow
try {
    $ping = Invoke-WebRequest "$api/_debug/ping"
    Write-Host "✅ Debug Ping: $($ping.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($ping.Content)" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Debug Ping Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 2: Debug db-test (should be 200, no auth required)
Write-Host "2. Testing /_debug/db-test..." -ForegroundColor Yellow
try {
    $dbTest = Invoke-WebRequest "$api/_debug/db-test"
    Write-Host "✅ Debug DB Test: $($dbTest.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($dbTest.Content)" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Debug DB Test Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 3: Old debug route (should be 401 if protected)
Write-Host "3. Testing /api/debug/simple (should be 401 if protected)..." -ForegroundColor Yellow
try {
    $oldDebug = Invoke-WebRequest "$api/api/debug/simple"
    Write-Host "✅ Old Debug Route: $($oldDebug.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($oldDebug.Content)" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Old Debug Route Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 4: Health check (should be 200)
Write-Host "4. Testing /healthz..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest "$api/healthz"
    Write-Host "✅ Health: $($health.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($health.Content)" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Health Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 EXPECTED RESULTS:" -ForegroundColor Yellow
Write-Host "- /_debug/ping: 200 (public)" -ForegroundColor White
Write-Host "- /_debug/db-test: 200 (public)" -ForegroundColor White
Write-Host "- /api/debug/simple: 401 (protected by auth middleware)" -ForegroundColor White
Write-Host "- /healthz: 200 (public)" -ForegroundColor White
