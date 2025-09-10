const { db } = require('../server/db.js');

/**
 * Ensures password reset columns exist in the user table
 * Safe to run multiple times - won't error if columns already exist
 */
function ensureUserResetColumns(db) {
    const cols = db.prepare("PRAGMA table_info(user)").all().map(c => c.name);
    const missing = (name) => !cols.includes(name);

    const tx = db.transaction(() => {
        if (missing("password_reset_token")) {
            console.log('Adding password_reset_token column...');
            db.prepare("ALTER TABLE user ADD COLUMN password_reset_token TEXT").run();
        }
        if (missing("password_reset_expires")) {
            console.log('Adding password_reset_expires column...');
            db.prepare("ALTER TABLE user ADD COLUMN password_reset_expires INTEGER").run();
        }
        if (missing("password_reset_used_at")) {
            console.log('Adding password_reset_used_at column...');
            db.prepare("ALTER TABLE user ADD COLUMN password_reset_used_at INTEGER").run();
        }
    });

    tx();
    console.log('Password reset columns migration completed');
}

module.exports = {
    ensureUserResetColumns
};
