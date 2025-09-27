# PowerShell script to test and debug auth endpoints

Write-Host "🔍 Testing Virtual Address Hub Auth Endpoints" -ForegroundColor Green
Write-Host ""

# Test health first
Write-Host "1. Testing health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest https://vah-api-staging.onrender.com/healthz
    Write-Host "✅ Health check passed: $($health.StatusCode)" -ForegroundColor Green
}
catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test signup with fresh email
Write-Host "2. Testing signup endpoint..." -ForegroundColor Yellow
$email = "test+$([Guid]::NewGuid().ToString('N').Substring(0,6))@example.com"
Write-Host "Using email: $email" -ForegroundColor Cyan

try {
    $signupBody = @{
        email      = $email
        password   = "TestPass123!A"
        first_name = "Test"
        last_name  = "User"
    } | ConvertTo-Json

    $signupResponse = Invoke-WebRequest -Method POST -Uri "https://vah-api-staging.onrender.com/api/auth/signup" -ContentType "application/json" -Body $signupBody
    Write-Host "✅ Signup successful: $($signupResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($signupResponse.Content)" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Signup failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error response: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""

# Test login with the created user
Write-Host "3. Testing login endpoint..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email    = $email
        password = "TestPass123!A"
    } | ConvertTo-Json

    $loginResponse = Invoke-WebRequest -Method POST -Uri "https://vah-api-staging.onrender.com/api/auth/login" -ContentType "application/json" -Body $loginBody
    Write-Host "✅ Login successful: $($loginResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($loginResponse.Content)" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error response: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Yellow
Write-Host "1. Check Render logs for detailed error messages" -ForegroundColor White
Write-Host "2. If signup still fails, the issue might be in the database connection or schema" -ForegroundColor White
Write-Host "3. Try creating users directly via the admin endpoint with proper setup secret" -ForegroundColor White
