// Postmark template sending with fallbacks. Converted from Jest to Vitest (it could not load before).
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

// The module reads these when it loads, so set them before importing it.
const env = vi.hoisted(() => {
    const saved = { NODE_ENV: process.env.NODE_ENV, POSTMARK_TOKEN: process.env.POSTMARK_TOKEN, DEV_EMAIL_OVERRIDE: process.env.DEV_EMAIL_OVERRIDE };
    process.env.POSTMARK_TOKEN = 'test-token';
    process.env.DEV_EMAIL_OVERRIDE = 'dev@example.com';
    return saved;
});
const pm = vi.hoisted(() => ({ sendEmailWithTemplate: vi.fn(), sendEmail: vi.fn() }));
vi.mock('postmark', () => ({
    ServerClient: vi.fn(function ServerClient() { return pm; }),
}));

import * as mailer from './mailer';

describe('sendTemplateEmail', () => {
    beforeEach(() => {
        pm.sendEmailWithTemplate.mockReset();
        pm.sendEmail.mockReset();
        process.env.NODE_ENV = 'test';
    });
    afterAll(() => {
        for (const [k, v] of Object.entries(env)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    });

    const model = (name: string) => ({ name, score: 72, segment_label: 'Mid', cta_label: 'View', cta_url: 'https://x' });

    it('prefers the template alias, sent to the development override address', async () => {
        pm.sendEmailWithTemplate.mockResolvedValueOnce({});
        const mode = await mailer.sendTemplateEmail({ to: 'real@user.com', alias: mailer.Templates.QuizDay0, templateIdFallback: 42035123, model: model('Alex') });
        expect(mode).toBe('template');
        expect(pm.sendEmailWithTemplate).toHaveBeenCalledWith(expect.objectContaining({ TemplateAlias: 'quiz-day0', To: 'dev@example.com' }));
        expect(pm.sendEmail).not.toHaveBeenCalled();
    });

    it('falls back to the numeric template id when the alias fails', async () => {
        pm.sendEmailWithTemplate.mockRejectedValueOnce(new Error('alias missing')).mockResolvedValueOnce({});
        const mode = await mailer.sendTemplateEmail({ to: 'real@user.com', alias: mailer.Templates.QuizDay0, templateIdFallback: 42035123, model: model('Dana') });
        expect(mode).toBe('templateId');
        expect(pm.sendEmailWithTemplate).toHaveBeenCalledTimes(2);
        expect(pm.sendEmailWithTemplate).toHaveBeenNthCalledWith(1, expect.objectContaining({ TemplateAlias: 'quiz-day0' }));
        expect(pm.sendEmailWithTemplate).toHaveBeenNthCalledWith(2, expect.objectContaining({ TemplateId: 42035123 }));
    });

    it('falls back to a plain email when both template methods fail', async () => {
        pm.sendEmailWithTemplate.mockRejectedValueOnce(new Error('alias missing')).mockRejectedValueOnce(new Error('template id missing'));
        pm.sendEmail.mockResolvedValueOnce({});
        const mode = await mailer.sendTemplateEmail({ to: 'real@user.com', alias: mailer.Templates.QuizDay0, templateIdFallback: 42035123, model: model('Jordan') });
        expect(mode).toBe('fallback');
        expect(pm.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ Subject: expect.stringContaining('Compliance Score'), TextBody: expect.stringContaining('Hi Jordan') }));
    });

    it('uses the real recipient in production', async () => {
        process.env.NODE_ENV = 'production';
        pm.sendEmailWithTemplate.mockResolvedValueOnce({});
        await mailer.sendTemplateEmail({ to: 'real@user.com', alias: mailer.Templates.QuizDay0, templateIdFallback: 42035123, model: { name: 'Test', score: 80 } });
        expect(pm.sendEmailWithTemplate).toHaveBeenCalledWith(expect.objectContaining({ To: 'real@user.com' }));
    });
});
