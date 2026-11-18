import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Unit tests for the website (pure functions and source checks). Browser flows are covered by the
// backend journey suites and the screenshot checks; tests/*.spec.ts are Playwright specs (not run here).
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/**/*.test.ts', 'lib/**/*.test.ts'],
  },
});
