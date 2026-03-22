// src/server/routes/metrics.ts
// Metrics endpoint for observability

import { Router, Request, Response } from 'express';
import { exportMetrics, metrics } from '../../lib/metrics';

const router = Router();

function basicAuthOk(req: Request): boolean {
  const user = process.env.METRICS_USER || '';
  const pass = process.env.METRICS_PASS || '';
  
  // Allow in dev if credentials are not configured
  if (!user || !pass) {
    return process.env.NODE_ENV !== 'production';
  }
  
  const hdr = req.headers.authorization || '';
  if (!hdr.startsWith('Basic ')) return false;
  
  try {
    const [u, p] = Buffer.from(hdr.slice(6), 'base64').toString('utf8').split(':');
    return u === user && p === pass;
  } catch {
    return false;
  }
}

function ipAllowed(req: Request): boolean {
  const allowedIpsStr = process.env.METRICS_ALLOWED_IPS || '';
  const allow = allowedIpsStr.split(',').map(s => s.trim()).filter(Boolean);
  
  if (!allow.length) return true;
  
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  
  const ip = (forwardedIp || req.ip || '').toString().split(',')[0].trim();
  return allow.includes(ip);
}

// Global guard for all metrics routes
router.use((req: Request, res: Response, next) => {
  if (!basicAuthOk(req) || !ipAllowed(req)) {
    return res.status(401).send('unauthorized');
  }
  next();
});

// Original JS endpoint mounted at GET /api/metrics/
router.get('/', (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.end(exportMetrics());
  } catch (error) {
    console.error('[METRICS] Failed to export metrics:', error);
    res.status(500).json({ error: 'Failed to export metrics' });
  }
});

// JSON metrics endpoint for debugging
router.get('/json', (_req: Request, res: Response) => {
  try {
    const summary = metrics.getSummary();
    res.json(summary);
  } catch (error) {
    console.error('[METRICS] Failed to get metrics summary:', error);
    res.status(500).json({ error: 'Failed to get metrics summary' });
  }
});

export default router;
