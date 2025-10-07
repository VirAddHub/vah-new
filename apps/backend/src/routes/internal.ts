// apps/backend/src/routes/internal.ts
// Internal routes for admin-driven forwarding system
// No cron/outbox system needed - everything is admin-managed

import express from 'express';

export const internalRouter = express.Router();

// Placeholder for future internal endpoints if needed
// All forwarding is now admin-managed through /api/admin/forwarding
