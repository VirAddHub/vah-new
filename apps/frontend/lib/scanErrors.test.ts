import { describe, it, expect } from 'vitest';
import { scanErrorMessage, scanErrorFromResponse } from './scanErrors';

describe('scanErrorMessage', () => {
  it('explains a missing scan file without technical detail', () => {
    const m = scanErrorMessage(404, 'scan_file_missing');
    expect(m).toMatch(/isn't available/);
    expect(m).not.toMatch(/404|error|backend/i);
  });
  it('tells restricted customers to finish their account', () => {
    expect(scanErrorMessage(403, 'plan_inactive')).toMatch(/outstanding steps/);
  });
  it('reads the code from a response body', async () => {
    const res = new Response(JSON.stringify({ ok: false, error: 'scan_file_missing' }), { status: 404 });
    expect(await scanErrorFromResponse(res)).toMatch(/isn't available/);
  });
  it('falls back when the body is not JSON', async () => {
    expect(await scanErrorFromResponse(new Response('<html>', { status: 502 }))).toMatch(/try again/);
  });
});
