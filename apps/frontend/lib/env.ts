// apps/frontend/lib/env.ts
// safe helper if any code constructs absolute URLs
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, '') || '/api';
