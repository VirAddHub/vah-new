// src/server/routes/admin-forwarding.ts
// Admin forwarding request management endpoints

import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../middleware/require-admin';
import { adminListForwarding, adminUpdateForwarding } from '../../modules/forwarding/forwarding.admin.controller';

const router = Router();

// Apply admin auth to all routes
router.use(requireAdmin);

// GET /api/admin/forwarding/requests?status=Requested&q=...&limit=50&offset=0
router.get('/forwarding/requests', (req, res, next) => {
    console.log('[admin-forwarding] GET /forwarding/requests called');
    console.log('[admin-forwarding] User:', req.user);
    next();
}, adminListForwarding);

// PATCH /api/admin/forwarding/requests/:id  { action, courier?, tracking_number?, admin_notes? }
router.patch('/forwarding/requests/:id', adminUpdateForwarding);

export default router;