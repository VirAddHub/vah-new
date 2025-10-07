// apps/backend/src/routes/admin.ts
import express from 'express';
import { requireAdmin } from '../middleware/require-admin';
import { adminListForwarding, adminUpdateForwarding } from '../modules/forwarding/forwarding.admin.controller';

export const adminRouter = express.Router();

// Apply admin auth to all routes
adminRouter.use(requireAdmin);

// GET /api/admin/forwarding/requests?status=Requested&q=...&limit=50&offset=0
adminRouter.get('/forwarding/requests', adminListForwarding);

// PATCH /api/admin/forwarding/requests/:id  { action, courier?, tracking_number?, admin_notes? }
adminRouter.patch('/forwarding/requests/:id', adminUpdateForwarding);
