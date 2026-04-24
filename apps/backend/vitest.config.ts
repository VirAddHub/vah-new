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
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
    },
    setupFiles: ['./src/tests/setup.ts'],
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
