// Basic server test
const BASE = "http://localhost:4000";

let cookieJar = '';

async function fetchWithCookies(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            ...(cookieJar ? { 'Cookie': cookieJar } : {})
        }
    });

    // Store cookies from response
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
        cookieJar = setCookie;
    }

    return response;
}

async function test() {
    console.log("Testing server endpoints...");

    // Test 1: Server status
    console.log("1. Testing server status...");
    const status = await fetchWithCookies(`${BASE}/__status`);
    const statusData = await status.json();
    console.log("   Server status:", statusData);

    // Test 2: CSRF endpoint
    console.log("2. Testing CSRF endpoint...");
    const csrf = await fetchWithCookies(`${BASE}/api/csrf`);
    const csrfData = await csrf.json();
    console.log("   CSRF token:", csrfData.csrfToken ? "OK" : "FAILED");
    console.log("   Cookies:", cookieJar);

    // Test 3: Test idempotency key validation
    console.log("3. Testing idempotency key validation...");
    console.log("   Headers:", {
        "x-dev-user-id": "1",
        "X-CSRF-Token": csrfData.csrfToken,
        "Idempotency-Key": "250910-0001"
    });

    const testCreate = await fetchWithCookies(`${BASE}/api/admin/mail-items`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-dev-user-id": "1",
            "X-CSRF-Token": csrfData.csrfToken,
            "Idempotency-Key": "250910-0001"
        },
        body: JSON.stringify({
            user_id: "1",
            subject: "Test Mail",
            sender_name: "Test Sender",
            received_date: "2025-09-10",
            tag: "Test"
        })
    });

    const createResult = await testCreate.json();
    console.log("   Create result:", testCreate.status, createResult);

    if (testCreate.ok) {
        console.log("✅ Basic test passed - server is working!");
    } else {
        console.log("❌ Basic test failed:", createResult);
    }
}

test().catch(console.error);
