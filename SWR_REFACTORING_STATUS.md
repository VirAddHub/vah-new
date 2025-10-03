# 🔄 SWR Refactoring Status & Action Plan

**Date:** 2025-10-03
**Status:** Infrastructure Complete | Backend & Frontend Alignment Needed

---

## ✅ What's Already Done

### 1. SWR Infrastructure (COMPLETE)
- ✅ Global SWR configuration in `app/layout.tsx`
- ✅ Custom hooks: `usePaged`, `useInfinite`, `useSearch`, `useDebouncedValue`
- ✅ Auto-refresh middleware for different API prefixes
- ✅ Fetcher utilities with error handling
- ✅ Comprehensive documentation

### 2. Service Layer (COMPLETE)
Located in `lib/services/`:
- ✅ `mail.service.ts` - Mail items API
- ✅ `billing.service.ts` - Billing & subscriptions
- ✅ `forwarding.service.ts` - Mail forwarding
- ✅ `kyc.service.ts` - KYC verification
- ✅ `profile.service.ts` - User profile
- ✅ `admin.service.ts` - Admin operations
- ✅ And more...

### 3. Components Using Manual State Management (NEEDS REFACTORING)
All dashboard components currently use:
```tsx
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  service.getData().then(r => r.ok && setData(r.data));
}, []);
```

---

## 🚧 Current Gap: API Response Format Mismatch

### Issue
Our SWR hooks expect paginated responses:
```ts
{
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

But current API returns:
```ts
{
  ok: boolean;
  data: T[];  // or data: { ... }
}
```

### Solutions

#### **Option 1: Update Backend APIs (Recommended)**
Add pagination support to backend endpoints:

```ts
// Backend: apps/backend/src/server/routes/mail.ts
router.get('/mail-items', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const offset = (page - 1) * pageSize;

  const items = await pool.query(`
    SELECT * FROM mail_item
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `, [userId, pageSize, offset]);

  const totalResult = await pool.query(
    'SELECT COUNT(*) FROM mail_item WHERE user_id = $1',
    [userId]
  );

  res.json({
    ok: true,
    items: items.rows,
    total: parseInt(totalResult.rows[0].count),
    page,
    pageSize,
  });
});
```

#### **Option 2: Create Adapter Services (Quick Fix)**
Wrap existing services to transform responses:

```ts
// lib/services/mail.service.swr.ts
import { mailService } from './mail.service';
import type { PagedResponse } from '@/hooks/usePaged';

export const mailServiceSWR = {
  async getMailItemsPaged(page = 1, pageSize = 20): Promise<PagedResponse<MailItem>> {
    const response = await mailService.getMailItems();

    if (!response.ok) {
      throw new Error('Failed to fetch mail items');
    }

    // Client-side pagination (temporary until backend supports it)
    const items = response.data || [];
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedItems = items.slice(start, end);

    return {
      items: paginatedItems,
      total: items.length,
      page,
      pageSize,
    };
  },
};
```

#### **Option 3: Direct useSWR (Simplest for Non-Paginated Data)**
For endpoints that don't need pagination (billing info, profile, etc.):

```tsx
import useSWR from 'swr';
import { billingService } from '@/lib/services';

// Create a wrapper fetcher
const billingFetcher = async () => {
  const response = await billingService.getBillingOverview();
  if (!response.ok) throw new Error('Failed to fetch billing');
  return response.data;
};

// In component
const { data: billing, isValidating } = useSWR(
  '/api/billing',
  billingFetcher,
  { refreshInterval: 20000 }
);
```

---

## 📋 Recommended Approach

### Phase 1: Update Backend for Pagination (1-2 hours)

Add pagination support to key endpoints:

**1. Mail Items** (`/api/mail-items`)
```ts
GET /api/mail-items?page=1&pageSize=20
Response: { ok: true, items: [], total: number, page: number, pageSize: number }
```

**2. Admin Users** (`/api/admin/users`)
```ts
GET /api/admin/users?page=1&pageSize=50
Response: { ok: true, items: [], total: number, page: number, pageSize: number }
```

**3. Forwarding Requests** (`/api/forwarding/requests`)
```ts
GET /api/forwarding/requests?page=1&pageSize=20
Response: { ok: true, items: [], total: number, page: number, pageSize: number }
```

**4. Invoices** (`/api/billing/invoices`)
```ts
GET /api/billing/invoices?page=1&pageSize=20
Response: { ok: true, items: [], total: number, page: number, pageSize: number }
```

### Phase 2: Update Service Layer (30 mins)

Update service methods to support pagination:

```ts
// lib/services/mail.service.ts
export const mailService = {
  // Old method (keep for backwards compatibility)
  async getMailItems(): Promise<MailItemsResponse> {
    const { data } = await api('/api/mail-items', { method: 'GET' });
    return data;
  },

  // New paginated method
  async getMailItemsPaged(page = 1, pageSize = 20): Promise<PagedResponse<MailItem>> {
    const { data } = await api(`/api/mail-items?page=${page}&pageSize=${pageSize}`, {
      method: 'GET',
    });
    return data;
  },
};
```

### Phase 3: Refactor Components (2-3 hours)

Refactor each dashboard component to use SWR hooks:

#### **Example: EnhancedUserDashboard**

**Before:**
```tsx
const [mailItems, setMailItems] = useState<MailItem[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    const response = await mailService.getMailItems();
    if (response.ok) setMailItems(response.data);
    setLoading(false);
  };
  loadData();
}, []);
```

**After:**
```tsx
import { usePaged } from '@/hooks/usePaged';

const [page, setPage] = useState(1);
const { items: mailItems, total, isLoading, isValidating } = usePaged<MailItem>(
  `/api/mail-items?page=${page}&pageSize=20`,
  { refreshMs: 15000 }
);
```

---

## 🎯 Migration Checklist

### Backend Updates
- [ ] Add pagination to `/api/mail-items`
- [ ] Add pagination to `/api/admin/users`
- [ ] Add pagination to `/api/forwarding/requests`
- [ ] Add pagination to `/api/billing/invoices`
- [ ] Test all endpoints return correct format

### Service Layer Updates
- [ ] Add paginated methods to `mail.service.ts`
- [ ] Add paginated methods to `admin.service.ts`
- [ ] Add paginated methods to `forwarding.service.ts`
- [ ] Add paginated methods to `billing.service.ts`

### Component Refactoring
- [ ] `EnhancedUserDashboard.tsx` → Use `usePaged` for mail items
- [ ] `BillingDashboard.tsx` → Use `useSWR` for billing info
- [ ] `KYCDashboard.tsx` → Use `useSWR` for KYC status
- [ ] `EnhancedAdminDashboard.tsx` → Use `usePaged` for admin tables

### Testing
- [ ] Verify background refresh works (switch tabs)
- [ ] Verify focus revalidation (return to tab)
- [ ] Verify offline/online revalidation
- [ ] Verify no content flash during refresh
- [ ] Test pagination controls
- [ ] Test on mobile devices

---

## 🚀 Quick Start: Immediate Actions

### 1. Backend: Add Pagination Helper (5 mins)

```ts
// apps/backend/src/server/db-helpers.ts
export async function selectPaged<T>(
  query: string,
  params: any[],
  page = 1,
  pageSize = 20
): Promise<{ items: T[]; total: number; page: number; pageSize: number }> {
  const pool = getPool();
  const offset = (page - 1) * pageSize;

  // Get paginated items
  const itemsResult = await pool.query(
    `${query} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, offset]
  );

  // Get total count (modify query to remove ORDER BY and LIMIT)
  const countQuery = query.replace(/ORDER BY.*$/i, '').replace(/LIMIT.*$/i, '');
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM (${countQuery}) AS count_query`,
    params
  );

  return {
    items: itemsResult.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    pageSize,
  };
}
```

### 2. Backend: Update Mail Items Endpoint (10 mins)

```ts
// apps/backend/src/server/routes/mail.ts
router.get('/mail-items', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;

  try {
    const result = await selectPaged(
      `SELECT m.*, f.name as file_name, f.web_url
       FROM mail_item m
       LEFT JOIN file f ON m.file_id = f.id
       WHERE m.user_id = $1 AND m.deleted = false
       ORDER BY m.created_at DESC`,
      [userId],
      page,
      pageSize
    );

    return res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('[GET /api/mail-items] error:', error);
    return res.status(500).json({ ok: false, error: 'database_error' });
  }
});
```

### 3. Frontend: Use SWR Hook (5 mins)

```tsx
// components/EnhancedUserDashboard.tsx
import { usePaged } from '@/hooks/usePaged';

// Inside component
const [page, setPage] = useState(1);
const {
  items: mailItems,
  total,
  isLoading,
  isValidating,
  error,
} = usePaged<MailItem>(
  `/api/mail-items?page=${page}&pageSize=20`,
  { refreshMs: 15000 }
);

// Show loading/refreshing indicator
{isValidating && !isLoading && (
  <div className="text-xs text-muted-foreground">Refreshing...</div>
)}
```

---

## 📊 Expected Benefits After Migration

1. **Automatic Updates** - Data refreshes every 15-30s without user action
2. **Better UX** - No loading spinners replacing content
3. **Consistent Patterns** - Same data fetching approach everywhere
4. **Better Performance** - SWR caching and deduplication
5. **Real-time Feel** - App feels more responsive and modern

---

## 📚 Resources

- **SWR Docs:** https://swr.vercel.app/
- **Implementation Guide:** `/SWR_IMPLEMENTATION_GUIDE.md`
- **Backend Pagination Pattern:** See examples above

---

**Last Updated:** 2025-10-03
**Next Step:** Add pagination to backend endpoints, then refactor components
