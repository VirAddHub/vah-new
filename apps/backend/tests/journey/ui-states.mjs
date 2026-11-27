// Builds one dummy customer per account state, using only the API and mock provider events
// (no direct database writes), for checking the dashboard in a browser.
// Writes the logins to /tmp/vah-ui-states.json. Mock provider events: NOT provider-sandbox tests.
import { writeFileSync } from 'node:fs';
import { Session, db, stripeEvent, sendStripe, recordIdentity, importMail, setScanUrl, startPdfServer, stripeFixture } from './lib.mjs';

const PW = 'Journey!Passw0rd#1';
// --stable: fixed emails (ui.<state>@example.test) for trying the app by hand; existing ones are kept.
const STABLE = process.argv.includes('--stable');
const stamp = Date.now().toString(36);
const SKIP = Symbol('exists');
const pg = await db();
const one = async (sql, args) => (await pg.query(sql, args)).rows[0];
const plan = await one(`SELECT id FROM plans WHERE slug='virtual-mailbox-monthly'`);
// Reuse a scan server already listening (UI_SCAN_PORT), e.g. one left running for browser checks.
const scanPort = Number(process.env.UI_SCAN_PORT || 4012);
const pdf = await startPdfServer(scanPort).catch(() => ({ url: `http://127.0.0.1:${scanPort}/scan.pdf`, close() {} }));
if (!pdf.close) pdf.close = () => {};
const admin = new Session();
const a = await admin.post('/api/auth/login', { email: 'admin@example.test', password: 'Local!Admin#2026' });
if (a.status !== 200) throw new Error(`admin login ${a.status}`);

async function customer(tag) {
  const s = new Session(); const email = STABLE ? `ui.${tag}@example.test` : `ui.${tag}.${stamp}@example.test`;
  const r = await s.post('/api/auth/signup', {
    email, password: PW, first_name: 'Ui', last_name: tag[0].toUpperCase() + tag.slice(1),
    business_type: 'limited_company', country_of_incorporation: 'GB', company_number: '12345678', company_name: `UI ${tag} Ltd`,
    forward_to_first_name: 'Ui', forward_to_last_name: 'Customer', address_line1: '1 Test Street', city: 'London', postcode: 'SW1A 1AA', forward_country: 'GB',
    billing: 'monthly', price: '9.99', isSoleController: true, additionalControllersCount: 0,
  });
  const exists = STABLE && r.status === 409;
  if (!exists && r.status !== 200 && r.status !== 201) throw new Error(`signup ${tag}: ${r.status} ${r.text.slice(0, 120)}`);
  const id = Number((await one('SELECT id FROM "user" WHERE email=$1', [email])).id);
  const hasMail = exists && (await one('SELECT COUNT(*)::int AS n FROM mail_item WHERE user_id=$1 AND deleted=false AND scan_file_url IS NOT NULL', [id])).n > 0;
  if (!hasMail) {
    await importMail({ userId: id, sourceSlug: 'hmrc', fileName: `user${id}_2026-11-17_HMRC.pdf`, oneDriveFileId: `ui-${tag}-${stamp}`, oneDriveDownloadUrl: pdf.url, receivedAt: new Date().toISOString() });
    const mailId = Number((await one('SELECT id FROM mail_item WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [id])).id);
    await setScanUrl(mailId, pdf.url);
  }
  if (exists) { out[tag] = email; console.log(tag.padEnd(10), hasMail ? 'already exists, kept as it is' : 'already exists, dummy mail added'); throw SKIP; }
  return { s, id, email };
}
async function pay(id, inv = {}) {
  const fx = stripeFixture(id, plan.id, 'monthly');
  for (const e of [stripeEvent('checkout.session.completed', fx.checkout()), stripeEvent('customer.subscription.created', fx.sub('active')), stripeEvent('invoice.paid', fx.invoice(inv))]) {
    const r = await sendStripe(e); if (r.status !== 200) throw new Error(`${e.type} ${r.status}`);
  }
  return fx;
}
const verify = async id => { const r = await recordIdentity(id); if (r.status !== 200) throw new Error(`identity ${r.status}`); };
const out = {};
const done = async (tag, c) => { out[tag] = c.email; const acc = (await c.s.get('/api/access')).json?.data; console.log(tag.padEnd(10), acc ? `${acc.level} next=${acc.next} missing=${acc.missing.join(',')}` : 'no access (login refused)'); };

try { const c = await customer('unpaid'); await done('unpaid', c); } catch (e) { if (e !== SKIP) throw e; }
try { const c = await customer('paid'); await pay(c.id); await done('paid', c); } catch (e) { if (e !== SKIP) throw e; }
try { const c = await customer('full'); await pay(c.id); await verify(c.id); await done('full', c); } catch (e) { if (e !== SKIP) throw e; }
try { const c = await customer('owners'); await pay(c.id); await verify(c.id);
  const r = await c.s.post('/api/business-owners', { fullName: 'Second Director', email: `director.${stamp}@example.test` });
  if (r.status >= 300) throw new Error(`add owner ${r.status} ${r.text.slice(0, 120)}`); await done('owners', c); } catch (e) { if (e !== SKIP) throw e; }
try { const c = await customer('overdue'); const past = Math.floor(Date.now() / 1000) - 3 * 86400;
  // first month paid and ended 3 days ago; the renewal then fails
  const fx = await pay(c.id, { start: past - 30 * 86400, end: past }); await verify(c.id);
  await sendStripe(stripeEvent('invoice.payment_failed', fx.invoice({ amount_paid: 0, status: 'open' })));
  await sendStripe(stripeEvent('customer.subscription.updated', fx.sub('past_due', { current_period_end: past }), { created: Math.floor(Date.now() / 1000) + 5 }));
  await done('overdue', c); } catch (e) { if (e !== SKIP) throw e; }
try { const c = await customer('ending'); const fx = await pay(c.id); await verify(c.id);
  await sendStripe(stripeEvent('customer.subscription.updated', fx.sub('active', { cancel_at_period_end: true }), { created: Math.floor(Date.now() / 1000) + 5 }));
  await done('ending', c); } catch (e) { if (e !== SKIP) throw e; }
try { const c = await customer('cancelled'); const fx = await pay(c.id); await verify(c.id);
  await sendStripe(stripeEvent('customer.subscription.deleted', fx.sub('canceled'), { created: Math.floor(Date.now() / 1000) + 5 }));
  await done('cancelled', c); } catch (e) { if (e !== SKIP) throw e; }
try { const c = await customer('suspended'); await pay(c.id); await verify(c.id);
  const r = await admin.post(`/api/admin/users/${c.id}/suspend`, { reason: 'UI state check: suspended' }); if (r.status !== 200) throw new Error(`suspend ${r.status} ${r.text.slice(0, 100)}`);
  await done('suspended', c); } catch (e) { if (e !== SKIP) throw e; }
try { const c = await customer('restored'); await pay(c.id); await verify(c.id);
  await admin.post(`/api/admin/users/${c.id}/suspend`, { reason: 'UI state check: suspend before restore' });
  const r = await admin.post(`/api/admin/users/${c.id}/restore-standing`, { reason: 'UI state check: restored' }); if (r.status !== 200) throw new Error(`restore ${r.status} ${r.text.slice(0, 100)}`);
  await done('restored', c); } catch (e) { if (e !== SKIP) throw e; }
try { const c = await customer('closed'); await pay(c.id); await verify(c.id);
  const r = await admin.post(`/api/admin/users/${c.id}/close`, { reason: 'UI state check: closed' }); if (r.status !== 200) throw new Error(`close ${r.status} ${r.text.slice(0, 100)}`);
  await done('closed', c); } catch (e) { if (e !== SKIP) throw e; }

writeFileSync('/tmp/vah-ui-states.json', JSON.stringify({ password: PW, users: out }, null, 1));
pdf.close(); await pg.end();
