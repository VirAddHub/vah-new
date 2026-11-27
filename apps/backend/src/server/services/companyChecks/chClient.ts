/**
 * Companies House public data API, for administrator company checks.
 * https://developer.company-information.service.gov.uk/ (free; 600 requests per 5 minutes per key).
 *
 * The key is read from COMPANIES_HOUSE_API_KEY and never logged or returned.
 * Every call has a timeout. Optional resources (insolvency, PSC statements) answer 404 when there is
 * nothing to show, and are returned as null rather than treated as failures.
 */
import { logger } from '../../../lib/logger';

export const CH_BASE_URL = 'https://api.company-information.service.gov.uk';
const TIMEOUT_MS = 10_000;

export class ChError extends Error {
    constructor(public code: 'not_configured' | 'not_found' | 'rate_limited' | 'unavailable' | 'bad_request', message: string, public status?: number) {
        super(message);
    }
}

/** Upper-case, no spaces; purely numeric numbers are padded to the 8 characters Companies House uses. */
export function normaliseCompanyNumber(raw: unknown): string | null {
    const s = String(raw ?? '').replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z0-9]{1,8}$/.test(s)) return null;
    return /^\d+$/.test(s) ? s.padStart(8, '0') : s;
}

type FetchLike = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

export interface ChClient {
    get(path: string, opts?: { optional?: boolean }): Promise<any | null>;
}

export function createChClient(apiKey = process.env.COMPANIES_HOUSE_API_KEY, fetchImpl: FetchLike = (globalThis.fetch as any)): ChClient {
    return {
        async get(path, opts = {}) {
            if (!apiKey) throw new ChError('not_configured', 'Companies House API key is not configured');
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
            let res;
            try {
                res = await fetchImpl(`${CH_BASE_URL}${path}`, {
                    headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`, Accept: 'application/json' },
                    signal: controller.signal,
                });
            } catch (e) {
                logger.warn('[companyChecks] Companies House request failed', { path: path.split('?')[0], message: (e as Error)?.name });
                throw new ChError('unavailable', 'Companies House did not respond. Try again shortly.');
            } finally {
                clearTimeout(timer);
            }
            if (res.status === 404) {
                if (opts.optional) return null;
                throw new ChError('not_found', 'Not found at Companies House', 404);
            }
            if (res.status === 429) throw new ChError('rate_limited', 'Companies House request limit reached. Try again in a few minutes.', 429);
            if (res.status === 400) throw new ChError('bad_request', 'Companies House rejected the request', 400);
            if (!res.ok) {
                logger.warn('[companyChecks] Companies House error', { path: path.split('?')[0], status: res.status });
                throw new ChError('unavailable', `Companies House answered ${res.status}`, res.status);
            }
            return res.json();
        },
    };
}

/** Search by name or number. A number that matches a company exactly is returned first. */
export async function searchCompanies(client: ChClient, q: string) {
    const query = String(q || '').trim();
    if (query.length < 2 || query.length > 160) throw new ChError('bad_request', 'Enter at least 2 characters');
    const out: any[] = [];
    const number = normaliseCompanyNumber(query);
    if (number && /\d/.test(query)) {
        const exact = await client.get(`/company/${encodeURIComponent(number)}`, { optional: true });
        if (exact) out.push({ company_number: exact.company_number, title: exact.company_name, company_status: exact.company_status,
            date_of_creation: exact.date_of_creation, address_snippet: addressLine(exact.registered_office_address) });
    }
    const r = await client.get(`/search/companies?q=${encodeURIComponent(query)}&items_per_page=10`);
    for (const i of r?.items ?? []) {
        if (out.some(o => o.company_number === i.company_number)) continue;
        out.push({ company_number: i.company_number, title: i.title, company_status: i.company_status, date_of_creation: i.date_of_creation, address_snippet: i.address_snippet });
    }
    return out.slice(0, 10);
}

export function addressLine(a: any): string {
    if (!a) return '';
    return [a.care_of, a.po_box, a.premises, a.address_line_1, a.address_line_2, a.locality, a.region, a.postal_code, a.country]
        .filter(Boolean).join(', ');
}
