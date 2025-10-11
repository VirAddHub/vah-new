import { Router } from 'express';

const router = Router();

// DEBUG: Test route to verify router is loaded
router.get('/address/test', (req, res) => {
    res.json({ ok: true, message: 'Address router is loaded', timestamp: new Date().toISOString() });
});

// DEBUG: Simple address route without external API
router.get('/address', (req, res) => {
    const postcode = String(req.query.postcode || '').trim();
    if (!postcode) {
        return res.status(400).json({ ok: false, error: 'postcode required' });
    }
    
    // Return mock data for now
    res.json({ 
        ok: true, 
        data: { 
            addresses: [
                `${postcode} Test Address 1`,
                `${postcode} Test Address 2`,
                `${postcode} Test Address 3`
            ] 
        } 
    });
});

export default router;
