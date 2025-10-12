// apps/backend/src/server/routes/metrics.ts
// Metrics endpoint for observability

import { Router } from 'express';
import { exportMetrics } from '../../lib/metrics';

const router = Router();

// Prometheus-style metrics endpoint
router.get('/metrics', (req, res) => {
  try {
    const metricsData = exportMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metricsData);
  } catch (error) {
    console.error('[METRICS] Failed to export metrics:', error);
    res.status(500).json({ error: 'Failed to export metrics' });
  }
});

// JSON metrics endpoint for debugging
router.get('/metrics/json', (req, res) => {
  try {
    const { metrics } = require('../../lib/metrics');
    const summary = metrics.getSummary();
    res.json(summary);
  } catch (error) {
    console.error('[METRICS] Failed to get metrics summary:', error);
    res.status(500).json({ error: 'Failed to get metrics summary' });
  }
});

export default router;
