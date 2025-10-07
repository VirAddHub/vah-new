# Forwarding E2E Testing Guide

## Overview

This guide provides comprehensive testing tools for the forwarding system, including a fail-fast E2E script, database seeding utilities, and UI verification checklists.

## Files Created

### 1. `verify-forwarding-e2e.sh`
A bullet-proof E2E verification script that tests the complete forwarding workflow with proper error handling and assertions.

**Features:**
- Fail-fast behavior with clear error messages
- Comprehensive API testing with jq assertions
- Security validation (non-admin access blocking)
- State machine validation (illegal transitions)
- Courier/tracking validation checks

### 2. `seed.sql`
Creates a safe test mail item for testing purposes.

### 3. `cleanup.sql`
Removes test forwarding requests to keep the database clean.

### 4. `UI_VERIFICATION_CHECKLIST.md`
Comprehensive checklist for manual UI testing covering edge cases, accessibility, and cross-browser compatibility.

## Usage

### Prerequisites

1. **jq installed**: Required for JSON parsing and assertions
   ```bash
   # macOS
   brew install jq
   
   # Ubuntu/Debian
   sudo apt-get install jq
   
   # CentOS/RHEL
   sudo yum install jq
   ```

2. **Valid session cookies**: You need both user and admin session cookies

### Running the E2E Test

1. **Set environment variables:**
   ```bash
   export API_BASE="https://vah-api-staging.onrender.com"
   export USER_COOKIE="sid=...; Path=/; HttpOnly"
   export ADMIN_COOKIE="sid=...; Path=/; HttpOnly"
   export MAIL_ITEM_ID=25  # Optional, defaults to 25
   ```

2. **Run the test:**
   ```bash
   ./verify-forwarding-e2e.sh
   ```

### Database Seeding (Optional)

For local development or when you need specific test data:

```bash
# Seed test data
psql "$DATABASE_URL" -f seed.sql

# Run your tests
./verify-forwarding-e2e.sh

# Clean up after testing
psql "$DATABASE_URL" -f cleanup.sql
```

## Test Coverage

### API Endpoints Tested
- `POST /api/forwarding/requests` - Create forwarding request
- `GET /api/admin/forwarding/requests` - List admin requests
- `PATCH /api/admin/forwarding/requests/{id}` - Update request status

### Workflow States Tested
1. **Requested** → **Reviewed** → **Processing** → **Dispatched** → **Delivered**
2. **Illegal transitions** (e.g., Requested → Delivered)
3. **Security validation** (non-admin access blocking)
4. **Courier/tracking validation** (required fields)

### Error Scenarios Tested
- Invalid API responses
- Missing required fields
- Illegal state transitions
- Unauthorized access attempts
- Validation failures

## Expected Output

When all tests pass, you'll see:
```
▶ Creating forwarding request as USER...
✅ Created request id=123
▶ Admin listing Requested queue...
✅ Request visible in Requested
▶ Illegal transition should fail (Requested → Delivered)...
✅ Illegal transition rejected
▶ Review → Processing → Dispatched → Delivered...
✅ Happy path transitions complete
▶ Security checks...
✅ Non-admin blocked from admin endpoints
▶ (Optional) Courier validation check...
✅ Dispatch requires courier/tracking (or rejects as expected)
🎉 All E2E checks passed.
```

## Troubleshooting

### Common Issues

1. **"jq assertion failed"**
   - Check API response format
   - Verify endpoint is working correctly
   - Check for authentication issues

2. **"API call failed"**
   - Verify API_BASE URL is correct
   - Check session cookies are valid
   - Ensure server is running

3. **"Non-admin could access admin routes"**
   - Check admin middleware is working
   - Verify session validation
   - Ensure proper role checking

### Debug Mode

To see raw API responses, modify the script to remove the `-s` flag from curl commands:

```bash
# Change this line:
api_user()  { curl -sS -b "$USER_COOKIE"  -H "Content-Type: application/json" "$@"; }

# To this:
api_user()  { curl -S -b "$USER_COOKIE"  -H "Content-Type: application/json" "$@"; }
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: E2E Forwarding Test
on:
  workflow_dispatch:
    inputs:
      api_base:
        description: 'API Base URL'
        required: true
        default: 'https://vah-api-staging.onrender.com'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install jq
        run: sudo apt-get install jq
      - name: Run E2E Test
        env:
          API_BASE: ${{ inputs.api_base }}
          USER_COOKIE: ${{ secrets.USER_COOKIE }}
          ADMIN_COOKIE: ${{ secrets.ADMIN_COOKIE }}
        run: ./verify-forwarding-e2e.sh
```

## Manual Testing

Use the `UI_VERIFICATION_CHECKLIST.md` for comprehensive manual testing covering:

- User dashboard functionality
- Admin dashboard features
- Error handling scenarios
- Mobile responsiveness
- Accessibility compliance
- Cross-browser compatibility

## Best Practices

1. **Run tests regularly** - Include in your development workflow
2. **Test with real data** - Use production-like test data when possible
3. **Clean up after tests** - Use cleanup.sql to maintain database hygiene
4. **Monitor test results** - Set up alerts for test failures
5. **Update tests with features** - Keep tests in sync with new functionality

## Security Considerations

- Never commit session cookies to version control
- Use environment variables for sensitive data
- Rotate test credentials regularly
- Monitor for unauthorized access attempts
- Validate all input parameters
