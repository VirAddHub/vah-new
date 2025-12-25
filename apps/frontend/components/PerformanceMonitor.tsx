'use client';

import { useEffect } from 'react';
import type { Metric } from 'web-vitals';
import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';

export function PerformanceMonitor() {
  useEffect(() => {
    // Monitor Core Web Vitals
    onCLS((metric: Metric) => {
      console.log('CLS:', metric);
      // Send to analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Performance',
          event_label: 'CLS',
          value: Math.round(metric.value * 1000),
        });
      }
    });

    onFCP((metric: Metric) => {
      console.log('FCP:', metric);
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Performance',
          event_label: 'FCP',
          value: Math.round(metric.value),
        });
      }
    });

    onLCP((metric: Metric) => {
      console.log('LCP:', metric);
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Performance',
          event_label: 'LCP',
          value: Math.round(metric.value),
        });
      }
    });

    onTTFB((metric: Metric) => {
      console.log('TTFB:', metric);
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Performance',
          event_label: 'TTFB',
          value: Math.round(metric.value),
        });
      }
    });

    // INP (replaces FID)
    onINP((metric: Metric) => {
      console.log('INP:', metric);
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Performance',
          event_label: 'INP',
          value: Math.round(metric.value),
        });
      }
    });

    // Monitor resource loading
    if (typeof window !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            console.log('Navigation timing:', entry);
          } else if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            if (resource.duration > 1000) { // Log slow resources
              console.warn('Slow resource:', resource.name, resource.duration);
            }
          }
        }
      });

      observer.observe({ entryTypes: ['navigation', 'resource'] });

      return () => observer.disconnect();
    }
  }, []);

  return null;
}
