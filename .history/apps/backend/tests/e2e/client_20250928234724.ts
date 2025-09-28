import request from 'supertest';

const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
export const api = () => request(baseUrl);

export const auth = () => {
  const token = process.env.AUTH_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
};
