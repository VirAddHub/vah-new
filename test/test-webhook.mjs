// Test OneDrive webhook with proper CSRF handling
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

async function testWebhook() {
    console.log("🔗 TESTING ONEDRIVE WEBHOOK");
    console.log("=".repeat(40));

    // Get CSRF token first
    console.log("\n1️⃣ Getting CSRF token...");
    const csrfResponse = await fetchWithCookies(`${BASE}/api/csrf`);
    const csrfData = await csrfResponse.json();
    console.log("   ✅ CSRF token obtained");

    // Test OneDrive webhook
    console.log("\n2️⃣ Testing OneDrive webhook...");
    const webhookData = {
        mail_item_id: "999",
        onedrive_file_id: "test_file_123",
        path: "/Clients/1 - Test Client/2025/09/mail_999.pdf"
    };

    console.log("   📤 Sending webhook data:", webhookData);

    const webhookResponse = await fetchWithCookies(`${BASE}/api/webhooks/onedrive`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfData.csrfToken
        },
        body: JSON.stringify(webhookData)
    });

    const webhookResult = await webhookResponse.json();
    console.log("   📥 Response status:", webhookResponse.status);
    console.log("   📥 Response data:", webhookResult);

    if (webhookResponse.ok) {
        console.log("   ✅ OneDrive webhook working correctly!");
    } else {
        console.log("   ⚠️  OneDrive webhook needs configuration or has issues");
    }

    console.log("\n" + "=".repeat(40));
    console.log("🎯 WEBHOOK TEST COMPLETE");
    console.log("=".repeat(40));
}

testWebhook().catch(console.error);
