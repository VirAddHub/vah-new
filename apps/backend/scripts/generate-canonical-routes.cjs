#!/usr/bin/env node
/**
 * Generate Canonical Routes Manifest
 * 
 * Processes the route inventory to create a canonical manifest with:
 * - Prefer TypeScript /api/** over legacy JS
 * - Mark streaming and webhook endpoints
 * - Mark admin endpoints with proper roles
 * - Handle duplicates with canonical/deprecated status
 */

const fs = require('fs');
const path = require('path');

// Load the route manifest
const manifestPath = path.join(__dirname, '../.route-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Configuration
const OUTPUT_MANIFEST = path.join(__dirname, '../docs/routes.manifest.json');
const OUTPUT_OPENAPI = path.join(__dirname, '../docs/openapi.yaml');

// Ensure docs directory exists
const docsDir = path.join(__dirname, '../docs');
if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
}

/**
 * Determine if a route is canonical (prefer TS /api/** over legacy)
 */
function isCanonical(route) {
    const { path: routePath, routerFile, method } = route;
    
    // Prefer TypeScript files over JavaScript
    const isTypeScript = routerFile.endsWith('.ts');
    const isJavaScript = routerFile.endsWith('.js');
    
    // Prefer /api/** paths
    const isApiPath = routePath.startsWith('/api/');
    const isLegacyPath = !routePath.startsWith('/api/') && !routePath.startsWith('/admin/');
    
    // Special cases for public endpoints
    if (routePath.startsWith('/scans/') || routePath.startsWith('/webhooks-')) {
        return true; // Public endpoints are always canonical
    }
    
    // Health endpoints
    if (routePath === '/healthz' || routePath === '/api/ready' || routePath === '/api/healthz') {
        return true;
    }
    
    // Prefer TypeScript + /api/** combination
    if (isTypeScript && isApiPath) {
        return true;
    }
    
    // If no TypeScript version exists, prefer /api/** JavaScript
    if (isJavaScript && isApiPath) {
        return true;
    }
    
    return false;
}

/**
 * Find duplicate routes (same method + path)
 */
function findDuplicates(routes) {
    const groups = {};
    
    routes.forEach(route => {
        const key = `${route.method}:${route.path}`;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(route);
    });
    
    return Object.values(groups).filter(group => group.length > 1);
}

/**
 * Determine route properties
 */
function getRouteProperties(route) {
    const { path: routePath, method, routerFile, middleware, notes } = route;
    
    const props = {
        method,
        path: routePath,
        routerFile,
        status: isCanonical(route) ? 'canonical' : 'deprecated',
        auth: middleware.includes('auth'),
        csrf: middleware.includes('csrf'),
        stream: notes.some(note => note.includes('streaming')),
        webhook: notes.some(note => note.includes('webhook')),
        public: routePath.startsWith('/scans/') || routePath.startsWith('/webhooks-') || routePath === '/healthz' || routePath.startsWith('/api/ready') || routePath.startsWith('/api/healthz'),
        role: null,
        tags: []
    };
    
    // Determine role
    if (routePath.startsWith('/api/admin/') || routePath.startsWith('/admin/')) {
        props.role = 'admin';
        props.tags.push('admin');
    } else if (routePath.startsWith('/api/auth/') || routePath.startsWith('/auth/')) {
        props.tags.push('auth');
    } else if (routePath.includes('billing') || routePath.includes('payment') || routePath.includes('invoice')) {
        props.tags.push('billing');
    } else if (routePath.includes('mail') || routePath.includes('forwarding')) {
        props.tags.push('mail');
    } else if (routePath.includes('profile') || routePath.includes('user')) {
        props.tags.push('profile');
    } else if (routePath.includes('kyc')) {
        props.tags.push('kyc');
    } else if (routePath.includes('support') || routePath.includes('ticket')) {
        props.tags.push('support');
    } else if (props.webhook) {
        props.tags.push('webhooks');
    } else if (props.public) {
        props.tags.push('health');
    }
    
    // Webhooks don't need auth or CSRF
    if (props.webhook) {
        props.auth = false;
        props.csrf = false;
    }
    
    return props;
}

/**
 * Generate canonical routes manifest
 */
function generateCanonicalManifest() {
    const routes = manifest.routes;
    const duplicates = findDuplicates(routes);
    
    // Process all routes
    const processedRoutes = routes.map(route => getRouteProperties(route));
    
    // Handle duplicates
    const canonicalRoutes = [];
    const deprecatedRoutes = [];
    
    duplicates.forEach(duplicateGroup => {
        const canonical = duplicateGroup.find(route => isCanonical(route));
        const others = duplicateGroup.filter(route => !isCanonical(route));
        
        if (canonical) {
            const canonicalProps = getRouteProperties(canonical);
            canonicalProps.status = 'canonical';
            canonicalRoutes.push(canonicalProps);
            
            // Mark others as deprecated with alias
            others.forEach(route => {
                const deprecatedProps = getRouteProperties(route);
                deprecatedProps.status = 'deprecated';
                deprecatedProps.aliasOf = canonicalProps.path;
                deprecatedRoutes.push(deprecatedProps);
            });
        } else {
            // If no canonical found, mark all as deprecated
            duplicateGroup.forEach(route => {
                const props = getRouteProperties(route);
                props.status = 'deprecated';
                deprecatedRoutes.push(props);
            });
        }
    });
    
    // Add non-duplicate routes
    const duplicateKeys = new Set();
    duplicates.forEach(group => {
        group.forEach(route => {
            duplicateKeys.add(`${route.method}:${route.path}`);
        });
    });
    
    routes.forEach(route => {
        const key = `${route.method}:${route.path}`;
        if (!duplicateKeys.has(key)) {
            const props = getRouteProperties(route);
            if (props.status === 'canonical') {
                canonicalRoutes.push(props);
            } else {
                deprecatedRoutes.push(props);
            }
        }
    });
    
    // Sort routes
    canonicalRoutes.sort((a, b) => {
        if (a.path !== b.path) return a.path.localeCompare(b.path);
        return a.method.localeCompare(b.method);
    });
    
    deprecatedRoutes.sort((a, b) => {
        if (a.path !== b.path) return a.path.localeCompare(b.path);
        return a.method.localeCompare(b.method);
    });
    
    return {
        generated: new Date().toISOString(),
        version: '0.1.0-draft',
        canonical: {
            count: canonicalRoutes.length,
            routes: canonicalRoutes
        },
        deprecated: {
            count: deprecatedRoutes.length,
            routes: deprecatedRoutes
        },
        summary: {
            totalCanonical: canonicalRoutes.length,
            totalDeprecated: deprecatedRoutes.length,
            byTag: getTagCounts(canonicalRoutes),
            byMethod: getMethodCounts(canonicalRoutes)
        }
    };
}

/**
 * Get tag counts
 */
function getTagCounts(routes) {
    const counts = {};
    routes.forEach(route => {
        route.tags.forEach(tag => {
            counts[tag] = (counts[tag] || 0) + 1;
        });
    });
    return counts;
}

/**
 * Get method counts
 */
function getMethodCounts(routes) {
    const counts = {};
    routes.forEach(route => {
        counts[route.method] = (counts[route.method] || 0) + 1;
    });
    return counts;
}

/**
 * Generate OpenAPI 3.1 specification
 */
function generateOpenAPI(canonicalRoutes) {
    const openapi = {
        openapi: '3.1.0',
        info: {
            title: 'VirtualAddressHub API',
            version: '0.1.0-draft',
            description: 'Virtual Address Hub API - Professional mail forwarding service'
        },
        servers: [
            {
                url: '/api',
                description: 'API Base URL'
            },
            {
                url: 'https://vah-api-staging.onrender.com/api',
                description: 'Staging Environment'
            }
        ],
        tags: [
            { name: 'auth', description: 'Authentication endpoints' },
            { name: 'profile', description: 'User profile management' },
            { name: 'mail', description: 'Mail item management' },
            { name: 'forwarding', description: 'Mail forwarding requests' },
            { name: 'billing', description: 'Billing and payments' },
            { name: 'kyc', description: 'Know Your Customer verification' },
            { name: 'admin', description: 'Administrative functions' },
            { name: 'health', description: 'Health and status checks' },
            { name: 'webhooks', description: 'Webhook endpoints' }
        ],
        components: {
            schemas: {
                ApiResponse: {
                    type: 'object',
                    required: ['ok'],
                    properties: {
                        ok: { type: 'boolean' },
                        data: { nullable: true },
                        error: {
                            nullable: true,
                            oneOf: [
                                { type: 'string' },
                                { type: 'object' }
                            ]
                        }
                    }
                }
            },
            securitySchemes: {
                sessionAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'vah_session'
                },
                roleAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'vah_role'
                }
            }
        },
        paths: {}
    };
    
    // Generate paths from canonical routes
    canonicalRoutes.forEach(route => {
        const pathKey = route.path;
        if (!openapi.paths[pathKey]) {
            openapi.paths[pathKey] = {};
        }
        
        const operation = {
            tags: route.tags,
            summary: `${route.method} ${route.path}`,
            responses: {
                '200': {
                    description: 'Success',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ApiResponse' }
                        }
                    }
                },
                '400': {
                    description: 'Bad Request',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ApiResponse' }
                        }
                    }
                },
                '401': {
                    description: 'Unauthorized',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ApiResponse' }
                        }
                    }
                },
                '500': {
                    description: 'Internal Server Error',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ApiResponse' }
                        }
                    }
                }
            }
        };
        
        // Add security requirements
        if (route.auth && !route.public) {
            operation.security = [{ sessionAuth: [] }];
            if (route.role === 'admin') {
                operation.security[0].roleAuth = [];
            }
        }
        
        // Add streaming response for streaming endpoints
        if (route.stream) {
            operation.responses['200'].content['application/octet-stream'] = {
                schema: { type: 'string', format: 'binary' }
            };
        }
        
        openapi.paths[pathKey][route.method.toLowerCase()] = operation;
    });
    
    return openapi;
}

/**
 * Main execution
 */
function main() {
    console.log('🔧 Generating canonical routes manifest...');
    
    try {
        // Generate canonical manifest
        const canonicalManifest = generateCanonicalManifest();
        
        // Write routes manifest
        fs.writeFileSync(OUTPUT_MANIFEST, JSON.stringify(canonicalManifest, null, 2));
        console.log(`✅ Routes manifest written to: ${OUTPUT_MANIFEST}`);
        
        // Generate OpenAPI spec
        const openapi = generateOpenAPI(canonicalManifest.canonical.routes);
        
        // Write OpenAPI spec
        const yaml = require('js-yaml');
        fs.writeFileSync(OUTPUT_OPENAPI, yaml.dump(openapi, { indent: 2 }));
        console.log(`✅ OpenAPI spec written to: ${OUTPUT_OPENAPI}`);
        
        // Print summary
        console.log('\n📊 Canonical Routes Summary:');
        console.log(`Total Canonical: ${canonicalManifest.summary.totalCanonical}`);
        console.log(`Total Deprecated: ${canonicalManifest.summary.totalDeprecated}`);
        
        console.log('\n📈 By Tag:');
        Object.entries(canonicalManifest.summary.byTag).forEach(([tag, count]) => {
            console.log(`  ${tag}: ${count} endpoints`);
        });
        
        console.log('\n📈 By Method:');
        Object.entries(canonicalManifest.summary.byMethod).forEach(([method, count]) => {
            console.log(`  ${method}: ${count} endpoints`);
        });
        
    } catch (error) {
        console.error('❌ Error generating canonical routes:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { generateCanonicalManifest, generateOpenAPI };
