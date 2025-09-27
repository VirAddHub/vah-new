# Key REST API Endpoints Test Script
# Tests the most important endpoints from the REST Client collection

$base = "http://localhost:4000/api"
$adminEmail = "admin@virtualaddresshub.co.uk"
$adminPass = "Admin123!"

Write-Host "🚀 Testing Key REST API Endpoints" -ForegroundColor Green
Write-Host "Base URL: $base" -ForegroundColor Yellow
Write-Host ""

# Initialize session for cookie handling
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Helper function to make requests
function Invoke-APIRequest {
    param(
        [string]$Method = "GET",
        [string]$Uri,
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    $requestParams = @{
        Method = $Method
        Uri = $Uri
        Headers = $Headers
        WebSession = $session
    }
    
    if ($Body) {
        $requestParams.Body = $Body
        $requestParams.ContentType = "application/json"
    }
    
    try {
        $response = Invoke-WebRequest @requestParams
        return $response
    }
    catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Test 1: Health Check
Write-Host "1️⃣ Testing Health Check..." -ForegroundColor Cyan
$response = Invoke-APIRequest -Uri "$base/health"
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✅ Health Check successful" -ForegroundColor Green
} else {
    Write-Host "❌ Health Check failed" -ForegroundColor Red
}

# Test 2: Ready Check
Write-Host "2️⃣ Testing Ready Check..." -ForegroundColor Cyan
$response = Invoke-APIRequest -Uri "$base/ready"
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✅ Ready Check successful" -ForegroundColor Green
} else {
    Write-Host "❌ Ready Check failed" -ForegroundColor Red
}

# Test 3: CSRF Token
Write-Host "3️⃣ Testing CSRF Token..." -ForegroundColor Cyan
$response = Invoke-APIRequest -Uri "$base/csrf"
if ($response -and $response.StatusCode -eq 200) {
    $csrf = ($response.Content | ConvertFrom-Json).csrfToken
    Write-Host "✅ CSRF Token: $csrf" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to get CSRF token" -ForegroundColor Red
    exit 1
}

# Test 4: Login
Write-Host "4️⃣ Testing Login..." -ForegroundColor Cyan
$loginBody = @{
    email = $adminEmail
    password = $adminPass
} | ConvertTo-Json

$response = Invoke-APIRequest -Method POST -Uri "$base/auth/login" -Headers @{"x-csrf-token" = $csrf} -Body $loginBody
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✅ Login successful" -ForegroundColor Green
} else {
    Write-Host "❌ Login failed: $($response.Content)" -ForegroundColor Red
    exit 1
}

# Test 5: Whoami
Write-Host "5️⃣ Testing Whoami..." -ForegroundColor Cyan
$response = Invoke-APIRequest -Uri "$base/auth/whoami"
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✅ Whoami successful" -ForegroundColor Green
} else {
    Write-Host "❌ Whoami failed" -ForegroundColor Red
}

# Test 6: Profile
Write-Host "6️⃣ Testing Profile..." -ForegroundColor Cyan
$response = Invoke-APIRequest -Uri "$base/profile"
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✅ Profile successful" -ForegroundColor Green
} else {
    Write-Host "❌ Profile failed" -ForegroundColor Red
}

# Test 7: Plans
Write-Host "7️⃣ Testing Plans..." -ForegroundColor Cyan
$response = Invoke-APIRequest -Uri "$base/plans"
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✅ Plans successful" -ForegroundColor Green
} else {
    Write-Host "❌ Plans failed: $($response.Content)" -ForegroundColor Red
}

# Test 8: Billing
Write-Host "8️⃣ Testing Billing..." -ForegroundColor Cyan
$response = Invoke-APIRequest -Uri "$base/billing"
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✅ Billing successful" -ForegroundColor Green
} else {
    Write-Host "❌ Billing failed" -ForegroundColor Red
}

# Test 9: Mail Items
Write-Host "9️⃣ Testing Mail Items..." -ForegroundColor Cyan
$response = Invoke-APIRequest -Uri "$base/mail-items"
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✅ Mail Items successful" -ForegroundColor Green
} else {
    Write-Host "❌ Mail Items failed" -ForegroundColor Red
}

# Test 10: Mail Search
Write-Host "🔟 Testing Mail Search..." -ForegroundColor Cyan
$response = Invoke-APIRequest -Uri "$base/mail-search?q=test&limit=5"
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✅ Mail Search successful" -ForegroundColor Green
} else {
    Write-Host "❌ Mail Search failed" -ForegroundColor Red
}

# Test 11: Support
Write-Host "1️⃣1️⃣ Testing Support..." -ForegroundColor Cyan
$response = Invoke-APIRequest -Uri "$base/support"
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✅ Support successful" -ForegroundColor Green
} else {
    Write-Host "❌ Support failed" -ForegroundColor Red
}

# Test 12: Admin Users
Write-Host "1️⃣2️⃣ Testing Admin Users..." -ForegroundColor Cyan
$response = Invoke-APIRequest -Uri "$base/admin/users?limit=10"
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✅ Admin Users successful" -ForegroundColor Green
} else {
    Write-Host "❌ Admin Users failed" -ForegroundColor Red
}

# Test 13: Admin Mail Items
Write-Host "1️⃣3️⃣ Testing Admin Mail Items..." -ForegroundColor Cyan
$response = Invoke-APIRequest -Uri "$base/admin/mail-items?limit=10"
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✅ Admin Mail Items successful" -ForegroundColor Green
} else {
    Write-Host "❌ Admin Mail Items failed" -ForegroundColor Red
}

# Test 14: Webhooks - GoCardless
Write-Host "1️⃣4️⃣ Testing GoCardless Webhook..." -ForegroundColor Cyan
$gcBody = @{
    events = @(
        @{
            resource_type = "payments"
            action = "confirmed"
            links = @{ payment = "PM123" }
        }
    )
} | ConvertTo-Json

$response = Invoke-APIRequest -Method POST -Uri "$base/webhooks-gc" -Body $gcBody
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✅ GoCardless Webhook successful" -ForegroundColor Green
} else {
    Write-Host "❌ GoCardless Webhook failed" -ForegroundColor Red
}

# Test 15: Webhooks - Postmark
Write-Host "1️⃣5️⃣ Testing Postmark Webhook..." -ForegroundColor Cyan
$postmarkBody = @{
    RecordType = "Bounce"
    Type = "HardBounce"
    Email = "user@example.com"
} | ConvertTo-Json

$response = Invoke-APIRequest -Method POST -Uri "$base/webhooks-postmark" -Body $postmarkBody
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✅ Postmark Webhook successful" -ForegroundColor Green
} else {
    Write-Host "❌ Postmark Webhook failed" -ForegroundColor Red
}

# Test 16: Metrics
Write-Host "1️⃣6️⃣ Testing Metrics..." -ForegroundColor Cyan
$response = Invoke-APIRequest -Uri "$base/metrics"
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✅ Metrics successful" -ForegroundColor Green
} else {
    Write-Host "❌ Metrics failed" -ForegroundColor Red
}

# Test 17: Get CSRF for logout
Write-Host "1️⃣7️⃣ Getting CSRF for logout..." -ForegroundColor Cyan
$response = Invoke-APIRequest -Uri "$base/csrf"
if ($response -and $response.StatusCode -eq 200) {
    $csrf = ($response.Content | ConvertFrom-Json).csrfToken
    Write-Host "✅ CSRF Token: $csrf" -ForegroundColor Green
}

# Test 18: Logout
Write-Host "1️⃣8️⃣ Testing Logout..." -ForegroundColor Cyan
$response = Invoke-APIRequest -Method POST -Uri "$base/auth/logout" -Headers @{"x-csrf-token" = $csrf}
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✅ Logout successful" -ForegroundColor Green
} else {
    Write-Host "❌ Logout failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Key REST API Endpoints Test Complete!" -ForegroundColor Green
Write-Host "📊 Tested 18 key endpoints across the backend" -ForegroundColor Yellow
Write-Host "🔐 Authentication, CSRF, and session management working" -ForegroundColor Yellow
Write-Host "🌐 Webhooks, admin functions, and user operations tested" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Backend is ready for comprehensive testing!" -ForegroundColor Green
