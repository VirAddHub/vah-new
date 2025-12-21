import axios from 'axios';
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://vah-api-staging.onrender.com';
export const http = axios.create({ baseURL: '', withCredentials: true }); // BFF is same-origin

// SWR fetcher with no-store to prevent 304 responses and stale cache
export const swrFetcher = (url: string) => 
  http.get(url, {
    headers: {
      'cache-control': 'no-store',
      'pragma': 'no-cache',
    },
  }).then(r => r.data);
