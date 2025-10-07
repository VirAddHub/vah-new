// apps/backend/src/config/env.ts
import 'dotenv/config';

export const APP_BASE_URL =
  process.env.APP_BASE_URL?.trim() ||
  process.env.APP_URL?.trim() ||
  'http://localhost:3000';

export const POSTMARK_WEBHOOK_SECRET = process.env.POSTMARK_WEBHOOK_SECRET || '';
export const POSTMARK_TOKEN = process.env.POSTMARK_TOKEN || '';

export const PORT = Number(process.env.PORT || 3001);
export const HOST = process.env.HOST || '0.0.0.0';

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  INTERNAL_CRON_TOKEN: process.env.INTERNAL_CRON_TOKEN || '',
};
