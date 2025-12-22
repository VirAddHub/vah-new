#!/usr/bin/env ts-node
/**
 * Verify charge table exists and is properly configured
 * Run: npx ts-node scripts/verify-charge-table.ts
 */

import { getPool } from '../src/lib/db';

async function verifyChargeTable() {
  const pool = getPool();
  
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'charge'
      );
    `);
    
    const tableExists = tableCheck.rows[0]?.exists;
    
    if (!tableExists) {
      console.error('❌ charge table does NOT exist');
      console.log('💡 Run migration: node run-migrations.js');
      process.exit(1);
    }
    
    console.log('✅ charge table exists');
    
    // Check columns
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'charge'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check indexes
    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'charge';
    `);
    
    console.log('\n📊 Indexes:');
    indexes.rows.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });
    
    // Check for pending charges
    const pendingCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM charge
      WHERE status = 'pending';
    `);
    
    console.log(`\n💰 Pending charges: ${pendingCount.rows[0]?.count || 0}`);
    
    // Check forwarding_request.id type compatibility
    const forwardingIdType = await pool.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'forwarding_request'
      AND column_name = 'id';
    `);
    
    if (forwardingIdType.rows.length > 0) {
      const idType = forwardingIdType.rows[0]?.data_type;
      console.log(`\n🔗 forwarding_request.id type: ${idType}`);
      if (idType === 'integer') {
        console.log('   ✅ INTEGER can be cast to BIGINT automatically');
      }
    }
    
    console.log('\n✅ Charge table verification complete');
    
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyChargeTable().catch(console.error);

