const { Pool } = require('pg');

async function fixForwardingAddresses() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔧 Fixing forwarding addresses for existing users...');

        // Find users who have individual address fields but no forwarding_address
        const usersToFix = await pool.query(`
            SELECT 
                id, 
                email, 
                first_name, 
                last_name,
                forward_to_first_name,
                forward_to_last_name,
                address_line1,
                address_line2,
                city,
                postcode,
                forward_country
            FROM "user" 
            WHERE forwarding_address IS NULL 
            AND forward_to_first_name IS NOT NULL 
            AND address_line1 IS NOT NULL 
            AND city IS NOT NULL 
            AND postcode IS NOT NULL
        `);

        console.log(`📊 Found ${usersToFix.rows.length} users to fix:\n`);

        for (const user of usersToFix.rows) {
            // Reconstruct forwarding address from individual fields
            const forwardingAddress = `${user.forward_to_first_name} ${user.forward_to_last_name}\n${user.address_line1}${user.address_line2 ? '\n' + user.address_line2 : ''}\n${user.city}, ${user.postcode}\n${user.forward_country}`;

            console.log(`👤 Fixing user ${user.id} (${user.email}):`);
            console.log(`   Forwarding Address: "${forwardingAddress}"`);

            // Update the user with the reconstructed forwarding address
            await pool.query(`
                UPDATE "user" 
                SET forwarding_address = $1, updated_at = $2
                WHERE id = $3
            `, [forwardingAddress, Date.now(), user.id]);

            console.log(`   ✅ Updated successfully\n`);
        }

        // Verify the fix
        const verifyResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM "user" 
            WHERE forwarding_address IS NOT NULL
        `);

        console.log(`✅ Verification: ${verifyResult.rows[0].count} users now have forwarding addresses`);

    } catch (error) {
        console.error('❌ Error fixing forwarding addresses:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

fixForwardingAddresses();
