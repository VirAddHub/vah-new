#!/usr/bin/env node
// Test Address API with Built Routes

const express = require('express');
const app = express();
app.use(express.json());

// Mock the address routes from dist
const path = require('path');
const addressRoutes = require(path.join(__dirname, '../dist/routes/address.js'));
app.use(addressRoutes);

const server = app.listen(0, () => {
  const port = server.address().port;
  console.log('🧪 Test server running on port', port);
  
  const fetch = require('node-fetch').default || require('node-fetch');
  
  async function testAddressAPI() {
    try {
      console.log('\n1️⃣ Testing unauthenticated request...');
      const unauthRes = await fetch(`http://localhost:${port}/api/me/address`);
      const unauthData = await unauthRes.json();
      console.log('Status:', unauthRes.status, 'Response:', unauthData);
      
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
      console.log('Status:', assignRes.status);
      console.log('Response:', JSON.stringify(assignData, null, 2));
      
      console.log('\n3️⃣ Testing address retrieval...');
      const readRes = await fetch(`http://localhost:${port}/api/me/address`, {
        headers: { 'x-user-id': '42' }
      });
      const readData = await readRes.json();
      console.log('Status:', readRes.status);
      console.log('Response:', JSON.stringify(readData, null, 2));
      
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
      console.log('Status:', idempotentRes.status);
      console.log('Already assigned:', idempotentData.already);
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
