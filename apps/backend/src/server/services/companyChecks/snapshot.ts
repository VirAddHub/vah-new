/**
 * The Companies House register extract for one company: profile, officers, PSCs and statements,
 * filing history, insolvency, and a disqualified-directors search and appointment count for each
 * current officer. Stored as JSON on the check so the record shows exactly what was seen and when.
 */
import crypto from 'crypto';
import { ChClient, ChError } from './chClient';

const MAX_OFFICERS_SCREENED = 15; // keeps one check well inside the shared 600-per-5-minutes allowance

export interface Snapshot {
    retrieved_at: string;
    profile: any;
    officers: any[];
    officers_total: number;
    pscs: any[];
    psc_statements: any[];
    filing_history: any[];
    insolvency: any | null;
    screening_truncated: boolean;
    partial_errors: string[];
}

const pick = (o: any, keys: string[]) => Object.fromEntries(keys.filter(k => o?.[k] !== undefined).map(k => [k, o[k]]));

/** "SMITH, John Paul" -> ["john", "paul", "smith"]; "Mr John Paul Smith" -> same. Titles removed. */
export function nameTokens(name: unknown): string[] {
    const s = String(name ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
    let ordered = s;
    const comma = s.indexOf(',');
    if (comma > 0) ordered = `${s.slice(comma + 1)} ${s.slice(0, comma)}`;
    return ordered.replace(/[^a-z\s'-]/g, ' ').split(/\s+/)
        .filter(t => t && !['mr', 'mrs', 'ms', 'miss', 'dr', 'sir', 'dame', 'lord', 'lady', 'prof'].includes(t));
}

/** Same first forename and surname (Companies House often adds middle names the customer did not). */
export function sameName(a: unknown, b: unknown): boolean {
    const x = nameTokens(a), y = nameTokens(b);
    if (x.length < 2 || y.length < 2) return x.length > 0 && x.join(' ') === y.join(' ');
    return x[0] === y[0] && x[x.length - 1] === y[y.length - 1];
}

function officerIdFrom(link: unknown): string | null {
    const m = String(link || '').match(/^\/officers\/([^/]+)\/appointments/);
    return m ? m[1] : null;
}

async function screenOfficer(client: ChClient, o: any) {
    const searchName = nameTokens(o.name).join(' ');
    const out: any = { appointment_count: null, disqualification: { searched: false, matches: [] as any[] } };
    const id = officerIdFrom(o.links?.officer?.appointments);
    if (id) {
        const a = await client.get(`/officers/${encodeURIComponent(id)}/appointments?items_per_page=1`, { optional: true });
        out.appointment_count = typeof a?.total_results === 'number' ? a.total_results : null;
    }
    if (searchName) {
        const r = await client.get(`/search/disqualified-officers?q=${encodeURIComponent(searchName)}&items_per_page=20`);
        out.disqualification.searched = true;
        for (const i of r?.items ?? []) {
            if (!sameName(o.name, i.title)) continue;
            const dob = String(i.date_of_birth || '');
            const dobKnown = !!(dob && o.date_of_birth?.year);
            const dobMatch = dobKnown ? dob.startsWith(`${o.date_of_birth.year}-${String(o.date_of_birth.month).padStart(2, '0')}`) : null;
            if (dobMatch === false) continue;
            out.disqualification.matches.push({ title: i.title, date_of_birth: i.date_of_birth || null, link: i.links?.self || null,
                description: i.description || null, basis: dobMatch ? 'name and date of birth' : 'name only' });
        }
    }
    return out;
}

export async function fetchSnapshot(client: ChClient, companyNumber: string, now = new Date()): Promise<Snapshot> {
    const n = encodeURIComponent(companyNumber);
    const profile = await client.get(`/company/${n}`); // a missing company is a hard failure
    const partial: string[] = [];
    const soft = async <T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
        try { return await fn(); } catch (e) {
            if (e instanceof ChError && e.code === 'rate_limited') throw e;
            partial.push(`${label}: ${(e as Error).message}`);
            return fallback;
        }
    };
    const officersRes = await soft('officers', () => client.get(`/company/${n}/officers?items_per_page=100`), null as any);
    const pscRes = await soft('persons with significant control', () => client.get(`/company/${n}/persons-with-significant-control?items_per_page=100`, { optional: true }), null as any);
    const stmtRes = await soft('PSC statements', () => client.get(`/company/${n}/persons-with-significant-control-statements?items_per_page=100`, { optional: true }), null as any);
    const filingRes = await soft('filing history', () => client.get(`/company/${n}/filing-history?items_per_page=25`), null as any);
    const insolvency = (profile.has_insolvency_history || profile.has_been_liquidated)
        ? await soft('insolvency', () => client.get(`/company/${n}/insolvency`, { optional: true }), null)
        : null;

    const rawOfficers: any[] = officersRes?.items ?? [];
    const current = rawOfficers.filter(o => !o.resigned_on);
    let screened = 0;
    const officers: any[] = [];
    for (const o of rawOfficers) {
        const base = {
            ...pick(o, ['name', 'officer_role', 'appointed_on', 'resigned_on', 'nationality', 'country_of_residence', 'occupation']),
            date_of_birth: o.date_of_birth ? { month: o.date_of_birth.month, year: o.date_of_birth.year } : null,
            appointments_link: o.links?.officer?.appointments || null,
        };
        if (!o.resigned_on && screened < MAX_OFFICERS_SCREENED) {
            screened++;
            officers.push({ ...base, ...(await soft(`screening for ${o.name}`, () => screenOfficer(client, o), { appointment_count: null, disqualification: { searched: false, matches: [] } })) });
        } else {
            officers.push(base);
        }
    }

    const pscs = (pscRes?.items ?? []).map((p: any) => ({
        ...pick(p, ['name', 'kind', 'natures_of_control', 'notified_on', 'ceased_on', 'ceased', 'nationality', 'country_of_residence', 'is_sanctioned']),
        date_of_birth: p.date_of_birth ? { month: p.date_of_birth.month, year: p.date_of_birth.year } : null,
        identification: p.identification ? pick(p.identification, ['legal_form', 'legal_authority', 'registration_number', 'country_registered', 'place_registered']) : null,
    }));

    return {
        retrieved_at: now.toISOString(),
        profile: pick(profile, ['company_number', 'company_name', 'company_status', 'company_status_detail', 'type', 'subtype', 'jurisdiction',
            'date_of_creation', 'date_of_cessation', 'registered_office_address', 'sic_codes', 'has_insolvency_history', 'has_been_liquidated',
            'has_charges', 'registered_office_is_in_dispute', 'undeliverable_registered_office_address', 'accounts', 'confirmation_statement',
            'previous_company_names']),
        officers,
        officers_total: typeof officersRes?.total_results === 'number' ? officersRes.total_results : rawOfficers.length,
        pscs,
        psc_statements: (stmtRes?.items ?? []).map((s: any) => pick(s, ['statement', 'notified_on', 'ceased_on'])),
        filing_history: (filingRes?.items ?? []).map((f: any) => pick(f, ['date', 'type', 'category', 'description', 'description_values', 'transaction_id'])),
        insolvency: insolvency ? { cases: (insolvency.cases ?? []).map((c: any) => ({ type: c.type, dates: c.dates ?? [], practitioners: (c.practitioners ?? []).map((p: any) => p.name) })) } : null,
        screening_truncated: current.length > MAX_OFFICERS_SCREENED,
        partial_errors: partial,
    };
}

/** The parts of the register that monitoring watches. A change in any of them raises an alert. */
export function monitoredView(s: Snapshot) {
    const p = s.profile || {};
    return {
        company_name: p.company_name ?? null,
        company_status: p.company_status ?? null,
        company_status_detail: p.company_status_detail ?? null,
        registered_office: p.registered_office_address ?? null,
        sic_codes: [...(p.sic_codes ?? [])].sort(),
        insolvency: !!(p.has_insolvency_history || p.has_been_liquidated),
        registered_office_is_in_dispute: !!p.registered_office_is_in_dispute,
        accounts_overdue: !!p.accounts?.overdue,
        confirmation_statement_overdue: !!p.confirmation_statement?.overdue,
        officers: s.officers.filter(o => !o.resigned_on).map(o => `${o.officer_role}:${nameTokens(o.name).join(' ')}`).sort(),
        pscs: s.pscs.filter(p => !p.ceased_on && !p.ceased).map(p => `${p.kind}:${nameTokens(p.name).join(' ')}:${[...(p.natures_of_control ?? [])].sort().join('|')}`).sort(),
        psc_statements: s.psc_statements.filter(x => !x.ceased_on).map(x => x.statement).sort(),
        disqualification_matches: s.officers.flatMap(o => (o.disqualification?.matches ?? []).map((m: any) => m.title)).sort(),
    };
}

/** JSON with object keys sorted, so a copy read back from Postgres (jsonb re-orders keys) compares equal. */
export function stableStringify(v: unknown): string {
    if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
    if (v && typeof v === 'object') return `{${Object.keys(v as object).sort().map(k => `${JSON.stringify(k)}:${stableStringify((v as any)[k])}`).join(',')}}`;
    return JSON.stringify(v ?? null);
}

export function snapshotHash(s: Snapshot): string {
    return crypto.createHash('sha256').update(stableStringify(monitoredView(s))).digest('hex');
}

const LABELS: Record<string, string> = {
    company_name: 'Company name', company_status: 'Company status', company_status_detail: 'Status detail',
    registered_office: 'Registered office', sic_codes: 'SIC codes', insolvency: 'Insolvency or liquidation history',
    registered_office_is_in_dispute: 'Registered office in dispute', accounts_overdue: 'Accounts overdue',
    confirmation_statement_overdue: 'Confirmation statement overdue', officers: 'Current officers', pscs: 'Persons with significant control',
    psc_statements: 'PSC statements', disqualification_matches: 'Possible disqualified-director matches',
};

/** Field-by-field differences between two extracts, for an alert. */
export function diffSnapshots(before: Snapshot, after: Snapshot): { field: string; label: string; before: unknown; after: unknown }[] {
    const a = monitoredView(before) as Record<string, unknown>, b = monitoredView(after) as Record<string, unknown>;
    return Object.keys(b).filter(k => stableStringify(a[k]) !== stableStringify(b[k]))
        .map(k => ({ field: k, label: LABELS[k] || k, before: a[k], after: b[k] }));
}
