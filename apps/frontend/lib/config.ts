export const API_BASE =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ||
    process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, '') ||
    (process.env.BACKEND_API_ORIGIN ? process.env.BACKEND_API_ORIGIN.replace(/\/+$/, '') : null) ||
    'https://vah-api-staging.onrender.com';
