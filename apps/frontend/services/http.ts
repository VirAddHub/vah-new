import axios from 'axios';
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://vah-api-staging.onrender.com';
export const http = axios.create({ baseURL: '', withCredentials: true }); // BFF is same-origin
export const swrFetcher = (url: string) => http.get(url).then(r => r.data);
