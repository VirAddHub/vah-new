// app/lib/env.ts
// Environment configuration for frontend - synced from backend

import { z } from 'zod';

const Base = z.object({
    NODE_ENV: z.enum(['production', 'development', 'test']).default('development'),
    NEXT_PUBLIC_APP_ORIGIN: z.string().url().optional(),
    NEXT_PUBLIC_API_BASE: z.string().url().optional(),
    NEXT_PUBLIC_COMPANIES_HOUSE_API_KEY: z.string().optional(),
    NEXT_PUBLIC_ADDRESS_API_KEY: z.string().optional(),
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z.string().optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

const DevRelaxed = Base.partial({
    NEXT_PUBLIC_COMPANIES_HOUSE_API_KEY: true,
    NEXT_PUBLIC_ADDRESS_API_KEY: true,
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: true,
    NEXT_PUBLIC_SENTRY_DSN: true,
});

const TestRelaxed = Base.partial({
    NEXT_PUBLIC_APP_ORIGIN: true,
    NEXT_PUBLIC_API_BASE: true,
    NEXT_PUBLIC_COMPANIES_HOUSE_API_KEY: true,
    NEXT_PUBLIC_ADDRESS_API_KEY: true,
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: true,
    NEXT_PUBLIC_SENTRY_DSN: true,
});

function getEnvSchema() {
    const env = process.env.NODE_ENV;

    if (env === 'test') {
        return TestRelaxed;
    }

    if (env === 'development') {
        return DevRelaxed;
    }

    return Base;
}

export function validateEnv() {
    const schema = getEnvSchema();
    const result = schema.safeParse(process.env);

    if (!result.success) {
        const errors = result.error.issues.map((err: any) =>
            `${err.path.join('.')}: ${err.message}`
        ).join('\n');

        throw new Error(`Environment validation failed:\n${errors}`);
    }

    return result.data;
}

export function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
}

export function getEnv(key: string, defaultValue?: string): string | undefined {
    return process.env[key] || defaultValue;
}

export function isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
}

export function isTest(): boolean {
    return process.env.NODE_ENV === 'test';
}

// Validate environment on import
export const env = validateEnv();
