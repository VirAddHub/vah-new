const BASE = process.env.BASE_URL || "http://localhost:4000";
const headers = { "Content-Type": "application/json", "X-Dev-Admin": "1" };

async function jf(url, opts = {}) {
    const res = await fetch(url, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
    const text = await res.text();
    let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text } }
    return { ok: res.ok, status: res.status, json, text };
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

(async () => {
    const today = new Date().toISOString().slice(0, 10);

    // 0) sanity
    let r = await jf(`${BASE}/__status`);                                   // optional
    console.log("health:", r.status, r.json || r.text);

    // 1) create (idempotent)
    const idem = `250910-0001`; // YYMMDD-#### format
    r = await jf(`${BASE}/api/admin/mail-items`, {
        method: "POST",
        headers: { "Idempotency-Key": idem },
        body: JSON.stringify({ user_id: 1, subject: "HMRC PAYE", sender_name: "HMRC", received_date: today, tag: "HMRC" })
    });
    assert(r.ok, `create failed: ${r.status} ${JSON.stringify(r.json)}`);
    const itemId = r.json.mail_item_id || r.json.id;
    assert(itemId, "missing mail_item_id");
    console.log("created:", itemId);

    // 1b) create again w/ same key → same id
    const r2 = await jf(`${BASE}/api/admin/mail-items`, {
        method: "POST",
        headers: { "Idempotency-Key": idem },
        body: JSON.stringify({ user_id: 1, subject: "HMRC PAYE", sender_name: "HMRC", received_date: today, tag: "HMRC" })
    });
    assert(r2.ok, `idempotent create failed: ${r2.status}`);
    assert((r2.json.mail_item_id || r2.json.id) === itemId, "idempotency returned different id");

    // 2) guard: mark scanned BEFORE attach → 409 (create fresh item for guard test)
    const guardIdem = `250910-0002`;
    const guardItem = await jf(`${BASE}/api/admin/mail-items`, {
        method: "POST",
        headers: { "Idempotency-Key": guardIdem },
        body: JSON.stringify({ user_id: 1, subject: "Guard Test", sender_name: "Test", received_date: today, tag: "Test" })
    });
    assert(guardItem.ok, `guard item create failed: ${guardItem.status}`);
    const guardItemId = guardItem.json.mail_item_id || guardItem.json.id;

    r = await jf(`${BASE}/api/admin/mail-items/${guardItemId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "scanned" })
    });
    assert(r.status === 409, `expected 409 guard, got ${r.status}`);

    // 3) attach scan (simulate by directly updating the database)
    const path = `/Clients/1 - Dev Admin/${today.slice(0, 4)}/${today.slice(5, 7)}/mail_${itemId}.pdf`;
    r = await jf(`${BASE}/api/admin/mail-items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ scan_file_url: `https://graph.microsoft.com/v1.0/me/drive/items/FILE_ID_SMOKE/content`, file_size: 1024 })
    });
    assert(r.ok, `attach failed: ${r.status} ${JSON.stringify(r.json)}`);

    // 4) mark scanned → 200
    r = await jf(`${BASE}/api/admin/mail-items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "scanned" })
    });
    assert(r.ok, `mark scanned failed: ${r.status} ${JSON.stringify(r.json)}`);

    // 5) get scan-url → { url, expires_at }
    r = await jf(`${BASE}/api/mail-items/${itemId}/scan-url`);
    assert(r.ok && r.json.url && r.json.expires_at, `scan-url failed: ${r.status} ${JSON.stringify(r.json)}`);
    console.log("issued:", r.json.url, "exp:", r.json.expires_at);

    // 6) consume once → 200
    const once = await fetch(r.json.url, { headers: { "X-Dev-Admin": "1" } });
    const onceText = await once.text();
    assert(once.ok, `consume failed: ${once.status} ${onceText}`);
    console.log("consumed(1):", once.status);

    // 7) consume again → 410
    const twice = await fetch(r.json.url, { headers: { "X-Dev-Admin": "1" } });
    const twiceText = await twice.text();
    assert(twice.status === 410, `second consume should be 410, got ${twice.status} ${twiceText}`);
    console.log("consumed(2):", twice.status);

    console.log("✅ SMOKE OK", { itemId });
    process.exit(0);
})().catch(e => {
    console.error("❌ SMOKE FAIL:", e.message);
    process.exit(1);
});
