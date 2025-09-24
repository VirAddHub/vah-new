# Comprehensive Auth Testing Script
Write-Host "🚀 Testing Complete Auth System" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest https://vah-api-staging.onrender.com/healthz
    Write-Host "✅ Health: $($health.StatusCode) - $($health.Content)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Auth Routes Ping
Write-Host "2. Testing Auth Routes..." -ForegroundColor Yellow
try {
    $authPing = Invoke-WebRequest https://vah-api-staging.onrender.com/api/auth/ping
    Write-Host "✅ Auth Routes: $($authPing.StatusCode) - $($authPing.Content)" -ForegroundColor Green
} catch {
    Write-Host "❌ Auth Routes Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Signup Test
Write-Host "3. Testing User Signup..." -ForegroundColor Yellow
$testEmail = "test+$([Guid]::NewGuid().ToString('N').Substring(0,8))@example.com"
Write-Host "Using email: $testEmail" -ForegroundColor Cyan

try {
    $signupBody = @{
        email = $testEmail
        password = "TestPass123!A"
        first_name = "Test"
        last_name = "User"
    } | ConvertTo-Json

    $signupResponse = Invoke-WebRequest -Method POST -Uri "https://vah-api-staging.onrender.com/api/auth/signup" -ContentType "application/json" -Body $signupBody
    Write-Host "✅ Signup Success: $($signupResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($signupResponse.Content)" -ForegroundColor Cyan
    
    # Parse the response to get the token
    $signupData = $signupResponse.Content | ConvertFrom-Json
    $token = $signupData.token
    
    if ($token) {
        Write-Host "✅ Token received: $($token.Substring(0,20))..." -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Signup Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error Details: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""

# Test 4: Login Test
Write-Host "4. Testing User Login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = $testEmail
        password = "TestPass123!A"
    } | ConvertTo-Json

    $loginResponse = Invoke-WebRequest -Method POST -Uri "https://vah-api-staging.onrender.com/api/auth/login" -ContentType "application/json" -Body $loginBody
    Write-Host "✅ Login Success: $($loginResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($loginResponse.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Login Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error Details: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""

# Test 5: Admin Creation (if SETUP_SECRET is available)
Write-Host "5. Testing Admin Creation..." -ForegroundColor Yellow
Write-Host "Note: This requires SETUP_SECRET to be set on Render" -ForegroundColor Yellow

try {
    $adminBody = @{
        email = "admin@virtualaddresshub.co.uk"
        password = "AdminPass123!"
        first_name = "Admin"
        last_name = "User"
    } | ConvertTo-Json

    $adminResponse = Invoke-WebRequest -Method POST -Uri "https://vah-api-staging.onrender.com/api/create-admin-user" -ContentType "application/json" -Headers @{"x-setup-secret"="test123"} -Body $adminBody
    Write-Host "✅ Admin Creation Success: $($adminResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($adminResponse.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Admin Creation Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error Details: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎯 Summary:" -ForegroundColor Yellow
Write-Host "- If signup works, your PostgreSQL integration is fixed!" -ForegroundColor White
Write-Host "- If admin creation fails with 401, set SETUP_SECRET on Render" -ForegroundColor White
Write-Host "- If login works, your auth system is fully functional!" -ForegroundColor White
