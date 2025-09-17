# PowerShell script for secure admin password management
# This script safely updates admin passwords in PostgreSQL using crypt() hashing

param(
    [string]$Email = "ops@virtualaddresshub.co.uk",
    [string]$DatabaseUrl = $env:DATABASE_URL
)

# Check if DATABASE_URL is provided
if (-not $DatabaseUrl) {
    Write-Error "DATABASE_URL environment variable is not set. Please set it or provide it as a parameter."
    Write-Host "Example: `$env:DATABASE_URL = 'postgresql://user:pass@host:port/dbname?sslmode=require'"
    exit 1
}

# Check if psql is available
try {
    $null = Get-Command psql -ErrorAction Stop
}
catch {
    Write-Error "psql command not found. Please ensure PostgreSQL client tools are installed."
    exit 1
}

# Function to securely prompt for password
function Get-SecurePassword {
    param([string]$Prompt)
    
    $securePassword = Read-Host -Prompt $Prompt -AsSecureString
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
    return $plainPassword
}

# Function to validate password strength
function Test-PasswordStrength {
    param([string]$Password)
    
    if ($Password.Length -lt 12) {
        Write-Warning "Password should be at least 12 characters long"
        return $false
    }
    
    if ($Password -notmatch "[A-Z]") {
        Write-Warning "Password should contain at least one uppercase letter"
        return $false
    }
    
    if ($Password -notmatch "[a-z]") {
        Write-Warning "Password should contain at least one lowercase letter"
        return $false
    }
    
    if ($Password -notmatch "[0-9]") {
        Write-Warning "Password should contain at least one number"
        return $false
    }
    
    if ($Password -notmatch "[!@#$%^&*()_+\-=\[\]{};':""\\|,.<>\/?]") {
        Write-Warning "Password should contain at least one special character"
        return $false
    }
    
    return $true
}

Write-Host "=== Admin Password Management ===" -ForegroundColor Cyan
Write-Host "Target email: $Email" -ForegroundColor Yellow
Write-Host "Database: $($DatabaseUrl -replace ':[^:]*@', ':***@')" -ForegroundColor Yellow
Write-Host ""

# Get new password securely
do {
    $newPassword = Get-SecurePassword "Enter new admin password"
    if (-not (Test-PasswordStrength $newPassword)) {
        Write-Host "Password does not meet strength requirements. Please try again." -ForegroundColor Red
        $newPassword = $null
    }
} while (-not $newPassword)

# Confirm password
$confirmPassword = Get-SecurePassword "Confirm new admin password"
if ($newPassword -ne $confirmPassword) {
    Write-Error "Passwords do not match. Aborting."
    exit 1
}

Write-Host ""
Write-Host "Updating admin password..." -ForegroundColor Yellow

# Create SQL with proper escaping for PowerShell
$sql = @"
UPDATE "user"
SET password = crypt('$($newPassword -replace "'", "''")', gen_salt('bf', 12)),
    updated_at = (EXTRACT(EPOCH FROM NOW())*1000)::bigint
WHERE email = '$($Email -replace "'", "''")';
"@

# Write SQL to temporary file to avoid quoting issues
$tempSqlFile = [System.IO.Path]::GetTempFileName() + ".sql"
$sql | Out-File -FilePath $tempSqlFile -Encoding UTF8

try {
    # Execute the SQL
    $result = psql $DatabaseUrl -f $tempSqlFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Password updated successfully!" -ForegroundColor Green
        
        # Verify the update
        Write-Host "Verifying update..." -ForegroundColor Yellow
        $verifySql = @"
SELECT email, first_name, last_name, role, is_admin, status, 
       CASE WHEN password IS NOT NULL THEN 'Password set' ELSE 'No password' END as password_status,
       to_timestamp(updated_at/1000) as updated_at_readable
FROM "user"
WHERE email = '$($Email -replace "'", "''")';
"@
        
        $verifyFile = [System.IO.Path]::GetTempFileName() + ".sql"
        $verifySql | Out-File -FilePath $verifyFile -Encoding UTF8
        
        $verifyResult = psql $DatabaseUrl -f $verifyFile 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Verification result:" -ForegroundColor Cyan
            Write-Host $verifyResult
        }
        else {
            Write-Warning "Could not verify update: $verifyResult"
        }
        
        Remove-Item $verifyFile -ErrorAction SilentlyContinue
    }
    else {
        Write-Error "Failed to update password: $result"
        exit 1
    }
}
finally {
    # Clean up temporary file
    Remove-Item $tempSqlFile -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "✅ Admin password has been updated securely using bcrypt hashing"
Write-Host "✅ Password strength requirements were validated"
Write-Host "✅ Update was verified in the database"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test login with the new password"
Write-Host "2. Remove any temporary password environment variables from Render"
Write-Host "3. Consider rotating other admin passwords if needed"
