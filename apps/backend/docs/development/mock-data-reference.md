# Mock Data Reference

This document details all the mock data used in the API testing system.

## Core Mock Data Objects

All mock data is defined in `test-api-mock-server.js` in the `mocks` object.

---

## 1. User Mock Data

```javascript
user: {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    plan_id: 1
}
```

**Used in:**
- `/api/auth/whoami` - Returns authenticated user
- `/api/auth/login` - Returns user with token
- `/api/auth/register` - Returns newly created user
- `/api/profile` - Returns user profile
- `/api/admin/users` - Returns user in list
- `/api/admin/users/:id` - Returns specific user

---

## 2. Mail Items Mock Data

```javascript
mailItems: [
    {
        id: 1,
        subject: 'Test Mail 1',
        from: 'sender1@example.com',
        received_at: Date.now() // Current timestamp
    },
    {
        id: 2,
        subject: 'Test Mail 2',
        from: 'sender2@example.com',
        received_at: Date.now() - 86400000 // 24 hours ago
    }
]
```

**Used in:**
- `/api/mail-items` - Returns list of mail items
- `/api/mail-items/:id` - Returns specific mail item
- `/api/admin/mail-items` - Returns list for admin view

---

## 3. Forwarding Requests Mock Data

```javascript
forwardingRequests: [
    {
        id: 1,
        to_name: 'John Doe',
        status: 'requested',
        created_at: Date.now() // Current timestamp
    },
    {
        id: 2,
        to_name: 'Jane Smith',
        status: 'dispatched',
        dispatched_at: Date.now() - 3600000 // 1 hour ago
    }
]
```

**Used in:**
- `/api/forwarding/requests` - Returns list of forwarding requests
- `/api/admin/forwarding/requests` - Returns list for admin view
- `/api/admin/forwarding/requests/:id` - Returns specific request

---

## 4. Plans Mock Data

```javascript
plans: [
    {
        id: 1,
        name: 'Monthly',
        price: 9.99,
        billing_cycle: 'monthly'
    },
    {
        id: 2,
        name: 'Annual',
        price: 89.99,
        billing_cycle: 'annual'
    }
]
```

**Used in:**
- `/api/plans` - Returns all available plans
- `/api/plans/:id` - Returns specific plan
- `/api/admin/plans` - Returns plans for admin view

---

## 5. Invoices Mock Data

```javascript
invoices: [
    {
        id: 1,
        amount: 999, // In pence (9.99 GBP)
        status: 'paid',
        created_at: Date.now() - 86400000 // 24 hours ago
    },
    {
        id: 2,
        amount: 999,
        status: 'paid',
        created_at: Date.now() - 172800000 // 48 hours ago
    }
]
```

**Used in:**
- `/api/billing/invoices` - Returns list of invoices
- `/api/billing/overview` - Returns subscription with invoices

---

## 6. Admin Overview Mock Data

```javascript
adminOverview: {
    users: {
        total: 100,
        active: 75,
        kycPending: 5,
        deleted: 2
    },
    mail: {
        total: 500,
        processedLast30Days: 150
    },
    forwarding: {
        active: 25,
        requested: 10,
        dispatched: 15
    },
    revenue: {
        currentMonth: 50000, // In pence (£500.00)
        lastMonth: 45000,     // In pence (£450.00)
        delta: 11             // 11% increase
    }
}
```

**Used in:**
- `/api/admin/overview` - Returns comprehensive admin metrics
- `/api/admin/users/stats` - Returns user statistics
- `/api/admin/mail-items/stats` - Returns mail statistics
- `/api/admin/forwarding/stats` - Returns forwarding statistics
- `/api/admin/billing/metrics` - Returns revenue metrics

---

## 7. Dynamic Mock Data

These are generated at request time rather than stored in the `mocks` object:

### Health Endpoints

```javascript
// GET /api/health
{
    ok: true,
    status: 'healthy',
    timestamp: Date.now()
}

// GET /api/healthz
{
    ok: true
}

// GET /api/__version
{
    builtAt: new Date().toISOString(),
    commit: 'test',
    branch: 'main'
}

// GET /api/metrics (Prometheus format)
'# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total 100\n'
```

### Support Info

```javascript
// GET /api/support/info
{
    ok: true,
    email: 'support@example.com',
    phone: '+44 20 1234 5678'
}
```

### Quiz Responses

```javascript
// POST /api/quiz/submit
{
    ok: true,
    score: 75,
    segment: 'high' // 'high', 'mid', or 'low'
}

// GET /api/quiz/stats
{
    ok: true,
    total: 100,
    averageScore: 72
}
```

### Admin Activity

```javascript
// GET /api/admin/activity
{
    ok: true,
    activities: [
        {
            id: 1,
            type: 'user_signup',
            at: Date.now(),
            title: 'New user signed up'
        },
        {
            id: 2,
            type: 'mail_received',
            at: Date.now() - 3600000, // 1 hour ago
            title: 'Mail received'
        }
    ]
}
```

### Admin Health

```javascript
// GET /api/admin/health/summary
{
    ok: true,
    status: 'healthy',
    uptime: 3600 // seconds
}

// GET /api/admin/health/dependencies
{
    ok: true,
    database: 'connected',
    postmark: 'connected'
}
```

### Billing

```javascript
// GET /api/billing/subscription-status
{
    ok: true,
    status: 'active',
    plan_id: 1
}

// GET /api/billing/overview
{
    ok: true,
    subscription: {
        plan_id: 1,
        status: 'active'
    },
    invoices: [/* invoices mock data */]
}
```

### Companies House

```javascript
// GET /api/companies-house/search?q=test
{
    ok: true,
    companies: [
        {
            name: 'Test Company',
            number: '12345678'
        }
    ]
}

// GET /api/companies-house/12345678
{
    ok: true,
    name: 'Test Company',
    number: '12345678'
}
```

### Address Lookup

```javascript
// GET /api/address?postcode=SW1A1AA
{
    ok: true,
    addresses: [
        {
            address1: '123 Test St',
            city: 'London',
            postal: 'SW1A 1AA'
        }
    ]
}
```

### Blog

```javascript
// GET /api/blog/posts
{
    ok: true,
    posts: [
        {
            slug: 'test-post',
            title: 'Test Post'
        }
    ]
}

// GET /api/blog/posts/test-slug
{
    ok: true,
    slug: 'test-slug',
    title: 'Test Post',
    content: 'Test content'
}
```

### KYC

```javascript
// GET /api/kyc/status
{
    ok: true,
    status: 'pending' // 'pending', 'approved', 'rejected'
}

// POST /api/kyc/start
{
    ok: true,
    kyc_url: 'https://kyc.example.com/start'
}
```

### Email Preferences

```javascript
// GET /api/email-prefs
{
    ok: true,
    notifications: true,
    marketing: false
}

// PATCH /api/email-prefs
{
    ok: true,
    notifications: true,
    marketing: false,
    // ... merged with request body
}
```

### Ops Self Test

```javascript
// GET /api/ops/self-test
{
    ok: true,
    tests: [
        {
            name: 'Database',
            status: 'pass' // 'pass', 'fail'
        }
    ]
}
```

---

## Authentication Mock

All protected endpoints check for an `Authorization` header:

```javascript
Authorization: Bearer mock-jwt-token
```

If missing, endpoints return:
```javascript
{
    ok: false,
    error: 'Unauthorized'
}
```

---

## Response Format

All successful responses follow this format:
```javascript
{
    ok: true,
    // ... data fields
}
```

All error responses follow this format:
```javascript
{
    ok: false,
    error: 'Error message'
}
```

---

## Timestamps

All timestamps use:
- `Date.now()` - Current time in milliseconds since epoch
- `Date.now() - 86400000` - 24 hours ago (1 day = 86400000 ms)
- `Date.now() - 3600000` - 1 hour ago (1 hour = 3600000 ms)
- `Date.now() - 172800000` - 48 hours ago (2 days)

---

## Customization

To modify mock data:

1. Edit the `mocks` object in `test-api-mock-server.js`
2. Update route handlers to use new mock data
3. Restart the mock server

Example:
```javascript
const mocks = {
    user: {
        id: 1,
        email: 'your-email@example.com', // Change this
        name: 'Your Name',                // Change this
        // ...
    },
    // ...
};
```

