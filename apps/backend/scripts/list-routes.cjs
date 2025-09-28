#!/usr/bin/env node
/**
 * Backend Route Discovery Script
 * 
 * Scans the backend server for all mounted routes and generates a comprehensive manifest.
 * This script performs static analysis without executing the application.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROUTES_DIR = path.join(__dirname, '../server/routes');
const OUTPUT_MANIFEST = path.join(__dirname, '../.route-manifest.json');
const OUTPUT_SUMMARY = path.join(__dirname, '../endpoint-summary.md');

// Track discovered routes
const routes = [];
const routerFiles = new Set();

/**
 * Extract route information from a router file
 */
function analyzeRouterFile(filePath, basePath = '') {
    const relativePath = path.relative(ROUTES_DIR, filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    // Track this router file
    routerFiles.add(relativePath);

    // Extract HTTP method routes
    const methodPatterns = [
        { method: 'GET', pattern: /router\.get\s*\(\s*['"`]([^'"`]+)['"`]/g },
        { method: 'POST', pattern: /router\.post\s*\(\s*['"`]([^'"`]+)['"`]/g },
        { method: 'PUT', pattern: /router\.put\s*\(\s*['"`]([^'"`]+)['"`]/g },
        { method: 'PATCH', pattern: /router\.patch\s*\(\s*['"`]([^'"`]+)['"`]/g },
        { method: 'DELETE', pattern: /router\.delete\s*\(\s*['"`]([^'"`]+)['"`]/g },
        { method: 'OPTIONS', pattern: /router\.options\s*\(\s*['"`]([^'"`]+)['"`]/g },
        { method: 'HEAD', pattern: /router\.head\s*\(\s*['"`]([^'"`]+)['"`]/g },
        { method: 'ALL', pattern: /router\.all\s*\(\s*['"`]([^'"`]+)['"`]/g }
    ];

    // Extract middleware usage
    const middleware = [];
    if (content.includes('auth')) middleware.push('auth');
    if (content.includes('csrf')) middleware.push('csrf');
    if (content.includes('rateLimit')) middleware.push('rate-limit');
    if (content.includes('multer') || content.includes('upload.single')) middleware.push('file-upload');
    if (content.includes('express.json()')) middleware.push('json-parser');
    if (content.includes('cors')) middleware.push('cors');

    // Extract notes about the route
    const notes = [];
    if (content.includes('FormData') || content.includes('multipart/form-data')) {
        notes.push('expects FormData/multipart');
    }
    if (content.includes('req.body') && content.includes('JSON')) {
        notes.push('expects JSON body');
    }
    if (content.includes('req.params.id') || content.includes(':id')) {
        notes.push('uses id parameter');
    }
    if (content.includes('req.query') || content.includes('?page=')) {
        notes.push('supports query parameters');
    }
    if (content.includes('pagination') || content.includes('limit') || content.includes('offset')) {
        notes.push('supports pagination');
    }
    if (content.includes('stream') || content.includes('res.write')) {
        notes.push('streaming response');
    }
    if (content.includes('webhook') || content.includes('stripe') || content.includes('postmark')) {
        notes.push('webhook endpoint');
    }

    // Process each method pattern
    methodPatterns.forEach(({ method, pattern }) => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const routePath = match[1];
            const fullPath = basePath + routePath;

            routes.push({
                method,
                path: fullPath,
                routerFile: relativePath,
                middleware: [...middleware],
                notes: [...notes]
            });
        }
    });

    // Look for nested router usage
    const nestedRouterPattern = /router\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*require\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let nestedMatch;
    while ((nestedMatch = nestedRouterPattern.exec(content)) !== null) {
        const nestedBasePath = basePath + nestedMatch[1];
        const nestedRouterPath = nestedMatch[2];

        // Resolve the nested router file path
        const nestedFilePath = path.resolve(path.dirname(filePath), nestedRouterPath);
        if (fs.existsSync(nestedFilePath)) {
            analyzeRouterFile(nestedFilePath, nestedBasePath);
        }
    }
}

/**
 * Parse the main server file to find router mounts
 */
function analyzeServerFile() {
    const serverFile = path.join(__dirname, '../server/index.js');
    const content = fs.readFileSync(serverFile, 'utf8');

    // Find loadRouter calls
    const loadRouterPattern = /loadRouter\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = loadRouterPattern.exec(content)) !== null) {
        const routerPath = match[1];
        const fullPath = path.resolve(ROUTES_DIR, routerPath);

        if (fs.existsSync(fullPath)) {
            analyzeRouterFile(fullPath);
        }
    }

    // Find app.use calls with require
    const appUsePattern = /app\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*loadRouter\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let appMatch;
    while ((appMatch = appUsePattern.exec(content)) !== null) {
        const basePath = appMatch[1];
        const routerPath = appMatch[2];
        const fullPath = path.resolve(ROUTES_DIR, routerPath);

        if (fs.existsSync(fullPath)) {
            analyzeRouterFile(fullPath, basePath);
        }
    }

    // Find direct app.use calls
    const directAppUsePattern = /app\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*require\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let directMatch;
    while ((directMatch = directAppUsePattern.exec(content)) !== null) {
        const basePath = directMatch[1];
        const routerPath = directMatch[2];
        const fullPath = path.resolve(ROUTES_DIR, routerPath);

        if (fs.existsSync(fullPath)) {
            analyzeRouterFile(fullPath, basePath);
        }
    }

    // Find inline route definitions
    const inlineRoutePattern = /app\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let inlineMatch;
    while ((inlineMatch = inlineRoutePattern.exec(content)) !== null) {
        const method = inlineMatch[1].toUpperCase();
        const routePath = inlineMatch[2];

        routes.push({
            method,
            path: routePath,
            routerFile: 'server/index.js (inline)',
            middleware: ['rate-limit', 'cors', 'helmet'],
            notes: ['inline route definition']
        });
    }
}

/**
 * Generate endpoint summary markdown
 */
function generateSummary() {
    const domains = {};

    // Group routes by domain
    routes.forEach(route => {
        const pathParts = route.path.split('/').filter(Boolean);
        let domain = 'other';

        if (pathParts.length > 0) {
            const firstPart = pathParts[0];
            if (['api', 'auth', 'user', 'admin', 'public', 'dashboard'].includes(firstPart)) {
                domain = firstPart;
            } else if (firstPart.startsWith('api/')) {
                domain = pathParts[1] || 'api';
            }
        }

        if (!domains[domain]) {
            domains[domain] = {
                routes: [],
                methods: {},
                specials: new Set()
            };
        }

        domains[domain].routes.push(route);
        domains[domain].methods[route.method] = (domains[domain].methods[route.method] || 0) + 1;

        // Track special features
        if (route.middleware.includes('file-upload')) {
            domains[domain].specials.add('file-upload');
        }
        if (route.notes.some(note => note.includes('webhook'))) {
            domains[domain].specials.add('webhook');
        }
        if (route.notes.some(note => note.includes('streaming'))) {
            domains[domain].specials.add('streaming');
        }
    });

    let summary = '# Backend Endpoint Summary\n\n';
    summary += `Generated on: ${new Date().toISOString()}\n\n`;
    summary += `**Total Routers:** ${routerFiles.size}\n`;
    summary += `**Total Endpoints:** ${routes.length}\n`;
    summary += `**With Auth:** ${routes.filter(r => r.middleware.includes('auth')).length}\n`;
    summary += `**With File Upload:** ${routes.filter(r => r.middleware.includes('file-upload')).length}\n\n`;

    // Generate domain sections
    Object.keys(domains).sort().forEach(domain => {
        const domainData = domains[domain];
        summary += `## ${domain.toUpperCase()} Domain\n\n`;

        // Method counts
        const methodCounts = Object.entries(domainData.methods)
            .map(([method, count]) => `${method}: ${count}`)
            .join(', ');
        summary += `**Methods:** ${methodCounts}\n\n`;

        // Special features
        if (domainData.specials.size > 0) {
            summary += `**Special Features:** ${Array.from(domainData.specials).join(', ')}\n\n`;
        }

        // Route list
        summary += '### Routes\n\n';
        domainData.routes.forEach(route => {
            const middlewareStr = route.middleware.length > 0 ? ` [${route.middleware.join(', ')}]` : '';
            const notesStr = route.notes.length > 0 ? ` - ${route.notes.join(', ')}` : '';
            summary += `- \`${route.method} ${route.path}\`${middlewareStr}${notesStr}\n`;
        });
        summary += '\n';
    });

    return summary;
}

/**
 * Main execution
 */
function main() {
    console.log('🔍 Discovering backend routes...');

    try {
        // Analyze the main server file
        analyzeServerFile();

        // Also scan all router files directly
        function scanDirectory(dir) {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    scanDirectory(filePath);
                } else if (file.endsWith('.js') || file.endsWith('.ts')) {
                    const relativePath = path.relative(ROUTES_DIR, filePath);
                    if (!routerFiles.has(relativePath)) {
                        analyzeRouterFile(filePath);
                    }
                }
            });
        }

        scanDirectory(ROUTES_DIR);

        // Generate outputs
        const manifest = {
            generated: new Date().toISOString(),
            totalRouters: routerFiles.size,
            totalEndpoints: routes.length,
            routes: routes.sort((a, b) => {
                if (a.path !== b.path) return a.path.localeCompare(b.path);
                return a.method.localeCompare(b.method);
            })
        };

        // Write manifest
        fs.writeFileSync(OUTPUT_MANIFEST, JSON.stringify(manifest, null, 2));
        console.log(`✅ Route manifest written to: ${OUTPUT_MANIFEST}`);

        // Write summary
        const summary = generateSummary();
        fs.writeFileSync(OUTPUT_SUMMARY, summary);
        console.log(`✅ Endpoint summary written to: ${OUTPUT_SUMMARY}`);

        // Print totals
        console.log('\n📊 Summary:');
        console.log(`Routers: ${routerFiles.size}, Endpoints: ${routes.length}, With auth: ${routes.filter(r => r.middleware.includes('auth')).length}, With file upload: ${routes.filter(r => r.middleware.includes('file-upload')).length}`);

        // Print domain counts
        const domains = {};
        routes.forEach(route => {
            const pathParts = route.path.split('/').filter(Boolean);
            let domain = 'other';
            if (pathParts.length > 0) {
                const firstPart = pathParts[0];
                if (['api', 'auth', 'user', 'admin', 'public', 'dashboard'].includes(firstPart)) {
                    domain = firstPart;
                } else if (firstPart.startsWith('api/')) {
                    domain = pathParts[1] || 'api';
                }
            }
            domains[domain] = (domains[domain] || 0) + 1;
        });

        console.log('\n📈 By Domain:');
        Object.entries(domains).sort((a, b) => b[1] - a[1]).forEach(([domain, count]) => {
            console.log(`  ${domain}: ${count} endpoints`);
        });

    } catch (error) {
        console.error('❌ Error during route discovery:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { analyzeRouterFile, analyzeServerFile };
