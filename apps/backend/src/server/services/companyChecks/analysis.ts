/**
 * Turns a Companies House extract plus what the customer told us into:
 *  - a comparison table (register value vs customer value)
 *  - flags for the administrator to look at
 *  - the checklist and the rules a "satisfactory" decision must meet
 *
 * Nothing here decides due diligence on its own. Flags are prompts; the administrator ticks each
 * checklist item. In particular the PSC register is never treated as proof of beneficial ownership
 * (MLR reg 28(9)): that item needs the administrator's own verification, with evidence or a note.
 */
import { addressLine, normaliseCompanyNumber } from './chClient';
import { nameTokens, sameName, type Snapshot } from './snapshot';

export interface CustomerInfo {
    user_id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
    kyc_status: string | null;
    business_type: string | null;
    company_name: string | null;
    company_number: string | null;
    trading_name: string | null;
    owners: { full_name: string; role: string | null; status: string | null; requires_verification: boolean }[];
}

export type Flag = { level: 'warning' | 'info'; area: string; text: string };
export type ComparisonRow = { field: string; register: string; customer: string; result: 'match' | 'differs' | 'not_supplied' | 'review' };

const SUFFIX = /\b(limited|ltd|plc|llp|lp|cic|community interest company|co|company|uk)\b\.?/g;
export function normaliseCompanyName(s: unknown): string {
    return String(s ?? '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9\s]/g, ' ').replace(SUFFIX, ' ').replace(/\s+/g, ' ').trim();
}

const UK = new Set(['united kingdom', 'england', 'wales', 'scotland', 'northern ireland', 'great britain', 'uk', 'england and wales']);
const isUk = (c: unknown) => !c || UK.has(String(c).toLowerCase().trim());

const active = (o: any) => !o.resigned_on;
const activePsc = (p: any) => !p.ceased_on && !p.ceased;
const DIRECTOR_ROLES = /director|member|partner/;
export const APPOINTMENTS_REVIEW_THRESHOLD = 20;

export function analyse(s: Snapshot, c: CustomerInfo) {
    const flags: Flag[] = [];
    const p = s.profile || {};
    const officers = s.officers.filter(active);
    const pscs = s.pscs.filter(activePsc);

    // --- Company ---
    if (p.company_status !== 'active') flags.push({ level: 'warning', area: 'Status', text: `Company status is "${p.company_status || 'unknown'}"${p.company_status_detail ? ` (${p.company_status_detail})` : ''}.` });
    if (p.has_insolvency_history || p.has_been_liquidated) flags.push({ level: 'warning', area: 'Insolvency', text: 'Companies House shows insolvency or liquidation history.' });
    if (p.registered_office_is_in_dispute) flags.push({ level: 'warning', area: 'Registered office', text: 'The registered office is marked as in dispute.' });
    if (p.undeliverable_registered_office_address) flags.push({ level: 'warning', area: 'Registered office', text: 'Mail to the registered office has been marked undeliverable.' });
    if (p.accounts?.overdue) flags.push({ level: 'warning', area: 'Filings', text: `Accounts are overdue (were due ${p.accounts?.next_due ?? 'earlier'}).` });
    if (p.confirmation_statement?.overdue) flags.push({ level: 'warning', area: 'Filings', text: `Confirmation statement is overdue (was due ${p.confirmation_statement?.next_due ?? 'earlier'}).` });
    if (p.date_of_creation && Date.now() - Date.parse(p.date_of_creation) < 90 * 864e5) flags.push({ level: 'info', area: 'Company', text: `Incorporated recently (${p.date_of_creation}). Compare with any pre-incorporation declaration.` });
    if ((p.previous_company_names ?? []).length) flags.push({ level: 'info', area: 'Company', text: `Has ${p.previous_company_names.length} previous name(s).` });
    if (!(p.sic_codes ?? []).length) flags.push({ level: 'info', area: 'Activity', text: 'No SIC codes on the register.' });

    // --- Officers ---
    if (!officers.some(o => DIRECTOR_ROLES.test(String(o.officer_role)))) flags.push({ level: 'warning', area: 'Officers', text: 'No current director, member or partner on the register.' });
    for (const o of officers) {
        if (/corporate/.test(String(o.officer_role))) flags.push({ level: 'warning', area: 'Officers', text: `${o.name} is a corporate officer: identify the individuals behind it.` });
        if (!isUk(o.country_of_residence)) flags.push({ level: 'warning', area: 'Officers', text: `${o.name} lives outside the UK (${o.country_of_residence}).` });
        if ((o.appointment_count ?? 0) >= APPOINTMENTS_REVIEW_THRESHOLD) flags.push({ level: 'warning', area: 'Officers', text: `${o.name} has ${o.appointment_count} appointments: check for nominee arrangements.` });
        for (const m of o.disqualification?.matches ?? []) flags.push({ level: 'warning', area: 'Disqualification', text: `Possible disqualified-director match for ${o.name}: "${m.title}" (${m.basis}). Review the record.` });
    }
    if (s.screening_truncated) flags.push({ level: 'info', area: 'Disqualification', text: 'More than 15 current officers: only the first 15 were screened automatically. Check the rest manually.' });

    // --- PSCs ---
    if (!pscs.length && !s.psc_statements.filter(x => !x.ceased_on).length) flags.push({ level: 'warning', area: 'PSC', text: 'No current PSCs and no PSC statement on the register.' });
    for (const x of s.psc_statements.filter(x => !x.ceased_on)) flags.push({ level: 'warning', area: 'PSC', text: `PSC statement on file: "${String(x.statement).replace(/-/g, ' ')}".` });
    for (const ps of pscs) {
        if (/corporate-entity|legal-person/.test(String(ps.kind))) flags.push({ level: 'warning', area: 'PSC', text: `${ps.name} is a ${String(ps.kind).includes('legal') ? 'legal person' : 'corporate'} PSC: trace the ownership to the individuals who ultimately own or control it.` });
        if (/super-secure/.test(String(ps.kind))) flags.push({ level: 'warning', area: 'PSC', text: 'A PSC\'s details are protected (super-secure): verify beneficial ownership directly with the customer.' });
        if (/individual/.test(String(ps.kind)) && !isUk(ps.country_of_residence)) flags.push({ level: 'warning', area: 'PSC', text: `${ps.name} lives outside the UK (${ps.country_of_residence}).` });
        if (ps.is_sanctioned) flags.push({ level: 'warning', area: 'PSC', text: `${ps.name} is marked as sanctioned on the register.` });
    }
    for (const e of s.partial_errors) flags.push({ level: 'warning', area: 'Data', text: `Part of the register could not be retrieved: ${e}. Refresh before deciding.` });

    // --- Comparison with the customer's information ---
    const comparison: ComparisonRow[] = [];
    const custNumber = normaliseCompanyNumber(c.company_number);
    comparison.push({ field: 'Company number', register: p.company_number ?? '', customer: c.company_number ?? '',
        result: !c.company_number ? 'not_supplied' : custNumber === p.company_number ? 'match' : 'differs' });
    comparison.push({ field: 'Company name', register: p.company_name ?? '', customer: c.company_name ?? '',
        result: !c.company_name ? 'not_supplied' : normaliseCompanyName(c.company_name) === normaliseCompanyName(p.company_name) ? 'match' : 'differs' });
    if (c.business_type) {
        const t = String(c.business_type).toLowerCase();
        const reg = String(p.type ?? '');
        const ok = /llp/.test(t) ? /llp/.test(reg) : /limited|ltd/.test(t) ? /ltd|private|plc|public/.test(reg) : null;
        comparison.push({ field: 'Company type', register: reg, customer: c.business_type, result: ok === null ? 'review' : ok ? 'match' : 'differs' });
    }
    comparison.push({ field: 'Registered office', register: addressLine(p.registered_office_address), customer: '', result: 'review' });
    comparison.push({ field: 'Nature of business (SIC)', register: (p.sic_codes ?? []).join(', '), customer: '', result: 'review' });

    const applicant = [c.first_name, c.last_name].filter(Boolean).join(' ');
    const people = [...officers.map(o => o.name), ...pscs.filter(ps => /individual/.test(String(ps.kind))).map(ps => ps.name)];
    if (applicant) {
        const onRegister = people.some(n => sameName(n, applicant));
        comparison.push({ field: 'Account holder on the register', register: onRegister ? 'Yes' : 'Not found as an officer or PSC', customer: applicant, result: onRegister ? 'match' : 'differs' });
    }
    const declared = c.owners.map(o => o.full_name).filter(Boolean);
    for (const d of declared) {
        const found = people.some(n => sameName(n, d));
        comparison.push({ field: 'Declared owner/director', register: found ? 'Found' : 'Not found', customer: d, result: found ? 'match' : 'differs' });
    }
    const known = [applicant, ...declared].filter(Boolean);
    const undeclared = [
        ...officers.filter(o => DIRECTOR_ROLES.test(String(o.officer_role)) && !/corporate/.test(String(o.officer_role))).map(o => o.name),
        ...pscs.filter(ps => /individual/.test(String(ps.kind))).map(ps => ps.name),
    ].filter((n, i, all) => all.findIndex(x => sameName(x, n)) === i && !known.some(k => sameName(k, n)));
    for (const u of undeclared) comparison.push({ field: 'Director/PSC not declared by customer', register: u, customer: '', result: 'differs' });

    return { flags, comparison };
}

/** The compliance checklist. Every item is ticked by an administrator; flags are hints, not results. */
export const CHECKLIST = [
    { id: 'register_extract', label: 'Register extract obtained and reviewed', hint: 'Company details, officers, PSCs and filing history retrieved from Companies House.' },
    { id: 'status', label: 'Status and insolvency reviewed', hint: 'Active, not dissolved or in liquidation; insolvency history explained.' },
    { id: 'customer_match', label: 'Compared with customer information', hint: 'Name, number, type and registered office match what the customer gave us.' },
    { id: 'activity', label: 'Nature of business consistent', hint: 'SIC codes are consistent with what the customer told us about their business.' },
    { id: 'officers', label: 'Directors reviewed', hint: 'Directors match the people declared; residence and other appointments considered.' },
    { id: 'disqualifications', label: 'Disqualified directors register checked', hint: 'Any possible match reviewed and resolved.' },
    { id: 'filings', label: 'Accounts and confirmation statement reviewed', hint: 'Filing position checked; any overdue filing explained.' },
    { id: 'psc', label: 'PSC register and statements reviewed', hint: 'Corporate, protected or missing PSCs followed up.' },
    { id: 'beneficial_owners', label: 'Beneficial owners verified independently', hint: 'Not on the PSC register alone (MLR reg 28(9)). Upload evidence or record how they were verified.' },
    { id: 'owner_identity', label: 'Individual checks confirmed as done separately', hint: 'Each beneficial owner and director needing it has passed identity verification (Sumsub), and screening is recorded outside this section.' },
    { id: 'discrepancies', label: 'Discrepancies recorded and reported', hint: 'Material discrepancies reported to Companies House (MLR reg 30A) and the reference recorded.' },
] as const;
export type ChecklistId = typeof CHECKLIST[number]['id'];
export const CHECKLIST_IDS = CHECKLIST.map(i => i.id) as string[];

export const MAX_EXTRACT_AGE_DAYS = 30;

/** What still stops a "satisfactory" decision. Empty list = it may be recorded. */
export function satisfactoryBlockers(input: {
    checklist: Record<string, { done?: boolean; note?: string | null } | undefined>;
    fetchedAt: Date | string | null;
    hasSnapshot: boolean;
    partialErrors: number;
    unresolvedDiscrepancies: number;
    beneficialOwnerEvidence: number;
    now?: number;
}): string[] {
    const out: string[] = [];
    const now = input.now ?? Date.now();
    if (!input.hasSnapshot) out.push('Retrieve the Companies House extract first.');
    else if (input.partialErrors > 0) out.push('Part of the extract could not be retrieved. Refresh it.');
    if (input.fetchedAt && now - new Date(input.fetchedAt).getTime() > MAX_EXTRACT_AGE_DAYS * 864e5) out.push(`The extract is more than ${MAX_EXTRACT_AGE_DAYS} days old. Refresh it.`);
    const open = CHECKLIST.filter(i => !input.checklist[i.id]?.done);
    if (open.length) out.push(`Checklist items outstanding: ${open.map(i => i.label).join('; ')}.`);
    const bo = input.checklist.beneficial_owners;
    if (bo?.done && !input.beneficialOwnerEvidence && !(bo.note && bo.note.trim().length >= 20)) {
        out.push('Beneficial ownership needs supporting evidence or a note (at least 20 characters) explaining how it was verified.');
    }
    if (input.unresolvedDiscrepancies > 0) out.push(`${input.unresolvedDiscrepancies} discrepancy(ies) not yet resolved.`);
    return out;
}

export { nameTokens };
