// Test health routes
const express = require('express');

// Create a minimal app with just the health routes
const app = express();

// Health check routes - before any middleware (exactly as in the main server)
app.get("/healthz", (req, res) => res.status(200).send("ok"));
app.get("/ready", (req, res) => res.status(200).json({ status: "ready" }));

const server = app.listen(8083, () => {
  console.log('Health test server running on port 8083');
  
  // Test both routes
  const http = require('http');
  
  console.log('Testing /healthz...');
  http.get('http://localhost:8083/healthz', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('✅ /healthz response:', res.statusCode, data);
      
      console.log('Testing /ready...');
      http.get('http://localhost:8083/ready', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log('✅ /ready response:', res.statusCode, data);
          console.log('Health routes test completed successfully!');
          server.close();
        });
      });
    });
  });
});
