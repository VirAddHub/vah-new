const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { getPgSslOption } = require('./lib/pgSsl.cjs');

// Internal connection string from Render
const connectionString = 'postgresql://vah_postgres_40zq_user:uTRWGQlKebPeTjsEwvYb6rAw8YMNbLZX@dpg-d3coq7l6ubrc73f0bt3g-a:5432/vah_postgres_40zq?sslmode=require';

(async () => {
    const client = new Client({ 
        connectionString,
        ssl: getPgSslOption()
    });

    try {
        console.log('🔗 Connecting to Render PostgreSQL...');
        await client.connect();
        console.log('✅ Connected successfully!');

        // Read and run the combined migration
        const migrationPath = path.join(__dirname, 'COMBINED_MIGRATION.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('\n📝 Running blog migrations...');
        await client.query(migrationSQL);
        console.log('✅ Migrations completed successfully!');

        // Verify table was created
        const result = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'blog_posts'
            );
        `);

        if (result.rows[0].exists) {
            console.log('\n✅ blog_posts table exists!');
            
            // Check columns
            const columns = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'blog_posts'
                ORDER BY ordinal_position;
            `);
            console.log(`\n📋 Table has ${columns.rows.length} columns`);
            
            // Check author columns
            const authorCols = columns.rows.filter(c => c.column_name.includes('author'));
            if (authorCols.length > 0) {
                console.log('✅ Author columns found:', authorCols.map(c => c.column_name).join(', '));
            }
            
            console.log('\n🎉 Migration successful! Your blog will now work.');
        } else {
            console.error('❌ blog_posts table was not created');
            process.exit(1);
        }

        await client.end();
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        if (error.code) {
            console.error('   Error code:', error.code);
        }
        if (error.detail) {
            console.error('   Detail:', error.detail);
        }
        console.error('\nFull error:', error);
        process.exit(1);
    }
})();

