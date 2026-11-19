import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret',
      DISABLE_RATE_LIMIT: '1',
      DB_CLIENT: 'pg',
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5433/vah_unit_test',
    },
    globalSetup: ['./src/tests/globalSetup.ts'],
    setupFiles: ['./src/tests/setup.ts'],
    // One database for all files: run test files one at a time so they cannot interfere.
    fileParallelism: false,
    exclude: [
      '**/node_modules/**',
      '**/coalescing.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/node_modules/**', '**/tests/**'],
    },
    testTimeout: 10000,
  },
});
