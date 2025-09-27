# Final Auth Smoke Test - PostgreSQL RETURNING approach
Write-Host "🚀 FINAL AUTH SMOKE TEST" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""

function PostJson($u, $o, $h = @{}) {
    $j = ($o | ConvertTo-Json)
    Invoke-RestMethod -Method POST -Uri $u -Headers $h -ContentType "application/json" -Body $j -SkipHttpErrorCheck
}

$api = "https://vah-api-staging.onrender.com"

# Test 1: Health Check
Write-Host "1. Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest "$api/healthz"
    Write-Host "✅ Health: $($health.StatusCode)" -ForegroundColor Green
}
catch {
    Write-Host "❌ Health Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Fresh User Signup
Write-Host "2. Fresh User Signup..." -ForegroundColor Yellow
$email = "user+" + ([Guid]::NewGuid().ToString('N').Substring(0, 6)) + "@example.com"
Write-Host "Using email: $email" -ForegroundColor Cyan

$signup = PostJson "$api/api/auth/signup" @{
    email      = $email
    password   = "TestPass123!A"
    first_name = "Test"
    last_name  = "User"
}

Write-Host "Signup Response:" -ForegroundColor Cyan
$signup | ConvertTo-Json -Depth 6

Write-Host ""

# Test 3: Bad Login (should fail)
Write-Host "3. Bad Login Test..." -ForegroundColor Yellow
$loginBad = PostJson "$api/api/auth/login" @{
    email    = $email
    password = "WrongPass123!"
}
Write-Host "Bad Login Response:" -ForegroundColor Cyan
$loginBad | ConvertTo-Json -Depth 6

Write-Host ""

# Test 4: Good Login (should succeed)
Write-Host "4. Good Login Test..." -ForegroundColor Yellow
$loginOk = PostJson "$api/api/auth/login" @{
    email    = $email
    password = "TestPass123!A"
}
Write-Host "Good Login Response:" -ForegroundColor Cyan
$loginOk | ConvertTo-Json -Depth 6

Write-Host ""

# Test 5: Duplicate Signup (should fail with 409)
Write-Host "5. Duplicate Signup Test..." -ForegroundColor Yellow
$duplicate = PostJson "$api/api/auth/signup" @{
    email      = $email
    password   = "AnotherPass123!"
    first_name = "X"
    last_name  = "Y"
}
Write-Host "Duplicate Signup Response:" -ForegroundColor Cyan
$duplicate | ConvertTo-Json -Depth 6

Write-Host ""
Write-Host "🎯 EXPECTED RESULTS:" -ForegroundColor Yellow
Write-Host "- Health: 200" -ForegroundColor White
Write-Host "- Signup: 201 with user data + token" -ForegroundColor White
Write-Host "- Bad Login: 401 with error message" -ForegroundColor White
Write-Host "- Good Login: 200 with user data + token" -ForegroundColor White
Write-Host "- Duplicate: 409 with 'Email already in use'" -ForegroundColor White
