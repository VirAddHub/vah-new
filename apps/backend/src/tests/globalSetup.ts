/**
 * Integration tests run against a real, disposable Postgres database built from the project
 * migrations, with the two fixture users the tests' tokens refer to (ids 1001 and 9999).
 * They used to point at a database that does not exist, so every route that reaches the
 * database answered 500 and several tests could never pass.
 *
 * Default: postgres://postgres:postgres@127.0.0.1:5433/vah_unit_test (the local docker database
 * server). Override with TEST_DATABASE_URL. Only localhost databases named vah_unit_test* are accepted.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { Client } from 'pg';

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5433/vah_unit_test';

export default async function setup() {
    const url = new URL(TEST_DATABASE_URL);
    const dbName = url.pathname.replace(/^\//, '');
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !dbName.startsWith('vah_unit_test')) {
        throw new Error(`Refusing to run tests against ${url.hostname}/${dbName}: must be a localhost database named vah_unit_test*`);
    }
    const adminUrl = new URL(TEST_DATABASE_URL); adminUrl.pathname = '/postgres';
    const admin = new Client({ connectionString: adminUrl.toString() });
    try {
        await admin.connect();
    } catch (e) {
        throw new Error(`Test database server not reachable at ${url.host}. Start it with "npm run local:db". (${(e as Error).message})`);
    }
    await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${dbName}"`);
    await admin.end();

    execFileSync(process.execPath, [path.join(__dirname, '../../scripts/migrate-pg.cjs')], {
        env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }, stdio: 'pipe',
    });

    const db = new Client({ connectionString: TEST_DATABASE_URL });
    await db.connect();
    const now = Date.now();
    await db.query(
        `INSERT INTO "user" (id, email, password, first_name, last_name, is_admin, role, status, plan_status, kyc_status, is_sole_controller, created_at, updated_at)
         VALUES (1001, 'test@example.com', 'x', 'Test', 'User', false, 'user', 'active', 'pending_payment', 'not_started', true, $1, $1),
                (9999, 'admin@example.com', 'x', 'Test', 'Admin', true, 'admin', 'active', 'active', 'approved', true, $1, $1)`, [now]);
    await db.query(`SELECT setval(pg_get_serial_sequence('"user"', 'id'), 20000)`);
    await db.end();
}
