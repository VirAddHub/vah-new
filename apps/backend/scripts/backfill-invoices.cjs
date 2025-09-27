#!/usr/bin/env node
/**
 * Backfill invoice PDFs for past payments (SQLite).
 * Sources:
 *  1) DB table 'payments' or 'gocardless_payments' if present; OR
 *  2) CSV at ./data/backfill/gc_payments.csv with columns:
 *     user_id,payment_id,amount_pence,charge_date,interval
 *
 * Writes PDFs to INVOICE_PDF_DIR (default ./data/invoices).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dayjs = require('dayjs');
const PDFDocument = require('pdfkit');
const Database = require('better-sqlite3');

const DB_FILE = process.env.DB_FILE || path.join(process.cwd(), 'data', 'app.db');
const INVOICE_PDF_DIR = process.env.INVOICE_PDF_DIR || path.join(process.cwd(), 'data', 'invoices');
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');

function ensureDirSync(d) { fs.mkdirSync(d, { recursive: true }); }
function fmtGBP(p) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format((p || 0) / 100); }
function mkInvoiceNumber(createdAt, seq) { const y = dayjs(createdAt).format('YYYY'); return `VAH-${y}-${String(seq).padStart(6, '0')}`; }

function tableExists(name) {
    try { db.prepare(`SELECT 1 FROM ${name} LIMIT 1`).get(); return true; } catch { return false; }
}
function columnExists(table, col) {
    try { const r = db.prepare(`PRAGMA table_info(${table})`).all(); return r.some(c => c.name === col); } catch { return false; }
}

function ensureInvoiceTables() {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS invoice (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            number TEXT NOT NULL,
            gocardless_payment_id TEXT,
            amount_pence INTEGER NOT NULL,
            currency TEXT NOT NULL DEFAULT 'GBP',
            period_start TEXT NOT NULL,
            period_end   TEXT NOT NULL,
            pdf_path TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_number ON invoice(number)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_invoice_user ON invoice(user_id)`).run();
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

function detectPayments() {
    // Try common tables; normalize fields to {user_id, payment_id, amount_pence, charge_date}
    const candidates = [];
    if (tableExists('payments') && columnExists('payments', 'user_id')) {
        const sql = `
            SELECT user_id,
                   COALESCE(gocardless_payment_id, payment_id, id) AS payment_id,
                   COALESCE(amount_pence, amount * 100, amount) AS amount_pence,
                   COALESCE(charge_date, created_at) AS charge_date
            FROM payments
        `;
        candidates.push(...db.prepare(sql).all());
    } else if (tableExists('gocardless_payments') && columnExists('gocardless_payments', 'user_id')) {
        const sql = `
            SELECT user_id,
                   COALESCE(payment_id, id) AS payment_id,
                   COALESCE(amount_pence, amount * 100, amount) AS amount_pence,
                   COALESCE(charge_date, created_at) AS charge_date
            FROM gocardless_payments
        `;
        candidates.push(...db.prepare(sql).all());
    } else {
        // CSV fallback
        const csvPath = path.join(process.cwd(), 'data', 'backfill', 'gc_payments.csv');
        if (fs.existsSync(csvPath)) {
            const lines = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
            for (let i = 1; i < lines.length; i++) {
                const [user_id, payment_id, amount_pence, charge_date] = lines[i].split(',').map(s => s.trim());
                candidates.push({ user_id: Number(user_id), payment_id, amount_pence: Number(amount_pence), charge_date });
            }
        }
    }
    return candidates.filter(r => r.user_id && r.amount_pence && r.charge_date);
}

async function main() {
    ensureInvoiceTables();
    ensureDirSync(INVOICE_PDF_DIR);
    const rows = detectPayments();
    if (!rows.length) {
        console.log('No payment records found. Create data/backfill/gc_payments.csv or confirm your payments table.');
        process.exit(0);
    }
    let created = 0, skipped = 0;
    for (const p of rows) {
        const exists = db.prepare(`SELECT id FROM invoice WHERE gocardless_payment_id = ?`).get(p.payment_id);
        if (exists) { skipped++; continue; }
        const user = db.prepare(`SELECT * FROM user WHERE id = ?`).get(p.user_id);
        if (!user) { skipped++; continue; }
        const plan = user.plan_id ? db.prepare(`SELECT * FROM plans WHERE id = ?`).get(user.plan_id) : null;
        const interval = (plan?.interval || 'month').toLowerCase(); // 'month' | 'year'
        const chargeDate = dayjs(p.charge_date);
        const period_start = chargeDate.startOf('day');
        const period_end = interval === 'year' ? period_start.add(1, 'year').subtract(1, 'day')
            : period_start.add(1, 'month').subtract(1, 'day');
        const ins = db.prepare(`
            INSERT INTO invoice (user_id, number, gocardless_payment_id, amount_pence, currency, period_start, period_end, pdf_path)
            VALUES (@user_id, 'PENDING', @gpid, @amount_pence, 'GBP', @start, @end, 'PENDING')
        `).run({
            user_id: user.id,
            gpid: p.payment_id,
            amount_pence: p.amount_pence,
            start: period_start.toISOString(),
            end: period_end.toISOString()
        });
        const id = ins.lastInsertRowid;
        const createdRow = db.prepare(`SELECT created_at FROM invoice WHERE id = ?`).get(id);
        const number = mkInvoiceNumber(createdRow?.created_at || new Date(), id);
        const filePath = path.join(INVOICE_PDF_DIR, dayjs().format('YYYY'), String(user.id), `${number}.pdf`);
        await renderInvoicePDF({
            filePath,
            invoice: { number, amount_pence: p.amount_pence, period_start: period_start.toISOString(), period_end: period_end.toISOString(), created_at: createdRow?.created_at },
            user,
            plan
        });
        db.prepare(`UPDATE invoice SET number = ?, pdf_path = ? WHERE id = ?`).run(number, filePath, id);
        created++;
        if (created % 50 === 0) console.log(`Created ${created} invoices…`);
    }
    console.log(`Done. Created: ${created}, Skipped (already had): ${skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); });
