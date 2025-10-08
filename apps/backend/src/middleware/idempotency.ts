// src/middleware/idempotency.ts
// Idempotency key middleware for preventing duplicate operations

import { Request, Response, NextFunction } from 'express';
import { getPool } from '../server/db';

// In-memory store for idempotency keys (in production, use Redis)
const idempotencyStore = new Map<string, { result: any; timestamp: number }>();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only apply to POST/PUT/PATCH requests
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] as string;
  if (!idempotencyKey) {
    return next();
  }

  const user = (req as any).user;
  const userId = user?.id ?? 'anon';
  const key = `${userId}:${idempotencyKey}`;

  // Check if we've seen this key before
  const existing = idempotencyStore.get(key);
  if (existing) {
    const age = Date.now() - existing.timestamp;
    if (age < IDEMPOTENCY_TTL) {
      // Return cached result
      return res.status(existing.result.status || 200).json(existing.result.data);
    } else {
      // Expired, remove it
      idempotencyStore.delete(key);
    }
  }

  // Store the original res.json to intercept the response
  const originalJson = res.json;
  res.json = function(data: any) {
    // Store the result for future requests
    idempotencyStore.set(key, {
      result: { status: res.statusCode, data },
      timestamp: Date.now()
    });

    // Clean up old entries periodically
    if (idempotencyStore.size > 1000) {
      const now = Date.now();
      for (const [k, v] of idempotencyStore.entries()) {
        if (now - v.timestamp > IDEMPOTENCY_TTL) {
          idempotencyStore.delete(k);
        }
      }
    }

    return originalJson.call(this, data);
  };

  next();
}
