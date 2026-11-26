// PATCH /api/profile safety rules. Ported from tests/e2e/profile-patch.test.ts, which only ran
// against a live server with a real token (so it never ran). Runs against the test database.
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeAdminToken } from '../helpers/authHelper';
import { getPool } from '../../server/db';

const app = createTestApp();
// Customers are refused outright (customerDetailsLocked); these rules still guard admin edits.
const token = makeAdminToken(); // fixture admin 9999 (src/tests/globalSetup.ts)
const patch = (body: Record<string, unknown>) =>
  request(app).patch('/api/profile').set('Authorization', `Bearer ${token}`).send(body);

describe('PATCH /api/profile — safety rules', () => {
  let original: Record<string, unknown> | undefined;
  afterAll(async () => {
    if (original) await getPool().query('UPDATE "user" SET first_name=$2, last_name=$3, phone=$4 WHERE id=$1', [9999, original.first_name, original.last_name, original.phone]);
  });

  it('refuses registered-office fields', async () => {
    const res = await patch({ address_line1: '123 Test Street' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('registered_office_immutable');
  });

  it('refuses payment fields', async () => {
    const res = await patch({ stripe_customer_id: 'cus_123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('payment_fields_immutable');
  });

  it('never changes the email address (that needs the confirmed email-change flow)', async () => {
    const before = (await getPool().query('SELECT email FROM "user" WHERE id=9999')).rows[0].email;
    const res = await patch({ email: 'newemail@example.com' });
    expect(res.status).toBe(400);
    const after = (await getPool().query('SELECT email FROM "user" WHERE id=9999')).rows[0].email;
    expect(after).toBe(before);
  });

  it('reports the registered-office error first when several refused fields are sent', async () => {
    const res = await patch({ address_line1: '123 Test', stripe_customer_id: 'cus_123', email: 'x@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('registered_office_immutable');
  });

  it('updates allowed fields and never returns secrets', async () => {
    original = (await getPool().query('SELECT first_name, last_name, phone FROM "user" WHERE id=9999')).rows[0];
    const res = await patch({ first_name: 'John', last_name: 'Doe', phone: '+44 20 1234 5678' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expect.objectContaining({ first_name: 'John', last_name: 'Doe' }));
    const keys = Object.keys(res.body.data ?? {});
    expect(keys.filter(k => /password|token|hash|secret|stripe_customer|stripe_subscription|applicant_id|locked_until|login_attempts/i.test(k))).toEqual([]);
  });
});
