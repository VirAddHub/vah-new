# API Endpoint to Frontend Component Mapping

This document maps all 51 tested API endpoints to their frontend usage locations (components, pages, buttons, etc.).

---

## 🩺 System & Health Endpoints

### 1. `GET /api/health`
**Frontend Usage:** 
- ✅ **Not directly used in UI** - Backend health check endpoint
- Used by monitoring systems and deployment checks

### 2. `GET /api/healthz`
**Frontend Usage:**
- ✅ **Not directly used in UI** - Render/uptime monitoring endpoint
- Used by hosting platform health checks

### 3. `GET /api/__version`
**Frontend Usage:**
- ✅ **Not directly used in UI** - Build metadata endpoint
- Used for deployment verification

### 4. `GET /api/metrics`
**Frontend Usage:**
- ✅ **Not directly used in UI** - Prometheus metrics endpoint
- Used by monitoring/observability tools

---

## 👤 Auth & Session Endpoints

### 5. `GET /api/auth/whoami`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/lib/api-client.ts` (line 440-447)
- 📍 **Location:** `apps/frontend/contexts/AuthContext.tsx` (line 93-154)
- 🔘 **Triggered by:**
  - Page load in `AuthContext` to check authentication status
  - After login to verify user session
- 📄 **Components:** `AuthContext`, `Login`, `UserDashboard`

### 6. `POST /api/auth/login`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/app/login/page.tsx` (line 26-33)
- 📍 **Location:** `apps/frontend/components/Login.tsx` (line 50)
- 📍 **Location:** `apps/frontend/lib/api-client.ts` (line 412-438)
- 📍 **Location:** `apps/frontend/contexts/AuthContext.tsx` (line 158-216)
- 🔘 **Triggered by:**
  - "Sign In" button on login page
  - Login form submission
- 📄 **Components:** `Login`, `LoginPage`

### 7. `POST /api/auth/register`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/app/signup/page.tsx`
- 🔘 **Triggered by:**
  - "Sign Up" button on registration page
  - Registration form submission
- 📄 **Components:** Signup page component

### 8. `POST /api/auth/logout`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/lib/api-client.ts` (line 449-452)
- 📍 **Location:** `apps/frontend/components/UserDashboard.tsx`
- 🔘 **Triggered by:**
  - "Logout" button in user dashboard
  - Session timeout
- 📄 **Components:** `UserDashboard`, `Header`

---

## 👥 Profile Endpoints

### 9. `GET /api/profile`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/UserDashboard.tsx` (line 161-178)
- 📍 **Location:** `apps/frontend/lib/apiClient.ts` (line 288)
- 📍 **Location:** `apps/frontend/app/(dashboard)/account/page.tsx`
- 🔘 **Triggered by:**
  - User dashboard page load
  - Account page load
  - Profile refresh button
- 📄 **Components:** `UserDashboard`, `AccountPage`

### 10. `PATCH /api/profile`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/app/(dashboard)/account/page.tsx`
- 🔘 **Triggered by:**
  - "Save" button on account settings page
  - Profile update form submission
- 📄 **Components:** `AccountPage`

---

## 📬 Mail Items Endpoints

### 11. `GET /api/mail-items`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/UserDashboard.tsx` (line 115-135)
- 📍 **Location:** `apps/frontend/lib/apiClient.ts` (line 290)
- 📍 **Location:** `apps/frontend/components/MailManagement.tsx`
- 🔘 **Triggered by:**
  - User dashboard page load
  - Mail items refresh (SWR polling every 2 minutes)
  - "Refresh" button
- 📄 **Components:** `UserDashboard`, `MailManagement`

### 12. `GET /api/mail-items/:id`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/lib/apiClient.ts` (line 292)
- 📍 **Location:** `apps/frontend/components/MailManagement.tsx`
- 🔘 **Triggered by:**
  - Clicking on a mail item to view details
  - Opening mail item modal
- 📄 **Components:** `MailManagement`, `UserDashboard`

### 13. `PATCH /api/mail-items/:id`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/MailManagement.tsx`
- 🔘 **Triggered by:**
  - Tagging a mail item
  - Marking as read/unread
  - Updating mail item metadata
- 📄 **Components:** `MailManagement`

### 14. `DELETE /api/mail-items/:id`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/MailManagement.tsx`
- 🔘 **Triggered by:**
  - "Archive" button on mail item
  - "Delete" button (if available)
- 📄 **Components:** `MailManagement`

---

## 📦 Forwarding Requests Endpoints

### 15. `GET /api/forwarding/requests`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/app/forwarding/page.tsx` (line 74-82)
- 📍 **Location:** `apps/frontend/lib/apiClient.ts` (line 309)
- 🔘 **Triggered by:**
  - Forwarding page load
  - "Refresh" button on forwarding page
- 📄 **Components:** `ForwardingPage`

### 16. `POST /api/forwarding/requests`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/app/forwarding/page.tsx`
- 📍 **Location:** `apps/frontend/components/UserDashboard.tsx`
- 🔘 **Triggered by:**
  - "Forward Mail" button on mail item
  - "Request Forwarding" button on forwarding page
  - Forwarding form submission
- 📄 **Components:** `ForwardingPage`, `UserDashboard`

---

## 💳 Billing & Plans Endpoints

### 17. `GET /api/billing/overview`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/app/(dashboard)/billing/page.tsx`
- 📍 **Location:** `apps/frontend/lib/services/billing.service.ts`
- 🔘 **Triggered by:**
  - Billing page load
  - Subscription status refresh
- 📄 **Components:** `BillingPage`

### 18. `GET /api/billing/invoices`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/app/(dashboard)/billing/page.tsx`
- 📍 **Location:** `apps/frontend/lib/apiClient.ts` (line 320)
- 🔘 **Triggered by:**
  - Billing page load
  - "View Invoices" section
- 📄 **Components:** `BillingPage`

### 19. `GET /api/billing/subscription-status`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/app/(dashboard)/billing/page.tsx`
- 🔘 **Triggered by:**
  - Billing page load
  - Subscription status check
- 📄 **Components:** `BillingPage`

### 20. `GET /api/plans`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/HomePage.tsx`
- 📍 **Location:** `apps/frontend/app/pricing/page.tsx`
- 📍 **Location:** `apps/frontend/hooks/usePlans.ts`
- 🔘 **Triggered by:**
  - Homepage load (pricing section)
  - Pricing page load
  - Plan selection
- 📄 **Components:** `HomePage`, `PlansPage`, `PricingPage`

### 21. `GET /api/plans/:id`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/hooks/usePlans.ts`
- 🔘 **Triggered by:**
  - Selecting a specific plan
  - Plan details modal
- 📄 **Components:** `HomePage`, `PlansPage`

---

## 📞 Support & Contact Endpoints

### 22. `POST /api/contact`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/ContactPage.tsx`
- 🔘 **Triggered by:**
  - "Send Message" button on contact form
  - Contact form submission
- 📄 **Components:** `ContactPage`

### 23. `GET /api/support/info`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/ContactPage.tsx`
- 📍 **Location:** `apps/frontend/lib/apiClient.ts` (line 258-274)
- 🔘 **Triggered by:**
  - Contact page load
  - Support info display
- 📄 **Components:** `ContactPage`, `HelpPage`

---

## 🧠 Quiz Module Endpoints

### 24. `POST /api/quiz/submit`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/app/(marketing)/compliance-check/page.tsx`
- 📍 **Location:** `apps/frontend/app/api/bff/quiz/submit/route.ts`
- 🔘 **Triggered by:**
  - Quiz completion on compliance check page
  - Quiz form submission
- 📄 **Components:** `ComplianceCheckPage` (via iframe/embed)

### 25. `GET /api/quiz/stats`
**Frontend Usage:**
- ✅ **Not directly used in UI** - Admin analytics endpoint
- Could be used in admin dashboard for quiz analytics

---

## 🛠️ Admin Core Endpoints

### 26. `GET /api/admin/overview`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/EnhancedAdminDashboard.tsx`
- 📍 **Location:** `apps/frontend/lib/hooks/useAdminOverview.ts`
- 🔘 **Triggered by:**
  - Admin dashboard page load
  - Overview section refresh (SWR polling every 60 seconds)
- 📄 **Components:** `EnhancedAdminDashboard`, `OverviewSection`

### 27. `GET /api/admin/health/summary`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/EnhancedAdminDashboard.tsx`
- 📍 **Location:** `apps/frontend/lib/hooks/useAdminOverview.ts`
- 📍 **Location:** `apps/frontend/components/admin/SystemHealthCard.tsx`
- 🔘 **Triggered by:**
  - Admin dashboard load
  - System health card refresh (every 60 seconds)
- 📄 **Components:** `EnhancedAdminDashboard`, `SystemHealthCard`

### 28. `GET /api/admin/health/dependencies`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/EnhancedAdminDashboard.tsx`
- 📍 **Location:** `apps/frontend/lib/hooks/useAdminOverview.ts`
- 📍 **Location:** `apps/frontend/components/admin/SystemHealthCard.tsx`
- 🔘 **Triggered by:**
  - Admin dashboard load
  - Dependencies health check
- 📄 **Components:** `EnhancedAdminDashboard`, `SystemHealthCard`

### 29. `GET /api/admin/activity`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/EnhancedAdminDashboard.tsx`
- 📍 **Location:** `apps/frontend/lib/hooks/useAdminOverview.ts`
- 📍 **Location:** `apps/frontend/components/admin/RecentActivityCard.tsx`
- 🔘 **Triggered by:**
  - Admin dashboard load
  - Recent activity section refresh
- 📄 **Components:** `EnhancedAdminDashboard`, `RecentActivityCard`

---

## 👨‍💼 Admin → Users Endpoints

### 30. `GET /api/admin/users`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/admin/UsersSection.tsx`
- 🔘 **Triggered by:**
  - Admin users page load
  - Users table pagination
  - Users filter/search
- 📄 **Components:** `UsersSection`, `EnhancedAdminDashboard`

### 31. `GET /api/admin/users/:id`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/admin/UserEditForm.tsx`
- 🔘 **Triggered by:**
  - Clicking on a user to edit
  - User details modal
- 📄 **Components:** `UserEditForm`, `UsersSection`

### 32. `PATCH /api/admin/users/:id`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/admin/UserEditForm.tsx`
- 🔘 **Triggered by:**
  - "Save" button on user edit form
  - Changing user plan/status
- 📄 **Components:** `UserEditForm`

### 33. `GET /api/admin/users/stats`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/EnhancedAdminDashboard.tsx`
- 📍 **Location:** `apps/frontend/components/admin/OverviewMetricCard.tsx`
- 🔘 **Triggered by:**
  - Admin overview page load
  - User stats refresh
- 📄 **Components:** `EnhancedAdminDashboard`, `OverviewMetricCard`

---

## 📤 Admin → Forwarding Endpoints

### 34. `GET /api/admin/forwarding/stats`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/EnhancedAdminDashboard.tsx`
- 📍 **Location:** `apps/frontend/lib/hooks/useAdminOverview.ts`
- 📍 **Location:** `apps/frontend/components/admin/ForwardingCard.tsx`
- 🔘 **Triggered by:**
  - Admin overview load
  - Forwarding stats refresh (every 30 seconds)
- 📄 **Components:** `EnhancedAdminDashboard`, `ForwardingCard`

### 35. `GET /api/admin/forwarding/requests`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/admin/ForwardingSection.tsx`
- 📍 **Location:** `apps/frontend/components/admin/ForwardingCard.tsx`
- 🔘 **Triggered by:**
  - Admin forwarding page load
  - Forwarding requests table refresh
  - Status filter changes
- 📄 **Components:** `ForwardingSection`, `ForwardingCard`

### 36. `GET /api/admin/forwarding/requests/:id`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/admin/ForwardingSection.tsx`
- 🔘 **Triggered by:**
  - Clicking on a forwarding request to view details
  - Forwarding request details modal
- 📄 **Components:** `ForwardingSection`

---

## ✉️ Admin → Mail Items Endpoints

### 37. `GET /api/admin/mail-items`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/admin/MailSection.tsx`
- 🔘 **Triggered by:**
  - Admin mail page load
  - Mail items table pagination
  - Mail items filter/search
- 📄 **Components:** `MailSection`, `EnhancedAdminDashboard`

### 38. `GET /api/admin/mail-items/stats`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/EnhancedAdminDashboard.tsx`
- 🔘 **Triggered by:**
  - Admin overview load
  - Mail stats refresh
- 📄 **Components:** `EnhancedAdminDashboard`

---

## 💰 Admin → Plans & Billing Endpoints

### 39. `GET /api/admin/plans`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/admin/PlansSection.tsx`
- 🔘 **Triggered by:**
  - Admin plans page load
  - Plans management section
- 📄 **Components:** `PlansSection`

### 40. `GET /api/admin/plans/:id`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/admin/PlansSection.tsx`
- 🔘 **Triggered by:**
  - Clicking on a plan to edit
  - Plan details modal
- 📄 **Components:** `PlansSection`

### 41. `GET /api/admin/billing/metrics`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/EnhancedAdminDashboard.tsx`
- 📍 **Location:** `apps/frontend/components/admin/SystemSummaryCard.tsx`
- 🔘 **Triggered by:**
  - Admin overview load
  - Revenue metrics refresh
- 📄 **Components:** `EnhancedAdminDashboard`, `SystemSummaryCard`

---

## 🏢 Companies House Integration Endpoints

### 42. `GET /api/companies-house/search?q=test`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/components/admin/UsersSection.tsx` (potential)
- 🔘 **Triggered by:**
  - Company search functionality
  - KYC verification process
- 📄 **Components:** Company search components (if implemented)

### 43. `GET /api/companies-house/:id`
**Frontend Usage:**
- 📍 **Location:** Company details components
- 🔘 **Triggered by:**
  - Clicking on a company to view details
  - Company verification process
- 📄 **Components:** Company details components (if implemented)

---

## 🏠 Address Lookup Endpoints

### 44. `GET /api/address?postcode=SW1A1AA`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/app/api/bff/address/route.ts`
- 🔘 **Triggered by:**
  - Address lookup form (postcode search)
  - Address validation
- 📄 **Components:** Address lookup components (if implemented)

---

## 📰 Blog Endpoints

### 45. `GET /api/blog/posts`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/app/(marketing)/blog/page.tsx`
- 📍 **Location:** `apps/frontend/components/BlogPage.tsx`
- 📍 **Location:** `apps/frontend/app/api/bff/blog/list/route.ts`
- 🔘 **Triggered by:**
  - Blog listing page load
  - Blog page refresh
- 📄 **Components:** `BlogPage`

### 46. `GET /api/blog/posts/:slug`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/app/(marketing)/blog/[slug]/page.tsx`
- 📍 **Location:** `apps/frontend/components/BlogPostPage.tsx`
- 📍 **Location:** `apps/frontend/app/api/bff/blog/detail/route.ts`
- 🔘 **Triggered by:**
  - Clicking on a blog post
  - Blog post page load
- 📄 **Components:** `BlogPostPage`

---

## 🪪 KYC Verification Endpoints

### 47. `GET /api/kyc/status`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/lib/apiClient.ts` (line 278-281)
- 📍 **Location:** `apps/frontend/lib/services/kyc.service.ts`
- 📍 **Location:** `apps/frontend/app/(dashboard)/account/page.tsx`
- 🔘 **Triggered by:**
  - Account page load
  - KYC status check
- 📄 **Components:** `AccountPage`, KYC status components

### 48. `POST /api/kyc/start`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/lib/apiClient.ts` (line 286)
- 📍 **Location:** `apps/frontend/lib/services/kyc.service.ts`
- 📍 **Location:** `apps/frontend/app/(dashboard)/account/page.tsx`
- 🔘 **Triggered by:**
  - "Start KYC Verification" button
  - KYC onboarding flow
- 📄 **Components:** `AccountPage`, KYC components

---

## ✉️ Email Preferences Endpoints

### 49. `GET /api/email-prefs`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/lib/apiClient.ts` (line 317)
- 📍 **Location:** `apps/frontend/lib/services/email-prefs.service.ts`
- 📍 **Location:** `apps/frontend/app/(dashboard)/account/page.tsx`
- 🔘 **Triggered by:**
  - Account settings page load
  - Email preferences section
- 📄 **Components:** `AccountPage`

### 50. `PATCH /api/email-prefs`
**Frontend Usage:**
- 📍 **Location:** `apps/frontend/lib/services/email-prefs.service.ts`
- 📍 **Location:** `apps/frontend/app/(dashboard)/account/page.tsx`
- 🔘 **Triggered by:**
  - Toggling email notification preferences
  - "Save Preferences" button
- 📄 **Components:** `AccountPage`

---

## ⚙️ Operations Endpoints

### 51. `GET /api/ops/self-test`
**Frontend Usage:**
- ✅ **Not directly used in UI** - Backend operations endpoint
- Used for system diagnostics and testing

---

## Summary Statistics

- **Directly Used in UI:** 47 endpoints
- **Backend/System Only:** 4 endpoints (health, metrics, version, ops)
- **Admin Dashboard:** 18 endpoints
- **User Dashboard:** 12 endpoints
- **Public Pages:** 8 endpoints
- **Account Settings:** 4 endpoints
- **Billing:** 3 endpoints
- **Blog:** 2 endpoints

---

## Key Frontend Files

### Main Components
- `apps/frontend/components/UserDashboard.tsx` - Uses 5+ endpoints
- `apps/frontend/components/EnhancedAdminDashboard.tsx` - Uses 10+ endpoints
- `apps/frontend/components/MailManagement.tsx` - Uses 4 mail endpoints
- `apps/frontend/app/login/page.tsx` - Uses login endpoint
- `apps/frontend/app/(dashboard)/billing/page.tsx` - Uses 3 billing endpoints
- `apps/frontend/app/(dashboard)/account/page.tsx` - Uses profile, KYC, email prefs

### API Client Files
- `apps/frontend/lib/http.ts` - BFF client (routes through `/api/bff/*`)
- `apps/frontend/lib/api-client.ts` - Direct backend client
- `apps/frontend/lib/apiClient.ts` - Legacy API client
- `apps/frontend/lib/hooks/useAdminOverview.ts` - Admin SWR hooks

### Service Files
- `apps/frontend/lib/services/*.service.ts` - Domain-specific API wrappers

---

## Notes

- Most endpoints go through **BFF routes** (`/api/bff/*`) which proxy to the backend
- **SWR** is used for data fetching with automatic polling/refresh
- **Authentication** is handled via Bearer tokens in Authorization headers
- **Admin endpoints** require admin role authentication
- Some endpoints may be called but not yet fully implemented in the UI

