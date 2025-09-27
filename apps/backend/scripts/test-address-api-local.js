#!/usr/bin/env node
// Local Address API Testing Script

const express = require('express');
const app = express();
app.use(express.json());

// Mock the address routes
const addressRoutes = require('./routes/address');
app.use(addressRoutes);

const server = app.listen(0, () => {
  const port = server.address().port;
  console.log('🧪 Test server running on port', port);
  
  // Test the address API
  const fetch = require('node-fetch');
  
  async function testAddressAPI() {
    try {
      // Test 1: Unauthenticated request
      console.log('\n1️⃣ Testing unauthenticated request...');
      const unauthRes = await fetch(`http://localhost:${port}/api/me/address`);
      const unauthData = await unauthRes.json();
      console.log('Status:', unauthRes.status, 'Response:', unauthData);
      
      // Test 2: Assign address
      console.log('\n2️⃣ Testing address assignment...');
      const assignRes = await fetch(`http://localhost:${port}/api/me/address/assign`, {
        method: 'POST',
        headers: {
          'x-user-id': '42',
          'content-type': 'application/json'
        },
        body: JSON.stringify({locationId: 1})
      });
      const assignData = await assignRes.json();
      console.log('Status:', assignRes.status, 'Response:', JSON.stringify(assignData, null, 2));
      
      // Test 3: Read address
      console.log('\n3️⃣ Testing address retrieval...');
      const readRes = await fetch(`http://localhost:${port}/api/me/address`, {
        headers: { 'x-user-id': '42' }
      });
      const readData = await readRes.json();
      console.log('Status:', readRes.status, 'Response:', JSON.stringify(readData, null, 2));
      
      // Test 4: Idempotent assignment
      console.log('\n4️⃣ Testing idempotent assignment...');
      const idempotentRes = await fetch(`http://localhost:${port}/api/me/address/assign`, {
        method: 'POST',
        headers: {
          'x-user-id': '42',
          'content-type': 'application/json'
        },
        body: JSON.stringify({locationId: 1})
      });
      const idempotentData = await idempotentRes.json();
      console.log('Status:', idempotentRes.status, 'Already assigned:', idempotentData.already);
      console.log('Response:', JSON.stringify(idempotentData, null, 2));
      
      console.log('\n✅ Address API tests completed!');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    } finally {
      server.close();
    }
  }
  
  testAddressAPI();
});
