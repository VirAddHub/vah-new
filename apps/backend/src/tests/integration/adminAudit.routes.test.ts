import adminUsersRouter from '../../server/routes/admin-users';
import { readFileSync } from 'node:fs';
import { adminUserSearch } from '../../lib/adminUserSearch';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createRequire } from 'node:module';
import { authenticateJWT, requireActiveSubscription } from '../../middleware/auth';
import { makeAdminToken, makeUserToken } from '../helpers/authHelper';
import * as pool from '../../server/db';
import auditRouter from '../../server/routes/admin-audit';
import { auditQuery } from '../../server/audit/query';

// Uses real embedded PostgreSQL. Optional scratch installation avoids altering production dependencies.
// PGLITE_MODULE_PATH=/absolute/path/to/node_modules/@electric-sql/pglite npm run test:vitest -- src/tests/integration/adminAudit.routes.test.ts
const require = createRequire(import.meta.url);
const { PGlite } = require(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite');
let db: any;
const app = express();
app.use('/api', authenticateJWT);
app.use('/api/admin-audit', auditRouter);
const adminToken = makeAdminToken();
const userToken = makeUserToken();
const get = (query = '', source = '') =>
  request(app)
    .get(`/api/admin-audit/${source}${query}`)
    .set('Authorization', `Bearer ${adminToken}`);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE TABLE "user" (id bigint PRIMARY KEY, first_name text, last_name text, email text, company_name text, is_admin boolean, last_active_at bigint, role text, deleted_at timestamptz, suspended_at timestamptz);
    CREATE TABLE plans (id bigint PRIMARY KEY, name text);
    CREATE TABLE mail_item (id bigint PRIMARY KEY, user_id bigint);
    CREATE TABLE admin_audit (id bigint PRIMARY KEY, admin_id bigint, action text, target_type text, target_id bigint, details text, created_at timestamptz);
    CREATE TABLE mail_audit (id bigint PRIMARY KEY, user_id bigint, action text, item_id bigint, before_json text, after_json text, created_at bigint);
    INSERT INTO "user" (id, first_name, last_name, email, company_name, is_admin) VALUES (50, 'Example', 'Staff', 'staff@example.test', NULL, true), (53, 'Example', 'Customer', 'customer@example.test', 'Example Ltd', false);
    -- The signed-in test accounts (tokens from authHelper): sign-in checks they exist and are active.
    INSERT INTO "user" (id, email, is_admin, role) VALUES (9999, 'admin-token@example.test', true, 'admin'), (1001, 'user-token@example.test', false, 'user');
    INSERT INTO plans VALUES (3, 'Business plan');
    INSERT INTO mail_item VALUES (92, 53), (93, 888);
    INSERT INTO admin_audit SELECT i, 50, 'update_user', 'user', 53, '{"status":"active","password_hash":"DO-NOT-RETURN"}', '2026-11-21T12:00Z' FROM generate_series(1, 60) i;
    INSERT INTO admin_audit VALUES (61, 999, 'future_action', 'user', 777, 'Legacy operator note', '2026-11-21T12:00Z'),
      (62, 50, 'plan_update', 'plan', 3, '{"changes":{"old_price":1000,"new_price":2000}}', '2026-11-21T12:00Z'),
      (63, NULL, 'unknown_event', 'mail_item', 999, '{broken json', '2026-11-21T12:00Z'),
      (64, 50, 'update_mail_item', 'mail_item', 92, '{}', '2026-11-21T12:00Z'),
      (65, 50, 'update_mail_item', 'mail_item', 93, NULL, '2026-11-21T12:00Z'),
      (9007199254740993, 50, 'large_reference', 'user', 9007199254740995, NULL, '2026-01-01T00:00Z');
    INSERT INTO mail_audit SELECT i, 50, 'bulk_update', 92, NULL, '{"status":"processed","nested":{"token":"DO-NOT-RETURN"}}', 1795262400000 FROM generate_series(1, 31) i;`);
  vi.spyOn(pool, 'getPool').mockReturnValue({
    query: (sql: string, params?: unknown[]) => db.query(sql, params),
  } as any);
}, 30000);
afterAll(async () => {
  vi.restoreAllMocks();
  await db?.close();
});

describe('admin audit SQL and access', () => {
  it.each(['', 'mail-audit', 'mail-arrivals'])(
    'denies unauthenticated and non-admin requests to %s',
    async (source) => {
      expect((await request(app).get(`/api/admin-audit/${source}`)).status).toBe(403);
      expect(
        (
          await request(app)
            .get(`/api/admin-audit/${source}`)
            .set('Authorization', `Bearer ${userToken}`)
        ).status,
      ).toBe(403);
    },
  );
  it('searches all matching rows before pagination, resolves names and uses stable ties', async () => {
    const first = await get('?q=Example%20Ltd&limit=25');
    expect(first.status).toBe(200);
    expect(first.body.total).toBe(61);
    expect(first.body.items).toHaveLength(25);
    const second = await get('?q=Example%20Ltd&limit=25&offset=25');
    expect(second.body.total).toBe(61);
    expect(second.body.items).toHaveLength(25);
    expect(first.body.items[0].id).toBe('64');
    expect(first.body.items[1].id).toBe('60');
    expect(
      second.body.items
        .map((e: any) => e.id)
        .some((id: string) => first.body.items.some((e: any) => e.id === id)),
    ).toBe(false);
    expect(first.body.items[0].actor.name).toBe('Example Staff');
    expect(first.body.items[0].target.href).toBe('/admin/mail/92');
    expect(JSON.stringify(first.body)).not.toContain('DO-NOT-RETURN');
    expect(first.headers['cache-control']).toBe('no-store');
    const last = await get('?q=Example%20Ltd&limit=25&offset=50');
    expect(last.body.items).toHaveLength(11);
  });
  it('filters action, actor, email and references across pages and retains deleted relations', async () => {
    const filtered = await get('?actor=50&action=update_user&offset=50&q=customer%40example.test');
    expect(filtered.body.total).toBe(60);
    expect(filtered.body.items).toHaveLength(10);
    const deleted = await get('?q=user%20%23777');
    expect(deleted.body.total).toBe(1);
    expect(deleted.body.items[0].actor.id).toBe('999');
    expect(deleted.body.items[0].target.id).toBe('777');
    expect(deleted.body.items[0].actor.name).toBeNull();
    expect(deleted.body.actors.some((a: any) => a.id === '999')).toBe(true);
    expect(deleted.body.actions).toContain('future_action');
    const mail = await get('?q=mail%20%2393');
    expect(mail.body.items[0].target.customer_id).toBe('888');
    const missing = await get('?action=unknown_event');
    expect(missing.body.items[0].actor.id).toBeNull();
    expect(missing.body.items[0].target.href).toBeNull();
    const plan = await get('?q=Business%20plan');
    expect(plan.body.items[0].target.plan_name).toBe('Business plan');
    const big = await get('?action=large_reference');
    expect(big.body.items[0].id).toBe('9007199254740993');
    expect(big.body.items[0].target.id).toBe('9007199254740995');
  });
  it('returns accurate count for no rows, empty pages and literal wildcard searches', async () => {
    const emptyPage = await get('?offset=1000');
    expect(emptyPage.body.total).toBe(66);
    expect(emptyPage.body.items).toEqual([]);
    const none = await get('?q=missing');
    expect(none.body.total).toBe(0);
    const wildcard = await get('?q=%25');
    expect(wildcard.body.total).toBe(0);
    expect((await get('?q=%27%20OR%201%3D1--')).body.total).toBe(0);
  });
  it('normalizes mail source timestamps, redacts snapshots and filters all mail pages', async () => {
    const result = await get(
      '?offset=25&item_id=92&q=Example%20Ltd&actor=50&action=bulk_update',
      'mail-audit',
    );
    expect(result.status).toBe(200);
    expect(result.body.total).toBe(31);
    expect(result.body.items).toHaveLength(6);
    expect(result.body.items[0].id).toBe('6');
    expect(result.body.items[0].source).toBe('mail');
    expect(result.body.items[0].after.status).toBe('processed');
    expect(result.body.items[0].before).toBeNull();
    expect(JSON.stringify(result.body)).not.toContain('DO-NOT-RETURN');
    expect(result.body.items[0]).not.toHaveProperty('after_json');
  });
  it.each([
    ['2026-03-29', '2026-03-29T00:00Z', '2026-03-29T23:00Z'],
    ['2026-10-25', '2026-10-24T23:00Z', '2026-10-26T00:00Z'],
  ])('uses exact London-day boundaries on %s', async (day, start, end) => {
    await db.query(
      `INSERT INTO admin_audit VALUES (100, 50, 'dst', 'user', 53, NULL, $1::timestamptz - interval '1 millisecond'), (101, 50, 'dst', 'user', 53, NULL, $1::timestamptz), (102, 50, 'dst', 'user', 53, NULL, $2::timestamptz - interval '1 millisecond'), (103, 50, 'dst', 'user', 53, NULL, $2::timestamptz)`,
      [start, end],
    );
    const result = await get(`?action=dst&from=${day}&to=${day}`);
    expect(result.body.total).toBe(2);
    expect(result.body.items.map((e: any) => e.id)).toEqual(['102', '101']);
    await db.exec('DELETE FROM admin_audit WHERE id BETWEEN 100 AND 103');
  });
  it('handles the older bigint admin timestamp schema', async () => {
    await db.exec(
      'ALTER TABLE admin_audit ALTER COLUMN created_at TYPE bigint USING (extract(epoch FROM created_at) * 1000)::bigint',
    );
    const query = auditQuery('admin', { from: '2026-11-21', to: '2026-11-21' });
    const result = await db.query(query.sql, query.params);
    expect(result.rows[0].total).toBe(65);
  });
  it('rejects malformed queries and safely reports unavailable sources', async () => {
    expect((await get('?offset=-2')).status).toBe(400);
    await db.exec('DROP TABLE mail_audit');
    const result = await get('', 'mail-audit');
    expect(result.status).toBe(503);
    expect(result.body.error).toBe('audit_source_unavailable');
  });
});

it('lists imported scans from actual mail records even without bulk-update events', async () => {
  await db.exec(`ALTER TABLE mail_item ADD COLUMN created_at bigint, ADD COLUMN scanned boolean, ADD COLUMN idempotency_key text, ADD COLUMN scan_file_url text, ADD COLUMN locked boolean;
    UPDATE mail_item SET created_at = 1795262400000, scanned = true, idempotency_key = 'onedrive_import_example', locked = true WHERE id = 92;
    INSERT INTO mail_item (id,user_id,created_at,scanned,idempotency_key) SELECT i,53,1795262400000,true,'onedrive_import_' || i FROM generate_series(1000,1030) i;`);
  const first = await get('?q=Example%20Ltd&limit=25', 'mail-arrivals');
  expect(first.status).toBe(200);
  expect(first.body.total).toBe(32);
  expect(first.body.items[0].action).toBe('mail_added');
  expect(first.body.items[0].actor.name).toBe('System · OneDrive import');
  expect(first.body.items[0].actor.id).toBeNull();
  expect(first.body.items[0].details.human_uploader).toBe('Not recorded');
  const next = await get('?q=Example%20Ltd&offset=25', 'mail-arrivals');
  expect(next.body.items).toHaveLength(7);
  const locked = await get('?item_id=92', 'mail-arrivals');
  expect(locked.body.items[0].details.current_access).toBe('Locked');
  expect(locked.body.items[0].details.scan_availability).toBe('Scan reference not available now');
  await db.exec("UPDATE mail_item SET scan_file_url='https://example.test/scan.pdf' WHERE id=92");
  const repeated = await get('?item_id=92', 'mail-arrivals');
  expect(repeated.body.total).toBe(1);
  expect(repeated.body.items[0].created_at).toBe(locked.body.items[0].created_at);
});

it('customer-account audit scope excludes mail, plan records and self-service billing', async () => {
  await db.exec("INSERT INTO admin_audit VALUES (200,53,'plan_change','user',53,NULL,1795262400000)");
  const result = await get('?target=user');
  expect(result.status).toBe(200);
  expect(result.body.items.every((e:any) => e.target.type === 'user' && e.action !== 'plan_change')).toBe(true);
});
it('customer search finds full names, companies, literal text and exact IDs', async () => {
  await db.exec(`INSERT INTO "user" (id,first_name,last_name,email,company_name) VALUES (21,'Pat','Lee','21pat@example.test','21st Studio'),(22,'Kim','Jones','kim@example.test','100%_Local')`);
  for (const [search, expected] of [['Example Customer','53'],['21st Studio','21'],['21pat@','21'],['#21','21'],['100%_Local','22']]) {
    const match=adminUserSearch(search,1);
    const result=await db.query('SELECT id::text FROM "user" u WHERE '+match.clause,[match.value]);
    expect(result.rows.map((r:any)=>r.id)).toEqual([expected]);
  }
});


describe('customer state regression checks', () => {
  it('completed KYC includes approved and legacy verified in both list and count predicates', async () => {
    const source = readFileSync(new URL('../../server/routes/admin-users.ts', import.meta.url), 'utf8');
    // One predicate: the total is counted from the same filtered list.
    const predicates = [...source.matchAll(/AND (CASE WHEN u\.kyc_status[^`]+?) = \$\$\{/g)];
    expect(predicates).toHaveLength(1);
    for (const match of predicates) {
      const result = await db.query(`SELECT u.id FROM (VALUES (1,'approved'),(2,'verified'),(3,'pending'),(4,NULL),(5,'rejected')) u(id,kyc_status) WHERE ${match[1]} = $1 ORDER BY id`, ['approved']);
      expect(result.rows.map((r: any) => r.id)).toEqual([1,2]);
    }
  });

  it('payment recovery never lifts a staff suspension', () => {
    // Stripe is the only billing provider. When a payment recovers it may reset the payment
    // fields, but it must not clear a suspension or change the account status staff set.
    const source = readFileSync(new URL('../../server/routes/webhooks-stripe.ts', import.meta.url), 'utf8');
    expect(source).toMatch(/payment_failed_at = NULL/);
    for (const m of source.matchAll(/account_suspended_at\s*=\s*([^,`'\n]+)/g)) {
      expect(m[1]).toMatch(/CASE WHEN status = 'suspended'/);
    }
    expect(source).not.toMatch(/['`,]\s*status\s*=\s*'active'/);
  });

  it('denies mail access for a suspended customer with a paid active subscription', async () => {
    await db.exec(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS status text; UPDATE "user" SET status='suspended' WHERE id=53; CREATE TABLE IF NOT EXISTS subscription (user_id bigint, status text); INSERT INTO subscription VALUES (53,'active');`);
    const guarded = express();
    guarded.use((req, _res, next) => { req.user = {id:53, is_admin:false} as any; next(); });
    guarded.get('/', requireActiveSubscription, (_req, res) => res.json({ok:true}));
    expect((await request(guarded).get('/')).body.error).toBe('account_suspended');
    await db.exec(`UPDATE "user" SET status='active' WHERE id=53`);
    expect((await request(guarded).get('/')).status).toBe(200);
  });
});


it('saves company edits alone and alongside other profile changes through the admin endpoint', async () => {
  await db.exec(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS updated_at bigint;
    ALTER TABLE admin_audit ALTER COLUMN created_at TYPE timestamptz USING to_timestamp(created_at / 1000.0);
    CREATE SEQUENCE IF NOT EXISTS test_audit_id START 10000;
    ALTER TABLE admin_audit ALTER COLUMN id SET DEFAULT nextval('test_audit_id');`);
  const usersApp = express();
  usersApp.use(express.json());
  usersApp.use(authenticateJWT);
  usersApp.use('/api/admin',adminUsersRouter);
  const update = (body: any) => request(usersApp).patch('/api/admin/users/53').set('Authorization', `Bearer ${adminToken}`).send(body);
  expect((await update({company_name:'Updated Studio Ltd'})).status).toBe(200);
  expect((await db.query('SELECT company_name FROM "user" WHERE id=53')).rows[0].company_name).toBe('Updated Studio Ltd');
  expect((await update({company_name:'Second Studio Ltd',first_name:'New name'})).status).toBe(200);
  expect((await db.query('SELECT company_name,first_name FROM "user" WHERE id=53')).rows[0]).toEqual({company_name:'Second Studio Ltd',first_name:'New name'});
});
it('includes both pending statuses in list/count predicates and statistics', async () => {
  const source = readFileSync(new URL('../../server/routes/admin-users.ts',import.meta.url),'utf8');
  // One predicate: the total is counted from the same filtered list.
  const predicates=[...source.matchAll(/AND (\(CASE WHEN u\.status[^`]+?) = \$\$\{/g)];
  expect(predicates).toHaveLength(1);
  for (const match of predicates) {
    const result=await db.query(`SELECT u.id FROM (VALUES (1,'pending'),(2,'pending_payment'),(3,'active'),(4,'suspended')) u(id,status) WHERE ${match[1]} = $1 ORDER BY id`,['pending']);
    expect(result.rows.map((r:any)=>r.id)).toEqual([1,2]);
  }
  await db.exec(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS deleted_at bigint; UPDATE "user" SET status='pending' WHERE id=50; UPDATE "user" SET status='pending_payment' WHERE id=53;`);
  const usersApp=express();usersApp.use(authenticateJWT);usersApp.use('/api/admin',adminUsersRouter);
  const result=await request(usersApp).get('/api/admin/users/stats').set('Authorization',`Bearer ${adminToken}`);
  expect(result.status).toBe(200);
  expect(result.body.data.pending).toBe(2);
});
