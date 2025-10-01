// apps/frontend/types/user.ts
export type Role = 'user' | 'admin';

// Shape returned by backend auth endpoints
export interface User {
    user_id: string;
    email: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    is_admin: boolean;
    role?: Role | string; // backend may send plain string; we'll narrow on the client
}

export interface WhoAmI {
    user_id: string;
    email: string;
    name?: string;
    is_admin: boolean;
    role?: Role | string;
}
