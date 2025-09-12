# Security Guidelines

## Environment Variables

### Production Security
- **All production secrets** are stored in Render environment variables only
- **Never commit** real API keys, tokens, or secrets to the repository
- **Rotate keys immediately** if they are ever exposed in git history

### Environment File Structure

#### Server Environment (`server/env.example`)
```bash
NODE_ENV=production
APP_ENV=production
DATA_DIR=/var/data
INVOICES_DIR=/var/data/invoices
BACKUPS_DIR=/var/data/backups
APP_ORIGIN=https://www.virtualaddresshub.co.uk
BACKEND_API_ORIGIN=https://api.virtualaddresshub.co.uk/api
POSTMARK_API_TOKEN=your_postmark_token_here
POSTMARK_FROM=no-reply@virtualaddresshub.co.uk
COOKIE_SECRET=your_cookie_secret_here
GO_CARDLESS_SECRET=your_gocardless_secret_here
SUMSUB_SECRET=your_sumsub_secret_here
COMPANIES_HOUSE_API_KEY=your_companies_house_key_here
ADDRESS_API_KEY=your_address_api_key_here
INVOICE_LINK_TTL_USER_MIN=30
INVOICE_LINK_TTL_ADMIN_MIN=60
```

#### Frontend Environment (`app/env.example`)
```bash
NEXT_PUBLIC_BASE_URL=https://www.virtualaddresshub.co.uk
BACKEND_API_ORIGIN=https://api.virtualaddresshub.co.uk/api
```

### Local Development

#### Option 1: No .env files (Recommended)
Set environment variables in your shell or use a secret manager:
```bash
export COMPANIES_HOUSE_API_KEY="your_key_here"
export POSTMARK_API_TOKEN="your_token_here"
# ... other vars
```

#### Option 2: .env.local files (Git-ignored)
Create `.env.local` files that are automatically ignored by git:
- `server/.env.local` - for backend development
- `app/.env.local` - for frontend development

### Production Deployment

#### Render Environment Variables
Set these in your Render dashboard for each service:

**Backend Service (vah-api):**
- `NODE_ENV=production`
- `APP_ENV=production`
- `DATA_DIR=/var/data`
- `INVOICES_DIR=/var/data/invoices`
- `BACKUPS_DIR=/var/data/backups`
- `APP_ORIGIN=https://www.virtualaddresshub.co.uk`
- `BACKEND_API_ORIGIN=https://api.virtualaddresshub.co.uk/api`
- `POSTMARK_API_TOKEN=your_real_token`
- `POSTMARK_FROM=no-reply@virtualaddresshub.co.uk`
- `COOKIE_SECRET=your_real_secret`
- `GO_CARDLESS_SECRET=your_real_secret`
- `SUMSUB_SECRET=your_real_secret`
- `COMPANIES_HOUSE_API_KEY=your_real_key`
- `ADDRESS_API_KEY=your_real_key`

**Frontend Service (vah-web):**
- `NEXT_PUBLIC_BASE_URL=https://www.virtualaddresshub.co.uk`
- `BACKEND_API_ORIGIN=https://api.virtualaddresshub.co.uk/api`

### Security Validation

The application includes automatic environment validation:
- **Production mode**: Validates all required environment variables
- **Development mode**: Skips strict validation for easier local development
- **Missing variables**: Application fails fast with clear error messages

### Key Rotation

If any API key or secret is ever exposed:
1. **Immediately rotate** the key in the respective service dashboard
2. **Update** the key in Render environment variables
3. **Redeploy** the affected services
4. **Audit** git history to ensure no other secrets were exposed

### CI/CD Security

For GitHub Actions or other CI systems:
- Use **GitHub Secrets** for environment variables
- Never store secrets in workflow files
- Use **least privilege** access for deployment tokens

## Best Practices

1. **Never commit** `.env` files with real values
2. **Use example files** (`.env.example`) to document required variables
3. **Validate** environment variables in production
4. **Rotate keys** regularly and immediately if exposed
5. **Monitor** for exposed secrets in git history
6. **Use different keys** for different environments (dev/staging/prod)
