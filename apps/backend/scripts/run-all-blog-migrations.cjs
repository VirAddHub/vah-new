const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection string from user - try multiple formats
const baseString = 'postgresql://vah_postgres_40zq_user:uTRWGQlKebPeTjsEwvYb6rAw8YMNbLZX@dpg-d3coq7l6ubrc73f0bt3g-a/vah_postgres_40zq';
const connectionString = process.env.DATABASE_URL || baseString;

console.log('🔗 Attempting connection...');
console.log('   (Connection string format checked)');

(async () => {
    const client = new Client({ 
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to Render PostgreSQL database');

        // Migration 1: Create blog_posts table
        console.log('\n📝 Running migration: 114_create_blog_posts_table.sql');
        const migration1Path = path.join(__dirname, 'migrations-pg', '114_create_blog_posts_table.sql');
        const migration1SQL = fs.readFileSync(migration1Path, 'utf8');
        await client.query(migration1SQL);
        console.log('✅ Migration 114 completed');

        // Migration 2: Add author columns
        console.log('\n📝 Running migration: 115_add_author_to_blog_posts.sql');
        const migration2Path = path.join(__dirname, 'migrations-pg', '115_add_author_to_blog_posts.sql');
        const migration2SQL = fs.readFileSync(migration2Path, 'utf8');
        await client.query(migration2SQL);
        console.log('✅ Migration 115 completed');

        // Verify table was created
        console.log('\n🔍 Verifying blog_posts table...');
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'blog_posts'
            );
        `);

        if (tableCheck.rows[0].exists) {
            console.log('✅ blog_posts table exists');
            
            // Check columns
            const columns = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'blog_posts'
                ORDER BY ordinal_position;
            `);
            console.log(`\n📋 Table has ${columns.rows.length} columns:`);
            columns.rows.forEach(col => {
                console.log(`   - ${col.column_name} (${col.data_type})`);
            });

            // Check indexes
            const indexes = await client.query(`
                SELECT indexname FROM pg_indexes 
                WHERE tablename = 'blog_posts';
            `);
            console.log(`\n📊 Created ${indexes.rows.length} indexes:`, indexes.rows.map(r => r.indexname).join(', '));

            // Check if author columns exist
            const authorColumns = columns.rows.filter(c => 
                c.column_name.includes('author')
            );
            if (authorColumns.length > 0) {
                console.log('\n✅ Author columns found:', authorColumns.map(c => c.column_name).join(', '));
            } else {
                console.log('\n⚠️  Author columns not found - migration 115 may have failed');
            }
        } else {
            console.error('❌ blog_posts table was not created');
            process.exit(1);
        }

        await client.end();
        console.log('\n✅ All migrations completed successfully!');
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

