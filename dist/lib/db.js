// lib/db.js
// This module exports the database instance from server.js
// It's a simple re-export to avoid circular dependencies

// We'll get the db instance from the server module
let dbInstance = null;

function setDb(db) {
    dbInstance = db;
}

function getDb() {
    if (!dbInstance) {
        throw new Error('Database not initialized. Call setDb() first.');
    }
    return dbInstance;
}

module.exports = {
    setDb,
    get db() { return getDb(); }
};
