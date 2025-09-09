import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: number; email: string; is_admin?: boolean };
  }
}
