import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  esbuild: { jsx: 'automatic' },
  test: { environment: 'jsdom', globals: true, include: ['tests/audit-log.test.tsx', 'tests/pricing.test.tsx'] },
});
