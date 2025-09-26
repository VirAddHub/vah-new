#!/usr/bin/env node
// Main test runner for mailroom system
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tests = [
    { name: 'Basic System Test', file: 'test-basic.mjs' },
    { name: 'Comprehensive Test', file: 'test-comprehensive.mjs' },
    { name: 'Endpoint Test', file: 'test-endpoints.mjs' },
    { name: 'Webhook Test', file: 'test-webhook.mjs' },
    { name: 'Production Readiness', file: 'test-production-ready.mjs' }
];

async function runTest(testName, testFile) {
    return new Promise((resolve) => {
        console.log(`\n🧪 Running ${testName}...`);
        console.log('='.repeat(50));

        const child = spawn('node', [join(__dirname, testFile)], {
            stdio: 'inherit',
            shell: true
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`\n✅ ${testName} PASSED`);
                resolve(true);
            } else {
                console.log(`\n❌ ${testName} FAILED (exit code: ${code})`);
                resolve(false);
            }
        });

        child.on('error', (error) => {
            console.log(`\n❌ ${testName} ERROR: ${error.message}`);
            resolve(false);
        });
    });
}

async function runAllTests() {
    console.log('🚀 MAILROOM SYSTEM - COMPLETE TEST SUITE');
    console.log('='.repeat(60));
    console.log('Starting comprehensive testing of all system components...\n');

    const results = [];

    for (const test of tests) {
        const passed = await runTest(test.name, test.file);
        results.push({ name: test.name, passed });
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const percentage = Math.round((passed / total) * 100);

    results.forEach(result => {
        console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`🎯 OVERALL RESULT: ${passed}/${total} tests passed (${percentage}%)`);

    if (passed === total) {
        console.log('🎉 ALL TESTS PASSED! System is ready for production!');
    } else {
        console.log('⚠️  Some tests failed. Check the output above for details.');
    }

    console.log('='.repeat(60));

    process.exit(passed === total ? 0 : 1);
}

// Check if server is running
async function checkServer() {
    try {
        const response = await fetch('http://localhost:4000/__status');
        return response.ok;
    } catch (error) {
        return false;
    }
}

async function main() {
    console.log('🔍 Checking if server is running...');

    const serverRunning = await checkServer();
    if (!serverRunning) {
        console.log('❌ Server is not running on http://localhost:4000');
        console.log('Please start the server first:');
        console.log('  node server.js');
        process.exit(1);
    }

    console.log('✅ Server is running, starting tests...\n');
    await runAllTests();
}

main().catch(console.error);
