# Quiz Integration Setup Guide

This guide covers the complete quiz integration with lead capture, scoring, segmentation, and automated emails.

## ✅ Implementation Complete

All code has been implemented. Here's what's ready:

### Frontend
- ✅ `/compliance-check` page with quiz iframe placeholder
- ✅ Query parameter handling for completion redirect (`?done=1&score=X&email=Y`)
- ✅ Completion success screen with score display
- ✅ BFF routes for analytics ping and webhook proxy

### Backend
- ✅ Quiz submission endpoint at `/api/quiz/submit`
- ✅ Database table `quiz_leads` with migration
- ✅ Email sending via Postmark template `quiz-day0`
- ✅ Score segmentation (high/mid/low)
- ✅ Stats endpoint at `/api/quiz/stats`

---

## 📋 Setup Steps

### 1. Run Database Migration

Run the migration to create the `quiz_leads` table:

```bash
# On Render or locally
psql $DATABASE_URL -f apps/backend/migrations/030_quiz_leads.sql
```

Or if using a migration runner:
```bash
npm run migrate
```

### 2. Configure Quiz Provider (Fillout/ScoreApp)

#### In Fillout/ScoreApp Dashboard:

1. **Create your quiz form** with fields:
   - Email (required)
   - Name (optional)
   - Score calculation based on answers

2. **Set up redirect on completion:**
   ```
   https://virtualaddresshub.co.uk/compliance-check?done=1&score={{score}}&email={{email}}
   ```
   Replace `{{score}}` and `{{email}}` with your provider's variable syntax.

3. **Configure webhook URL:**
   ```
   https://virtualaddresshub.co.uk/api/bff/quiz/submit
   ```
   
   - Method: `POST`
   - Content-Type: `application/json` (or form-urlencoded)
   - Send these fields: `email`, `name` (or `full_name`), `score`, `answers` (optional)

4. **Get embed URL** from your quiz provider and set it as an environment variable.

### 3. Set Environment Variables

#### Frontend (Vercel):
```bash
NEXT_PUBLIC_QUIZ_EMBED_URL=https://your-quiz-provider.com/embed/xyz
BACKEND_API_ORIGIN=https://vah-api.onrender.com/api
```

#### Backend (Render):
```bash
# Already configured:
POSTMARK_TOKEN=your_postmark_token
EMAIL_FROM=hello@virtualaddresshub.co.uk
EMAIL_FROM_NAME=VirtualAddressHub
POSTMARK_STREAM=outbound
APP_BASE_URL=https://virtualaddresshub.co.uk

# Optional:
CALCOM_BOOKING_URL=https://cal.com/virtualaddresshub/15min
```

### 4. Create Postmark Email Template ⚠️ REQUIRED

**Important**: The quiz email template must be created in Postmark before the quiz will send emails.

1. Go to Postmark Dashboard → Templates → Create Template
2. Set the **Template Alias** to: **`quiz-day0`** (must match exactly)
3. Set subject line: `Your Business Address Compliance Score: {{score}}`
4. Copy the HTML template from below:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #FF6B00 0%, #FF8533 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Your Compliance Score</h1>
    </div>
    
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi {{name}},</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
            Thanks for taking the Compliance Check. Your score is <strong style="color: #FF6B00; font-size: 20px;">{{score}}</strong>.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #FF6B00;">What this means:</h3>
            
            {{#if_equals segment "high"}}
            <p style="margin-bottom: 0;"><strong>Strong setup</strong> — you're largely compliant. Here's how to tighten things further.</p>
            {{/if_equals}}
            
            {{#if_equals segment "mid"}}
            <p style="margin-bottom: 0;"><strong>Decent foundations</strong> — but there are risks worth fixing this week.</p>
            {{/if_equals}}
            
            {{#if_equals segment "low"}}
            <p style="margin-bottom: 0;"><strong>Critical gaps detected</strong> — we'll show you how to fix them in minutes.</p>
            {{/if_equals}}
        </div>
        
        <h3 style="color: #FF6B00; margin-top: 30px;">Next steps:</h3>
        <ul style="font-size: 16px; line-height: 1.8;">
            <li>Read your tailored recommendations (2–3 mins)</li>
            <li>Get a compliant, privacy-first address with same-day scanning</li>
            <li>Switch smoothly with our guided setup</li>
        </ul>
        
        {{#if_equals segment "high"}}
        <p style="margin: 25px 0;">
            <a href="{{cta_url}}" style="display: inline-block; background: #FF6B00; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Download the Registered Office Checklist
            </a>
        </p>
        {{/if_equals}}
        
        {{#if_equals segment "mid"}}
        <p style="margin: 25px 0;">
            <a href="{{cta_url}}" style="display: inline-block; background: #FF6B00; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                See how to become fully compliant this week
            </a>
        </p>
        {{/if_equals}}
        
        {{#if_equals segment "low"}}
        <p style="margin: 25px 0;">
            <a href="{{cta_url}}" style="display: inline-block; background: #FF6B00; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Book a free 15-minute compliance check
            </a>
        </p>
        {{/if_equals}}
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
            Prefer to talk? <a href="{{booking_url}}" style="color: #FF6B00;">Book here</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #666; margin-bottom: 0;">
            — VirtualAddressHub<br>
            HMRC AML-supervised • ICO-registered • Based in London
        </p>
    </div>
</body>
</html>
```

**Note:** 
- Postmark uses Handlebars syntax
- The template alias **must be exactly** `quiz-day0` (case-sensitive)
- Template variables available: `{{name}}`, `{{score}}`, `{{segment}}`, `{{cta_url}}`, `{{booking_url}}`
- If you don't create this template, the system will fall back to a simple email, but it's recommended to create the full template for better UX

### 5. Test the Integration

1. **Test quiz completion:**
   - Visit `/compliance-check`
   - Complete the quiz (or simulate with query params: `?done=1&score=75&email=test@example.com`)
   - Verify completion screen appears

2. **Test webhook:**
   ```bash
   curl -X POST https://virtualaddresshub.co.uk/api/bff/quiz/submit \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "name": "Test User",
       "score": 75,
       "answers": {"q1": "a", "q2": "b"}
     }'
   ```

3. **Verify database:**
   ```sql
   SELECT * FROM quiz_leads ORDER BY created_at DESC LIMIT 10;
   ```

4. **Check email delivery:**
   - Verify Postmark dashboard shows email sent
   - Check spam folder if email doesn't arrive

---

## 📊 Monitoring & Analytics

### View Quiz Stats

```bash
curl https://vah-api.onrender.com/api/quiz/stats
```

Returns:
```json
{
  "ok": true,
  "data": {
    "total": 150,
    "high_segment": 45,
    "mid_segment": 60,
    "low_segment": 45,
    "avg_score": 62.5
  }
}
```

### Database Queries

**Top scores:**
```sql
SELECT email, score, segment, created_at 
FROM quiz_leads 
ORDER BY score DESC 
LIMIT 20;
```

**Conversion by segment:**
```sql
SELECT 
    segment,
    COUNT(*) as leads,
    AVG(score) as avg_score
FROM quiz_leads
GROUP BY segment;
```

---

## 🔧 Troubleshooting

### Quiz iframe not loading
- Check `NEXT_PUBLIC_QUIZ_EMBED_URL` is set correctly
- Verify quiz provider allows iframe embedding
- Check browser console for CORS errors

### Webhook not receiving submissions
- Verify webhook URL in quiz provider matches: `https://virtualaddresshub.co.uk/api/bff/quiz/submit`
- Check backend logs: `render logs vah-backend`
- Ensure backend API origin is accessible from frontend

### Emails not sending
- Verify `POSTMARK_TOKEN` is set in backend environment
- Check Postmark dashboard for template alias `quiz-day0`
- Verify email is not in spam
- Check backend logs for email errors

### Database errors
- Ensure migration `030_quiz_leads.sql` has run
- Check database connection string
- Verify table exists: `\d quiz_leads` (in psql)

---

## 📈 Success Metrics

Track these weekly:

- **LP → Quiz start rate:** Should be ≥ 25%
- **Quiz completion rate:** Should be ≥ 75%
- **Lead → Paid conversion:** Target 5–10%
- **Unsubscribe rate:** Should be < 0.5%

---

## 🚀 Next Steps (Optional Enhancements)

1. **A/B test different email templates** for each segment
2. **Add retargeting pixels** (Facebook, Google Ads) in quiz completion flow
3. **Create admin dashboard** to view quiz leads
4. **Set up automated follow-ups** for low-scoring leads
5. **Integrate with CRM** (HubSpot, Pipedrive) for lead nurturing

---

## 📝 Files Created/Modified

### Frontend
- `apps/frontend/app/(marketing)/compliance-check/page.tsx` - Quiz page with completion handling
- `apps/frontend/app/api/bff/quiz/ping/route.ts` - Analytics ping endpoint
- `apps/frontend/app/api/bff/quiz/submit/route.ts` - Webhook proxy to backend

### Backend
- `apps/backend/src/server/routes/quiz.ts` - Quiz submission handler
- `apps/backend/migrations/030_quiz_leads.sql` - Database migration
- `apps/backend/src/server.ts` - Router mounting (modified)

---

## ✅ QA Checklist

- [ ] `/compliance-check` page loads and displays quiz iframe
- [ ] Quiz completion redirects with `?done=1&score=X&email=Y`
- [ ] Completion screen shows score and success message
- [ ] Webhook receives submissions at `/api/bff/quiz/submit`
- [ ] Backend stores lead in `quiz_leads` table
- [ ] Postmark sends email with template `quiz-day0`
- [ ] Email contains correct score and segment-based CTA
- [ ] Mobile view works correctly
- [ ] Analytics ping fires on completion

---

Ready to go live! 🎉

