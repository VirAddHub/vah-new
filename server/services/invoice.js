const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dayjs = require('dayjs');
const PDFDocument = require('pdfkit');

const INVOICE_PDF_DIR = process.env.INVOICE_PDF_DIR || path.join(process.cwd(), 'data', 'invoices');

function fmtGBP(pence) {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format((pence || 0) / 100);
}

function mkInvoiceNumber(createdAt, seq) {
    const y = dayjs(createdAt).format('YYYY');
    return `VAH-${y}-${String(seq).padStart(6, '0')}`;
}

function randToken() {
    return crypto.randomBytes(24).toString('hex');
}

function ensureDirSync(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function renderInvoicePDF({ filePath, invoice, user, plan }) {
    ensureDirSync(path.dirname(filePath));
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(18).text('VirtualAddressHub', { align: 'right' });
    doc.moveDown();
    doc.fontSize(11).text(`Invoice: ${invoice.number}`);
    doc.text(`Date: ${dayjs(invoice.created_at || new Date()).format('DD MMM YYYY')}`);
    doc.text(`Customer: ${user.business_name || user.email}`);
    doc.text(`Email: ${user.email}`);
    if (user.trading_name) doc.text(`Trading name: ${user.trading_name}`);
    doc.moveDown();
    doc.text(`Plan: ${plan?.name || 'Subscription'}`);
    doc.text(`Billing period: ${dayjs(invoice.period_start).format('DD MMM YYYY')} – ${dayjs(invoice.period_end).format('DD MMM YYYY')}`);
    doc.moveDown();
    doc.text(`Amount: ${fmtGBP(invoice.amount_pence)}`, { underline: true });
    doc.moveDown(2);
    doc.fontSize(9).fillColor('#666').text('Thank you for your business.');

    doc.end();
    return new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
    });
}

function issueInvoiceToken(invoiceId, ttlMinutes = 30) {
    const { db } = require('../db.js');
    const token = randToken();
    const expires_at = dayjs().add(ttlMinutes, 'minute').toDate().toISOString();
    db.prepare(`INSERT INTO invoice_token (token, invoice_id, expires_at) VALUES (?, ?, ?)`).run(token, invoiceId, expires_at);
    return token;
}

async function createInvoiceFromPayment({ user, plan, gcPayment }) {
    const { db } = require('../db.js');

    // gcPayment fields you typically have: id, amount (in pence), charge_date (YYYY-MM-DD)
    const amount_pence = gcPayment.amount;
    const chargeDate = dayjs(gcPayment.charge_date);
    const interval = (plan?.interval || 'month').toLowerCase(); // 'month' | 'year'
    const period_start = chargeDate.startOf('day');
    const period_end = interval === 'year' ? period_start.add(1, 'year').subtract(1, 'day')
        : period_start.add(1, 'month').subtract(1, 'day');

    // provisional row to get seq id
    const ins = db.prepare(`
        INSERT INTO invoice (user_id, number, gocardless_payment_id, amount_pence, currency, period_start, period_end, pdf_path)
        VALUES (@user_id, 'PENDING', @gpid, @amount_pence, 'GBP', @start, @end, 'PENDING')
    `).run({
        user_id: user.id,
        gpid: gcPayment.id,
        amount_pence,
        start: period_start.toISOString(),
        end: period_end.toISOString()
    });

    const id = ins.lastInsertRowid;
    const created = db.prepare(`SELECT created_at FROM invoice WHERE id = ?`).get(id);
    const number = mkInvoiceNumber(created?.created_at || new Date(), id);
    const filePath = path.join(INVOICE_PDF_DIR, dayjs().format('YYYY'), String(user.id), `${number}.pdf`);

    await renderInvoicePDF({
        filePath,
        invoice: {
            number,
            amount_pence,
            period_start: period_start.toISOString(),
            period_end: period_end.toISOString(),
            created_at: created?.created_at
        },
        user,
        plan
    });

    db.prepare(`UPDATE invoice SET number = ?, pdf_path = ? WHERE id = ?`).run(number, filePath, id);
    const token = issueInvoiceToken(id, 60); // 60 min validity
    return { id, number, filePath, token, period_start, period_end, amount_pence };
}

module.exports = {
    createInvoiceFromPayment,
    issueInvoiceToken,
    renderInvoicePDF
};
