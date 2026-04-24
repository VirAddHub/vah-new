import { beforeAll, afterAll } from 'vitest';

// Set env vars at module load time (before any imports that need them)
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DISABLE_RATE_LIMIT = '1';

beforeAll(async () => {
  // Additional setup if needed
});
afterAll(async () => {
  // global teardown
});
