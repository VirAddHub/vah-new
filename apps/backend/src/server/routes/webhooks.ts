import { Router } from 'express';
import { handleGcWebhook } from '../../webhooks/gocardless';

const router = Router();

// IMPORTANT: ensure raw body parsing for signature verification in your server before JSON parser or with a dedicated route setup.
router.post('/api/webhooks/gocardless', handleGcWebhook);

export default router;
