// apps/backend/src/server/routes/debug-forwarding-status.ts
// Debug endpoint to check forwarding request statuses

import { Router } from 'express';
import { getPool } from '../db';

const router = Router();

// Debug endpoint to check forwarding request statuses
router.get('/debug/forwarding-statuses', async (req, res) => {
  try {
    const pool = getPool();
    
    // Get all unique statuses from forwarding_request table
    const statusQuery = await pool.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM forwarding_request 
      GROUP BY status 
      ORDER BY count DESC
    `);
    
    // Get recent forwarding requests with their statuses
    const recentQuery = await pool.query(`
      SELECT id, status, created_at, updated_at
      FROM forwarding_request 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    res.json({
      ok: true,
      data: {
        uniqueStatuses: statusQuery.rows,
        recentRequests: recentQuery.rows,
        canonicalStatuses: {
          Requested: "Requested",
          Processing: "Processing", 
          Dispatched: "Dispatched",
          Delivered: "Delivered"
        }
      }
    });
  } catch (error) {
    console.error('[DEBUG] Error checking forwarding statuses:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to check forwarding statuses',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
