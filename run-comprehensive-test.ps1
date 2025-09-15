# Comprehensive API Test Runner
# This script runs through all the endpoints in the .http file

Write-Host "🚀 Starting Comprehensive API Test Suite" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

$baseUrl = "http://localhost:4000/api"
$adminEmail = "admin@virtualaddresshub.co.uk"
$adminPass = "Admin123!"
$testEmail = "test.user@example.com"
$testPass = "Test123!"
$companyNumber = "00000000"
$forwardAddress = "Home, 1 Test St, AB1 2CD"

# Global variables for captured IDs
$global:csrf = ""
$global:invoiceId = ""
$global:mailId = ""
$global:adminUserId = ""
$global:adminMailId = ""
$global:forwardReqId = ""
$global:planId = ""
$global:ticketId = ""
$global:redirectFlowId = ""

# Helper function to make requests
function Invoke-APIRequest {
    param(
        [string]$Method = "GET",
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [string]$Description = ""
    )
    
    try {
        $params = @{
            Uri             = $Url
            Method          = $Method
            Headers         = $Headers
            UseBasicParsing = $true
        }
        
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params
        $status = $response.StatusCode
        
        if ($status -ge 200 -and $status -lt 300) {
            Write-Host "✅ $Description - Status: $status" -ForegroundColor Green
        }
        elseif ($status -ge 400 -and $status -lt 500) {
            Write-Host "⚠️  $Description - Status: $status (Client Error)" -ForegroundColor Yellow
        }
        else {
            Write-Host "❌ $Description - Status: $status (Server Error)" -ForegroundColor Red
        }
        
        return $response
    }
    catch {
        Write-Host "❌ $Description - Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Test counter
$testCount = 0
$passedCount = 0
$failedCount = 0

function Run-Test {
    param(
        [string]$Method = "GET",
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [string]$Description = ""
    )
    
    $script:testCount++
    $response = Invoke-APIRequest -Method $Method -Url $Url -Headers $Headers -Body $Body -Description $Description
    
    if ($response -and $response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        $script:passedCount++
    }
    else {
        $script:failedCount++
    }
    
    return $response
}

Write-Host "`n🔐 1) AUTHENTICATION & USER TESTS" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# 0) CSRF helper
Write-Host "`n0) Getting CSRF token..." -ForegroundColor Yellow
$csrfResponse = Run-Test -Url "$baseUrl/csrf" -Description "Get CSRF token"
if ($csrfResponse) {
    $csrfData = $csrfResponse.Content | ConvertFrom-Json
    $global:csrf = $csrfData.token
    Write-Host "   CSRF Token: $($global:csrf.Substring(0, [Math]::Min(20, $global:csrf.Length)))..." -ForegroundColor Gray
}

# 1.1 Signup
Run-Test -Method "POST" -Url "$baseUrl/auth/signup" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        email    = $testEmail
        password = $testPass
    } | ConvertTo-Json) -Description "User signup"

# 1.2 Login (admin)
Run-Test -Method "POST" -Url "$baseUrl/auth/login" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        email    = $adminEmail
        password = $adminPass
    } | ConvertTo-Json) -Description "Admin login"

# 1.3 Login wrong password (negative)
Run-Test -Method "POST" -Url "$baseUrl/auth/login" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        email    = $adminEmail
        password = "WrongPassword!"
    } | ConvertTo-Json) -Description "Login with wrong password (should fail)"

# 1.4 WhoAmI
Run-Test -Url "$baseUrl/auth/whoami" -Description "Get current user (whoami)"

# 1.5 Logout
$csrfResponse = Run-Test -Url "$baseUrl/csrf" -Description "Get CSRF for logout"
if ($csrfResponse) {
    $csrfData = $csrfResponse.Content | ConvertFrom-Json
    $global:csrf = $csrfData.token
}
Run-Test -Method "POST" -Url "$baseUrl/auth/logout" -Headers @{"x-csrf-token" = $global:csrf } -Description "Logout"

# 1.6 Logout All Sessions
$csrfResponse = Run-Test -Url "$baseUrl/csrf" -Description "Get CSRF for logout-all"
if ($csrfResponse) {
    $csrfData = $csrfResponse.Content | ConvertFrom-Json
    $global:csrf = $csrfData.token
}
Run-Test -Method "POST" -Url "$baseUrl/auth/logout-all" -Headers @{"x-csrf-token" = $global:csrf } -Description "Logout all sessions"

# 1.7 Ping
Run-Test -Url "$baseUrl/auth/ping" -Description "Auth ping"

# 1.8 DB check
Run-Test -Url "$baseUrl/auth/db-check" -Description "DB check"

# 1.9 Hash check
Run-Test -Method "POST" -Url "$baseUrl/auth/hash-check" -Body (@{
        plaintext = "demo"
        hash      = "$2b$10$Gm6P0..examplehashDOESNOTMATCH"
    } | ConvertTo-Json) -Description "Hash check (demo)"

# 1.10 Reset password request
$csrfResponse = Run-Test -Url "$baseUrl/csrf" -Description "Get CSRF for password reset"
if ($csrfResponse) {
    $csrfData = $csrfResponse.Content | ConvertFrom-Json
    $global:csrf = $csrfData.token
}
Run-Test -Method "POST" -Url "$baseUrl/profile/reset-password-request" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        email = $adminEmail
    } | ConvertTo-Json) -Description "Password reset request"

# 1.11 Reset password confirm
Run-Test -Method "POST" -Url "$baseUrl/profile/reset-password" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        token        = "PLACEHOLDER_TOKEN"
        new_password = "Admin123!"
    } | ConvertTo-Json) -Description "Password reset confirm (placeholder)"

# 1.12 Update password (re-login first)
$csrfResponse = Run-Test -Url "$baseUrl/csrf" -Description "Get CSRF for re-login"
if ($csrfResponse) {
    $csrfData = $csrfResponse.Content | ConvertFrom-Json
    $global:csrf = $csrfData.token
}
Run-Test -Method "POST" -Url "$baseUrl/auth/login" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        email    = $adminEmail
        password = $adminPass
    } | ConvertTo-Json) -Description "Re-login for password update"

Run-Test -Method "POST" -Url "$baseUrl/profile/update-password" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        current_password = $adminPass
        new_password     = "Admin123!"
    } | ConvertTo-Json) -Description "Update password"

# 1.13 Profile (GET)
Run-Test -Url "$baseUrl/profile" -Description "Get profile"

# 1.14 Profile (POST update)
Run-Test -Method "POST" -Url "$baseUrl/profile" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        phone = "+441234567890"
    } | ConvertTo-Json) -Description "Update profile"

# 1.15 Update address
Run-Test -Method "PUT" -Url "$baseUrl/profile/address" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        address = "New Office, 2 Example Rd, ZZ1 1ZZ"
    } | ConvertTo-Json) -Description "Update address"

Write-Host "`n🏢 2) BUSINESS & ONBOARDING TESTS" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# 2.1 Save business details
Run-Test -Method "POST" -Url "$baseUrl/onboarding/business" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        business_name  = "Example Ltd"
        trading_name   = "Example"
        company_number = $companyNumber
    } | ConvertTo-Json) -Description "Save business details"

# 2.2 Company search
Run-Test -Method "POST" -Url "$baseUrl/company-search" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        query = "Example"
    } | ConvertTo-Json) -Description "Company search"

# 2.3 KYC start
Run-Test -Method "POST" -Url "$baseUrl/kyc/start" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        return_url = "https://localhost:3000/kyc/return"
    } | ConvertTo-Json) -Description "KYC start"

# 2.4 KYC upload
Run-Test -Method "POST" -Url "$baseUrl/kyc/upload" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        doc_type   = "passport"
        file_token = "UPLOAD_TOKEN_PLACEHOLDER"
    } | ConvertTo-Json) -Description "KYC upload (placeholder)"

# 2.5 KYC status
Run-Test -Url "$baseUrl/kyc/status" -Description "KYC status"

# 2.6 Resend verification link
Run-Test -Method "POST" -Url "$baseUrl/kyc/resend-verification-link" -Headers @{"x-csrf-token" = $global:csrf } -Description "Resend verification link"

# 2.7 Request business name change
Run-Test -Method "POST" -Url "$baseUrl/profile/request-business-name-change" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        new_name = "Example Group Ltd"
    } | ConvertTo-Json) -Description "Request business name change"

# 2.8 Certificate URL
Run-Test -Url "$baseUrl/profile/certificate-url" -Description "Certificate URL"

Write-Host "`n💳 3) BILLING & PAYMENTS TESTS" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# 3.1 Billing summary
Run-Test -Url "$baseUrl/billing" -Description "Billing summary"

# 3.2 Create mandate
Run-Test -Method "POST" -Url "$baseUrl/billing/mandate/create" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        redirect_url = "https://localhost:3000/payments/return"
    } | ConvertTo-Json) -Description "Create mandate"

# 3.3 Confirm mandate
Run-Test -Method "POST" -Url "$baseUrl/billing/mandate/confirm" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        session_id = "MANDATE_SESSION_PLACEHOLDER"
    } | ConvertTo-Json) -Description "Confirm mandate"

# 3.4 Invoices (list)
$invoiceResponse = Run-Test -Url "$baseUrl/billing/invoices" -Description "List invoices"
if ($invoiceResponse) {
    $invoiceData = $invoiceResponse.Content | ConvertFrom-Json
    if ($invoiceData -is [array] -and $invoiceData.Count -gt 0) {
        $global:invoiceId = $invoiceData[0].id
    }
    elseif ($invoiceData.invoices -and $invoiceData.invoices.Count -gt 0) {
        $global:invoiceId = $invoiceData.invoices[0].id
    }
}

# 3.5 Invoice link (GET)
if ($global:invoiceId) {
    Run-Test -Url "$baseUrl/billing/invoices/$($global:invoiceId)/link" -Description "Get invoice link"
}

# 3.6 Invoice link (POST)
if ($global:invoiceId) {
    Run-Test -Method "POST" -Url "$baseUrl/billing/invoices/$($global:invoiceId)/link" -Headers @{"x-csrf-token" = $global:csrf } -Description "Create invoice link"
}

# 3.7 Payment retry
if ($global:invoiceId) {
    Run-Test -Method "POST" -Url "$baseUrl/billing/retry" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
            invoice_id = $global:invoiceId
        } | ConvertTo-Json) -Description "Payment retry"
}

# 3.8 Cancel subscription
Run-Test -Method "POST" -Url "$baseUrl/billing/cancel" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        reason = "user_request"
    } | ConvertTo-Json) -Description "Cancel subscription"

# 3.9 Payments (list)
Run-Test -Url "$baseUrl/payments" -Description "List payments"

# 3.10 Subscription status
Run-Test -Url "$baseUrl/payments/subscriptions/status" -Description "Subscription status"

# 3.11 Redirect flows (start)
$redirectResponse = Run-Test -Method "POST" -Url "$baseUrl/payments/redirect-flows" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        success_redirect_url = "https://localhost:3000/payments/success"
        cancel_redirect_url  = "https://localhost:3000/payments/cancel"
    } | ConvertTo-Json) -Description "Start redirect flow"
if ($redirectResponse) {
    $redirectData = $redirectResponse.Content | ConvertFrom-Json
    $global:redirectFlowId = $redirectData.id
}

# 3.12 Redirect flows (complete)
if ($global:redirectFlowId) {
    Run-Test -Method "POST" -Url "$baseUrl/payments/redirect-flows/$($global:redirectFlowId)/complete" -Headers @{"x-csrf-token" = $global:csrf } -Description "Complete redirect flow"
}

# 3.13 Create subscription
Run-Test -Method "POST" -Url "$baseUrl/payments/subscriptions" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        plan_id = "basic"
    } | ConvertTo-Json) -Description "Create subscription"

Write-Host "`n📮 4) MAIL MANAGEMENT TESTS" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

# 4.1 Mail items (list)
$mailResponse = Run-Test -Url "$baseUrl/mail-items" -Description "List mail items"
if ($mailResponse) {
    $mailData = $mailResponse.Content | ConvertFrom-Json
    if ($mailData -is [array] -and $mailData.Count -gt 0) {
        $global:mailId = $mailData[0].id
    }
    elseif ($mailData.items -and $mailData.items.Count -gt 0) {
        $global:mailId = $mailData.items[0].id
    }
}

# 4.2 Mail item (detail)
if ($global:mailId) {
    Run-Test -Url "$baseUrl/mail-items/$($global:mailId)" -Description "Get mail item detail"
}

# 4.3 Mail item history
if ($global:mailId) {
    Run-Test -Url "$baseUrl/mail-items/$($global:mailId)/history" -Description "Get mail item history"
}

# 4.4 Mail item tag
if ($global:mailId) {
    Run-Test -Method "POST" -Url "$baseUrl/mail-items/$($global:mailId)/tag" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
            tag = "HMRC"
        } | ConvertTo-Json) -Description "Tag mail item"
}

# 4.5 Mail item delete
if ($global:mailId) {
    Run-Test -Method "DELETE" -Url "$baseUrl/mail-items/$($global:mailId)" -Headers @{"x-csrf-token" = $global:csrf } -Description "Delete mail item"
}

# 4.6 Mail item restore
if ($global:mailId) {
    Run-Test -Method "POST" -Url "$baseUrl/mail-items/$($global:mailId)/restore" -Headers @{"x-csrf-token" = $global:csrf } -Description "Restore mail item"
}

# 4.7 Scan URL
if ($global:mailId) {
    Run-Test -Url "$baseUrl/mail-items/$($global:mailId)/scan-url" -Description "Get scan URL"
}

# 4.8 Scan token (invalid demo)
Run-Test -Url "$baseUrl/scans/INVALID_OR_EXPIRED_TOKEN" -Description "Get scan with invalid token"

# 4.9 Search mail
Run-Test -Url "$baseUrl/search/mail?q=invoice&limit=10" -Description "Search mail"

# 4.10 Forward mail
if ($global:mailId) {
    Run-Test -Method "POST" -Url "$baseUrl/mail/forward" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
            mail_item_id = [int]$global:mailId
            address      = $forwardAddress
        } | ConvertTo-Json) -Description "Forward mail"
}

# 4.11 Forwarding history
if ($global:mailId) {
    Run-Test -Url "$baseUrl/mail/history/$($global:mailId)" -Description "Get forwarding history"
}

# 4.12 Mail summary
Run-Test -Url "$baseUrl/mail" -Description "Get mail summary"

# 4.13 Bulk forward request
if ($global:mailId) {
    Run-Test -Method "POST" -Url "$baseUrl/mail/bulk-forward-request" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
            ids     = @([int]$global:mailId)
            address = $forwardAddress
        } | ConvertTo-Json) -Description "Bulk forward request"
}

# 4.14 Forwarding requests (list)
$forwardResponse = Run-Test -Url "$baseUrl/forwarding-requests" -Description "List forwarding requests"
if ($forwardResponse) {
    $forwardData = $forwardResponse.Content | ConvertFrom-Json
    if ($forwardData -is [array] -and $forwardData.Count -gt 0) {
        $global:forwardReqId = $forwardData[0].id
    }
    elseif ($forwardData.items -and $forwardData.items.Count -gt 0) {
        $global:forwardReqId = $forwardData.items[0].id
    }
}

# 4.15 Forwarding request (get)
if ($global:forwardReqId) {
    Run-Test -Url "$baseUrl/forwarding-requests/$($global:forwardReqId)" -Description "Get forwarding request"
}

# 4.16 Forwarding requests (create)
if ($global:mailId) {
    Run-Test -Method "POST" -Url "$baseUrl/forwarding-requests" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
            mail_item_id = [int]$global:mailId
            address      = $forwardAddress
        } | ConvertTo-Json) -Description "Create forwarding request"
}

# 4.17 Forwarding usage
Run-Test -Url "$baseUrl/forwarding-requests/usage" -Description "Get forwarding usage"

# 4.18 Cancel forwarding request
if ($global:forwardReqId) {
    Run-Test -Method "PUT" -Url "$baseUrl/forwarding-requests/$($global:forwardReqId)/cancel" -Headers @{"x-csrf-token" = $global:csrf } -Description "Cancel forwarding request"
}

# 4.19 Bulk forward (admin variant)
if ($global:mailId) {
    Run-Test -Method "POST" -Url "$baseUrl/mail/forward/bulk" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
            ids     = @([int]$global:mailId)
            address = $forwardAddress
        } | ConvertTo-Json) -Description "Bulk forward (admin variant)"
}

# 4.20 Mail search (alt endpoint)
Run-Test -Url "$baseUrl/mail-search?q=tax&limit=10" -Description "Mail search (alt endpoint)"

Write-Host "`n👑 5) ADMIN FUNCTIONS TESTS" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

# 5.1 Users list
$usersResponse = Run-Test -Url "$baseUrl/admin/users?limit=20" -Description "List admin users"
if ($usersResponse) {
    $usersData = $usersResponse.Content | ConvertFrom-Json
    if ($usersData -is [array] -and $usersData.Count -gt 0) {
        $global:adminUserId = $usersData[0].id
    }
    elseif ($usersData.users -and $usersData.users.Count -gt 0) {
        $global:adminUserId = $usersData.users[0].id
    }
}

# 5.2 User get
if ($global:adminUserId) {
    Run-Test -Url "$baseUrl/admin/users/$($global:adminUserId)" -Description "Get admin user"
}

# 5.3 User update
if ($global:adminUserId) {
    Run-Test -Method "PUT" -Url "$baseUrl/admin/users/$($global:adminUserId)" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
            role = "admin"
        } | ConvertTo-Json) -Description "Update admin user"
}

# 5.4 Update KYC status
if ($global:adminUserId) {
    Run-Test -Method "PUT" -Url "$baseUrl/admin/users/$($global:adminUserId)/kyc-status" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
            kyc_status = "approved"
        } | ConvertTo-Json) -Description "Update KYC status"
}

# 5.5 Impersonate
if ($global:adminUserId) {
    Run-Test -Method "POST" -Url "$baseUrl/admin/users/$($global:adminUserId)/impersonate" -Headers @{"x-csrf-token" = $global:csrf } -Description "Impersonate user"
}

# 5.6 Billing history
if ($global:adminUserId) {
    Run-Test -Url "$baseUrl/admin/users/$($global:adminUserId)/billing-history" -Description "Get billing history"
}

# 5.7 Admin mail items (list)
$adminMailResponse = Run-Test -Url "$baseUrl/admin/mail-items?limit=20" -Description "List admin mail items"
if ($adminMailResponse) {
    $adminMailData = $adminMailResponse.Content | ConvertFrom-Json
    if ($adminMailData -is [array] -and $adminMailData.Count -gt 0) {
        $global:adminMailId = $adminMailData[0].id
    }
    elseif ($adminMailData.items -and $adminMailData.items.Count -gt 0) {
        $global:adminMailId = $adminMailData.items[0].id
    }
}

# 5.8 Admin mail item (get)
if ($global:adminMailId) {
    Run-Test -Url "$baseUrl/admin/mail-items/$($global:adminMailId)" -Description "Get admin mail item"
}

# 5.9 Admin mail create
$createMailResponse = Run-Test -Method "POST" -Url "$baseUrl/admin/mail-items" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        tag  = "INTAKE"
        note = "Found mail intake"
    } | ConvertTo-Json) -Description "Create admin mail item"
if ($createMailResponse) {
    $createMailData = $createMailResponse.Content | ConvertFrom-Json
    $global:adminMailId = $createMailData.id
}

# 5.10 Admin mail update
if ($global:adminMailId) {
    Run-Test -Method "PUT" -Url "$baseUrl/admin/mail-items/$($global:adminMailId)" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
            status = "scanned"
            tag    = "Priority"
        } | ConvertTo-Json) -Description "Update admin mail item"
}

# 5.11 Admin mail delete
if ($global:adminMailId) {
    Run-Test -Method "DELETE" -Url "$baseUrl/admin/mail-items/$($global:adminMailId)" -Headers @{"x-csrf-token" = $global:csrf } -Description "Delete admin mail item"
}

# 5.12 Admin mail restore
if ($global:adminMailId) {
    Run-Test -Method "POST" -Url "$baseUrl/admin/mail-items/$($global:adminMailId)/restore" -Headers @{"x-csrf-token" = $global:csrf } -Description "Restore admin mail item"
}

# 5.13 Log physical receipt
if ($global:adminMailId) {
    Run-Test -Method "POST" -Url "$baseUrl/admin/mail-items/$($global:adminMailId)/log-physical-receipt" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
            received_at = "2024-01-01T10:00:00Z"
        } | ConvertTo-Json) -Description "Log physical receipt"
}

# 5.14 Log physical dispatch
if ($global:adminMailId) {
    Run-Test -Method "POST" -Url "$baseUrl/admin/mail-items/$($global:adminMailId)/log-physical-dispatch" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
            carrier  = "Royal Mail"
            tracking = "RM123456789GB"
        } | ConvertTo-Json) -Description "Log physical dispatch"
}

# 5.15 Plans list (admin)
$plansResponse = Run-Test -Url "$baseUrl/admin/plans" -Description "List admin plans"
if ($plansResponse) {
    $plansData = $plansResponse.Content | ConvertFrom-Json
    if ($plansData -is [array] -and $plansData.Count -gt 0) {
        $global:planId = $plansData[0].id
    }
}

# 5.16 Plans create (admin)
$createPlanResponse = Run-Test -Method "POST" -Url "$baseUrl/admin/plans" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        name  = "Premium"
        price = 1999
    } | ConvertTo-Json) -Description "Create admin plan"
if ($createPlanResponse) {
    $createPlanData = $createPlanResponse.Content | ConvertFrom-Json
    $global:planId = $createPlanData.id
}

# 5.17 Plans update (admin)
if ($global:planId) {
    Run-Test -Method "PATCH" -Url "$baseUrl/admin/plans/$($global:planId)" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
            price = 1499
        } | ConvertTo-Json) -Description "Update admin plan"
}

# 5.18 Plans delete (admin)
if ($global:planId) {
    Run-Test -Method "DELETE" -Url "$baseUrl/admin/plans/$($global:planId)" -Headers @{"x-csrf-token" = $global:csrf } -Description "Delete admin plan"
}

# 5.19 Support tickets (admin list)
$supportResponse = Run-Test -Url "$baseUrl/admin/support" -Description "List admin support tickets"
if ($supportResponse) {
    $supportData = $supportResponse.Content | ConvertFrom-Json
    if ($supportData -is [array] -and $supportData.Count -gt 0) {
        $global:ticketId = $supportData[0].id
    }
    elseif ($supportData.tickets -and $supportData.tickets.Count -gt 0) {
        $global:ticketId = $supportData.tickets[0].id
    }
}

# 5.20 Support update (admin)
if ($global:ticketId) {
    Run-Test -Method "PATCH" -Url "$baseUrl/admin/support/$($global:ticketId)" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
            status = "resolved"
        } | ConvertTo-Json) -Description "Update admin support ticket"
}

# 5.21 Support close (admin)
if ($global:ticketId) {
    Run-Test -Method "POST" -Url "$baseUrl/admin/support/tickets/$($global:ticketId)/close" -Headers @{"x-csrf-token" = $global:csrf } -Description "Close admin support ticket"
}

# 5.22 Admin mail-bulk
if ($global:adminMailId) {
    Run-Test -Method "POST" -Url "$baseUrl/admin/mail-bulk" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
            ids     = @([int]$global:adminMailId)
            action  = "forward"
            address = $forwardAddress
        } | ConvertTo-Json) -Description "Admin mail bulk operation"
}

# 5.23 Admin payments: refund
Run-Test -Method "POST" -Url "$baseUrl/admin/payments/initiate-refund" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        payment_id = "PM_EXAMPLE"
    } | ConvertTo-Json) -Description "Admin initiate refund"

# 5.24 Admin payments: adhoc link
Run-Test -Method "POST" -Url "$baseUrl/admin/payments/create-adhoc-link" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        amount = 500
    } | ConvertTo-Json) -Description "Admin create adhoc payment link"

# 5.25 Admin invoices list
Run-Test -Url "$baseUrl/admin/invoices" -Description "List admin invoices"

Write-Host "`n🎫 6) SUPPORT & PLANS TESTS" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# 6.1 Support (user list)
Run-Test -Url "$baseUrl/support" -Description "List user support tickets"

# 6.2 Support create (user)
Run-Test -Method "POST" -Url "$baseUrl/support" -Headers @{"x-csrf-token" = $global:csrf } -Body (@{
        subject = "Trading name change"
        message = "Please update as attached."
    } | ConvertTo-Json) -Description "Create user support ticket"

# 6.3 Plans (public list)
Run-Test -Url "$baseUrl/plans" -Description "List public plans"

Write-Host "`n🔗 7) WEBHOOKS & EXTERNAL TESTS" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

# 7.1 Sumsub webhook (GREEN)
Run-Test -Method "POST" -Url "$baseUrl/webhooks/sumsub" -Body (@{
        type         = "applicantReviewed"
        reviewStatus = "completed"
        reviewResult = @{ reviewAnswer = "GREEN" }
        applicantId  = "demo"
    } | ConvertTo-Json) -Description "Sumsub webhook (GREEN)"

# 7.2 Sumsub webhook (RED)
Run-Test -Method "POST" -Url "$baseUrl/webhooks/sumsub" -Body (@{
        type         = "applicantReviewed"
        reviewStatus = "completed"
        reviewResult = @{ reviewAnswer = "RED" }
        applicantId  = "demo"
    } | ConvertTo-Json) -Description "Sumsub webhook (RED)"

# 7.3 GoCardless webhook (paid)
Run-Test -Method "POST" -Url "$baseUrl/webhooks-gc" -Body (@{
        events = @(
            @{
                resource_type = "payments"
                action        = "confirmed"
                links         = @{ payment = "PM123" }
            }
        )
    } | ConvertTo-Json) -Description "GoCardless webhook (paid)"

# 7.4 GoCardless webhook (failed)
Run-Test -Method "POST" -Url "$baseUrl/webhooks-gc" -Body (@{
        events = @(
            @{
                resource_type = "payments"
                action        = "failed"
                links         = @{ payment = "PM999" }
            }
        )
    } | ConvertTo-Json) -Description "GoCardless webhook (failed)"

# 7.5 Postmark bounce webhook
Run-Test -Method "POST" -Url "$baseUrl/webhooks-postmark" -Body (@{
        RecordType = "Bounce"
        Type       = "HardBounce"
        Email      = "user@example.com"
    } | ConvertTo-Json) -Description "Postmark bounce webhook"

# 7.6 OneDrive webhook
Run-Test -Method "POST" -Url "$baseUrl/webhooks/onedrive" -Body (@{
        event = "file_created"
        path  = "/Example/new.pdf"
    } | ConvertTo-Json) -Description "OneDrive webhook"

# 7.7 GoCardless callback (GET)
Run-Test -Url "$baseUrl/webhooks/gc" -Description "GoCardless callback"

Write-Host "`n📊 8) SYSTEM & MONITORING TESTS" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# 8.1 Health
Run-Test -Url "$baseUrl/health" -Description "Health check"

# 8.2 Healthz (alt)
Run-Test -Url "$baseUrl/healthz" -Description "Health check (alt)"

# 8.3 Ready
Run-Test -Url "$baseUrl/ready" -Description "Ready check"

# 8.4 Metrics (Prometheus)
Run-Test -Url "$baseUrl/metrics" -Description "Prometheus metrics"

# 8.5 Internal status
Run-Test -Url "$baseUrl/__status" -Description "Internal status"

# 8.6 Debug whoami (alt)
Run-Test -Url "$baseUrl/debug/whoami" -Description "Debug whoami"

# 8.7 Debug DB info
Run-Test -Url "$baseUrl/debug/db-info" -Description "Debug DB info"

# 8.8 Public invoice by token (invalid demo)
Run-Test -Url "$baseUrl/invoices/INVALID_OR_EXPIRED_TOKEN" -Description "Public invoice (invalid token)"

Write-Host "`n📄 9) CERTIFICATES & DOCUMENTS TESTS" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# 9.1 Certificate PDF (download)
Run-Test -Url "$baseUrl/profile/certificate.pdf" -Description "Download certificate PDF"

# 9.2 Certificate URL
Run-Test -Url "$baseUrl/profile/certificate-url" -Description "Get certificate URL"

Write-Host "`n🔧 10) ADDITIONAL TESTS" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

# 10.1 Create admin user (guarded)
Run-Test -Method "POST" -Url "$baseUrl/create-admin-user" -Headers @{"x-csrf-token" = $global:csrf } -Description "Create admin user"

# 10.2 Files (list or info)
Run-Test -Url "$baseUrl/files" -Description "List files"

Write-Host "`n🎉 COMPREHENSIVE API TEST COMPLETE!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host "Total Tests: $testCount" -ForegroundColor White
Write-Host "Passed: $passedCount" -ForegroundColor Green
Write-Host "Failed: $failedCount" -ForegroundColor Red
Write-Host "Success Rate: $([math]::Round(($passedCount / $testCount) * 100, 2))%" -ForegroundColor Yellow
