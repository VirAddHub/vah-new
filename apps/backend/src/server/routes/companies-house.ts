// src/server/routes/companies-house.ts
// Companies House API proxy endpoints with performance optimizations

import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { performance } from 'node:perf_hooks';
import { param } from '../../lib/express-params';

const router = Router();

const COMPANIES_HOUSE_API_KEY = process.env.COMPANIES_HOUSE_API_KEY;
const COMPANIES_HOUSE_BASE_URL = 'https://api.company-information.service.gov.uk';

// Performance optimizations
const cache = new Map<string, { at: number; data: any }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
const REQUEST_TIMEOUT = 10000; // 10 seconds timeout
const pendingRequests = new Map<string, Promise<any>>(); // Request deduplication

function getCacheKey(query: string): string {
    return `companies:${query.toLowerCase().trim()}`;
}

/**
 * GET /api/companies-house/search?q=query
 * Search for companies with caching and performance optimizations
 */
router.get('/search', async (req: Request, res: Response) => {
    const t0 = performance.now();
    const query = req.query.q as string;

    if (!query || query.trim().length < 2) {
        return res.status(400).json({
            ok: false,
            error: 'query_too_short',
            message: 'Search query must be at least 2 characters'
        });
    }

    if (!COMPANIES_HOUSE_API_KEY) {
        return res.status(500).json({
            ok: false,
            error: 'api_key_missing',
            message: 'Companies House API key not configured'
        });
    }

    const cacheKey = getCacheKey(query);
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL) {
        const latency = Math.round(performance.now() - t0);
        console.log(`[Companies House] Cache hit for "${query}" ${latency}ms`);
        return res.json(cached.data);
    }

    // Check if request is already in progress (deduplication)
    const existingRequest = pendingRequests.get(cacheKey);
    if (existingRequest) {
        console.log(`[Companies House] Deduplicating request for "${query}"`);
        try {
            const result = await existingRequest;
            const latency = Math.round(performance.now() - t0);
            console.log(`[Companies House] Deduplicated response for "${query}" ${latency}ms`);
            return res.json(result);
        } catch (error) {
            // If the existing request failed, we'll make a new one
            pendingRequests.delete(cacheKey);
        }
    }

    // Create new request promise
    const requestPromise = (async () => {
        try {
            console.log(`[Companies House] Searching for: "${query}"`);
            
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

            const response = await fetch(
                `${COMPANIES_HOUSE_BASE_URL}/search/companies?q=${encodeURIComponent(query)}`,
                {
                    headers: {
                        'Authorization': `Basic ${Buffer.from(COMPANIES_HOUSE_API_KEY + ':').toString('base64')}`,
                        'User-Agent': 'VirtualAddressHub/1.0'
                    },
                    signal: controller.signal
                }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error(`[Companies House] Search failed for "${query}":`, response.status);
                throw new Error(`Companies House API error: ${response.status}`);
            }

            const data = await response.json() as any;
            const result = {
                ok: true,
                data: data.items || [],
                total_results: data.total_results || 0
            };

            // Cache successful results
            cache.set(cacheKey, { at: Date.now(), data: result });
            
            // Clean up old cache entries periodically
            if (cache.size > 1000) {
                const now = Date.now();
                for (const [key, value] of cache.entries()) {
                    if (now - value.at > CACHE_TTL) {
                        cache.delete(key);
                    }
                }
            }

            return result;
        } catch (error: any) {
            console.error(`[Companies House] Search error for "${query}":`, error.message);
            throw error;
        } finally {
            // Clean up pending request
            pendingRequests.delete(cacheKey);
        }
    })();

    // Store the promise for deduplication
    pendingRequests.set(cacheKey, requestPromise);

    try {
        const result = await requestPromise;
        const latency = Math.round(performance.now() - t0);
        console.log(`[Companies House] Search completed for "${query}" ${latency}ms`);
        return res.json(result);
    } catch (error: any) {
        const latency = Math.round(performance.now() - t0);
        console.error(`[Companies House] Search failed for "${query}" ${latency}ms:`, error.message);
        
        return res.status(500).json({
            ok: false,
            error: 'search_failed',
            message: error.message.includes('aborted') ? 'Request timeout' : error.message
        });
    }
});

/**
 * GET /api/companies-house/company/:number
 * Get company details by number
 */
router.get('/company/:number', async (req: Request, res: Response) => {
    const companyNumber = param(req, 'number');

    if (!companyNumber || !companyNumber.trim()) {
        return res.status(400).json({
            ok: false,
            error: 'company_number_required',
            message: 'Company number is required'
        });
    }

    if (!COMPANIES_HOUSE_API_KEY) {
        return res.status(500).json({
            ok: false,
            error: 'api_key_missing',
            message: 'Companies House API key not configured'
        });
    }

    try {
        const response = await fetch(
            `${COMPANIES_HOUSE_BASE_URL}/company/${companyNumber}`,
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(COMPANIES_HOUSE_API_KEY + ':').toString('base64')}`
                }
            }
        );

        if (response.status === 404) {
            return res.status(404).json({
                ok: false,
                error: 'company_not_found',
                message: 'Company not found'
            });
        }

        if (!response.ok) {
            console.error('[Companies House] Lookup failed:', response.status);
            return res.status(response.status).json({
                ok: false,
                error: 'companies_house_error',
                message: 'Failed to lookup company'
            });
        }

        const data = await response.json() as any;

        return res.json({
            ok: true,
            data: {
                company_number: data.company_number,
                company_name: data.company_name,
                company_status: data.company_status,
                company_type: data.type,
                date_of_creation: data.date_of_creation,
                registered_office_address: data.registered_office_address,
                sic_codes: data.sic_codes
            }
        });
    } catch (error: any) {
        console.error('[Companies House] Lookup error:', error);
        return res.status(500).json({
            ok: false,
            error: 'lookup_failed',
            message: error.message
        });
    }
});

export default router;
