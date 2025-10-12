// apps/backend/src/server/routes/healthz.ts
// Health check endpoints for monitoring

import { Router } from 'express';
import { MAIL_STATUS, ALLOWED } from '../../modules/forwarding/mailStatus';

const router = Router();

// Basic health check
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Status guard health check
router.get('/status-guard', (req, res) => {
  try {
    const gitSha = process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      
      // Feature flags
      flags: {
        STRICT_STATUS_GUARD: process.env.STRICT_STATUS_GUARD || '0',
        BFF_READS_ONLY: process.env.BFF_READS_ONLY || '0',
        PERF_OPTIMIZATIONS: process.env.PERF_OPTIMIZATIONS || '0'
      },
      
      // System info
      system: {
        gitSha,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      },
      
      // Status guard configuration
      statusGuard: {
        enabled: process.env.STRICT_STATUS_GUARD === '1',
        canonicalStatuses: Object.values(MAIL_STATUS),
        allowedTransitions: Object.fromEntries(
          Object.entries(ALLOWED).map(([from, to]) => [from, to])
        )
      },
      
      // BFF guard configuration
      bffGuard: {
        enabled: process.env.BFF_READS_ONLY === '1',
        blocksNonGet: process.env.BFF_READS_ONLY === '1'
      }
    };
    
    res.json(health);
  } catch (error) {
    console.error('[HEALTH] Status guard health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed metrics health check
router.get('/metrics', (req, res) => {
  try {
    const { metrics } = require('../../lib/metrics');
    const summary = metrics.getSummary();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      
      metrics: {
        totalStatusTransitions: (Object.values(summary.statusTransitions) as number[]).reduce((a, b) => a + b, 0),
        totalIllegalAttempts: (Object.values(summary.illegalTransitions) as number[]).reduce((a, b) => a + b, 0),
        totalApiErrors: (Object.values(summary.apiErrors) as number[]).reduce((a, b) => a + b, 0),
        
        // Breakdown by type
        statusTransitions: summary.statusTransitions,
        illegalTransitions: summary.illegalTransitions,
        apiErrors: summary.apiErrors
      },
      
      // Health indicators
      indicators: {
        hasRecentActivity: (Object.values(summary.statusTransitions) as number[]).some(count => count > 0),
        hasIllegalAttempts: (Object.values(summary.illegalTransitions) as number[]).some(count => count > 0),
        hasApiErrors: (Object.values(summary.apiErrors) as number[]).some(count => count > 0)
      }
    };
    
    res.json(health);
  } catch (error) {
    console.error('[HEALTH] Metrics health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Metrics health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness check (for Kubernetes)
router.get('/ready', (req, res) => {
  // Add any readiness checks here (database connectivity, etc.)
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

// Liveness check (for Kubernetes)
router.get('/live', (req, res) => {
  // Add any liveness checks here
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;
