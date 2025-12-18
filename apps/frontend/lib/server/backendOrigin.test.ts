/**
 * Unit tests for backendOrigin helper
 * 
 * Run with: npm test -- backendOrigin.test.ts
 * Or: npx jest lib/server/backendOrigin.test.ts
 */

import { getBackendOrigin } from './backendOrigin';

describe('getBackendOrigin', () => {
  const originalEnv = process.env;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
    // Reset module-level didLog flag by clearing module cache
    delete require.cache[require.resolve('./backendOrigin')];
  });

  afterEach(() => {
    process.env = originalEnv;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should return NEXT_PUBLIC_BACKEND_API_ORIGIN when set (production Render origin)', () => {
    process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN = 'https://vah-api.onrender.com';
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.NODE_ENV = 'production';

    const result = getBackendOrigin();
    expect(result).toBe('https://vah-api.onrender.com');
  });

  it('should return NEXT_PUBLIC_BACKEND_API_ORIGIN when set (staging Render origin)', () => {
    process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN = 'https://vah-api-staging.onrender.com';
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.NODE_ENV = 'production';

    const result = getBackendOrigin();
    expect(result).toBe('https://vah-api-staging.onrender.com');
  });

  it('should trim trailing slashes from NEXT_PUBLIC_BACKEND_API_ORIGIN', () => {
    process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN = 'https://vah-api.onrender.com/';
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.NODE_ENV = 'production';

    const result = getBackendOrigin();
    expect(result).toBe('https://vah-api.onrender.com');
  });

  it('should throw error in production when NEXT_PUBLIC_BACKEND_API_ORIGIN is missing (ignores NEXT_PUBLIC_API_URL)', () => {
    delete process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN;
    process.env.NEXT_PUBLIC_API_URL = 'https://vah-api-staging.onrender.com';
    process.env.NODE_ENV = 'production';

    expect(() => getBackendOrigin()).toThrow('NEXT_PUBLIC_BACKEND_API_ORIGIN is not set');
  });

  it('should use NEXT_PUBLIC_API_URL as fallback in non-production (warns)', () => {
    delete process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN;
    process.env.NEXT_PUBLIC_API_URL = 'https://vah-api-staging.onrender.com';
    process.env.NODE_ENV = 'development';

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const result = getBackendOrigin();

    expect(result).toBe('https://vah-api-staging.onrender.com');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('NEXT_PUBLIC_API_URL (legacy)')
    );

    consoleSpy.mockRestore();
  });

  it('should use staging fallback in non-production when no env vars are set (warns)', () => {
    delete process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN;
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.NODE_ENV = 'development';

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const result = getBackendOrigin();

    expect(result).toBe('https://vah-api-staging.onrender.com');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('staging fallback')
    );

    consoleSpy.mockRestore();
  });

  it('should prioritize NEXT_PUBLIC_BACKEND_API_ORIGIN over NEXT_PUBLIC_API_URL', () => {
    process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN = 'https://vah-api.onrender.com';
    process.env.NEXT_PUBLIC_API_URL = 'https://vah-api-staging.onrender.com';
    process.env.NODE_ENV = 'production';

    const result = getBackendOrigin();
    expect(result).toBe('https://vah-api.onrender.com');
  });

  it('should reject non-Render origins in production', () => {
    process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN = 'https://api.example.com';
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.NODE_ENV = 'production';

    expect(() => getBackendOrigin()).toThrow('Invalid NEXT_PUBLIC_BACKEND_API_ORIGIN: must be Render origin');
  });

  it('should reject non-Render origins in non-production', () => {
    process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN = 'http://localhost:8080';
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.NODE_ENV = 'development';

    expect(() => getBackendOrigin()).toThrow('Invalid NEXT_PUBLIC_BACKEND_API_ORIGIN: must be Render origin');
  });

  it('should reject non-Render origins from NEXT_PUBLIC_API_URL', () => {
    delete process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN;
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080';
    process.env.NODE_ENV = 'development';

    expect(() => getBackendOrigin()).toThrow('Invalid NEXT_PUBLIC_API_URL: must be Render origin');
  });
});
