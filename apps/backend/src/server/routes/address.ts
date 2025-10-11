import { Router } from 'express';

const router = Router();

// loud module-load log so we know the file is actually in the build
console.log('[address] router module loaded');

router.get('/', (req, res) => {
  console.log('[address] GET / (ok)');
  return res.json({ ok: true, ping: 'address-root' });
});

router.get('/test', (req, res) => {
  console.log('[address] GET /test (ok)');
  return res.json({ ok: true, pong: 'address-test' });
});

// Simple lookup route for testing
router.get('/lookup', (req, res) => {
  console.log('[address] GET /lookup (start)');
  
  // Return mock data for now
  const mockAddresses = [
    '123 Test Street, London, N7 0EY',
    '456 Sample Road, London, N7 0EY',
    '789 Example Avenue, London, N7 0EY'
  ];
  
  console.log('[address] Returning mock data');
  return res.json({ ok: true, data: { addresses: mockAddresses } });
});

export default router;
