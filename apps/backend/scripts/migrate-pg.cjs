/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!/^postgres/i.test(DATABASE_URL || '')) {
    console.error('[pg-migrate] DATABASE_URL is not Postgres');
    process.exit(1);
}

const legacyDir = path.join(__dirname, 'migrations-pg');
const projectRootDir = path.join(__dirname, '..', '..', '..');
const rootDir = path.join(projectRootDir, 'migrations');

function collectMigrationFiles() {
    const dirs = [legacyDir, rootDir].filter((dirPath) => {
        try {
            return fs.existsSync(dirPath);
        } catch {
            return false;
        }
    });

    const filesMap = new Map();
    for (const dirPath of dirs) {
        const entries = fs.readdirSync(dirPath).filter(f => /^\d+_.*\.sql$/.test(f));
        for (const filename of entries) {
            if (!filesMap.has(filename)) {
                filesMap.set(filename, path.join(dirPath, filename));
            }
        }
    }

    return Array.from(filesMap.entries()).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
}

const files = collectMigrationFiles();

(async () => {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    await client.connect();

    const MIGRATIONS_TABLE = 'migrations';
    await client.query('BEGIN');
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
                id serial PRIMARY KEY,
                name text UNIQUE NOT NULL,
                applied_at timestamptz NOT NULL DEFAULT now()
            );
        `);

        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = '${MIGRATIONS_TABLE}' AND column_name = 'filename'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = '${MIGRATIONS_TABLE}' AND column_name = 'name'
                ) THEN
                    EXECUTE 'ALTER TABLE ${MIGRATIONS_TABLE} RENAME COLUMN filename TO name';
                ELSIF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = '${MIGRATIONS_TABLE}' AND column_name = 'name'
                ) THEN
                    EXECUTE 'ALTER TABLE ${MIGRATIONS_TABLE} ADD COLUMN name text';
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = '${MIGRATIONS_TABLE}' AND column_name = 'executed_at'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = '${MIGRATIONS_TABLE}' AND column_name = 'applied_at'
                ) THEN
                    EXECUTE 'ALTER TABLE ${MIGRATIONS_TABLE} RENAME COLUMN executed_at TO applied_at';
                ELSIF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = '${MIGRATIONS_TABLE}' AND column_name = 'applied_at'
                ) THEN
                    EXECUTE 'ALTER TABLE ${MIGRATIONS_TABLE} ADD COLUMN applied_at timestamptz NOT NULL DEFAULT now()';
                END IF;
            END
            $$;
        `);

        await client.query(`
            ALTER TABLE ${MIGRATIONS_TABLE}
            ALTER COLUMN name SET NOT NULL;
        `);
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'migrations_name_key'
                ) THEN
                    ALTER TABLE ${MIGRATIONS_TABLE} ADD CONSTRAINT migrations_name_key UNIQUE (name);
                END IF;
            END
            $$;
        `);

        // Legacy compatibility: if _migrations exists, sync it into new table once
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = '_migrations'
                ) THEN
                    INSERT INTO ${MIGRATIONS_TABLE} (name, applied_at)
                    SELECT name, applied_at FROM _migrations
                    ON CONFLICT (name) DO NOTHING;
                END IF;
            END
            $$;
        `);

        const { rows } = await client.query(`SELECT name FROM ${MIGRATIONS_TABLE}`);
        const applied = new Set(rows.map(r => r.name));

        for (const [filename, absolutePath] of files) {
            if (applied.has(filename)) { console.log('[pg-migrate] skip', filename); continue; }
            const sql = fs.readFileSync(absolutePath, 'utf8');
            console.log('[pg-migrate] apply', filename);
            await client.query(sql);
            await client.query(`INSERT INTO ${MIGRATIONS_TABLE}(name) VALUES ($1)`, [filename]);
        }

        await client.query('COMMIT');
        console.log('✅ PG migrations completed');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ PG migration failed:', err?.message || err);
        process.exit(1);
    } finally {
        await client.end();
    }
})();
