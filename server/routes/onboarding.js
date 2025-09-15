const express = require('express');
const router = express.Router();
const { validate, z } = require('../lib/validate');
const { db } = require('../db');

function requireAuth(req, res, next) {
    const token = req.cookies?.vah_session;
    if (!token) return res.status(401).json({ error: 'unauthenticated' });
    const user = db.prepare('SELECT * FROM user WHERE session_token = ?').get(token);
    if (!user) return res.status(401).json({ error: 'invalid_session' });
    req.user = user; next();
}

router.post('/business', requireAuth, validate(
    z.object({
        business_name: z.string().min(1),
        trading_name: z.string().optional().default(''),
        companies_house_number: z.string().optional().default(''),
        address_line1: z.string().min(1),
        address_line2: z.string().optional().default(''),
        city: z.string().min(1),
        postcode: z.string().min(2),
        phone: z.string().min(5),
        email: z.string().email()
    })
), (req, res) => {
    const u = req.user;
    const p = req.body;
    db.prepare(`
    UPDATE user SET 
      business_name=?, trading_name=?, companies_house_number=?, 
      address_line1=?, address_line2=?, city=?, postcode=?, phone=?, email=?,
      onboarding_step='business'
    WHERE id=?
  `).run(
        p.business_name, p.trading_name, p.companies_house_number,
        p.address_line1, p.address_line2, p.city, p.postcode, p.phone, p.email,
        u.id
    );
    res.json({ ok: true });
});

module.exports = router;
