import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: 'tests',
    testMatch: '**/*.spec.ts',
    timeout: 30_000,
    retries: 0,
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        trace: 'on-first-retry',
    },
});
