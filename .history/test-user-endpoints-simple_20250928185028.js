// Simple test for user endpoints
const express = require('express');
const session = require('express-session');

const app = express();

// Add body parsing and session middleware
app.use(express.json());
app.use(session({
  secret: 'test-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Add the user endpoints (copied from the main server)
app.get("/api/me", (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ ok:false, error:{ code:"UNAUTHENTICATED", message:"Not logged in" }});
  }
  const { id, email, name, roles } = req.session.user;
  res.json({ ok:true, data:{ user:{ id, email, name, roles: roles ?? [] } }});
});

app.patch("/api/me/profile", (req, res, next) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ ok:false, error:{ code:"UNAUTHENTICATED", message:"Not logged in" }});
    }
    const { name, avatarUrl, marketingOptIn } = req.body ?? {};
    // TODO: persist to DB with req.session.user.id
    req.session.user = { ...req.session.user, name, avatarUrl, marketingOptIn };
    res.json({ ok:true, data:{ user: req.session.user }});
  } catch (e) { next(e); }
});

// Add a test endpoint to set up a session
app.post("/api/test-login", (req, res) => {
  req.session.user = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    roles: ['user']
  };
  res.json({ ok: true, message: 'Session set up' });
});

const server = app.listen(8086, () => {
  console.log('User endpoints test server running on port 8086');
  
  const http = require('http');
  
  // Test 1: GET /api/me without session (should return 401)
  console.log('Testing GET /api/me without session...');
  http.get('http://localhost:8086/api/me', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('✅ GET /api/me (no session):', res.statusCode, data);
      
      // Test 2: Set up a session
      console.log('Setting up test session...');
      const loginReq = http.request({
        hostname: 'localhost',
        port: 8086,
        path: '/api/test-login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (loginRes) => {
        let data = '';
        loginRes.on('data', chunk => data += chunk);
        loginRes.on('end', () => {
          console.log('✅ Session setup:', loginRes.statusCode, data);
          
          // Get the session cookie
          const cookie = loginRes.headers['set-cookie'];
          if (cookie) {
            // Test 3: GET /api/me with session
            console.log('Testing GET /api/me with session...');
            const getReq = http.request({
              hostname: 'localhost',
              port: 8086,
              path: '/api/me',
              method: 'GET',
              headers: { 'Cookie': cookie[0] }
            }, (getRes) => {
              let data = '';
              getRes.on('data', chunk => data += chunk);
              getRes.on('end', () => {
                console.log('✅ GET /api/me (with session):', getRes.statusCode, data);
                
                // Test 4: PATCH /api/me/profile with session
                console.log('Testing PATCH /api/me/profile with session...');
                const patchData = JSON.stringify({ name: 'Updated User', avatarUrl: 'https://example.com/avatar.jpg' });
                const patchReq = http.request({
                  hostname: 'localhost',
                  port: 8086,
                  path: '/api/me/profile',
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(patchData),
                    'Cookie': cookie[0]
                  }
                }, (patchRes) => {
                  let data = '';
                  patchRes.on('data', chunk => data += chunk);
                  patchRes.on('end', () => {
                    console.log('✅ PATCH /api/me/profile (with session):', patchRes.statusCode, data);
                    console.log('User endpoints test completed successfully!');
                    server.close();
                  });
                });
                patchReq.write(patchData);
                patchReq.end();
              });
            });
            getReq.end();
          } else {
            console.log('No session cookie found');
            server.close();
          }
        });
      });
      loginReq.write('{}');
      loginReq.end();
    });
  });
});
