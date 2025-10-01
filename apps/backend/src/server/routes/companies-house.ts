// src/server/routes/companies-house.ts
// Companies House API proxy endpoints

import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';

const router = Router();

const COMPANIES_HOUSE_API_KEY = process.env.COMPANIES_HOUSE_API_KEY;
const COMPANIES_HOUSE_BASE_URL = 'https://api.company-information.service.gov.uk';

/**
 * GET /api/companies-house/search?q=query
 * Search for companies
 */
router.get('/search', async (req: Request, res: Response) => {
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

    try {
        const response = await fetch(
            `${COMPANIES_HOUSE_BASE_URL}/search/companies?q=${encodeURIComponent(query)}`,
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(COMPANIES_HOUSE_API_KEY + ':').toString('base64')}`
                }
            }
        );

        if (!response.ok) {
            console.error('[Companies House] Search failed:', response.status);
            return res.status(response.status).json({
                ok: false,
                error: 'companies_house_error',
                message: 'Failed to search companies'
            });
        }

        const data = await response.json();

        return res.json({
            ok: true,
            data: data.items || [],
            total_results: data.total_results || 0
        });
    } catch (error: any) {
        console.error('[Companies House] Search error:', error);
        return res.status(500).json({
            ok: false,
            error: 'search_failed',
            message: error.message
        });
    }
});

/**
 * GET /api/companies-house/company/:number
 * Get company details by number
 */
router.get('/company/:number', async (req: Request, res: Response) => {
    const companyNumber = req.params.number;

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

        const data = await response.json();

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
