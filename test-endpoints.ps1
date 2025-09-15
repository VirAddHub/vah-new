# Test script for BFF and Backend endpoints
$EMAIL = "admin@virtualaddresshub.co.uk"
$PASS = "Admin123!"

# Create JSON file for login data
$loginData = @{
    email    = $EMAIL
    password = $PASS
} | ConvertTo-Json -Compress

$loginData | Out-File -FilePath "test-login.json" -Encoding UTF8

Write-Host "=== BFF Testing ===" -ForegroundColor Green

Write-Host "BFF: CSRF"
$bff_csrf = (curl -s -c "bff-cookies.txt" "http://localhost:3000/api/bff/auth/csrf" | ConvertFrom-Json).token
Write-Host "CSRF Token: $bff_csrf"

Write-Host "BFF: Login"
$bff_login = curl -s -b "bff-cookies.txt" -c "bff-cookies.txt" -H "content-type: application/json" -H "x-csrf-token: $bff_csrf" -d "@test-login.json" "http://localhost:3000/api/bff/auth/login" | ConvertFrom-Json
$bff_login | ConvertTo-Json -Depth 3

Write-Host "BFF: WhoAmI"
$bff_whoami = curl -s -b "bff-cookies.txt" "http://localhost:3000/api/bff/auth/whoami" | ConvertFrom-Json
$bff_whoami | ConvertTo-Json -Depth 3

Write-Host "BFF: Plans"
$bff_plans = curl -s -b "bff-cookies.txt" "http://localhost:3000/api/bff/plans" | ConvertFrom-Json
$bff_plans | ConvertTo-Json -Depth 3

Write-Host "BFF: Ready"
$bff_ready = curl -s -b "bff-cookies.txt" "http://localhost:3000/api/bff/ready" | ConvertFrom-Json
$bff_ready | ConvertTo-Json -Depth 3

Write-Host "BFF: Health"
$bff_health = curl -s -b "bff-cookies.txt" "http://localhost:3000/api/bff/health" | ConvertFrom-Json
$bff_health | ConvertTo-Json -Depth 3

Write-Host "`n=== Backend Testing ===" -ForegroundColor Green

Write-Host "Backend: CSRF"
$backend_csrf = (curl -s -c "backend-cookies.txt" "http://localhost:4000/api/csrf" | ConvertFrom-Json).token
Write-Host "CSRF Token: $backend_csrf"

Write-Host "Backend: Login"
$backend_login = curl -s -b "backend-cookies.txt" -c "backend-cookies.txt" -H "content-type: application/json" -H "x-csrf-token: $backend_csrf" -d "@test-login.json" "http://localhost:4000/api/auth/login" | ConvertFrom-Json
$backend_login | ConvertTo-Json -Depth 3

Write-Host "Backend: Ready"
$backend_ready = curl -s "http://localhost:4000/api/ready" | ConvertFrom-Json
$backend_ready | ConvertTo-Json -Depth 3

Write-Host "Backend: Health"
$backend_health = curl -s "http://localhost:4000/api/health" | ConvertFrom-Json
$backend_health | ConvertTo-Json -Depth 3

Write-Host "Backend: Plans"
$backend_plans = curl -s "http://localhost:4000/api/plans" | ConvertFrom-Json
$backend_plans | ConvertTo-Json -Depth 3

Write-Host "`n=== Test Complete ===" -ForegroundColor Green
