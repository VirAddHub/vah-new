/** A fake Companies House for tests: fictional data, never the real API. */
import type { ChClient } from '../../server/services/companyChecks/chClient';
import { ChError } from '../../server/services/companyChecks/chClient';

export function fakeCompany(overrides: Record<string, any> = {}) {
    return {
        company_number: '12345678', company_name: 'EXAMPLE TRADING LTD', company_status: 'active', type: 'ltd',
        date_of_creation: '2019-04-01', registered_office_address: { address_line_1: '1 Test Street', locality: 'London', postal_code: 'EC1A 1AA', country: 'England' },
        sic_codes: ['62020'], has_insolvency_history: false, has_been_liquidated: false,
        accounts: { next_due: '2027-01-31', overdue: false, last_accounts: { made_up_to: '2025-04-30' } },
        confirmation_statement: { next_due: '2027-04-15', overdue: false, last_made_up_to: '2026-04-01' },
        ...overrides,
    };
}

export function fakeChClient(state: {
    company?: any; officers?: any[]; pscs?: any[]; statements?: any[]; disqualified?: any[]; appointments?: number;
    missing?: boolean; rateLimited?: boolean; calls?: string[];
} = {}): ChClient {
    return {
        async get(path: string, opts: { optional?: boolean } = {}) {
            state.calls?.push(path);
            if (state.rateLimited) throw new ChError('rate_limited', 'limit', 429);
            const company = state.company ?? fakeCompany();
            if (path.startsWith('/search/companies')) return { items: [{ company_number: company.company_number, title: company.company_name, company_status: 'active', address_snippet: 'London' }] };
            if (path.startsWith('/search/disqualified-officers')) return { items: state.disqualified ?? [] };
            if (path.startsWith('/officers/')) return { total_results: state.appointments ?? 2 };
            if (state.missing && path.startsWith('/company/')) { if (opts.optional) return null; throw new ChError('not_found', 'Not found', 404); }
            if (/^\/company\/[^/]+$/.test(path)) return company;
            if (path.includes('/officers')) return { total_results: (state.officers ?? defaultOfficers()).length, items: state.officers ?? defaultOfficers() };
            if (path.includes('/persons-with-significant-control-statements')) return state.statements ? { items: state.statements } : (opts.optional ? null : {});
            if (path.includes('/persons-with-significant-control')) return { items: state.pscs ?? defaultPscs() };
            if (path.includes('/filing-history')) return { items: [{ date: '2026-04-02', type: 'CS01', category: 'confirmation-statement', description: 'confirmation-statement-with-no-updates' }] };
            if (path.includes('/insolvency')) return { cases: [] };
            throw new Error(`unexpected path ${path}`);
        },
    };
}

export const defaultOfficers = () => [
    { name: 'USER, Test', officer_role: 'director', appointed_on: '2019-04-01', country_of_residence: 'England', nationality: 'British',
      date_of_birth: { month: 5, year: 1980 }, links: { officer: { appointments: '/officers/abc123/appointments' } } },
];
export const defaultPscs = () => [
    { name: 'Mr Test User', kind: 'individual-person-with-significant-control', natures_of_control: ['ownership-of-shares-75-to-100-percent', 'voting-rights-75-to-100-percent'],
      notified_on: '2019-04-01', country_of_residence: 'England', date_of_birth: { month: 5, year: 1980 } },
];

/** A complete, fictional company declaration matching the default fake company. */
export const declaration = (over: Record<string, any> = {}): any => ({
    nature_of_business: 'Software consultancy for small businesses', trading_name: null, website: null,
    principal_place_of_business: { same_as_registered_office: true, address: null },
    applicant_role: 'director_and_beneficial_owner', applicant_authority: null,
    people: [{ full_name: 'Test User', email: null, is_account_holder: true, is_director: true, is_beneficial_owner: true,
        ownership_percent: 100, voting_percent: 100, other_control: false, country_of_residence: 'England', date_of_birth: '1980-05' }],
    corporate_owners: [], no_beneficial_owner_explanation: null, expected_monthly_mail: '0-10', confirmation: true, ...over,
});
