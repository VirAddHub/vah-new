'use client';

import { useEffect } from 'react';

// Core Web Vitals monitoring and optimization
export function CoreWebVitalsOptimizer() {
  useEffect(() => {
    // Preload critical resources
    const preloadCriticalResources = () => {
      // Preload critical fonts
      const fontLink = document.createElement('link');
      fontLink.rel = 'preload';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap';
      fontLink.as = 'style';
      document.head.appendChild(fontLink);

      // Preload critical images
      const criticalImages = [
        '/images/hero-bg.webp',
        '/images/logo.png',
        '/images/og-image.jpg'
      ];

      criticalImages.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = src;
        link.as = 'image';
        document.head.appendChild(link);
      });
    };

    // Optimize images
    const optimizeImages = () => {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        // Add loading="lazy" to non-critical images
        if (!img.hasAttribute('loading')) {
          img.setAttribute('loading', 'lazy');
        }
        
        // Add decoding="async"
        if (!img.hasAttribute('decoding')) {
          img.setAttribute('decoding', 'async');
        }
      });
    };

    // Optimize fonts
    const optimizeFonts = () => {
      // Add font-display: swap to all font faces
      const style = document.createElement('style');
      style.textContent = `
        @font-face {
          font-family: 'Inter';
          font-display: swap;
        }
      `;
      document.head.appendChild(style);
    };

    // Defer non-critical JavaScript
    const deferNonCriticalJS = () => {
      const scripts = document.querySelectorAll('script[src]');
      scripts.forEach(script => {
        if (!script.hasAttribute('defer') && !script.hasAttribute('async')) {
          script.setAttribute('defer', '');
        }
      });
    };

    // Initialize optimizations
    preloadCriticalResources();
    optimizeImages();
    optimizeFonts();
    deferNonCriticalJS();

    // Monitor Core Web Vitals
    if (typeof window !== 'undefined' && 'web-vital' in window) {
      import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
        onCLS(console.log);
        onFCP(console.log);
        onLCP(console.log);
        onTTFB(console.log);
        onINP(console.log);
      });
    }
  }, []);

  return null;
}

// Performance monitoring hook
export function usePerformanceMonitoring() {
  useEffect(() => {
    // Monitor page load performance
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          console.log('Page Load Performance:', {
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
            firstByte: navEntry.responseStart - navEntry.requestStart
          });
        }
      }
    });

    observer.observe({ entryTypes: ['navigation'] });

    return () => observer.disconnect();
  }, []);
}

// Resource hints for better performance
export function ResourceHints() {
  useEffect(() => {
    // DNS prefetch for external domains
    const dnsPrefetchDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://api.virtualaddresshub.com'
    ];

    dnsPrefetchDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });

    // Preconnect to critical domains
    const preconnectDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ];

    preconnectDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }, []);

  return null;
}

// Critical CSS inliner
export function CriticalCSS() {
  useEffect(() => {
    const criticalCSS = `
      /* Critical above-the-fold styles */
      .hero-section {
        background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .hero-title {
        font-size: clamp(2rem, 5vw, 4rem);
        font-weight: 800;
        line-height: 1.1;
        color: white;
        text-align: center;
        margin-bottom: 1.5rem;
      }
      
      .hero-subtitle {
        font-size: 1.25rem;
        color: rgba(255, 255, 255, 0.9);
        text-align: center;
        margin-bottom: 2rem;
        max-width: 600px;
      }
      
      .btn-primary {
        background: white;
        color: hsl(var(--primary));
        padding: 1rem 2rem;
        border-radius: 0.75rem;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      }
    `;

    const style = document.createElement('style');
    style.textContent = criticalCSS;
    style.setAttribute('data-critical', 'true');
    document.head.insertBefore(style, document.head.firstChild);
  }, []);

  return null;
}
