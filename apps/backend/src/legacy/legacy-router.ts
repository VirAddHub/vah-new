/**
 * Legacy Router
 * 
 * Provides backward compatibility for deprecated endpoints by redirecting
 * them to their canonical counterparts with proper middleware handling.
 */

import express from 'express';
import { legacyAliasMap, legacyAdapter, legacyCsrfBypass } from './adapters';

const router = express.Router();

// Apply legacy adapter middleware to all routes
router.use(legacyAdapter);

// Apply CSRF bypass for legacy endpoints
router.use(legacyCsrfBypass);

// Register all deprecated endpoints as catch-all handlers
Object.entries(legacyAliasMap).forEach(([path, alias]) => {
  if (alias.status === 'deprecated' && alias.aliasOf) {
    // Register for all HTTP methods
    ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].forEach(method => {
      (router as any)[method.toLowerCase()](path, (req: any, res: any, next: any) => {
        // The legacyAdapter middleware already handled the path rewriting
        // Just pass through to the next handler
        next();
      });
    });
  }
});

// Health check for legacy router
router.get('/legacy/health', (req, res) => {
  res.json({
    ok: true,
    service: 'legacy-router',
    deprecatedEndpoints: Object.keys(legacyAliasMap).filter(path => 
      legacyAliasMap[path as keyof typeof legacyAliasMap].status === 'deprecated'
    ).length,
    canonicalEndpoints: Object.keys(legacyAliasMap).filter(path => 
      legacyAliasMap[path as keyof typeof legacyAliasMap].status === 'canonical'
    ).length
  });
});

export default router;
