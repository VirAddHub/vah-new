// server/mailer.js
const fetch = require('node-fetch');

const POSTMARK_TOKEN = process.env.POSTMARK_TOKEN;
const FROM_EMAIL = process.env.POSTMARK_FROM || 'no-reply@virtualaddresshub.co.uk';
const SERVER = 'https://api.postmarkapp.com/email/withTemplate';

async function send(templateAlias, to, templateModel) {
    if (!POSTMARK_TOKEN) {
        console.log('[mailer] dry-run', { templateAlias, to, templateModel });
        return;
    }
    const res = await fetch(SERVER, {
        method: 'POST',
        headers: {
            'X-Postmark-Server-Token': POSTMARK_TOKEN,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            From: FROM_EMAIL,
            To: to,
            TemplateAlias: templateAlias,
            TemplateModel: templateModel,
            MessageStream: 'outbound'
        })
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('[mailer] postmark error', res.status, text);
    }
}

module.exports = { send };
