#!/usr/bin/env node

/**
 * Bundle Size Monitor
 * Checks bundle sizes and fails CI if they exceed limits
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Bundle size limits (in bytes)
const BUNDLE_LIMITS = {
  'main': 200 * 1024,      // 200KB gzipped
  'vendors': 500 * 1024,   // 500KB gzipped
  'common': 100 * 1024,    // 100KB gzipped
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getBundleSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function getGzipSize(filePath) {
  try {
    const output = execSync(`gzip -c "${filePath}" | wc -c`, { encoding: 'utf8' });
    return parseInt(output.trim(), 10);
  } catch (error) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundles() {
  const buildDir = path.join(__dirname, '.next', 'static', 'chunks');
  
  if (!fs.existsSync(buildDir)) {
    log('❌ Build directory not found. Run "npm run build" first.', 'red');
    process.exit(1);
  }

  log('📊 Analyzing bundle sizes...', 'blue');
  log('', 'reset');

  const files = fs.readdirSync(buildDir);
  const jsFiles = files.filter(file => file.endsWith('.js'));
  
  let totalSize = 0;
  let totalGzipSize = 0;
  let hasExceeded = false;

  // Analyze each bundle
  jsFiles.forEach(file => {
    const filePath = path.join(buildDir, file);
    const size = getBundleSize(filePath);
    const gzipSize = getGzipSize(filePath);
    
    totalSize += size;
    totalGzipSize += gzipSize;

    // Determine bundle type
    let bundleType = 'other';
    if (file.includes('main')) bundleType = 'main';
    else if (file.includes('vendors')) bundleType = 'vendors';
    else if (file.includes('common')) bundleType = 'common';

    const limit = BUNDLE_LIMITS[bundleType] || Infinity;
    const exceeded = gzipSize > limit;
    
    if (exceeded) hasExceeded = true;

    const status = exceeded ? '❌' : '✅';
    const color = exceeded ? 'red' : 'green';
    
    log(`${status} ${file}`, color);
    log(`   Raw: ${formatBytes(size)}`, 'reset');
    log(`   Gzip: ${formatBytes(gzipSize)}`, exceeded ? 'red' : 'reset');
    if (bundleType !== 'other') {
      log(`   Limit: ${formatBytes(limit)}`, 'yellow');
    }
    log('', 'reset');
  });

  // Summary
  log('📈 Summary:', 'bold');
  log(`Total Raw Size: ${formatBytes(totalSize)}`, 'blue');
  log(`Total Gzip Size: ${formatBytes(totalGzipSize)}`, 'blue');
  log('', 'reset');

  // Check if any bundles exceeded limits
  if (hasExceeded) {
    log('❌ Bundle size limits exceeded!', 'red');
    log('Consider:', 'yellow');
    log('• Dynamic imports for heavy components', 'yellow');
    log('• Tree shaking unused code', 'yellow');
    log('• Code splitting optimization', 'yellow');
    log('• Removing unused dependencies', 'yellow');
    process.exit(1);
  } else {
    log('✅ All bundle sizes are within limits!', 'green');
  }
}

// Run analysis
analyzeBundles();