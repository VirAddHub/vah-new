/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!/^postgres/i.test(DATABASE_URL || '')) {
    console.error('[check-unmigrated] DATABASE_URL is not Postgres');
    process.exit(1);
}

const legacyDir = path.join(__dirname, 'migrations-pg');
const projectRootDir = path.join(__dirname, '..', '..', '..');
const rootDir = path.join(projectRootDir, 'migrations');
const backendMigrationsDir = path.join(__dirname, '..', 'migrations');

function collectAllMigrationFiles() {
    const dirs = [
        legacyDir,
        rootDir,
        backendMigrationsDir
    ].filter((dirPath) => {
        try {
            return fs.existsSync(dirPath);
        } catch {
            return false;
        }
    });

    const filesMap = new Map();
    for (const dirPath of dirs) {
        try {
            const entries = fs.readdirSync(dirPath).filter(f => /\.sql$/i.test(f));
            for (const filename of entries) {
                const fullPath = path.join(dirPath, filename);
                const relativePath = path.relative(projectRootDir, fullPath);
                if (!filesMap.has(filename)) {
                    filesMap.set(filename, { fullPath, relativePath, dir: dirPath });
                } else {
                    // If duplicate, prefer the one from migrations-pg or migrations root
                    const existing = filesMap.get(filename);
                    if (dirPath === legacyDir || dirPath === rootDir) {
                        filesMap.set(filename, { fullPath, relativePath, dir: dirPath });
                    }
                }
            }
        } catch (err) {
            console.warn(`[check-unmigrated] Could not read directory ${dirPath}:`, err.message);
        }
    }

    return Array.from(filesMap.entries()).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
}

(async () => {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();
        console.log('✅ Connected to database\n');

        // Check for migrations table
        const migrationsTableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'migrations'
            );
        `);

        if (!migrationsTableCheck.rows[0].exists) {
            console.log('⚠️  No migrations table found. All migrations are unmigrated.\n');
        }

        // Get applied migrations
        let applied = new Set();
        try {
            const { rows } = await client.query(`SELECT name FROM migrations ORDER BY applied_at`);
            applied = new Set(rows.map(r => r.name));
            console.log(`📋 Found ${applied.size} applied migrations in database\n`);
        } catch (err) {
            console.warn('⚠️  Could not query migrations table:', err.message);
            console.log('   Assuming no migrations have been applied.\n');
        }

        // Collect all migration files
        const allFiles = collectAllMigrationFiles();
        console.log(`📁 Found ${allFiles.length} total SQL migration files\n`);

        // Separate into migrated and unmigrated
        const migrated = [];
        const unmigrated = [];

        for (const [filename, { relativePath, dir }] of allFiles) {
            // Only check files matching the migration pattern (numbered prefix)
            if (/^\d+_.*\.sql$/i.test(filename)) {
                if (applied.has(filename)) {
                    migrated.push({ filename, relativePath, dir });
                } else {
                    unmigrated.push({ filename, relativePath, dir });
                }
            } else {
                // Files that don't match the pattern (like manual migrations, seed files, etc.)
                // Check if they might be in the migrations table anyway
                if (applied.has(filename)) {
                    migrated.push({ filename, relativePath, dir, note: 'non-standard name' });
                } else {
                    unmigrated.push({ filename, relativePath, dir, note: 'non-standard name (may need manual migration)' });
                }
            }
        }

        // Display results
        console.log('='.repeat(80));
        console.log('📊 MIGRATION STATUS REPORT');
        console.log('='.repeat(80));
        console.log(`\n✅ MIGRATED (${migrated.length}):`);
        if (migrated.length === 0) {
            console.log('   (none)');
        } else {
            migrated.forEach(({ filename, relativePath, note }) => {
                console.log(`   ✓ ${filename}`);
                if (note) console.log(`     └─ ${note}`);
            });
        }

        console.log(`\n❌ UNMIGRATED (${unmigrated.length}):`);
        if (unmigrated.length === 0) {
            console.log('   ✅ All migrations have been applied!');
        } else {
            unmigrated.forEach(({ filename, relativePath, dir, note }) => {
                console.log(`   ✗ ${filename}`);
                console.log(`     └─ ${relativePath}`);
                if (note) console.log(`       └─ ${note}`);
            });
        }

        console.log('\n' + '='.repeat(80));
        console.log(`\n📈 Summary:`);
        console.log(`   Total files: ${allFiles.length}`);
        console.log(`   Migrated: ${migrated.length}`);
        console.log(`   Unmigrated: ${unmigrated.length}`);
        console.log('='.repeat(80) + '\n');

        if (unmigrated.length > 0) {
            console.log('💡 To apply unmigrated migrations, run:');
            console.log('   npm run migrate\n');
            process.exit(1);
        } else {
            console.log('✅ All migrations are up to date!\n');
        }

    } catch (err) {
        console.error('❌ Error checking migrations:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        await client.end();
    }
})();






