// apps/backend/src/server/routes/ops-selftest.ts
import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth";
import axios from "axios";
import { metrics } from "../../lib/metrics";
import { logger } from "../../lib/logger";

const router = Router();

// ---- Feature flags / guard ----
const ENABLED = process.env.OPS_SELFTEST_ENABLED === "1";
const SECRET = process.env.SELFTEST_SECRET || "";

// ---- Self-test metrics (using existing metrics collector) ----
let selfTestMetrics = {
  totalRuns: 0,
  successfulRuns: 0,
  failedRuns: 0,
  lastRunTimestamp: 0,
  lastRunSuccess: false
};

let scheduler: NodeJS.Timeout | null = null;

export function stopSelfTestScheduler() {
  if (scheduler) {
    clearInterval(scheduler);
    scheduler = null;
    logger.info("[SELFTEST] Scheduler stopped");
  }
}

// ---- Utilities ----
function ok<T>(res: Response, data: T) {
  return res.json({ ok: true, data });
}

function bad(res: Response, status: number, error: string, details?: any) {
  return res.status(status).json({ ok: false, error, details });
}

async function sleep(ms: number) { 
  return new Promise(r => setTimeout(r, ms)); 
}

// ---- Core self-test steps (non-destructive) ----
async function simulateStatusPipeline() {
  // Simulate normal flow by incrementing metrics via existing helpers
  metrics.recordStatusTransition("Requested", "Processing");
  await sleep(50);
  metrics.recordStatusTransition("Processing", "Dispatched");
  await sleep(50);
  metrics.recordStatusTransition("Dispatched", "Delivered");
  return { pipeline: "ok" };
}

async function simulateIllegalAttempt() {
  // Intentionally record an illegal attempt (doesn't change DB)
  metrics.recordIllegalTransition("Requested", "Delivered");
  return { illegal: "recorded" };
}

async function simulateWebhookFreshness() {
  // "Touch" webhook freshness by calling health endpoint
  try {
    const healthUrl = process.env.SELFTEST_HEALTH_URL || "http://127.0.0.1:4000/api/healthz";
    await axios.get(healthUrl, { timeout: 2000 });
    return { webhooks: "pinged", status: "healthy" };
  } catch (error) {
    // Record a soft 5xx metric so we can see the failure surface
    metrics.recordApiError("/api/healthz", 502);
    return { webhooks: "pinged", status: "degraded", error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function runSelfTest() {
  const results: Record<string, any> = {};
  
  try {
    results.pipeline = await simulateStatusPipeline();
    results.illegal = await simulateIllegalAttempt();
    results.webhooks = await simulateWebhookFreshness();
    
    // Update metrics
    selfTestMetrics.totalRuns++;
    selfTestMetrics.successfulRuns++;
    selfTestMetrics.lastRunTimestamp = Date.now();
    selfTestMetrics.lastRunSuccess = true;
    
    return results;
  } catch (error) {
    // Update metrics
    selfTestMetrics.totalRuns++;
    selfTestMetrics.failedRuns++;
    selfTestMetrics.lastRunTimestamp = Date.now();
    selfTestMetrics.lastRunSuccess = false;
    
    throw error;
  }
}

// ---- Routes ----

// JSON heartbeat (cheap)
router.get("/ops/heartbeat", requireAuth, (req: Request, res: Response) => {
  if (!ENABLED) return bad(res, 403, "Self-test disabled");
  
  return ok(res, {
    service: "ops",
    selftest_enabled: ENABLED,
    now: Date.now(),
    metrics: selfTestMetrics
  });
});

// Manual run (admin + optional secret)
router.post("/ops/self-test", requireAuth, async (req: Request, res: Response) => {
  if (!ENABLED) return bad(res, 403, "Self-test disabled");
  
  if (SECRET && req.headers["x-selftest-secret"] !== SECRET) {
    return bad(res, 401, "Invalid self-test secret");
  }

  const started = Date.now();
  try {
    const results = await runSelfTest();
    const durationMs = Date.now() - started;

    return ok(res, { 
      results, 
      durationMs,
      metrics: selfTestMetrics
    });
  } catch (e: any) {
    return bad(res, 500, "Self-test failed", { 
      message: e?.message || String(e),
      metrics: selfTestMetrics
    });
  }
});

// Get self-test status
router.get("/ops/self-test/status", requireAuth, (req: Request, res: Response) => {
  return ok(res, {
    enabled: ENABLED,
    metrics: selfTestMetrics,
    lastRun: selfTestMetrics.lastRunTimestamp ? new Date(selfTestMetrics.lastRunTimestamp).toISOString() : null,
    successRate: selfTestMetrics.totalRuns > 0 ? (selfTestMetrics.successfulRuns / selfTestMetrics.totalRuns * 100).toFixed(1) + '%' : 'N/A'
  });
});

// Simple scheduler (every 15 min) if enabled
if (ENABLED && process.env.SELFTEST_INTERVAL_MIN) {
  const min = Math.max(5, parseInt(process.env.SELFTEST_INTERVAL_MIN, 10) || 15);
  
  logger.info("[SELFTEST] Starting scheduled self-tests", { everyMinutes: min });
  
  // Guard against duplicate intervals (dev reload / double import)
  if (!scheduler) {
    scheduler = setInterval(async () => {
    try {
      await runSelfTest();
        logger.debug("[SELFTEST] Scheduled run completed successfully");
    } catch (error) {
        logger.warn("[SELFTEST] Scheduled run failed", { message: error instanceof Error ? error.message : String(error) });
    }
    }, min * 60 * 1000);
  }
}

export default router;
