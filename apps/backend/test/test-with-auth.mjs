// Test with real authentication
const BASE = "http://localhost:4000";
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'dev-change-this';

async function createTestUser() {
    console.log("Creating test user...");

    // Create a test user by calling the register endpoint
    const registerResponse = await fetch(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: "test@example.com",
            password: "testpassword123",
            first_name: "Test",
            last_name: "User"
        })
    });

    const registerResult = await registerResponse.json();
    console.log("Register result:", registerResponse.status, registerResult);

    if (registerResponse.ok) {
        return registerResult.user_id;
    } else {
        console.log("User might already exist, trying login...");

        // Try to login
        const loginResponse = await fetch(`${BASE}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "test@example.com",
                password: "testpassword123"
            })
        });

        const loginResult = await loginResponse.json();
        console.log("Login result:", loginResponse.status, loginResult);

        if (loginResponse.ok) {
            return loginResult.user_id;
        }
    }

    return null;
}

async function createAdminToken(userId) {
    // Create a JWT token with admin privileges
    const payload = {
        id: userId,
        is_admin: true,
        email: "test@example.com",
        iss: "virtualaddresshub",
        aud: "vah-users"
    };

    return jwt.sign(payload, JWT_SECRET);
}

async function test() {
    console.log("Testing with real authentication...");

    // Create test user
    const userId = await createTestUser();
    if (!userId) {
        console.log("❌ Failed to create/get test user");
        return;
    }

    console.log("✅ Test user ID:", userId);

    // Create admin token
    const token = await createAdminToken(userId);
    console.log("✅ Admin token created");

    // Get CSRF token
    const csrfResponse = await fetch(`${BASE}/api/csrf`);
    const csrfData = await csrfResponse.json();
    console.log("✅ CSRF token:", csrfData.csrfToken ? "OK" : "FAILED");

    // Test creating mail item
    console.log("Testing mail item creation...");
    const createResponse = await fetch(`${BASE}/api/admin/mail-items`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "X-CSRF-Token": csrfData.csrfToken,
            "Idempotency-Key": "250910-0001"
        },
        body: JSON.stringify({
            user_id: userId,
            subject: "Test Mail",
            sender_name: "Test Sender",
            received_date: "2025-09-10",
            tag: "Test"
        })
    });

    const createResult = await createResponse.json();
    console.log("Create result:", createResponse.status, createResult);

    if (createResponse.ok) {
        console.log("✅ Mail item created successfully!");
        console.log("   Mail item ID:", createResult.mail_item_id);
        console.log("   User ID:", createResult.user_id);

        // Test idempotency
        console.log("Testing idempotency...");
        const createResponse2 = await fetch(`${BASE}/api/admin/mail-items`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "X-CSRF-Token": csrfData.csrfToken,
                "Idempotency-Key": "250910-0001"
            },
            body: JSON.stringify({
                user_id: userId,
                subject: "Test Mail",
                sender_name: "Test Sender",
                received_date: "2025-09-10",
                tag: "Test"
            })
        });

        const createResult2 = await createResponse2.json();
        console.log("Second create result:", createResponse2.status, createResult2);

        if (createResult.mail_item_id === createResult2.mail_item_id) {
            console.log("✅ Idempotency test passed!");
        } else {
            console.log("❌ Idempotency test failed");
        }

    } else {
        console.log("❌ Mail item creation failed:", createResult);
    }
}

test().catch(console.error);
