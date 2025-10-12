/**
 * Web Vitals Reporting
 * Reports Core Web Vitals metrics for performance monitoring
 */

export interface WebVitalsMetric {
  id: string;
  name: string;
  value: number;
  delta: number;
  entries: PerformanceEntry[];
  navigationType: string;
}

export interface WebVitalsReport {
  metric: WebVitalsMetric;
  url: string;
  timestamp: number;
  userAgent: string;
  connection?: string;
  deviceMemory?: number;
}

// Performance thresholds
const THRESHOLDS = {
  CLS: 0.1,      // Good: <0.1, Needs Improvement: 0.1-0.25, Poor: >0.25
  FID: 100,       // Good: <100ms, Needs Improvement: 100-300ms, Poor: >300ms
  FCP: 1800,      // Good: <1.8s, Needs Improvement: 1.8-3s, Poor: >3s
  LCP: 2500,      // Good: <2.5s, Needs Improvement: 2.5-4s, Poor: >4s
  TTFB: 800,      // Good: <800ms, Needs Improvement: 800-1800ms, Poor: >1800ms
  INP: 200,       // Good: <200ms, Needs Improvement: 200-500ms, Poor: >500ms
};

function getPerformanceRating(value: number, threshold: number): 'good' | 'needs-improvement' | 'poor' {
  if (value <= threshold) return 'good';
  if (value <= threshold * 1.5) return 'needs-improvement';
  return 'poor';
}

function formatMetricValue(name: string, value: number): string {
  switch (name) {
    case 'CLS':
      return value.toFixed(3);
    case 'FID':
    case 'FCP':
    case 'LCP':
    case 'TTFB':
    case 'INP':
      return `${Math.round(value)}ms`;
    default:
      return value.toString();
  }
}

function getConnectionInfo(): string {
  if ('connection' in navigator) {
    const conn = (navigator as any).connection;
    return `${conn.effectiveType || 'unknown'} (${conn.downlink || 'unknown'}Mbps)`;
  }
  return 'unknown';
}

function getDeviceMemory(): number | undefined {
  if ('deviceMemory' in navigator) {
    return (navigator as any).deviceMemory;
  }
  return undefined;
}

async function sendToAnalytics(report: WebVitalsReport): Promise<void> {
  try {
    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Web Vitals Report:', report);
      return;
    }

    // In production, send to analytics endpoint
    const response = await fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
    });

    if (!response.ok) {
      console.warn('Failed to send web vitals report:', response.status);
    }
  } catch (error) {
    console.warn('Error sending web vitals report:', error);
  }
}

export function reportWebVitals(metric: WebVitalsMetric): void {
  const report: WebVitalsReport = {
    metric,
    url: window.location.href,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    connection: getConnectionInfo(),
    deviceMemory: getDeviceMemory(),
  };

  // Get performance rating
  const threshold = THRESHOLDS[metric.name as keyof typeof THRESHOLDS];
  const rating = threshold ? getPerformanceRating(metric.value, threshold) : 'unknown';

  // Enhanced logging for development
  if (process.env.NODE_ENV === 'development') {
    const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(`${emoji} ${metric.name}: ${formatMetricValue(metric.name, metric.value)} (${rating})`);
    
    if (rating !== 'good' && threshold) {
      console.log(`   Threshold: ${formatMetricValue(metric.name, threshold)}`);
      console.log(`   Improvement needed: ${formatMetricValue(metric.name, metric.value - threshold)}`);
    }
  }

  // Send to analytics
  sendToAnalytics(report);

  // Track in localStorage for debugging
  try {
    const key = `web-vitals-${metric.name}`;
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    history.push({
      value: metric.value,
      rating,
      timestamp: Date.now(),
    });
    
    // Keep only last 10 measurements
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
    
    localStorage.setItem(key, JSON.stringify(history));
  } catch (error) {
    // Ignore localStorage errors
  }
}

// Initialize web vitals monitoring
export function initWebVitals(): void {
  if (typeof window === 'undefined') return;

  // Import web-vitals library dynamically
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB, getINP }) => {
    getCLS(reportWebVitals);
    getFID(reportWebVitals);
    getFCP(reportWebVitals);
    getLCP(reportWebVitals);
    getTTFB(reportWebVitals);
    
    // INP is newer, check if available
    if (getINP) {
      getINP(reportWebVitals);
    }
  }).catch((error) => {
    console.warn('Failed to load web-vitals library:', error);
  });
}

// Export for manual initialization
export default reportWebVitals;
