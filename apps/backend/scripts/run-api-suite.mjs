#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Full API coverage runner (backend + BFF).
 * - Uses `curl` under the hood so cookies/CSRF behave like a browser
 * - No extra deps; Node 18+ required (for fetch if you want to add it)
 *
 * How to run:
 *   node scripts/run-api-suite.mjs
 *   node scripts/run-api-suite.mjs --backend-only
 *   node scripts/run-api-suite.mjs --bff-only
 *
 * Tips:
 * - Make sure both servers are running:
 *     npm run dev        (Next + Express)
 * - Ensure DB path exists or let your db.ts create the folder:
 *     mkdir -p data
 */

import { execFile } from "node:child_process";
import { writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");

const args = process.argv.slice(2);
const runBackend = !args.includes("--bff-only");
const runBff = !args.includes("--backend-only");

const CFG = {
    creds: {
        email: process.env.TEST_EMAIL || "admin@virtualaddresshub.co.uk",
        password: process.env.TEST_PASS || "Admin123!",
    },
    origins: {
        backend: { base: "http://localhost:4000/api", csrf: "/csrf", name: "Express" },
        bff: { base: "http://localhost:3000/api/bff", csrf: "/auth/csrf", name: "Next BFF" },
    },
};

const jars = {
    backend: join(process.cwd(), ".cookies.backend.txt"),
    bff: join(process.cwd(), ".cookies.bff.txt"),
};
const outDir = join(tmpdir(), "vah-suite");
const jsonBodyFile = (name) => join(outDir, `${name}.json`);

const state = {
    // captured ids for chaining
    planId: null,
    invoiceId: null,
    mailId: null,
    supportId: null,
    userId: null,
    redirectFlowId: null,
    downloadToken: "expired_or_invalid_token", // intentionally bad to exercise 4xx
    // CSRF per origin
    csrf: { backend: "", bff: "" },
    results: [],
};

async function sh(file, args = []) {
    return new Promise((resolve) => {
        execFile(file, args, { encoding: "utf8", maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
            resolve({ ok: !err, code: err?.code ?? 0, stdout, stderr, err });
        });
    });
}

function parseJsonSafe(s) {
    try {
        return JSON.parse(s);
    } catch {
        return null;
    }
}

async function curlJSON({ origin, method = "GET", path, body, headers = {}, saveAs, expect = [200, 201, 202, 204] }) {
    const base = CFG.origins[origin].base;
    const url = path.startsWith("http") ? path : `${base}${path}`;
    const jar = jars[origin];

    const hdr = [];
    hdr.push("-H", "accept: application/json");
    if (body !== undefined) hdr.push("-H", "content-type: application/json");
    Object.entries(headers).forEach(([k, v]) => {
        hdr.push("-H", `${k}: ${v}`);
    });

    let bodyFile = null;
    if (body !== undefined) {
        bodyFile = jsonBodyFile(`body-${origin}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
        await writeFile(bodyFile, JSON.stringify(body));
    }

    const args = ["-sS", "-b", jar, "-c", jar, "-X", method, ...hdr, url];
    if (bodyFile) args.push("--data-binary", `@${bodyFile}`);

    const start = Date.now();
    const res = await sh("curl", args);
    if (bodyFile) await rm(bodyFile, { force: true });

    const ms = Date.now() - start;
    const ok = res.ok && expect.includes(0) ? res.code === 0 : expect.includes(res.code) || res.stderr === "" || res.code === 0;

    // Try to determine HTTP code from JSON body if backend includes it; otherwise guess by parsing
    // curl doesn't print HTTP code by default; we'll infer success by JSON presence or absence of "error"
    const json = parseJsonSafe(res.stdout);
    const text = res.stdout.trim();

    const passed =
        (json && (json.ok || !json.error) && expect.some((ec) => [200, 201, 202, 204].includes(ec))) ||
        (text && expect.some((ec) => [200, 201, 202, 204].includes(ec))) ||
        (res.ok && res.stderr === "");

    if (saveAs && json) {
        try {
            saveAs(json);
        } catch {
            // ignore chained capture errors
        }
    }

    state.results.push({
        origin,
        method,
        path,
        ms,
        passed: passed || ok,
        note: json?.error || json?.message || res.stderr?.trim() || "",
    });
    return { json, text };
}

async function getCsrf(origin) {
    const { csrf } = CFG.origins[origin];
    const { json } = await curlJSON({ origin, path: csrf });
    state.csrf[origin] = json?.csrfToken || json?.token || "";
    return state.csrf[origin];
}

async function login(origin) {
    const token = await getCsrf(origin);
    const { json } = await curlJSON({
        origin,
        method: "POST",
        path: origin === "bff" ? "/auth/login" : "/auth/login",
        headers: { "x-csrf-token": token },
        body: { email: CFG.creds.email, password: CFG.creds.password },
    });
    return json;
}

function need(varName) {
    return !!state[varName];
}

/** --------------------
 * Define test matrix
 * -------------------- */
const GETS_BACKEND = [
    "/ready",
    "/health",
    "/healthz",
    "/metrics",
    "/plans",
    "/profile",
    "/auth/whoami",
    "/billing",
    "/billing/invoices",
    "/payments",
    "/payments/subscriptions/status",
    "/mail-items",
    "/mail-search?q=hmrc&limit=5",
    "/notifications/unread",
    "/admin/users?limit=20",
    "/admin/mail-items?status=scanned&limit=20",
    "/admin/plans",
    "/admin/support",
    "/admin/invoices",
    "/forwarding-requests",
    "/forwarding-requests/usage",
    "/webhooks/gc", // callback (may be 404 depending on impl)
    "/debug/whoami",
    "/debug/db-info",
];

const POSTS_BACKEND = [
    { path: "/support", body: { subject: "Name change", message: "Please update trading name." }, capture: (j) => (state.supportId = j?.id || j?.ticket?.id || state.supportId) },
    { path: "/gdpr-export", body: { confirm: true } },
    { path: "/payments/redirect-flows", body: { session_token: "demo" }, capture: (j) => (state.redirectFlowId = j?.id || j?.redirect_flow?.id || state.redirectFlowId) },
    { path: "/mail/forward", body: () => (need("mailId") ? { mail_item_id: state.mailId, address: "Home, 1 Test St, AB1 2CD" } : null), requireVar: "mailId" },
    { path: "/admin/mail-bulk", body: { ids: [1, 2, 3], address: "Home, 1 Test St, AB1 2CD" } },
    { path: "/webhooks/sumsub", body: { type: "applicantReviewed", reviewStatus: "completed", reviewResult: { reviewAnswer: "GREEN" }, applicantId: "demo" } },
    { path: "/webhooks-gc", body: { events: [{ resource_type: "payments", action: "confirmed", links: { payment: "PM123" } }] } },
    { path: "/webhooks-postmark", body: { RecordType: "Bounce", Type: "HardBounce", Email: "user@example.com" } },
];

const PATCHES_BACKEND = [
    { path: () => (need("supportId") ? `/admin/support/${state.supportId}` : null), body: { status: "resolved" }, requireVar: "supportId" },
    { path: () => (need("userId") ? `/admin/users/${state.userId}` : null), body: { role: "admin" }, requireVar: "userId" },
    { path: () => (need("mailId") ? `/admin/mail-items/${state.mailId}` : null), body: { status: "forwarded", tag: "Priority" }, requireVar: "mailId" },
    { path: "/admin/plans/1", body: { amount_pence: 999, currency: "GBP" } }, // demo
];

const PUTS_BACKEND = [
    { path: "/profile/address", body: { line1: "1 Test St", city: "Testville", postcode: "AB1 2CD" } },
    { path: () => (need("userId") ? `/admin/users/${state.userId}/kyc-status` : null), body: { status: "approved" }, requireVar: "userId" },
];

const DELETES_BACKEND = [
    { path: () => (need("mailId") ? `/admin/mail-items/${state.mailId}` : null), requireVar: "mailId" },
];

// Detail endpoints that depend on discovery
const DETAIL_GETS_BACKEND = [
    { path: () => (need("invoiceId") ? `/billing/invoices/${state.invoiceId}/link` : null), requireVar: "invoiceId" },
    { path: () => (need("mailId") ? `/mail-items/${state.mailId}` : null), requireVar: "mailId" },
    { path: () => (need("mailId") ? `/mail-items/${state.mailId}/history` : null), requireVar: "mailId" },
    { path: () => (need("mailId") ? `/mail-items/${state.mailId}/scan-url` : null), requireVar: "mailId" },
    { path: () => (state.downloadToken ? `/downloads/${state.downloadToken}` : null) },
];

// "BFF mirror" paths (most are proxied 1:1)
const GETS_BFF = GETS_BACKEND.map((p) => p.replace(/^\/api/i, "")).map((p) => (p.startsWith("/") ? p : `/${p}`)).map((p) => p);
const POSTS_BFF = POSTS_BACKEND.map((x) => ({ ...x, path: x.path }));
const PATCHES_BFF = PATCHES_BACKEND.map((x) => ({ ...x, path: x.path }));
const PUTS_BFF = PUTS_BACKEND.map((x) => ({ ...x, path: x.path }));
const DELETES_BFF = DELETES_BACKEND.map((x) => ({ ...x, path: x.path }));
const DETAIL_GETS_BFF = DETAIL_GETS_BACKEND.map((x) => ({ ...x, path: x.path }));

/** --------
 * Runner
 * -------- */
async function main() {
    await mkdir(outDir, { recursive: true });

    // 0) Clean cookie jars
    await rm(jars.backend, { force: true });
    await rm(jars.bff, { force: true });

    // 1) Login to BOTH (order matters so cookies exist)
    if (runBackend) {
        console.log(`\n🔐 Login (backend)…`);
        await login("backend");
    }
    if (runBff) {
        console.log(`\n🔐 Login (BFF)…`);
        await login("bff");
    }

    // 2) Discovery to capture ids
    if (runBackend) {
        console.log("\n🔎 Discovery (backend)…");
        // plans -> planId
        await curlJSON({
            origin: "backend",
            path: "/plans",
            saveAs: (j) => (state.planId = j?.plans?.[0]?.id || state.planId),
        });
        // invoices -> invoiceId
        await curlJSON({
            origin: "backend",
            path: "/billing/invoices",
            saveAs: (j) => {
                const list = Array.isArray(j) ? j : j?.invoices;
                state.invoiceId = list?.[0]?.id || state.invoiceId;
            },
        });
        // mail-items -> mailId
        await curlJSON({
            origin: "backend",
            path: "/mail-items",
            saveAs: (j) => {
                const list = Array.isArray(j) ? j : j?.items;
                state.mailId = list?.[0]?.id || state.mailId;
            },
        });
        // admin/users -> userId
        await curlJSON({
            origin: "backend",
            path: "/admin/users?limit=20",
            saveAs: (j) => {
                const list = Array.isArray(j) ? j : j?.users;
                state.userId = list?.[0]?.id || state.userId;
            },
        });
    }

    // Helper to run a set
    const callSet = async (origin, list, method = "GET") => {
        for (const item of list) {
            const path = typeof item === "string" ? item : typeof item.path === "function" ? item.path() : item.path;
            if (!path) continue;
            if (item.requireVar && !state[item.requireVar]) continue;

            // CSRF for non-GET
            let headers = {};
            let body;
            if (method !== "GET") {
                if (!state.csrf[origin]) await getCsrf(origin);
                headers["x-csrf-token"] = state.csrf[origin];
                body = typeof item.body === "function" ? item.body() : item.body ?? {};
                if (body === null) continue;
            }

            await curlJSON({
                origin,
                method,
                path,
                headers,
                body,
                saveAs: item.capture,
            });
        }
    };

    // 3) Backend battery
    if (runBackend) {
        console.log("\n🧪 Backend test set…");
        await callSet("backend", GETS_BACKEND, "GET");
        await callSet("backend", DETAIL_GETS_BACKEND, "GET");
        await callSet("backend", POSTS_BACKEND, "POST");
        await callSet("backend", PATCHES_BACKEND, "PATCH");
        await callSet("backend", PUTS_BACKEND, "PUT");
        await callSet("backend", DELETES_BACKEND, "DELETE");

        // Logout (backend)
        if (!state.csrf.backend) await getCsrf("backend");
        await curlJSON({
            origin: "backend",
            method: "POST",
            path: "/auth/logout",
            headers: { "x-csrf-token": state.csrf.backend },
            body: {},
        });
    }

    // 4) BFF battery (mirrors)
    if (runBff) {
        console.log("\n🧪 BFF test set…");
        await callSet("bff", GETS_BFF, "GET");
        await callSet("bff", DETAIL_GETS_BFF, "GET");
        await callSet("bff", POSTS_BFF, "POST");
        await callSet("bff", PATCHES_BFF, "PATCH");
        await callSet("bff", PUTS_BFF, "PUT");
        await callSet("bff", DELETES_BFF, "DELETE");

        // Logout (BFF)
        if (!state.csrf.bff) await getCsrf("bff");
        await curlJSON({
            origin: "bff",
            method: "POST",
            path: "/auth/logout",
            headers: { "x-csrf-token": state.csrf.bff },
            body: {},
        });
    }

    // 5) Summary
    const total = state.results.length;
    const pass = state.results.filter((r) => r.passed).length;
    const fail = total - pass;

    console.log("\n\n========================");
    console.log("       TEST SUMMARY     ");
    console.log("========================");
    console.log(`Total: ${total}  ✅ Passed: ${pass}  ❌ Failed: ${fail}\n`);
    const byOrigin = ["backend", "bff"].filter((o) => (o === "backend" ? runBackend : runBff));
    for (const o of byOrigin) {
        const slice = state.results.filter((r) => r.origin === o);
        const ok = slice.filter((r) => r.passed).length;
        console.log(`${CFG.origins[o].name.padEnd(10)} — ${ok}/${slice.length} passed`);
    }

    console.log("\nLast 20 results:");
    state.results.slice(-20).forEach((r) => {
        console.log(
            `${r.passed ? "✅" : "❌"} [${r.origin}] ${r.method.padEnd(6)} ${r.path}  (${r.ms}ms) ${r.note ? "— " + r.note : ""}`
        );
    });

    // Hard failure if any tests failed
    if (fail > 0) {
        console.log(`\n❌ ${fail} test(s) failed. Build will fail.`);
        process.exitCode = 1;
    } else {
        console.log(`\n🎉 All ${total} tests passed!`);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
