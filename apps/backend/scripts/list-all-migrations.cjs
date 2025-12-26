/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const legacyDir = path.join(__dirname, 'migrations-pg');
const projectRootDir = path.join(__dirname, '..', '..', '..');
const rootDir = path.join(projectRootDir, 'migrations');
const backendMigrationsDir = path.join(__dirname, '..', 'migrations');

function collectAllMigrationFiles() {
    const dirs = [
        { path: legacyDir, name: 'migrations-pg' },
        { path: rootDir, name: 'migrations (root)' },
        { path: backendMigrationsDir, name: 'backend/migrations' }
    ].filter(({ path: dirPath }) => {
        try {
            return fs.existsSync(dirPath);
        } catch {
            return false;
        }
    });

    const filesMap = new Map();
    for (const { path: dirPath, name: dirName } of dirs) {
        try {
            const entries = fs.readdirSync(dirPath).filter(f => /\.sql$/i.test(f));
            for (const filename of entries) {
                const fullPath = path.join(dirPath, filename);
                const relativePath = path.relative(projectRootDir, fullPath);
                const isStandardMigration = /^\d+_.*\.sql$/i.test(filename);
                
                if (!filesMap.has(filename)) {
                    filesMap.set(filename, {
                        fullPath,
                        relativePath,
                        dir: dirName,
                        isStandardMigration,
                        locations: [{ dir: dirName, path: relativePath }]
                    });
                } else {
                    // Track duplicate locations
                    const existing = filesMap.get(filename);
                    existing.locations.push({ dir: dirName, path: relativePath });
                }
            }
        } catch (err) {
            console.warn(`⚠️  Could not read directory ${dirPath}:`, err.message);
        }
    }

    return Array.from(filesMap.entries()).sort((a, b) => {
        // Sort by filename, treating numbers correctly
        return a[0].localeCompare(b[0], undefined, { numeric: true });
    });
}

console.log('='.repeat(80));
console.log('📁 ALL SQL MIGRATION FILES');
console.log('='.repeat(80));
console.log('');

const allFiles = collectAllMigrationFiles();

// Separate into standard migrations and other SQL files
const standardMigrations = [];
const otherSqlFiles = [];

for (const [filename, info] of allFiles) {
    if (info.isStandardMigration) {
        standardMigrations.push({ filename, ...info });
    } else {
        otherSqlFiles.push({ filename, ...info });
    }
}

console.log(`📋 STANDARD MIGRATIONS (${standardMigrations.length}) - Files matching pattern: ^\\d+_.*\\.sql$`);
console.log('   (These are automatically picked up by migrate-pg.cjs)\n');

if (standardMigrations.length === 0) {
    console.log('   (none found)\n');
} else {
    standardMigrations.forEach(({ filename, relativePath, locations }) => {
        console.log(`   ✓ ${filename}`);
        if (locations.length > 1) {
            console.log(`     ⚠️  Found in multiple locations:`);
            locations.forEach(loc => {
                console.log(`        - ${loc.path}`);
            });
        } else {
            console.log(`     └─ ${relativePath}`);
        }
    });
}

console.log(`\n📄 OTHER SQL FILES (${otherSqlFiles.length}) - May need manual migration`);
console.log('   (These do not match the standard migration pattern)\n');

if (otherSqlFiles.length === 0) {
    console.log('   (none found)\n');
} else {
    otherSqlFiles.forEach(({ filename, relativePath, locations }) => {
        console.log(`   • ${filename}`);
        if (locations.length > 1) {
            console.log(`     ⚠️  Found in multiple locations:`);
            locations.forEach(loc => {
                console.log(`        - ${loc.path}`);
            });
        } else {
            console.log(`     └─ ${relativePath}`);
        }
    });
}

console.log('\n' + '='.repeat(80));
console.log(`\n📈 Summary:`);
console.log(`   Total SQL files: ${allFiles.length}`);
console.log(`   Standard migrations: ${standardMigrations.length}`);
console.log(`   Other SQL files: ${otherSqlFiles.length}`);
console.log('='.repeat(80));
console.log('\n💡 To check which migrations have been applied to your database:');
console.log('   1. Set DATABASE_URL environment variable');
console.log('   2. Run: node scripts/check-unmigrated.cjs');
console.log('\n   Or manually query: SELECT name FROM migrations ORDER BY applied_at;\n');



