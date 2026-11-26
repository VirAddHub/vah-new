// Companies House proofs must survive a deploy: stored in Postgres, not the app folder.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getPool } from '../../server/db';
import { saveProof, loadProof, resetProofTableProbe } from '../../server/services/chProofStore';

const USER = 30004;
const PDF = Buffer.from('%PDF-1.4\n%test proof\n%%EOF\n');

describe('Companies House proof storage', () => {
    beforeAll(async () => {
        const now = Date.now();
        await getPool().query(
            `INSERT INTO "user" (id, email, password, first_name, last_name, is_admin, role, status, is_sole_controller, created_at, updated_at)
             VALUES ($1, 'ch-proof@example.com', 'x', 'Ch', 'Proof', false, 'user', 'active', true, $2, $2) ON CONFLICT (id) DO NOTHING`, [USER, now]);
        resetProofTableProbe();
    });
    afterAll(async () => {
        await getPool().query(`DELETE FROM ch_verification_file WHERE user_id = $1`, [USER]).catch(() => undefined);
        await getPool().query(`DELETE FROM "user" WHERE id = $1`, [USER]);
    });

    it('stores the proof in the database, not on the app disk', async () => {
        const name = `ch-verification-${USER}-${Date.now()}.pdf`;
        expect(await saveProof(USER, name, PDF)).toBe('database');
        expect(fs.existsSync(path.join(process.cwd(), 'data', 'ch-verification', name))).toBe(false);
        const back = await loadProof(name);
        expect(back?.mime).toBe('application/pdf');
        expect(back?.data.equals(PDF)).toBe(true);
    });

    it('refuses path tricks and reports a missing proof as null', async () => {
        expect(await loadProof('../etc/passwd')).toBeNull();
        expect(await loadProof('ch-verification-0-0.pdf')).toBeNull();
    });
});
