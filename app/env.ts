import { z } from 'zod';

// Only expose NEXT_PUBLIC_* and client-safe values
const schema = z.object({
    NEXT_PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),
    BACKEND_API_ORIGIN: z.string().url().optional(), // used by server routes in Next (not exposed to browser)
});

const parsed = schema.safeParse({
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    BACKEND_API_ORIGIN: process.env.BACKEND_API_ORIGIN,
});

if (!parsed.success) {
    // Don't crash dev; log loudly
    console.warn('Env warning (frontend):', parsed.error.flatten().fieldErrors);
}

export const appEnv = parsed.success ? parsed.data : (parsed as any).data;
