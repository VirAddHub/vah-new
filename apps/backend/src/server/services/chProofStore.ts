/**
 * Storage for Companies House verification proofs.
 *
 * Proofs used to be written to the app folder (process.cwd()/data/ch-verification), which Render
 * replaces on every deploy, so every uploaded proof was lost at the next deploy. They are now kept
 * in Postgres (table ch_verification_file, migration 20261126_01). Until that migration is applied
 * the store falls back to the persistent disk (DATA_DIR) when one is mounted, else the app folder.
 */
import fs from 'fs';
import path from 'path';
import { getPool } from '../db';
import { logger } from '../../lib/logger';

type Queryable = { query: (sql: string, args?: unknown[]) => Promise<{ rows: any[] }> };

let tableKnown: boolean | null = null;
export async function hasProofTable(db: Queryable = getPool()): Promise<boolean> {
    if (tableKnown === true) return true;
    const r = await db.query(`SELECT to_regclass('public.ch_verification_file') IS NOT NULL AS ok`);
    tableKnown = r.rows[0]?.ok === true;
    return tableKnown;
}
/** For tests. */
export function resetProofTableProbe() { tableKnown = null; }

const dirs = () => [
    ...(process.env.DATA_DIR ? [path.join(process.env.DATA_DIR, 'ch-verification')] : []),
    path.join(process.cwd(), 'data', 'ch-verification'),
];

export function mimeFor(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.pdf') return 'application/pdf';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (/^\.(png|gif|webp)$/.test(ext)) return `image/${ext.slice(1)}`;
    return 'application/octet-stream';
}

export async function saveProof(userId: number, filename: string, data: Buffer, db: Queryable = getPool()): Promise<'database' | 'disk'> {
    if (await hasProofTable(db)) {
        await db.query(
            `INSERT INTO ch_verification_file (user_id, filename, mime, bytes, size_bytes, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, filename, mimeFor(filename), data, data.length, Date.now()]);
        return 'database';
    }
    const dir = dirs()[0];
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, filename), new Uint8Array(data));
    logger.warn('[chProof] stored on disk: apply migration 20261126_01 so proofs survive deploys');
    return 'disk';
}

/** The proof's bytes, from the database or (older uploads) a disk folder. Null if it no longer exists. */
export async function loadProof(filename: string, db: Queryable = getPool()): Promise<{ mime: string; data: Buffer } | null> {
    if (path.basename(filename) !== filename) return null;
    if (await hasProofTable(db)) {
        const r = await db.query(`SELECT mime, bytes FROM ch_verification_file WHERE filename = $1 LIMIT 1`, [filename]);
        if (r.rows[0]) return { mime: r.rows[0].mime, data: Buffer.from(r.rows[0].bytes) };
    }
    for (const dir of dirs()) {
        const p = path.join(dir, filename);
        if (fs.existsSync(p)) return { mime: mimeFor(filename), data: await fs.promises.readFile(p) };
    }
    return null;
}
