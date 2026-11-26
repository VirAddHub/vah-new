// Regression tests for fixes from the 24 Nov 2026 security review.
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { isAllowedDocumentUrl } from '../../controllers/pdfProxy';
import { encodeHtmlText } from '../../server/routes/contact';
import { isPastAbsoluteLifetime, sessionVersionMatches, SESSION_ABSOLUTE_MAX_SECONDS } from '../../lib/sessionVersion';
import { isCorsOriginAllowed } from '../../lib/corsAllowlist';
import { passwordSchema } from '../../lib/passwordSchema';

describe('F01 legacy OneDrive webhook fails closed', () => {
    it('refuses every request when no credential is configured, before touching the database', async () => {
        delete process.env.ONEDRIVE_WEBHOOK_SECRET;
        delete process.env.ONEDRIVE_WEBHOOK_BASIC_USER;
        delete process.env.ONEDRIVE_WEBHOOK_BASIC_PASS;
        const { default: router } = await import('../../server/routes/webhooks-onedrive');
        const app = express();
        app.use(express.json());
        app.use('/hook', router);
        const res = await request(app).post('/hook').send({ userId: '1', fileUrl: 'https://example.com/x.pdf' });
        expect(res.status).toBe(503);
        expect(res.body.error).toBe('webhook_not_configured');
    });
});

describe('F34 document proxy destinations', () => {
    it('allows approved storage hosts over https only', () => {
        expect(isAllowedDocumentUrl('https://contoso-my.sharepoint.com/personal/x/Documents/a.pdf')).toBe(true);
        expect(isAllowedDocumentUrl('https://graph.microsoft.com/v1.0/drives/x')).toBe(true);
        expect(isAllowedDocumentUrl('http://contoso-my.sharepoint.com/a.pdf')).toBe(false);
        expect(isAllowedDocumentUrl('https://example.com/a.pdf')).toBe(false);
        expect(isAllowedDocumentUrl('https://sharepoint.com.evil.example/a.pdf')).toBe(false);
        expect(isAllowedDocumentUrl('https://169.254.169.254/latest/meta-data')).toBe(false);
        expect(isAllowedDocumentUrl('https://user:pass@contoso.sharepoint.com/a.pdf')).toBe(false);
    });
    it('allows a local scan server only outside production', () => {
        const prev = process.env.NODE_ENV;
        try {
            process.env.NODE_ENV = 'test';
            expect(isAllowedDocumentUrl('http://127.0.0.1:4011/scan.pdf')).toBe(true);
            process.env.NODE_ENV = 'production';
            expect(isAllowedDocumentUrl('http://127.0.0.1:4011/scan.pdf')).toBe(false);
            expect(isAllowedDocumentUrl('https://localhost/scan.pdf')).toBe(false);
        } finally { process.env.NODE_ENV = prev; }
    });
});

describe('F32 contact email encoding', () => {
    it('renders submitted text as text', () => {
        expect(encodeHtmlText('<b>hi</b> & "you"')).toBe('&lt;b&gt;hi&lt;/b&gt; &amp; &quot;you&quot;');
    });
});

describe('F29/F20 session rules', () => {
    it('enforces the absolute lifetime from the original sign-in time', () => {
        const now = 2_000_000_000;
        expect(isPastAbsoluteLifetime({ auth_time: now - SESSION_ABSOLUTE_MAX_SECONDS - 1 }, now)).toBe(true);
        expect(isPastAbsoluteLifetime({ auth_time: now - 60, iat: now - SESSION_ABSOLUTE_MAX_SECONDS * 2 }, now)).toBe(false);
        expect(isPastAbsoluteLifetime({ iat: now - SESSION_ABSOLUTE_MAX_SECONDS - 1 }, now)).toBe(true);
    });
    it('treats tokens without a version as version 0', () => {
        expect(sessionVersionMatches({}, 0)).toBe(true);
        expect(sessionVersionMatches({}, 1)).toBe(false);
        expect(sessionVersionMatches({ sv: 3 }, 3)).toBe(true);
    });
});

describe('F16 CORS', () => {
    it('does not grant localhost in production', () => {
        expect(isCorsOriginAllowed('http://localhost:3000', true)).toBe(false);
        expect(isCorsOriginAllowed('http://localhost:3000', false)).toBe(true);
    });
});

describe('F23 password length is bounded by bcrypt bytes', () => {
    it('rejects passwords over 72 UTF-8 bytes', () => {
        expect(passwordSchema.safeParse('Aa1' + 'x'.repeat(69)).success).toBe(true);   // 72 bytes
        expect(passwordSchema.safeParse('Aa1' + 'x'.repeat(70)).success).toBe(false);  // 73 bytes
        expect(passwordSchema.safeParse('Aa1' + 'é'.repeat(40)).success).toBe(false);  // 83 bytes, 43 chars
    });
});
