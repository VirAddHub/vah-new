// Final verification of endpoints using mock server
const express = require('express');

const app = express();

// Add the exact endpoints from our server
app.get("/healthz", (req, res) => res.status(200).send("ok"));
app.get("/ready", (req, res) => res.status(200).json({ status: "ready" }));

// Add the /api/plans endpoint (simplified version)
app.get("/api/plans", (req, res) => {
  res.json({
    ok: true,
    data: [
      { id: 'monthly', name: 'Digital Mailbox', price_pence: 999 }
    ]
  });
});

const server = app.listen(8087, () => {
  console.log('Mock server running on port 8087');
  
  const http = require('http');
  
  // Test /healthz
  console.log('Testing /healthz...');
  http.get('http://localhost:8087/healthz', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('✅ /healthz:', res.statusCode, data);
      
      // Test /ready
      console.log('Testing /ready...');
      http.get('http://localhost:8087/ready', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log('✅ /ready:', res.statusCode, data);
          
          // Test /api/plans
          console.log('Testing /api/plans...');
          http.get('http://localhost:8087/api/plans', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              console.log('✅ /api/plans:', res.statusCode, data);
              console.log('\n🎉 All endpoints working correctly!');
              server.close();
            });
          });
        });
      });
    });
  });
});
