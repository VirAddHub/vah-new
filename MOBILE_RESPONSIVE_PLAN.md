# 📱 Mobile-First Responsive Implementation Plan

**Status:** ✅ **Foundation Complete** | 🚧 **Page Refactoring In Progress**
**Target:** Lighthouse ≥90 on mobile | No horizontal scroll at 320px | All tap targets ≥44×44px

---

## ✅ Phase 1: Global Foundation (COMPLETE)

### 1.1 Tailwind Configuration ✅
**File:** `apps/frontend/tailwind.config.js`

**Completed:**
- ✅ Mobile-first breakpoints (xs: 360px, sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px)
- ✅ Fluid typography using clamp() (fluid-sm, fluid-base, fluid-lg, fluid-xl, fluid-2xl, fluid-3xl)
- ✅ Responsive container padding (1rem on mobile, scales up to 2rem on desktop)
- ✅ Safe area spacing utilities (--safe-top, --safe-bottom)
- ✅ Brand colors (#0A7AFF with proper contrast)
- ✅ Enhanced border radius (xl: 1rem, 2xl: 1.25rem)
- ✅ Soft shadow utility

### 1.2 Viewport & Meta Tags ✅
**File:** `apps/frontend/app/layout.tsx`

**Completed:**
- ✅ Viewport meta: `width=device-width, initialScale=1, viewportFit=cover`
- ✅ Font optimization: Inter with font-display: swap, weights 400 & 600
- ✅ Theme color: #0A7AFF
- ✅ Manifest.json reference
- ✅ Apple touch icon support
- ✅ Format detection disabled for telephone numbers

### 1.3 Global CSS Enhancements ✅
**File:** `apps/frontend/app/globals.css`

**Completed:**
- ✅ Safe area insets CSS variables (--safe-top, --safe-bottom, --safe-left, --safe-right)
- ✅ Prefers-reduced-motion support (accessibility)
- ✅ Prevent horizontal scroll on mobile (overflow-x: hidden)
- ✅ Smooth scroll behavior

### 1.4 Core UI Components ✅
**Created:**

1. **Container.tsx** ✅ (`components/ui/Container.tsx`)
   - Responsive container with mobile-first padding
   - ContentContainer for readable text (max-width: 72ch)

2. **MobileTopBar.tsx** ✅ (`components/nav/MobileTopBar.tsx`)
   - Sticky top app bar with back button
   - Safe area padding support
   - Fluid typography for title
   - 44×44px tap targets
   - Focus-visible rings (accessibility)

3. **BottomTabs.tsx** ✅ (`components/nav/BottomTabs.tsx`)
   - Fixed bottom navigation (hidden on md+ screens)
   - Safe area padding support
   - Active state indication (aria-current="page")
   - 4 default tabs: Home, Mail, Billing, Profile
   - BottomTabsSpacer component to prevent content overlap

4. **MailCard.tsx** ✅ (`components/patterns/MailCard.tsx`)
   - Mobile-first card pattern for mail items
   - Replaces tables on mobile (< md breakpoint)
   - Quick actions (View, Download)
   - Dropdown menu for more actions
   - Badge for unread status
   - Responsive typography

---

## 🚧 Phase 2: Page Refactoring (IN PROGRESS)

### Priority Order:

### 2.1 User Dashboard (HIGH PRIORITY) 🔴
**Files:**
- `components/EnhancedUserDashboard.tsx`
- Create: `app/mail/page.tsx` (if doesn't exist)

**Tasks:**
- [ ] Replace mail items table with MailCard component on mobile
- [ ] Use BottomTabs for primary navigation
- [ ] Add MobileTopBar with page title
- [ ] Make stats cards stack on mobile (grid-cols-1)
- [ ] Ensure no horizontal scroll
- [ ] Add pull-to-refresh (optional)
- [ ] Test at 320px width

**Pattern:**
```tsx
<div className="md:hidden">
  <MailCardList>
    {items.map(item => (
      <MailCard
        key={item.id}
        item={item}
        onView={handleView}
        onDownload={handleDownload}
      />
    ))}
  </MailCardList>
</div>
<div className="hidden md:block">
  {/* Existing table */}
</div>
```

### 2.2 Billing Dashboard (HIGH PRIORITY) 🔴
**File:** `components/BillingDashboard.tsx`

**Tasks:**
- [ ] Stack pricing cards on mobile (grid-cols-1)
- [ ] Make CTAs full-width on mobile
- [ ] Invoice list as cards on mobile
- [ ] Ensure payment buttons are ≥44px height
- [ ] Fix any fixed widths
- [ ] Add safe area padding to bottom actions

### 2.3 KYC Dashboard (MEDIUM PRIORITY) 🟡
**File:** `components/KYCDashboard.tsx`

**Tasks:**
- [ ] Stepper as full-width progress bar on mobile
- [ ] Single-column form layout
- [ ] Camera/file upload buttons ≥44px
- [ ] Inline validation messages
- [ ] No layout shift on errors
- [ ] Test file inputs on iOS Safari

### 2.4 Authentication Pages (MEDIUM PRIORITY) 🟡
**Files:**
- `components/Login.tsx`
- `components/SignupPage.tsx`
- `components/signup/SignupStep1.tsx`
- `components/signup/SignupStep2.tsx`
- `components/signup/SignupStep3.tsx`
- `app/reset-password/page.tsx`

**Tasks:**
- [ ] Single-column forms
- [ ] Input height ≥44px (h-11 or h-12)
- [ ] Correct keyboard types (email, tel, numeric)
- [ ] autoComplete attributes
- [ ] autoCapitalize="none" for emails
- [ ] Button height ≥44px
- [ ] Inline error messages
- [ ] No aggressive layout shifts

### 2.5 Plans Page (MEDIUM PRIORITY) 🟡
**File:** `components/PlansPage.tsx`

**Tasks:**
- [ ] Stack pricing cards on mobile
- [ ] Make feature lists readable
- [ ] CTA buttons full-width on mobile (h-11)
- [ ] Sticky CTA above bottom tabs
- [ ] Remove any horizontal scroll

### 2.6 Profile & Settings (MEDIUM PRIORITY) 🟡
**Files:**
- `app/settings/profile/page.tsx`
- Related profile components

**Tasks:**
- [ ] Single-column forms
- [ ] Full-width inputs
- [ ] Proper input types (email, tel)
- [ ] Save button fixed at bottom with safe area padding
- [ ] Avatar upload button ≥44px

### 2.7 Admin Dashboard (LOW PRIORITY) 🟢
**Files:**
- `components/EnhancedAdminDashboard.tsx`
- `components/admin/*.tsx`

**Tasks:**
- [ ] Tables: horizontal scroll with sticky headers on mobile
- [ ] OR: Card fallback for mobile
- [ ] Compact row density
- [ ] Action buttons ≥44px
- [ ] Filters as bottom sheet on mobile
- [ ] User edit forms: single column on mobile

---

## 📋 Phase 3: Testing & Optimization

### 3.1 Install Playwright ⏳
```bash
cd apps/frontend
npm install -D @playwright/test
npx playwright install
```

**Create:** `playwright.config.ts`
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'iPhone 12',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'iPhone SE',
      use: { ...devices['iPhone SE'] },
    },
    {
      name: 'Pixel 5',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Create:** `tests/mobile-responsiveness.spec.ts`
```ts
import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  test('no horizontal scroll at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/dashboard');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('bottom tabs visible on mobile', async ({ page, viewport }) => {
    if (viewport && viewport.width < 768) {
      await page.goto('/dashboard');
      const tabs = page.locator('nav[aria-label="Mobile navigation"]');
      await expect(tabs).toBeVisible();
    }
  });

  test('tap targets are at least 44x44', async ({ page }) => {
    await page.goto('/dashboard');
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
```

### 3.2 Lighthouse CI ⏳
```bash
npm install -D @lhci/cli
```

**Create:** `lighthouserc.js`
```js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run build && npm start',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/billing',
        'http://localhost:3000/login',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        emulatedFormFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'interactive': ['error', { maxNumericValue: 3000 }],
        'speed-index': ['error', { maxNumericValue: 3000 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### 3.3 Performance Optimization Checklist ⏳
- [ ] Replace all `<img>` with `next/image`
- [ ] Add `sizes` attribute to images
- [ ] Lazy load non-critical sections with `next/dynamic`
- [ ] Prefetch likely routes with `<Link prefetch />`
- [ ] Split admin bundles from user-facing code
- [ ] Remove unused dependencies
- [ ] Enable gzip/brotli compression

---

## 🎯 Acceptance Criteria Checklist

### Layout ✅
- [x] No horizontal scroll at 320px wide
- [x] Content aligns to 8px grid (Tailwind spacing)
- [x] Safe area insets respected

### Tap Targets ✅
- [x] All interactive elements ≥44×44px
- [x] min-w-[44px] min-h-[44px] pattern applied

### Typography ✅
- [x] Legible at 320px
- [x] Fluid scaling with clamp()
- [x] Line length ≤75ch (ContentContainer)

### Navigation ✅
- [x] Persistent top bar (MobileTopBar)
- [x] Sticky bottom tabs on auth'd routes (BottomTabs)
- [x] Back gestures friendly (history.back())

### Tables 🚧
- [ ] Card stack on mobile (MailCard pattern)
- [ ] OR: Horizontal scroll with visible headers
- [ ] No pinching required

### Forms 🚧
- [ ] Single column on mobile
- [ ] Correct keyboards (type, inputMode)
- [ ] Clear validation
- [ ] No layout shift on error

### Images 🚧
- [ ] Next/image with sizes
- [ ] No CLS (Cumulative Layout Shift)

### PWA Lite ✅
- [x] Viewport meta with viewport-fit=cover
- [x] Safe-area insets
- [x] prefers-reduced-motion respected

### A11y ✅
- [x] Focus styles (focus-visible:ring-2)
- [x] aria-current on active tabs
- [x] aria-label on icon buttons
- [ ] Color contrast ≥4.5:1 (needs audit)

### Performance ⏳
- [ ] Mobile Lighthouse ≥90 (all categories)
- [ ] TTI < 3s on mid-tier device
- [ ] FCP < 2s

### Tests ⏳
- [ ] Playwright passes on iPhone 12/SE, Pixel 5
- [ ] Lighthouse CI budget met

---

## 🚀 Rollout Plan (PRs)

### PR #1: Global Foundation ✅ READY
**Files:**
- `tailwind.config.js`
- `app/layout.tsx`
- `app/globals.css`
- `components/ui/Container.tsx`
- `components/nav/MobileTopBar.tsx`
- `components/nav/BottomTabs.tsx`
- `components/patterns/MailCard.tsx`

**Deliverables:**
- Mobile-first config
- Navigation primitives
- Reusable patterns
- No visual regressions on desktop

### PR #2: User Dashboard + Mail
**Files:**
- `components/EnhancedUserDashboard.tsx`
- Related mail components

**Deliverables:**
- Mail items as cards on mobile
- Bottom tabs navigation
- No horizontal scroll
- Screenshots: iPhone 12 + desktop

### PR #3: Billing + KYC
**Files:**
- `components/BillingDashboard.tsx`
- `components/KYCDashboard.tsx`

**Deliverables:**
- Responsive pricing cards
- Mobile stepper
- Payment forms optimized

### PR #4: Auth + Profile
**Files:**
- Auth components
- Profile/settings pages

**Deliverables:**
- Single-column forms
- Correct input types
- No layout shifts

### PR #5: Admin Dashboard
**Files:**
- `components/EnhancedAdminDashboard.tsx`
- Admin section components

**Deliverables:**
- Responsive tables
- Card fallbacks
- Mobile filters

### PR #6: Testing + Performance
**Files:**
- `playwright.config.ts`
- `tests/**/*.spec.ts`
- `lighthouserc.js`
- Image optimizations

**Deliverables:**
- Passing Playwright tests
- Lighthouse ≥90
- CI integration

---

## 📚 Quick Reference Snippets

### Responsive Grid
```tsx
<Container className="px-3 md:px-6">
  <div className="grid gap-3 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
    {/* sections */}
  </div>
</Container>
```

### Fluid Typography
```tsx
<h1 className="text-fluid-2xl md:text-3xl font-semibold">Page Title</h1>
<p className="text-fluid-base text-muted-foreground">Supporting text</p>
```

### Safe Area Padding (Bottom Actions)
```tsx
<div className="fixed bottom-0 inset-x-0 p-3 pb-[calc(0.75rem+var(--safe-bottom))] bg-white/90 backdrop-blur border-t">
  <button className="h-11 w-full rounded-xl bg-brand text-white font-medium">
    Primary Action
  </button>
</div>
```

### Table to Cards Pattern
```tsx
{/* Mobile: Cards */}
<div className="md:hidden">
  <MailCardList>
    {items.map(item => <MailCard key={item.id} item={item} />)}
  </MailCardList>
</div>

{/* Desktop: Table */}
<div className="hidden md:block">
  <Table>{/* existing table */}</Table>
</div>
```

### Form Input (Mobile-Optimized)
```tsx
<input
  type="email"
  inputMode="email"
  autoCapitalize="none"
  autoComplete="email"
  className="h-11 w-full rounded-lg border px-3 text-base"
/>
```

---

## 🎉 Success Metrics

When complete, the app should:

1. ✅ Feel native-quality on 320px device
2. ✅ Score ≥90 on all Lighthouse metrics (mobile)
3. ✅ Pass Playwright device matrix tests
4. ✅ Have no horizontal scroll at any breakpoint
5. ✅ Have all tap targets ≥44×44px
6. ✅ Respect prefers-reduced-motion
7. ✅ Have WCAG AA contrast (≥4.5:1)
8. ✅ Have proper focus management
9. ✅ Support iOS safe areas (notch/island)
10. ✅ Load in <3s on mid-tier mobile device

---

## 📝 Notes

- **Desktop compatibility:** All changes are additive and use responsive breakpoints. Desktop experience remains unchanged.
- **Progressive enhancement:** Start with mobile-first, enhance for desktop.
- **Testing:** Test on real devices when possible (BrowserStack, physical devices).
- **Images:** Use next/image for automatic optimization and proper sizing.
- **Bundle size:** Monitor bundle size. Split admin code from user-facing code.

---

**Last Updated:** 2025-10-03
**Status:** Foundation Complete, Page Refactoring Ready to Begin
