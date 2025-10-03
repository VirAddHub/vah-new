# 🔄 SWR Background Refresh Implementation Guide

**Status:** ✅ **Infrastructure Complete** | 🚧 **Page Refactoring Ready**
**Goal:** Silent background refresh across all pages - no manual refresh buttons

---

## 📋 Overview

This implementation uses [SWR (Stale-While-Revalidate)](https://swr.vercel.app/) to provide automatic background data refresh across the entire frontend. Data updates silently in the background while keeping previous data visible (no loading spinners replacing content).

### Key Features

- ✅ **Automatic refresh** on tab focus, reconnect, and at intervals
- ✅ **Previous data retained** during refresh (no jank/flash)
- ✅ **Debounced search** to avoid excessive API calls
- ✅ **Infinite scroll** support for activity feeds
- ✅ **Paginated lists** with automatic refresh
- ✅ **Prefix-based middleware** for section-wide refresh policies
- ✅ **Throttled focus refresh** (15s) to avoid excessive requests

---

## ✅ Completed Infrastructure

### 1. Global SWR Configuration

**File:** `apps/frontend/app/layout.tsx`

```tsx
<SWRConfig
  value={{
    fetcher: flexFetcher,
    revalidateIfStale: true,
    revalidateOnFocus: true,          // Refresh when tab gains focus
    revalidateOnReconnect: true,      // Refresh when back online
    focusThrottleInterval: 15000,     // Throttle focus refresh (15s)
    dedupingInterval: 1000,           // Dedupe requests within 1s
    keepPreviousData: true,           // Keep previous data while refreshing
    use: [
      autoRefresh({ prefix: '/api/mail-items', intervalMs: 15000 }),
      autoRefresh({ prefix: '/api/billing', intervalMs: 20000 }),
      autoRefresh({ prefix: '/api/admin', intervalMs: 20000 }),
    ],
  }}
>
  {children}
</SWRConfig>
```

**Behavior:**
- Mail items refresh every 15 seconds
- Billing/admin data refreshes every 20 seconds
- Focus/reconnect triggers immediate refresh (throttled)
- Previous data stays visible during refresh

### 2. Core Utilities

#### **`lib/swr.ts`** ✅
- `ApiError` class for structured error handling
- `jsonFetcher` - Standard JSON fetcher with credentials
- `flexFetcher` - Supports both `string` and `[url, params]` keys

#### **`lib/swrAutoRefresh.ts`** ✅
- SWR middleware for prefix-based auto-refresh
- Automatically applies refresh policies to API sections

### 3. Reusable Hooks

#### **`hooks/useDebouncedValue.ts`** ✅
```tsx
const debouncedQuery = useDebouncedValue(query, 300);
```
- Debounces rapid value changes
- Default 300ms delay
- Perfect for search inputs

#### **`hooks/usePaged.ts`** ✅
```tsx
const { items, total, isLoading, isValidating, error } = usePaged<MailItem>(
  `/api/mail-items?page=${page}&pageSize=20`,
  { refreshMs: 15000 }
);
```
- For paginated lists
- Automatic background refresh
- Returns items, total, page, pageSize
- `isValidating` shows when refreshing in background

**Expected API Response:**
```ts
{
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
```

#### **`hooks/useInfinite.ts`** ✅
```tsx
const { items, hasMore, loadMore, isValidating } = useInfinite<Activity>(
  (index, prev) => {
    if (index === 0) return '/api/activity?limit=20';
    if (!prev?.nextCursor) return null;
    return `/api/activity?cursor=${prev.nextCursor}&limit=20`;
  },
  { refreshMs: 20000 }
);
```
- For infinite scroll lists
- Cursor-based pagination
- Refreshes first page automatically
- `loadMore()` fetches next page

**Expected API Response:**
```ts
{
  items: T[];
  nextCursor?: string;
}
```

#### **`hooks/useSearch.ts`** ✅
```tsx
const [query, setQuery] = useState('');
const { items, total, isValidating, isSearching } = useSearch<MailItem>(
  query,
  page,
  pageSize,
  { debounceMs: 300, refreshMs: 30000 }
);
```
- Debounced search
- Automatic refresh of search results
- Returns null key if query is empty (no fetch)
- `isSearching` indicates active search

**Expected API Response:**
```ts
{
  items: T[];
  total: number;
  query: string;
}
```

---

## 🚧 Page Refactoring Guide

### Pattern: Replace Manual Fetching with SWR Hooks

**Before (Manual fetch):**
```tsx
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch('/api/mail-items')
    .then(r => r.json())
    .then(data => setItems(data.items))
    .finally(() => setLoading(false));
}, []);
```

**After (SWR with auto-refresh):**
```tsx
const { items, isLoading, isValidating } = usePaged<MailItem>(
  '/api/mail-items?page=1&pageSize=20',
  { refreshMs: 15000 }
);
```

### Priority Pages to Refactor

#### 1. **User Dashboard / Mail Items** 🔴 HIGH

**File:** `components/EnhancedUserDashboard.tsx`

```tsx
'use client';
import { useState } from 'react';
import { usePaged } from '@/hooks/usePaged';

type MailItem = {
  id: number;
  name: string;
  sender_name?: string;
  received_date?: string;
  is_read?: boolean;
};

export function EnhancedUserDashboard() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { items, total, isLoading, isValidating, error } = usePaged<MailItem>(
    `/api/mail-items?page=${page}&pageSize=${pageSize}`,
    { refreshMs: 15000 }
  );

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Mail Items</h1>
        <div className="text-sm text-muted-foreground">
          {isLoading ? 'Loading...' : isValidating ? 'Refreshing...' : `${total} items`}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 mb-4">
          Error: {error.message}
        </div>
      )}

      <div className="grid gap-3">
        {items.map(item => (
          <div key={item.id} className="rounded-lg border p-4">
            <div className="font-medium">{item.name}</div>
            {item.sender_name && (
              <div className="text-sm text-muted-foreground">{item.sender_name}</div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination controls */}
    </div>
  );
}
```

**API Endpoint Required:**
```
GET /api/mail-items?page=1&pageSize=20
Response: { items: MailItem[], total: number, page: number, pageSize: number }
```

#### 2. **Billing Dashboard** 🔴 HIGH

**File:** `components/BillingDashboard.tsx`

```tsx
'use client';
import useSWR from 'swr';

type BillingInfo = {
  subscription_status: string;
  plan_name: string;
  next_billing_date?: string;
  payment_method?: string;
};

export function BillingDashboard() {
  const { data, isLoading, isValidating, error } = useSWR<BillingInfo>(
    '/api/billing',
    {
      refreshInterval: 20000, // Refresh every 20s
      refreshWhenHidden: false,
    }
  );

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Billing</h1>
        {isValidating && !isLoading && (
          <div className="text-xs text-muted-foreground">Updating...</div>
        )}
      </div>

      {data && (
        <div className="grid gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="text-lg font-semibold">{data.subscription_status}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Plan</div>
            <div className="text-lg font-semibold">{data.plan_name}</div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 3. **Search Page with Auto-Refresh** 🟡 MEDIUM

**File:** `app/search/page.tsx`

```tsx
'use client';
import { useState } from 'react';
import { useSearch } from '@/hooks/useSearch';

type SearchResult = {
  id: number;
  name: string;
  type: 'mail' | 'document';
  snippet?: string;
};

export default function SearchPage() {
  const [query, setQuery] = useState('');

  const { items, total, isLoading, isValidating, isSearching } = useSearch<SearchResult>(
    query,
    1,
    20,
    { debounceMs: 300, refreshMs: 30000 }
  );

  return (
    <div className="p-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search mail items..."
        className="w-full h-11 rounded-lg border px-3 mb-4"
      />

      <div className="text-sm text-muted-foreground mb-2">
        {isLoading ? 'Searching...' : isValidating ? 'Updating...' : ''}
        {isSearching && !isLoading && `${total} results`}
      </div>

      <div className="grid gap-3">
        {items.map(result => (
          <div key={result.id} className="rounded-lg border p-4">
            <div className="font-medium">{result.name}</div>
            {result.snippet && (
              <p className="text-sm text-muted-foreground mt-1">{result.snippet}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 4. **Admin Dashboard** 🟢 LOW

**File:** `components/EnhancedAdminDashboard.tsx`

```tsx
'use client';
import { useState } from 'react';
import { usePaged } from '@/hooks/usePaged';

type AdminUser = {
  id: number;
  email: string;
  name: string;
  created_at: number;
  subscription_status?: string;
};

export function EnhancedAdminDashboard() {
  const [page, setPage] = useState(1);

  const { items, total, isLoading, isValidating } = usePaged<AdminUser>(
    `/api/admin/users?page=${page}&pageSize=50`,
    { refreshMs: 20000 }
  );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      <div className="text-sm text-muted-foreground mb-2">
        {isValidating && 'Refreshing...'}
        {total} users
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(user => (
              <tr key={user.id} className="border-b">
                <td className="p-3">{user.email}</td>
                <td className="p-3">{user.name}</td>
                <td className="p-3">{user.subscription_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 📊 API Requirements

### Response Formats

All paginated endpoints should return:

```ts
// Paginated response
{
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

// Infinite scroll response
{
  items: T[];
  nextCursor?: string;
}

// Search response
{
  items: T[];
  total: number;
  query: string;
}
```

### ETag Support (Optional but Recommended)

Add ETag headers for cheaper background checks:

```ts
// Backend (Node.js/Express)
app.get('/api/mail-items', (req, res) => {
  const data = getMailItems();
  const etag = generateETag(data);

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end(); // Not Modified
  }

  res.setHeader('ETag', etag);
  res.json(data);
});
```

---

## ✅ Acceptance Criteria

For each refactored page, verify:

### Behavior Tests

1. **Background Refresh:**
   - [ ] Switch to another tab for 20-30s, return → data silently refreshed
   - [ ] Check network tab: automatic requests every N seconds

2. **Focus Revalidation:**
   - [ ] Switch tabs and immediately return → revalidation triggered
   - [ ] Rapid tab switching → throttled (max 1 request per 15s)

3. **Offline/Online:**
   - [ ] Toggle offline mode → no requests
   - [ ] Go back online → immediate revalidation

4. **Loading States:**
   - [ ] Initial load shows "Loading..."
   - [ ] Background refresh shows "Refreshing..." or "Updating..."
   - [ ] **Content never disappears** during refresh (keepPreviousData)

5. **Search Debouncing:**
   - [ ] Type quickly → waits 300ms before fetching
   - [ ] Results update after debounce delay
   - [ ] Background refresh continues for active search

6. **Error Handling:**
   - [ ] Network errors show error message
   - [ ] Previous data remains visible
   - [ ] Retry on next interval or focus

### Visual Tests

- [ ] No loading spinners replacing content
- [ ] Small "Refreshing..." indicator acceptable
- [ ] No layout shifts during refresh
- [ ] Previous data visible until new data arrives

---

## 🔧 Debugging

### Check SWR Cache

```tsx
import { useSWRConfig } from 'swr';

export function DebugCache() {
  const { cache } = useSWRConfig();

  return (
    <div className="p-4">
      <h2>SWR Cache</h2>
      <pre>{JSON.stringify(cache, null, 2)}</pre>
    </div>
  );
}
```

### Check Refresh Intervals

```tsx
// Add to component for debugging
useEffect(() => {
  console.log('Data refreshed:', data);
  console.log('Is validating:', isValidating);
}, [data, isValidating]);
```

### Network Tab

- Look for requests with "swr-" in initiator
- Check timing: should match configured intervals
- Verify throttling on rapid focus changes

---

## 📈 Performance Considerations

### Refresh Intervals by Data Type

- **Real-time data** (inbox, notifications): 10-15s
- **Moderate data** (billing, account): 20-30s
- **Slow-changing data** (plans, settings): 60s+
- **Static data** (about, terms): no refresh

### Optimization Tips

1. **Use `keepPreviousData: true`** - Prevents flash during refresh
2. **Set `refreshWhenHidden: false`** - Saves battery/bandwidth
3. **Throttle focus refresh** - Prevents excessive requests
4. **Dedupe requests** - Prevents duplicate fetches
5. **ETag support** - 304 responses are cheaper than full payloads

---

## 🚀 Next Steps

### Phase 1: Infrastructure ✅ COMPLETE
- [x] SWR config and global setup
- [x] Reusable hooks (usePaged, useInfinite, useSearch)
- [x] Auto-refresh middleware
- [x] Documentation

### Phase 2: Page Refactoring 🚧 IN PROGRESS
- [ ] Refactor EnhancedUserDashboard
- [ ] Refactor BillingDashboard
- [ ] Refactor KYCDashboard
- [ ] Refactor EnhancedAdminDashboard
- [ ] Add search functionality

### Phase 3: Testing ⏳ PENDING
- [ ] Test all pages against acceptance criteria
- [ ] Verify no regressions
- [ ] Load testing with background refresh
- [ ] Mobile device testing

---

## 📚 Resources

- [SWR Documentation](https://swr.vercel.app/)
- [SWR Examples](https://swr.vercel.app/examples/basic)
- [useSWR API Reference](https://swr.vercel.app/docs/api)
- [useSWRInfinite](https://swr.vercel.app/docs/pagination#useswrinfinite)

---

**Last Updated:** 2025-10-03
**Status:** Infrastructure Complete, Ready for Page Refactoring
