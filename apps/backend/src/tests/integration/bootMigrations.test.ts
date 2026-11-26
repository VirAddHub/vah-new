import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getPool } from '../../server/db';
import { applyBootMigrations, findMigrationsDir, requestedBootMigrations } from '../../server/bootMigrations';

const NAME = '20991231_01_boot_migration_probe.sql';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bootmig-'));
fs.writeFileSync(path.join(dir, NAME), 'CREATE TABLE IF NOT EXISTS boot_migration_probe (id INT);');

describe('start-up migrations', () => {
    afterAll(async () => {
        await getPool().query('DROP TABLE IF EXISTS boot_migration_probe');
        await getPool().query('DELETE FROM migrations WHERE name = $1', [NAME]);
    });
    it('does nothing unless files are named', async () => {
        expect(requestedBootMigrations('')).toEqual([]);
        expect(await applyBootMigrations([], dir)).toEqual({ applied: [], skipped: [] });
    });
    it('applies a named file once and records it', async () => {
        expect((await applyBootMigrations([NAME], dir)).applied).toEqual([NAME]);
        expect((await applyBootMigrations([NAME], dir)).skipped).toEqual([NAME]);
        const r = await getPool().query(`SELECT to_regclass('public.boot_migration_probe') IS NOT NULL AS ok`);
        expect(r.rows[0].ok).toBe(true);
    });
    it('refuses unexpected names and missing files', async () => {
        await expect(applyBootMigrations(['../x.sql'], dir)).rejects.toThrow(/not allowed/);
        await expect(applyBootMigrations(['20991231_02_missing.sql'], dir)).rejects.toThrow(/not found/);
    });
    it('finds the real migrations folder', () => {
        expect(fs.existsSync(path.join(findMigrationsDir(), '20261124_01_user_session_version.sql'))).toBe(true);
    });
});
