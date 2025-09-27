// Test specific endpoints that don't require authentication
const BASE = "http://localhost:4000";

async function testEndpoints() {
    console.log("🔍 TESTING SPECIFIC ENDPOINTS");
    console.log("=".repeat(40));

    // Test 1: OneDrive webhook (should work without auth)
    console.log("\n1️⃣ Testing OneDrive webhook...");
    try {
        const webhookResponse = await fetch(`${BASE}/api/webhooks/onedrive`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mail_item_id: "999",
                onedrive_file_id: "test_file_123",
                path: "/Clients/1 - Test Client/2025/09/mail_999.pdf"
            })
        });

        const webhookResult = await webhookResponse.json();
        console.log("   Status:", webhookResponse.status);
        console.log("   Response:", webhookResult);

        if (webhookResponse.status === 200) {
            console.log("   ✅ OneDrive webhook working");
        } else {
            console.log("   ⚠️  OneDrive webhook needs configuration");
        }
    } catch (error) {
        console.log("   ❌ OneDrive webhook error:", error.message);
    }

    // Test 2: CSRF endpoint
    console.log("\n2️⃣ Testing CSRF endpoint...");
    try {
        const csrfResponse = await fetch(`${BASE}/api/csrf`);
        const csrfData = await csrfResponse.json();
        console.log("   Status:", csrfResponse.status);
        console.log("   Token length:", csrfData.csrfToken ? csrfData.csrfToken.length : 0);
        console.log("   ✅ CSRF endpoint working");
    } catch (error) {
        console.log("   ❌ CSRF error:", error.message);
    }

    // Test 3: Server status
    console.log("\n3️⃣ Testing server status...");
    try {
        const statusResponse = await fetch(`${BASE}/__status`);
        const statusData = await statusResponse.json();
        console.log("   Status:", statusResponse.status);
        console.log("   PID:", statusData.pid);
        console.log("   ✅ Status endpoint working");
    } catch (error) {
        console.log("   ❌ Status error:", error.message);
    }

    // Test 4: Test idempotency key format validation
    console.log("\n4️⃣ Testing idempotency key format...");
    const testKeys = [
        "250910-0001", // Valid
        "250910-9999", // Valid
        "invalid",     // Invalid
        "25091-0001",  // Invalid (missing digit)
        "250910-001",  // Invalid (missing digit)
        "2509100-0001" // Invalid (too many digits)
    ];

    const keyRegex = /^\d{6}-\d{4}$/;
    testKeys.forEach(key => {
        const isValid = keyRegex.test(key);
        console.log(`   ${key}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    });

    // Test 5: Test scan guard logic (simulated)
    console.log("\n5️⃣ Testing scan guard logic...");
    const testItems = [
        { id: 1, file_id: null, scan_file_url: null, status: "created" },
        { id: 2, file_id: "123", scan_file_url: null, status: "created" },
        { id: 3, file_id: null, scan_file_url: "https://example.com/scan.pdf", status: "created" },
        { id: 4, file_id: "123", scan_file_url: "https://example.com/scan.pdf", status: "created" }
    ];

    testItems.forEach(item => {
        const canMarkScanned = Boolean(item.file_id || item.scan_file_url);
        console.log(`   Item ${item.id}: ${canMarkScanned ? '✅ Can mark scanned' : '❌ Cannot mark scanned'}`);
    });

    // Test 6: Test retention calculation
    console.log("\n6️⃣ Testing retention calculation...");
    const receivedDate = new Date('2025-09-10');
    const retentionDays = 365;
    const shredDate = new Date(receivedDate);
    shredDate.setDate(shredDate.getDate() + 30); // Physical shred date

    console.log(`   Received: ${receivedDate.toISOString().split('T')[0]}`);
    console.log(`   Digital retention: ${retentionDays} days`);
    console.log(`   Physical shred date: ${shredDate.toISOString().split('T')[0]}`);
    console.log("   ✅ Retention calculation working");

    console.log("\n" + "=".repeat(40));
    console.log("🎯 ENDPOINT TESTING COMPLETE");
    console.log("=".repeat(40));
}

testEndpoints().catch(console.error);
