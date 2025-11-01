# Migration Status — Legacy API Imports

Generated: $(date -u +"%Y-%m-%d %H:%M UTC")

## Summary

This document tracks the migration from legacy API clients to the unified `@/lib/http` client.

**Status**: In Progress  
**Files remaining**: ~14 files still use legacy imports  
**Target**: All components migrated to `@/lib/http`

## Files still using legacy imports

The following files still import from deprecated API clients:

### High Priority (User-facing)

1. `components/HomePage.tsx` - Uses legacy client
2. `components/PlansPage.tsx` - Uses legacy client
3. `components/BillingDashboard.tsx` - Uses legacy client
4. `components/KYCDashboard.tsx` - Uses legacy client
5. `components/Login.tsx` - Uses legacy client

### Admin Components

6. `components/EnhancedAdminDashboard.tsx` - Uses legacy client
7. `components/admin/ForwardingSection.tsx` - Uses legacy client
8. `components/admin/CollaborativeForwardingBoard.tsx` - Uses legacy client

### Pages & Routes

9. `app/settings/profile/page.tsx` - Uses legacy client
10. `app/dashboard/DashboardClient.tsx` - Uses legacy client
11. `app/admin/dashboard/page.tsx` - Uses legacy client
12. `app/forwarding/page.tsx` - Uses legacy client

### Utilities

13. `lib/services/http.ts` - Uses legacy client
14. `lib/forwardingActions.ts` - Uses legacy client

## Files with localStorage token reads

These files still read tokens directly from localStorage (security risk):

1. `lib/apiDirect.ts` - Direct token read (deprecated file)
2. `components/EnhancedAdminDashboard.tsx`
3. `components/ui/AddressFinder.tsx`
4. `lib/services/http.ts`
5. `lib/forwardingActions.ts`
6. `hooks/usePDFPreloader.ts`
7. `components/admin/ForwardingSection.tsx`
8. `components/admin/CollaborativeForwardingBoard.tsx`
9. `components/PDFViewerModal.tsx`
10. `app/dashboard/DashboardClient.tsx`
11. `app/admin/dashboard/page.tsx`
12. `app/forwarding/page.tsx`

## Migration Checklist

- [x] Create unified API client (`lib/http.ts`)
- [x] Add ESLint warnings for deprecated imports
- [x] Add dev-only console warnings to deprecated files
- [x] Add JSDoc `@deprecated` tags
- [x] Create unit tests for new client
- [x] Add barrel exports (`lib/index.ts`)
- [ ] Migrate high-priority user-facing components
- [ ] Migrate admin components
- [ ] Remove all localStorage token reads
- [ ] Delete deprecated files

## Next Steps

1. **Start with user-facing pages**: HomePage, PlansPage, Login
2. **Then admin components**: EnhancedAdminDashboard, ForwardingSection
3. **Finally utilities**: forwardingActions, services/http

## Migration Pattern

```typescript
// OLD
import { apiClient } from '@/lib/apiClient';
const res = await apiClient.get('/endpoint');
if (isOk(res)) { /* ... */ }

// NEW
import api from '@/lib/http';
const res = await api.get('/endpoint');
if (res.ok) { /* use res.data */ }
```

## Notes

- All deprecation warnings only appear in development mode
- ESLint warnings help developers identify deprecated imports
- Old files remain functional until all usages are migrated
- No breaking changes - gradual migration is safe

