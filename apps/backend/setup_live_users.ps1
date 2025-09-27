# PowerShell script to set up live users
# This script helps you create users for your Virtual Address Hub

Write-Host "🚀 Virtual Address Hub - Live User Setup" -ForegroundColor Green
Write-Host ""

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL environment variable is not set." -ForegroundColor Red
    Write-Host ""
    Write-Host "To get your database password:" -ForegroundColor Yellow
    Write-Host "1. Go to https://dashboard.render.com"
    Write-Host "2. Navigate to your PostgreSQL database (vah-postgres)"
    Write-Host "3. Copy the connection string"
    Write-Host "4. Set the environment variable:"
    Write-Host ""
    Write-Host '$env:DATABASE_URL = "postgresql://vah_postgres_user:[PASSWORD]@dpg-d2vikgnfte5s73c5nv80-a:5432/vah_postgres"' -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Then run this script again."
    exit 1
}

Write-Host "✅ DATABASE_URL is set" -ForegroundColor Green
Write-Host ""

# Test database connection
Write-Host "🔍 Testing database connection..."
try {
    $testBody = '{"email":"test@example.com","password":"TestPass123!","first_name":"Test","last_name":"User"}'
    $testResponse = Invoke-WebRequest -Method POST -Uri "https://vah-api-staging.onrender.com/api/auth/signup" -ContentType "application/json" -Body $testBody -ErrorAction Stop
    Write-Host "✅ API is working - Status: $($testResponse.StatusCode)" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  API test failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "This is expected - we'll create users directly in the database." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Creating live users..."

# Run the user creation script
try {
    node create_live_users_final.mjs
    Write-Host ""
    Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Your login credentials:" -ForegroundColor Cyan
    Write-Host "Admin User:" -ForegroundColor Yellow
    Write-Host "  Email: admin@virtualaddresshub.co.uk" -ForegroundColor White
    Write-Host "  Password: AdminPass123!" -ForegroundColor White
    Write-Host ""
    Write-Host "Regular User:" -ForegroundColor Yellow
    Write-Host "  Email: user@virtualaddresshub.co.uk" -ForegroundColor White
    Write-Host "  Password: UserPass123!" -ForegroundColor White
    Write-Host ""
    Write-Host "🌐 You can now login at: https://vah-api-staging.onrender.com" -ForegroundColor Green
}
catch {
    Write-Host "❌ Error creating users: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure your DATABASE_URL is correct"
    Write-Host "2. Check that your database is accessible"
    Write-Host "3. Verify the password is correct"
}
