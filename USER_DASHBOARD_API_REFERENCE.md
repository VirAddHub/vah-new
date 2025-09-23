# User Dashboard API Reference

## 🔐 Authentication APIs

### `/api/auth/login` (POST)
**Purpose**: User login
**Body**: `{ email, password }`
**Response**: `{ ok: true, user: { id, role, email, is_admin } }`
**Notes**: Sets `test_user` cookie for session management

### `/api/auth/logout` (POST)
**Purpose**: User logout
**Response**: `{ ok: true }`
**Notes**: Clears session cookie

### `/api/auth/whoami` (GET)
**Purpose**: Get current user info
**Response**: `{ id, role, email, is_admin }`
**Notes**: Available via BFF at `/api/bff/auth/whoami`

### `/api/auth/csrf` (GET)
**Purpose**: Get CSRF token
**Response**: `{ token: "csrf_token_string" }`
**Notes**: Available via BFF at `/api/bff/auth/csrf`

---

## 📧 Mail Management APIs

### `/api/mail` (GET)
**Purpose**: List all mail items for user
**Response**: `{ ok: true, data: [] }`
**Notes**: Returns user's mail items

### `/api/mail/:id` (GET)
**Purpose**: Get specific mail item
**Response**: `{ ok: true, data: mailItem }`
**Notes**: Returns detailed mail item info

### `/api/mail/scan` (POST)
**Purpose**: Trigger mail scanning
**Response**: `{ ok: true }`
**Notes**: Initiates mail scanning process

### `/api/mail/bulk/mark-read` (POST)
**Purpose**: Mark multiple mail items as read
**Body**: `{ ids: [1, 2, 3] }`
**Response**: `{ ok: true }`

### `/api/mail/search` (GET)
**Purpose**: Search mail items
**Query**: `?q=search_term`
**Response**: `{ ok: true, data: [] }`

### `/api/mail-items/:id/scan-url` (GET)
**Purpose**: Get secure scan URL for mail item
**Response**: `{ url: "secure_url", expires_at: "2024-01-01T12:00:00Z" }`
**Notes**: Returns time-limited URL for viewing scans

### `/api/scans/:token` (GET)
**Purpose**: Access mail scan via token
**Response**: `{ ok: true, file_url: "scan_url" }`
**Notes**: Single-use token for secure scan access

---

## 👤 Profile Management APIs

### `/api/profile` (GET)
**Purpose**: Get user profile
**Response**: `{ email, ...profileData }`
**Notes**: Returns current user's profile information

### `/api/profile` (POST)
**Purpose**: Update user profile
**Body**: `{ name, phone, address, ... }`
**Response**: `{ email, ...updatedProfile }`
**Notes**: Updates and returns profile data

### `/api/profile/address` (PUT)
**Purpose**: Update forwarding address
**Body**: `{ forwarding_address }`
**Response**: `{ forwarding_address }`
**Notes**: Sets mail forwarding address

### `/api/profile/reset-password-request` (POST)
**Purpose**: Request password reset
**Response**: `{ ok: true, debug_token: "token" }`
**Notes**: Initiates password reset process

### `/api/profile/reset-password` (POST)
**Purpose**: Reset password with token
**Body**: `{ token, new_password }`
**Response**: `{ ok: true }`

### `/api/profile/certificate` (GET)
**Purpose**: Download proof of address certificate
**Response**: PDF certificate file
**Notes**: Generates fresh certificate with current date

---

## 📮 Mail Forwarding APIs

### `/api/forwarding/requests` (GET)
**Purpose**: List forwarding requests
**Response**: `{ ok: true, data: [forwardingRequests] }`
**Notes**: Returns user's mail forwarding requests

### `/api/forwarding/requests` (POST)
**Purpose**: Create forwarding request
**Body**: `{ letter_id, to_name, address1, address2, city, state, postal, country, reason, method }`
**Response**: `{ ok: true, data: forwardingRequest }`
**Notes**: Creates new forwarding request

### `/api/forwarding/requests/:id` (GET)
**Purpose**: Get specific forwarding request
**Response**: `{ ok: true, data: forwardingRequest }`
**Notes**: Returns details of specific request

---

## 💳 Billing & Invoices APIs

### `/api/billing` (GET)
**Purpose**: Get billing information
**Response**: `{ ok: true }`
**Notes**: Returns billing dashboard data

### `/api/billing/invoices` (GET)
**Purpose**: List user invoices
**Response**: `{ ok: true, data: [] }`
**Notes**: Returns invoice list

### `/api/billing/invoices/:id/link` (GET)
**Purpose**: Get invoice download link
**Response**: `{ url: "download_url" }` or `{ error: "not_found" }`
**Notes**: Returns secure download link

### `/api/invoices/:token` (GET)
**Purpose**: Download invoice via token
**Response**: PDF invoice file
**Notes**: Token-based invoice download

---

## 🆔 KYC (Identity Verification) APIs

### `/api/kyc/upload` (POST)
**Purpose**: Upload KYC documents
**Body**: `{ documents }`
**Response**: `{ ok: true, data: { sdk_token: "stub" } }`
**Notes**: Initiates KYC verification process

### `/api/kyc/status` (GET)
**Purpose**: Check KYC verification status
**Response**: `{ ok: true, data: { status: "pending" } }`
**Notes**: Returns verification status

---

## 📋 Plans & Subscriptions APIs

### `/api/plans` (GET)
**Purpose**: List available plans
**Response**: `{ ok: true, data: [] }`
**Notes**: Returns subscription plans

---

## 🎫 Support & Tickets APIs

### `/api/support/tickets` (POST)
**Purpose**: Create support ticket
**Body**: `{ subject, message, priority }`
**Response**: `{ ok: true, data: { id: 1, status: "open" } }`
**Notes**: Creates new support ticket

### `/api/support/tickets/:id/close` (POST)
**Purpose**: Close support ticket
**Response**: `{ ok: true }`
**Notes**: Closes existing ticket

---

## 🚀 Onboarding APIs

### `/api/onboarding/business` (POST)
**Purpose**: Complete business onboarding
**Body**: `{ business_name, trading_name, companies_house_number, address_line1, address_line2, city, postcode, phone, email }`
**Response**: `{ ok: true }`
**Notes**: Updates user with business information

---

## 🌐 Address Services APIs (BFF)

### `/api/bff/address/search` (GET)
**Purpose**: Search addresses by postcode
**Query**: `?postcode=SW1A1AA&building=123`
**Response**: `{ postcode, addresses: [addressObjects] }`
**Notes**: Uses getAddress.io API

### `/api/bff/address/autocomplete` (GET)
**Purpose**: Address autocomplete
**Query**: `?q=search_term`
**Response**: `{ addresses: [addressObjects] }`

### `/api/bff/address/find/:postcode` (GET)
**Purpose**: Find addresses by postcode
**Response**: `{ addresses: [addressObjects] }`

### `/api/bff/address/get/:id` (GET)
**Purpose**: Get specific address details
**Response**: `{ addressObject }`

---

## 🏢 Company Information APIs (BFF)

### `/api/bff/companies/search` (GET)
**Purpose**: Search companies
**Query**: `?q=company_name`
**Response**: `[companyObjects]`
**Notes**: Uses Companies House API

### `/api/bff/companies/:number` (GET)
**Purpose**: Get company details
**Response**: `{ company_name, company_number, company_status, date_of_creation, address, ... }`
**Notes**: Returns Companies House data

---

## 📞 Contact Form API

### `/api/contact` (POST)
**Purpose**: Send contact form message
**Body**: `{ name, email, company, subject, message, inquiryType, website }`
**Response**: `{ ok: true }`
**Notes**: Sends email via Postmark, includes honeypot spam protection

---

## 🔧 System APIs

### `/api/ready` (GET)
**Purpose**: Health check
**Response**: `{ ok: true, service: "vah-backend" }`
**Notes**: Service health status

### `/api/healthz` (GET)
**Purpose**: Detailed health check
**Response**: `{ status: "healthy", ... }`
**Notes**: Detailed system health

---

## 🛡️ Security Notes

- **Authentication**: Most APIs require valid session cookie
- **CSRF Protection**: Protected APIs require CSRF token
- **Rate Limiting**: APIs have rate limiting applied
- **CORS**: Configured for allowed origins
- **Input Validation**: All inputs are validated and sanitized

## 🔗 BFF (Backend for Frontend) Pattern

Many APIs are available through BFF routes (`/api/bff/*`) which:
- Proxy to backend services
- Handle CORS automatically
- Provide unified authentication
- Include CSRF protection
- Offer better error handling

## 📱 Frontend Integration

Use the existing API clients:
```typescript
import { apiClient, API_ENDPOINTS } from '@/lib/api-client';
import { apiGet, apiPostCSRF } from '@/lib/api';

// Examples:
const profile = await apiClient.get(API_ENDPOINTS.profile.get);
const mailItems = await apiGet('/api/bff/mail');
const result = await apiPostCSRF('/api/bff/profile', updatedData);
```
