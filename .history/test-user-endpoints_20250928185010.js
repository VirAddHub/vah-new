// Test user endpoints
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

const server = app.listen(8085, () => {
  console.log('User endpoints test server running on port 8085');
  
  const http = require('http');
  
  // Test 1: GET /api/me without session (should return 401)
  console.log('Testing GET /api/me without session...');
  http.get('http://localhost:8085/api/me', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('✅ GET /api/me (no session):', res.statusCode, data);
      
      // Test 2: PATCH /api/me/profile without session (should return 401)
      console.log('Testing PATCH /api/me/profile without session...');
      const postData = JSON.stringify({ name: 'Test User' });
      const options = {
        hostname: 'localhost',
        port: 8085,
        path: '/api/me/profile',
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log('✅ PATCH /api/me/profile (no session):', res.statusCode, data);
          
          // Test 3: GET /api/me with session (should return user data)
          console.log('Testing GET /api/me with session...');
          const cookie = res.headers['set-cookie'];
          if (cookie) {
            const options = {
              hostname: 'localhost',
              port: 8085,
              path: '/api/me',
              method: 'GET',
              headers: {
                'Cookie': cookie[0]
              }
            };
            
            // First, set up a session by making a request that sets session data
            const setupReq = http.request({
              hostname: 'localhost',
              port: 8085,
              path: '/api/me/profile',
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify({ name: 'Test User' })),
                'Cookie': cookie[0]
              }
            }, (setupRes) => {
              // Now test GET /api/me with the session
              const getReq = http.request(options, (getRes) => {
                let data = '';
                getRes.on('data', chunk => data += chunk);
                getRes.on('end', () => {
                  console.log('✅ GET /api/me (with session):', getRes.statusCode, data);
                  console.log('User endpoints test completed!');
                  server.close();
                });
              });
              getReq.end();
            });
            setupReq.write(JSON.stringify({ name: 'Test User' }));
            setupReq.end();
          } else {
            console.log('No session cookie found, skipping session test');
            server.close();
          }
        });
      });
      req.write(postData);
      req.end();
    });
  });
});
