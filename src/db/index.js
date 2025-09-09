const client = (process.env.DB_CLIENT || 'sqlite');

let impl;
if (client === 'pg') {
    impl = require('./pg');
} else {
    impl = require('./sqlite');
}

module.exports = {
    ensureSchema: impl.ensureSchema,
    selectOne: impl.selectOne,
    selectMany: impl.selectMany,
    execute: impl.execute,
    insertReturningId: impl.insertReturningId
};
