// apps/frontend/types/user.ts
export type Role = 'user' | 'admin' | undefined;

export type User = {
  user_id: string;
  email: string;
  role?: Role;
  is_admin?: boolean;
  first_name?: string;
  last_name?: string;
};
