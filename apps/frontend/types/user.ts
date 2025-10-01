// apps/frontend/types/user.ts
export type Role = 'user' | 'admin';

// Re-export User from single source of truth
export type { User } from '../lib/client-auth';

// Shape returned by backend auth endpoints (API-specific)
export interface ApiUser {
    user_id: string;
    email: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    is_admin: boolean;
    role?: Role | string; // backend may send plain string; we'll narrow on the client
    kyc_status?: string;
}

export interface WhoAmI {
    user_id: string;
    email: string;
    name?: string;
    is_admin: boolean;
    role?: Role | string;
    kyc_status?: string;
}
