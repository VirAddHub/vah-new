// scripts/run-sql.cjs
const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

const DB_PATH = process.env.SQLITE_PATH || path.resolve(process.cwd(), 'data', 'app.db')
const SQL_FILE = process.argv[2] || path.resolve(process.cwd(), 'scripts', 'migrate-hardening.sql')

if (!fs.existsSync(SQL_FILE)) {
    console.error('[run-sql] Missing SQL file:', SQL_FILE)
    process.exit(1)
}

const sql = fs.readFileSync(SQL_FILE, 'utf8')
const db = new Database(DB_PATH)
db.exec('PRAGMA foreign_keys=ON;')

// Split SQL into individual statements and execute them one by one
const statements = sql.split(';').filter(stmt => stmt.trim().length > 0)

let successCount = 0
let errorCount = 0

for (const statement of statements) {
    try {
        db.exec(statement.trim())
        successCount++
    } catch (error) {
        // Ignore errors for columns/indexes that already exist
        if (error.message.includes('duplicate column name') ||
            error.message.includes('index') && error.message.includes('already exists')) {
            console.log('[run-sql] Skipped (already exists):', statement.trim().substring(0, 50) + '...')
            successCount++
        } else {
            console.error('[run-sql] Error:', error.message)
            console.error('[run-sql] Statement:', statement.trim())
            errorCount++
        }
    }
}

console.log(`[run-sql] Applied: ${path.basename(SQL_FILE)} → ${DB_PATH}`)
console.log(`[run-sql] Success: ${successCount}, Errors: ${errorCount}`)
