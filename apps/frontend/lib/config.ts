export const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, '') || 
    process.env.BACKEND_API_ORIGIN?.replace(/\/+$/, '') + '/api' ||
    'https://vah-api-staging.onrender.com/api';
