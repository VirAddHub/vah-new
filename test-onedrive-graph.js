#!/usr/bin/env node

/**
 * Test script for OneDrive Graph API integration
 * Tests the token generation and file access endpoints
 */

const https = require('https');
const { URL } = require('url');

// Load environment variables
require('dotenv').config({ path: './apps/backend/.env' });

const GRAPH_TENANT_ID = process.env.GRAPH_TENANT_ID;
const GRAPH_CLIENT_ID = process.env.GRAPH_CLIENT_ID;
const GRAPH_CLIENT_SECRET = process.env.GRAPH_CLIENT_SECRET;
const GRAPH_SITE_PATH = process.env.GRAPH_SITE_PATH; // /personal/ops_virtualaddresshub_co_uk

if (!GRAPH_TENANT_ID || !GRAPH_CLIENT_ID || !GRAPH_CLIENT_SECRET) {
    console.error('❌ Missing required environment variables:');
    console.error('   GRAPH_TENANT_ID:', !!GRAPH_TENANT_ID);
    console.error('   GRAPH_CLIENT_ID:', !!GRAPH_CLIENT_ID);
    console.error('   GRAPH_CLIENT_SECRET:', !!GRAPH_CLIENT_SECRET);
    process.exit(1);
}

console.log('🔧 OneDrive Graph API Test');
console.log('========================');
console.log('Tenant ID:', GRAPH_TENANT_ID);
console.log('Client ID:', GRAPH_CLIENT_ID);
console.log('Site Path:', GRAPH_SITE_PATH);
console.log('');

// Extract UPN from site path (improved version for multi-part domains)
function extractUPNFromSitePath(sitePath) {
    const m = /^\/personal\/([^/]+)$/.exec(sitePath);
    if (!m) throw new Error(`Invalid OneDrive personal path: ${sitePath}`);
    const alias = m[1]; // e.g., "ops_virtualaddresshub_co_uk"
    const parts = alias.split("_").filter(Boolean);
    if (parts.length < 2) throw new Error(`Unexpected alias format: ${alias}`);
    const user = parts.shift();              // "ops"
    const domain = parts.join(".");           // "virtualaddresshub.co.uk"
    return `${user}@${domain}`;
}

const UPN = extractUPNFromSitePath(GRAPH_SITE_PATH);
console.log('📧 Extracted UPN:', UPN);
console.log('');

// Test 1: Get access token
async function testTokenGeneration() {
    console.log('🔑 Testing token generation...');

    const body = new URLSearchParams({
        client_id: GRAPH_CLIENT_ID,
        client_secret: GRAPH_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'https://graph.microsoft.com/.default',
    });

    try {
        const response = await fetch(`https://login.microsoftonline.com/${GRAPH_TENANT_ID}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token request failed: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Token generation successful');
        console.log('   Token type:', data.token_type);
        console.log('   Expires in:', data.expires_in, 'seconds');
        console.log('   Token preview:', data.access_token.substring(0, 20) + '...');
        console.log('');

        return data.access_token;
    } catch (error) {
        console.error('❌ Token generation failed:', error.message);
        throw error;
    }
}

// Test 2: Test OneDrive file access
async function testOneDriveAccess(accessToken, testFilePath = 'Documents/Scanned_Mail/user4_1111_bilan.pdf') {
    console.log('📁 Testing OneDrive file access...');
    console.log('   File path:', testFilePath);

    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(UPN)}/drive/root:/${encodeURI(testFilePath)}:/content`;
    console.log('   Graph URL:', url);
    console.log('');

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'VAH-OneDrive-Test/1.0'
            },
            method: 'HEAD' // Use HEAD to avoid downloading the entire file
        });

        console.log('📊 Response status:', response.status, response.statusText);
        console.log('📊 Response headers:');
        for (const [key, value] of response.headers.entries()) {
            if (key.toLowerCase().includes('content') || key.toLowerCase().includes('cache')) {
                console.log(`   ${key}: ${value}`);
            }
        }
        console.log('');

        if (response.ok) {
            console.log('✅ OneDrive file access successful!');
            console.log('   The file exists and is accessible');

            // If it's a redirect, show the redirect URL
            if (response.status === 302 || response.status === 307) {
                const location = response.headers.get('location');
                if (location) {
                    console.log('   Redirect URL:', location);
                }
            }
        } else {
            const errorText = await response.text();
            console.error('❌ OneDrive file access failed');
            console.error('   Error response:', errorText);
        }

        return response.ok;
    } catch (error) {
        console.error('❌ OneDrive file access failed:', error.message);
        return false;
    }
}

// Test 3: Test alternative file paths
async function testAlternativePaths(accessToken) {
    console.log('🔍 Testing alternative file paths...');

    const testPaths = [
        'Documents/Scanned_Mail/',
        'Documents/',
        'Scanned_Mail/',
        'Documents/Scanned_Mail/test.pdf'
    ];

    for (const path of testPaths) {
        console.log(`   Testing: ${path}`);
        const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(UPN)}/drive/root:/${encodeURI(path)}`;

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
                method: 'HEAD'
            });

            console.log(`     Status: ${response.status} ${response.statusText}`);
        } catch (error) {
            console.log(`     Error: ${error.message}`);
        }
    }
    console.log('');
}

// Main test function
async function runTests() {
    try {
        // Test 1: Token generation
        const accessToken = await testTokenGeneration();

        // Test 2: OneDrive file access
        const fileAccessSuccess = await testOneDriveAccess(accessToken);

        // Test 3: Alternative paths
        await testAlternativePaths(accessToken);

        console.log('🎯 Test Summary');
        console.log('===============');
        console.log('Token generation:', '✅ Success');
        console.log('OneDrive access:', fileAccessSuccess ? '✅ Success' : '❌ Failed');
        console.log('');

        if (fileAccessSuccess) {
            console.log('🎉 All tests passed! Your OneDrive integration is working correctly.');
            console.log('');
            console.log('Next steps:');
            console.log('1. Ensure Files.Read.All permission is granted with admin consent');
            console.log('2. Test with your actual file paths');
            console.log('3. Deploy the updated code to production');
        } else {
            console.log('⚠️  Some tests failed. Please check:');
            console.log('1. Azure AD app registration permissions');
            console.log('2. Admin consent for Files.Read.All');
            console.log('3. File path format and existence');
        }

    } catch (error) {
        console.error('💥 Test suite failed:', error.message);
        process.exit(1);
    }
}

// Run the tests
runTests();
