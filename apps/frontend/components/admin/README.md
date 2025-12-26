# Admin Dashboard Monitoring Features

This document outlines the functionality of the monitoring bundles and vitals sections found under the "Monitoring" navbar in the Enhanced Admin Dashboard.

## 1. System Health (Overview)
**Status:** ✅ Real Data  
**Location:** `OverviewSection` in `EnhancedAdminDashboard.tsx`

This is the default view. It aggregates data from multiple real backend endpoints:
- **Metrics**: Total Users, Active Users, Pending KYC, Suspended Users.
- **Revenue**: Monthly revenue calculated from billing metrics.
- **Mail & Forwarding**: Counts of processed mail and active forwarding requests.
- **System Status**: Checks `/api/healthz` for operational status.

## 2. Web Vitals
**Status:** ⚠️ Partially Real / Local Storage  
**Location:** `web-vitals` route -> `WebVitalsSection.tsx`

**What it does:**
- Designed to track Core Web Vitals (Google's performance metrics):
  - **LCP** (Largest Contentful Paint): Loading speed.
  - **FID** (First Input Delay): Interactivity.
  - **CLS** (Cumulative Layout Shift): Visual stability.
- **How it works**:
  - It attempts to read metrics from the browser's `localStorage` (keys like `web-vitals-CLS`).
  - **Note**: This is currently a client-side implementation. In a full production environment, these metrics are typically aggregated on a server. If you haven't visited the site and triggered these metrics locally, this section might be empty or show placeholder data.

## 3. Bundle Analysis
**Status:** 🚧 Mock Data (Simulated)  
**Location:** `bundle-analysis` route -> `BundleAnalysisSection.tsx`

**What it does:**
- Intended to visualize the size of the application's JavaScript bundles to prevent performance bloat.
- **Current Behavior**:
  - The data usually displayed (Main Bundle: 450KB, Vendor Bundle: 600KB, etc.) is **hardcoded mock data**.
  - It effectively demonstrates *how* the UI would look if connected to a real build-time analysis tool (like `@next/bundle-analyzer`), but it does not reflect the live application's actual bundle sizes.

## 4. Service Monitoring
**Status:** ✅ Real Data  
**Location:** `service-monitoring` route -> `ServiceMonitoring.tsx`

**What it does:**
- Checks the health and connectivity of external 3rd-party services critical to VAH.
- **Services Monitored**:
  - **GoCardless**: Checks payment processing status.
  - **Sumsub**: Checks KYC verification service status.
  - **Postmark**: Checks email delivery service status.
  - **OneDrive**: Checks file storage status.
- **Mechanism**: Calls internal API endpoints (e.g., `/api/admin/service-status/gocardless`) which perform the actual health checks.

### Sub-component: Forwarding Health
**Status:** ✅ Real Data  
**Location:** `ForwardingHealthCard.tsx` (embedded in Service Monitoring)

- **Advanced Metrics**:
  - Connects to Prometheus/Metrics endpoint (`/api/bff/metrics`).
  - **KPIs**: Tracks total transitions, illegal state attempts, and 5xx errors in real-time.
  - **SLA Tracking**: Visualizes percentage of forwarding requests meeting the 2-hour Service Level Agreement.
  - **Latency**: Shows p95 latency for different stages of the forwarding process (Requested → Processing → Dispatched).
  - **Webhook Freshness**: Monitors when the last webhooks were received from providers.
