const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { validate, z } = require('../lib/validate');
const db = require('../db');

function requireAuth(req, res, next) {
    const token = req.cookies?.vah_session;
    if (!token) return res.status(401).json({ error: 'unauthenticated' });
    const user = db.prepare('SELECT * FROM user WHERE session_token = ?').get(token);
    if (!user) return res.status(401).json({ error: 'invalid_session' });
    req.user = user; next();
}

router.get('/profile/certificate-url', requireAuth, (_req, res) => {
    const u = _req.user;
    if (u.kyc_status !== 'approved') return res.status(403).json({ error: 'kyc_not_approved' });

    // Generate on the fly; in production store and return URL
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="proof-of-address.pdf"');

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);
    doc.fontSize(18).text('Proof of Address Certificate', { align: 'center' }).moveDown();
    doc.fontSize(12).text(`Client Name: ${u.first_name || ''} ${u.last_name || ''}`);
    doc.text(`Company: ${u.business_name || 'N/A'}`);
    doc.text(`CRN: ${u.companies_house_number || 'N/A'}`);
    doc.moveDown();
    doc.text(`Issued by: VirtualAddressHub`);
    doc.text(`Date: ${(new Date()).toLocaleDateString()}`);
    doc.moveDown().text('This document certifies that the above client is assigned a verified business address through VirtualAddressHub.', { align: 'left' });
    doc.end();
});

module.exports = router;
