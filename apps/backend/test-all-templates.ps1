# Test all Postmark templates
# Usage: .\test-all-templates.ps1

Write-Host "🧪 Testing all 17 Postmark templates..." -ForegroundColor Green
Write-Host ""

# Check if POSTMARK_TOKEN is set
if (-not $env:POSTMARK_TOKEN) {
    Write-Host "❌ Error: POSTMARK_TOKEN environment variable not set" -ForegroundColor Red
    Write-Host "Set it with: `$env:POSTMARK_TOKEN='your_server_token'" -ForegroundColor Yellow
    exit 1
}

# Read the test data
$testData = Get-Content "test-all-templates.json" | ConvertFrom-Json

$successCount = 0
$failCount = 0
$results = @()

foreach ($template in $testData.templates) {
    Write-Host "Testing: $($template.name) - $($template.description)" -ForegroundColor Cyan
    
    # Create temporary JSON file for this template
    $tempFile = "temp-$($template.name).json"
    $template.payload | ConvertTo-Json -Depth 10 | Out-File -FilePath $tempFile -Encoding UTF8
    
    try {
        # Send the request
        $response = curl "https://api.postmarkapp.com/email/withTemplate" -X POST -H "Accept: application/json" -H "Content-Type: application/json" -H "X-Postmark-Server-Token: $env:POSTMARK_TOKEN" -d "@$tempFile" 2>$null
        
        # Parse response
        $responseObj = $response | ConvertFrom-Json
        
        if ($responseObj.ErrorCode -eq 0) {
            Write-Host "  ✅ SUCCESS - MessageID: $($responseObj.MessageID)" -ForegroundColor Green
            $successCount++
            $results += [PSCustomObject]@{
                Template    = $template.name
                Status      = "SUCCESS"
                MessageID   = $responseObj.MessageID
                SubmittedAt = $responseObj.SubmittedAt
            }
        }
        else {
            Write-Host "  ❌ FAILED - Error: $($responseObj.Message)" -ForegroundColor Red
            $failCount++
            $results += [PSCustomObject]@{
                Template  = $template.name
                Status    = "FAILED"
                Error     = $responseObj.Message
                MessageID = $null
            }
        }
    }
    catch {
        Write-Host "  ❌ ERROR - $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
        $results += [PSCustomObject]@{
            Template  = $template.name
            Status    = "ERROR"
            Error     = $_.Exception.Message
            MessageID = $null
        }
    }
    finally {
        # Clean up temp file
        if (Test-Path $tempFile) {
            Remove-Item $tempFile
        }
    }
    
    Write-Host ""
}

# Summary
Write-Host "📊 TEST SUMMARY" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow
Write-Host "✅ Successful: $successCount" -ForegroundColor Green
Write-Host "❌ Failed: $failCount" -ForegroundColor Red
Write-Host "📧 Total: $($successCount + $failCount)" -ForegroundColor Blue
Write-Host ""

# Detailed results
Write-Host "📋 DETAILED RESULTS" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow
$results | Format-Table -AutoSize

if ($successCount -gt 0) {
    Write-Host ""
    Write-Host "🎉 Check your support@virtualaddresshub.co.uk inbox for the test emails!" -ForegroundColor Green
    Write-Host "📊 Track them in your Postmark dashboard using the MessageIDs above" -ForegroundColor Blue
}

if ($failCount -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Some templates failed. Check the error messages above." -ForegroundColor Yellow
    Write-Host "💡 Make sure all template aliases exist in your Postmark account" -ForegroundColor Cyan
}
