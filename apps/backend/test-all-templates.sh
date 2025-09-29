#!/bin/bash

# Test all Postmark templates
# Usage: ./test-all-templates.sh

echo "🧪 Testing all 17 Postmark templates..."
echo ""

# Check if POSTMARK_TOKEN is set
if [ -z "$POSTMARK_TOKEN" ]; then
    echo "❌ Error: POSTMARK_TOKEN environment variable not set"
    echo "Set it with: export POSTMARK_TOKEN='your_server_token'"
    exit 1
fi

# Test each template
templates=(
    "password-reset-email"
    "password-changed-confirmation"
    "welcome-email"
    "plan-cancelled"
    "invoice-sent"
    "payment-failed"
    "kyc-submitted"
    "kyc-approved"
    "kyc-rejected"
    "support-request-received"
    "support-request-closed"
    "mail-scanned"
    "mail-forwarded"
    "mail-received-after-cancellation"
)

success_count=0
fail_count=0

for template in "${templates[@]}"; do
    echo "Testing: $template"
    
    # Create test payload based on template
    case $template in
        "password-reset-email")
            payload='{"From":"hello@virtualaddresshub.co.uk","To":"support@virtualaddresshub.co.uk","TemplateAlias":"password-reset-email","TemplateModel":{"name":"Test User","cta_url":"https://vah-new-frontend-75d6.vercel.app/reset?token=test123"},"MessageStream":"outbound","ReplyTo":"support@virtualaddresshub.co.uk"}'
            ;;
        "password-changed-confirmation")
            payload='{"From":"hello@virtualaddresshub.co.uk","To":"support@virtualaddresshub.co.uk","TemplateAlias":"password-changed-confirmation","TemplateModel":{"name":"Test User"},"MessageStream":"outbound","ReplyTo":"support@virtualaddresshub.co.uk"}'
            ;;
        "welcome-email")
            payload='{"From":"hello@virtualaddresshub.co.uk","To":"support@virtualaddresshub.co.uk","TemplateAlias":"welcome-email","TemplateModel":{"first_name":"Test User","dashboard_link":"https://vah-new-frontend-75d6.vercel.app/dashboard"},"MessageStream":"outbound","ReplyTo":"support@virtualaddresshub.co.uk"}'
            ;;
        "plan-cancelled")
            payload='{"From":"hello@virtualaddresshub.co.uk","To":"support@virtualaddresshub.co.uk","TemplateAlias":"plan-cancelled","TemplateModel":{"name":"Test User","end_date":"2024-12-31","cta_url":"https://vah-new-frontend-75d6.vercel.app/billing"},"MessageStream":"outbound","ReplyTo":"support@virtualaddresshub.co.uk"}'
            ;;
        "invoice-sent")
            payload='{"From":"hello@virtualaddresshub.co.uk","To":"support@virtualaddresshub.co.uk","TemplateAlias":"invoice-sent","TemplateModel":{"name":"Test User","invoice_number":"INV-123456","amount":"£29.99","cta_url":"https://vah-new-frontend-75d6.vercel.app/billing"},"MessageStream":"outbound","ReplyTo":"support@virtualaddresshub.co.uk"}'
            ;;
        "payment-failed")
            payload='{"From":"hello@virtualaddresshub.co.uk","To":"support@virtualaddresshub.co.uk","TemplateAlias":"payment-failed","TemplateModel":{"name":"Test User","cta_url":"https://vah-new-frontend-75d6.vercel.app/billing#payment"},"MessageStream":"outbound","ReplyTo":"support@virtualaddresshub.co.uk"}'
            ;;
        "kyc-submitted")
            payload='{"From":"hello@virtualaddresshub.co.uk","To":"support@virtualaddresshub.co.uk","TemplateAlias":"kyc-submitted","TemplateModel":{"name":"Test User","cta_url":"https://vah-new-frontend-75d6.vercel.app/profile"},"MessageStream":"outbound","ReplyTo":"support@virtualaddresshub.co.uk"}'
            ;;
        "kyc-approved")
            payload='{"From":"hello@virtualaddresshub.co.uk","To":"support@virtualaddresshub.co.uk","TemplateAlias":"kyc-approved","TemplateModel":{"name":"Test User","cta_url":"https://vah-new-frontend-75d6.vercel.app/profile"},"MessageStream":"outbound","ReplyTo":"support@virtualaddresshub.co.uk"}'
            ;;
        "kyc-rejected")
            payload='{"From":"hello@virtualaddresshub.co.uk","To":"support@virtualaddresshub.co.uk","TemplateAlias":"kyc-rejected","TemplateModel":{"name":"Test User","reason":"Document quality insufficient - please resubmit with clearer images","cta_url":"https://vah-new-frontend-75d6.vercel.app/profile"},"MessageStream":"outbound","ReplyTo":"support@virtualaddresshub.co.uk"}'
            ;;
        "support-request-received")
            payload='{"From":"hello@virtualaddresshub.co.uk","To":"support@virtualaddresshub.co.uk","TemplateAlias":"support-request-received","TemplateModel":{"name":"Test User","ticket_id":"TICKET-789456","cta_url":"https://vah-new-frontend-75d6.vercel.app/support"},"MessageStream":"outbound","ReplyTo":"support@virtualaddresshub.co.uk"}'
            ;;
        "support-request-closed")
            payload='{"From":"hello@virtualaddresshub.co.uk","To":"support@virtualaddresshub.co.uk","TemplateAlias":"support-request-closed","TemplateModel":{"name":"Test User","ticket_id":"TICKET-789456","cta_url":"https://vah-new-frontend-75d6.vercel.app/support"},"MessageStream":"outbound","ReplyTo":"support@virtualaddresshub.co.uk"}'
            ;;
        "mail-scanned")
            payload='{"From":"hello@virtualaddresshub.co.uk","To":"support@virtualaddresshub.co.uk","TemplateAlias":"mail-scanned","TemplateModel":{"name":"Test User","subject":"Bank statement received","cta_url":"https://vah-new-frontend-75d6.vercel.app/mail"},"MessageStream":"outbound","ReplyTo":"support@virtualaddresshub.co.uk"}'
            ;;
        "mail-forwarded")
            payload='{"From":"hello@virtualaddresshub.co.uk","To":"support@virtualaddresshub.co.uk","TemplateAlias":"mail-forwarded","TemplateModel":{"name":"Test User","tracking_number":"TRK123456789","carrier":"Royal Mail","cta_url":"https://vah-new-frontend-75d6.vercel.app/mail"},"MessageStream":"outbound","ReplyTo":"support@virtualaddresshub.co.uk"}'
            ;;
        "mail-received-after-cancellation")
            payload='{"From":"hello@virtualaddresshub.co.uk","To":"support@virtualaddresshub.co.uk","TemplateAlias":"mail-received-after-cancellation","TemplateModel":{"name":"Test User","subject":"Important document received after cancellation","cta_url":"https://vah-new-frontend-75d6.vercel.app/mail"},"MessageStream":"outbound","ReplyTo":"support@virtualaddresshub.co.uk"}'
            ;;
    esac
    
    # Send the request
    response=$(curl -s "https://api.postmarkapp.com/email/withTemplate" \
        -X POST \
        -H "Accept: application/json" \
        -H "Content-Type: application/json" \
        -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
        -d "$payload")
    
    # Check if successful
    if echo "$response" | grep -q '"ErrorCode":0'; then
        message_id=$(echo "$response" | grep -o '"MessageID":"[^"]*"' | cut -d'"' -f4)
        echo "  ✅ SUCCESS - MessageID: $message_id"
        ((success_count++))
    else
        error_msg=$(echo "$response" | grep -o '"Message":"[^"]*"' | cut -d'"' -f4)
        echo "  ❌ FAILED - Error: $error_msg"
        ((fail_count++))
    fi
    
    echo ""
done

# Summary
echo "📊 TEST SUMMARY"
echo "==============="
echo "✅ Successful: $success_count"
echo "❌ Failed: $fail_count"
echo "📧 Total: $((success_count + fail_count))"
echo ""

if [ $success_count -gt 0 ]; then
    echo "🎉 Check your support@virtualaddresshub.co.uk inbox for the test emails!"
    echo "📊 Track them in your Postmark dashboard using the MessageIDs above"
fi

if [ $fail_count -gt 0 ]; then
    echo "⚠️  Some templates failed. Check the error messages above."
    echo "💡 Make sure all template aliases exist in your Postmark account"
fi
