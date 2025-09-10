#!/usr/bin/env node

// Production smoke test - requires real authentication
// Usage: npm run smoke:prod

const BASE = process.env.BASE_URL || "http://localhost:4000";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
    console.error("❌ ADMIN_TOKEN environment variable required for production smoke test");
    console.error("   Set ADMIN_TOKEN to a valid admin JWT token");
    process.exit(1);
}

const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${ADMIN_TOKEN}`
};

async function jf(url, opts = {}) {
    const res = await fetch(url, { ...opts, headers: { ...headers, ...opts.headers } });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { error: text }; }
    return { ok: res.ok, status: res.status, json, text };
}

function assert(c, m) { if (!c) throw new Error(m); }

(async () => {
    console.log("🔍 Production smoke test starting...");
    console.log(`   Base URL: ${BASE}`);
    console.log(`   Admin token: ${ADMIN_TOKEN.substring(0, 20)}...`);

    const today = new Date().toISOString().slice(0, 10);
    const key = `PROD-${today.replace(/-/g, '')}-0001`;

    try {
        // 1) Health check
        const health = await jf(`${BASE}/api/health`);
        assert(health.ok, `Health check failed: ${health.status}`);
        console.log("✅ Health check passed");

        // 2) Create idempotent mail item
        const create = await jf(`${BASE}/api/admin/mail-items`, {
            method: "POST",
            body: JSON.stringify({
                user_id: 1,
                subject: "HMRC PAYE",
                sender_name: "HMRC",
                received_date: today,
                tag: "HMRC"
            }),
            headers: { ...headers, "Idempotency-Key": key }
        });
        assert(create.ok, `Create failed: ${create.status} ${JSON.stringify(create.json)}`);
        const itemId = create.json.mail_item_id || create.json.id;
        console.log(`✅ Created mail item: ${itemId}`);

        // 3) Repeat with same key -> should get same item
        const repeat = await jf(`${BASE}/api/admin/mail-items`, {
            method: "POST",
            body: JSON.stringify({
                user_id: 1,
                subject: "HMRC PAYE",
                sender_name: "HMRC",
                received_date: today,
                tag: "HMRC"
            }),
            headers: { ...headers, "Idempotency-Key": key }
        });
        assert(repeat.ok, `Repeat create failed: ${repeat.status}`);
        assert((repeat.json.mail_item_id || repeat.json.id) === itemId, "Idempotency failed - different ID returned");
        console.log("✅ Idempotency test passed");

        // 4) Try to mark as scanned without scan -> should get 409
        const guard = await jf(`${BASE}/api/admin/mail-items/${itemId}`, {
            method: "PUT",
            body: JSON.stringify({ status: "scanned" })
        });
        assert(guard.status === 409, `Expected 409 for scan guard, got ${guard.status}`);
        console.log("✅ Scan guard protection working");

        // 5) Attach scan file (simulate)
        const attach = await jf(`${BASE}/api/admin/mail-items/${itemId}`, {
            method: "PUT",
            body: JSON.stringify({
                scan_file_url: `https://graph.microsoft.com/v1.0/me/drive/items/FILE_ID_PROD/content`,
                file_size: 2048
            })
        });
        assert(attach.ok, `Attach scan failed: ${attach.status}`);
        console.log("✅ Scan file attached");

        // 6) Now mark as scanned -> should work
        const markScanned = await jf(`${BASE}/api/admin/mail-items/${itemId}`, {
            method: "PUT",
            body: JSON.stringify({ status: "scanned" })
        });
        assert(markScanned.ok, `Mark scanned failed: ${markScanned.status}`);
        console.log("✅ Mark as scanned successful");

        // 7) Issue scan URL
        const scanUrl = await jf(`${BASE}/api/mail-items/${itemId}/scan-url`);
        assert(scanUrl.ok && scanUrl.json.url, `Scan URL failed: ${scanUrl.status}`);
        console.log(`✅ Scan URL issued: ${scanUrl.json.url}`);

        // 8) Consume scan URL once -> should work
        const consume1 = await fetch(scanUrl.json.url, { headers: { "Authorization": `Bearer ${ADMIN_TOKEN}` } });
        assert(consume1.ok, `First consume failed: ${consume1.status}`);
        console.log("✅ Scan URL consumed (first time)");

        // 9) Consume scan URL again -> should get 410
        const consume2 = await fetch(scanUrl.json.url, { headers: { "Authorization": `Bearer ${ADMIN_TOKEN}` } });
        assert(consume2.status === 410, `Second consume should be 410, got ${consume2.status}`);
        console.log("✅ Scan URL single-use protection working");

        // 10) Test search
        const search = await jf(`${BASE}/api/search/mail?q=HMRC`);
        assert(search.ok, `Search failed: ${search.status}`);
        assert(search.json.items && search.json.items.length > 0, "Search returned no results");
        console.log(`✅ Search working: found ${search.json.total} items`);

        console.log("🎉 PRODUCTION SMOKE TEST PASSED!");
        console.log(`   All features working with real authentication`);
        process.exit(0);

    } catch (error) {
        console.error("❌ PRODUCTION SMOKE TEST FAILED:", error.message);
        process.exit(1);
    }
})();
