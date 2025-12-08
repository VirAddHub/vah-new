const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Use the provided connection string
// Note: Render PostgreSQL connection strings may need .render.com suffix or port
const providedString = 'postgresql://vah_postgres_40zq_user:uTRWGQlKebPeTjsEwvYb6rAw8YMNbLZX@dpg-d3coq7l6ubrc73f0bt3g-a/vah_postgres_40zq';
const connectionString = process.env.DATABASE_URL || providedString;

console.log('🔗 Attempting connection to:', connectionString.replace(/:[^:@]+@/, ':****@'));

(async () => {
    const client = new Client({ 
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        const migrationPath = path.join(__dirname, 'migrations-pg', '114_create_blog_posts_table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📝 Running migration: 114_create_blog_posts_table.sql');
        await client.query(migrationSQL);

        // Verify table was created
        const result = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'blog_posts'
            );
        `);

        if (result.rows[0].exists) {
            console.log('✅ blog_posts table created successfully');
            
            // Check indexes
            const indexes = await client.query(`
                SELECT indexname FROM pg_indexes 
                WHERE tablename = 'blog_posts';
            `);
            console.log(`✅ Created ${indexes.rows.length} indexes:`, indexes.rows.map(r => r.indexname).join(', '));
        } else {
            console.error('❌ blog_posts table was not created');
            process.exit(1);
        }

        await client.end();
        console.log('✅ Migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
})();

