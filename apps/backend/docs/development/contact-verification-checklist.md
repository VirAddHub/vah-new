# Contact Form Verification Checklist

## Status Pill Implementation ✅

- [x] StatusPill component created in `components/ui/StatusPill.tsx`
- [x] SLA helper created in `lib/sla.ts` with customer-first promise
- [x] StatusPill integrated into ContactPage success state
- [x] Shows "We'll reply as soon as possible" with clock icon

## Frontend Verification

- [ ] `/contact` renders without console errors
- [ ] Nav link visible on desktop + mobile, active state on `/contact`
- [ ] Valid submit → success screen (HTTP 200/202)
- [ ] Status pill displays with SLA promise in success state
- [ ] Honeypot filled → 400/422 (spam blocked)
- [ ] Bad email → inline validation error
- [ ] Rate limit → friendly 429 message
- [ ] Form validation works for all required fields

## Backend Verification

- [ ] Server sets `From: "Name via VirtualAddressHub" <support@virtualaddresshub.co.uk>`
- [ ] Server sets `Reply-To: user@…` for proper email threading
- [ ] If using external API origin: CORS allows POST from your site
- [ ] Rate limiting configured appropriately
- [ ] Email service properly configured

## Testing

### Quick 3-command smoke test
```bash
npm run dev
./test-contact.sh
curl -i -X POST http://localhost:3000/api/contact -H "Content-Type: application/json" \
  -d '{"name":"Spam","email":"spam@example.com","subject":"x","message":"x","website":"bot"}'
```

### Contract Tests
```bash
npm test tests/api.contact.contract.test.ts
```

### E2E Tests
```bash
npm run test:e2e
```

## Expected Results

- ✅ Valid submission: 200 OK (or 500 if email service not configured)
- ❌ Invalid email: 400 Bad Request
- 🚫 Spam detection: 400 Bad Request (honeypot filled)
- ⚠️ Missing fields: 400 Bad Request
- 🕒 Rate limit: 429 Too Many Requests with friendly message

## Troubleshooting Quick Hits

* **CORS**: If `NEXT_PUBLIC_API_BASE` is external, backend must send `Access-Control-Allow-Origin: https://yourdomain` and `Vary: Origin`
* **429 too eager**: Increase your limiter burst/window; keep copy friendly
* **Emails without Reply-To**: Ensure backend sets `Reply-To` and Postmark domain is verified
* **Status pill not showing**: Check imports and success state rendering

## Files Created/Modified

- `components/ui/StatusPill.tsx` - New status pill component
- `lib/sla.ts` - SLA label helper
- `components/ContactPage.tsx` - Updated with status pill integration
- `tests/api.contact.contract.test.ts` - Contract tests
- `tests/e2e/contact.spec.ts` - E2E tests
- `test-contact.sh` - Already existed, smoke test script
