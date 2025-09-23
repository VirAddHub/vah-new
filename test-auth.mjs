import request from 'supertest';
import { app } from './dist/server/index.js';

async function testAuth() {
    console.log('Testing auth flow...');

    // Test 1: Login with admin@example.com
    console.log('\n1. Testing admin login...');
    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com' });

    console.log('Login status:', loginRes.status);
    console.log('Login body:', loginRes.body);
    console.log('Login cookies:', loginRes.headers['set-cookie']);

    if (loginRes.status === 200) {
        const cookie = loginRes.headers['set-cookie']?.[0];
        console.log('Got cookie:', cookie);

        // Test 2: Try admin endpoint with cookie
        console.log('\n2. Testing admin endpoint...');
        const adminRes = await request(app)
            .get('/api/admin/plans')
            .set('Cookie', cookie);

        console.log('Admin status:', adminRes.status);
        console.log('Admin body:', adminRes.body);

        // Test 3: Try a different admin endpoint
        console.log('\n3. Testing admin users endpoint...');
        const usersRes = await request(app)
            .get('/api/admin/users')
            .set('Cookie', cookie);

        console.log('Users status:', usersRes.status);
        console.log('Users body:', usersRes.body);
    }
}

testAuth().catch(console.error);
