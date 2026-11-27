/**
 * Company due diligence analysis.
 *
 * Inputs: the Companies House extract, what the customer told us (account details and their
 * company declaration) and the identity status of the people involved.
 * Outputs, each kept distinct:
 *  - automated results the system has performed (pass / attention / missing / discrepancy / not available)
 *  - missing information (who needs to supply it) — not a discrepancy
 *  - discrepancies: the customer's declaration and the register disagree. Each is categorised:
 *      beneficial_ownership: about PSCs / beneficial owners. MLR reg 30A reporting applies only to
 *        these, and only when material (reasonably linked to money laundering, terrorist financing
 *        or concealing details of the customer's business).
 *      other: names, numbers, directors, activity. Resolved internally; never reported under reg 30A.
 *  - the few items that need human judgement.
 *
 * Nothing here approves anything. The PSC register is never accepted on its own as proof of
 * beneficial ownership (MLR reg 28(9)).
 */
import { addressLine, normaliseCompanyNumber } from './chClient';
import { nameTokens, sameName, type Snapshot } from './snapshot';
import { isBeneficialOwner, type Declaration } from './declaration';

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
    owners: { id?: number; full_name: string; email?: string | null; role: string | null; status: string | null; requires_verification: boolean }[];
    declaration?: { data: Declaration; submitted_at: string | Date; returned_at?: string | Date | null; returned_reason?: string | null } | null;
}

export type AutoStatus = 'pass' | 'attention' | 'missing' | 'discrepancy' | 'not_available';
export type AutoResult = { id: string; label: string; status: AutoStatus; detail: string };
export type Discrepancy = { key: string; category: 'beneficial_ownership' | 'other'; field: string; register: string; declared: string; text: string };
export type Missing = { key: string; from: 'customer' | 'register' | 'administrator'; text: string };
export type Flag = { level: 'warning' | 'info'; area: string; text: string };
export type ComparisonRow = { field: string; register: string; customer: string; result: 'match' | 'differs' | 'not_supplied' | 'review' };

const SUFFIX = /\b(limited|ltd|plc|llp|lp|cic|community interest company|co|company|uk)\b\.?/g;
export function normaliseCompanyName(s: unknown): string {
    return String(s ?? '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9\s]/g, ' ').replace(SUFFIX, ' ').replace(/\s+/g, ' ').trim();
}

const UK = new Set(['united kingdom', 'england', 'wales', 'scotland', 'northern ireland', 'great britain', 'uk', 'england and wales', 'gb']);
const isUk = (c: unknown) => !c || UK.has(String(c).toLowerCase().trim());
const activeOfficer = (o: any) => !o.resigned_on;
const activePsc = (p: any) => !p.ceased_on && !p.ceased;
const isDirectorRole = (r: unknown) => /director|member|partner|managing-officer/.test(String(r)) && !/secretary/.test(String(r));
export const APPOINTMENTS_REVIEW_THRESHOLD = 20;
export const MAX_EXTRACT_AGE_DAYS = 30;
const key = (s: string) => nameTokens(s).join(' ') || s.toLowerCase().trim();

/** PSC "natures of control" band for shares or votes: 25-50, 50-75, 75-100. */
function pscBand(natures: string[] | undefined, kind: 'ownership-of-shares' | 'voting-rights'): string | null {
    const n = (natures ?? []).find(x => x.startsWith(kind));
    const m = n?.match(/(\d+)-to-(\d+)-percent/);
    return m ? `${m[1]}-${m[2]}` : null;
}
function declaredBand(pct: number | null | undefined): string | null {
    if (pct == null || pct <= 25) return null;
    return pct <= 50 ? '25-50' : pct < 75 ? '50-75' : '75-100';
}
const bandText = (b: string | null) => (b ? `${b.replace('-', '–')}%` : 'none over 25%');

export function analyse(s: Snapshot | null, c: CustomerInfo, now = Date.now()) {
    const automated: AutoResult[] = [];
    const discrepancies: Discrepancy[] = [];
    const missing: Missing[] = [];
    const flags: Flag[] = [];
    const comparison: ComparisonRow[] = [];
    const decl = c.declaration && !c.declaration.returned_at ? c.declaration.data : null;
    const add = (id: string, label: string, status: AutoStatus, detail: string) => automated.push({ id, label, status, detail });

    // ---------- Register extract ----------
    if (!s) {
        add('register_extract', 'Companies House extract', 'missing', 'Not retrieved yet.');
        missing.push({ key: 'register_extract', from: 'register', text: 'The Companies House extract has not been retrieved.' });
    } else {
        const age = (now - Date.parse(s.retrieved_at)) / 864e5;
        if (s.partial_errors.length) {
            add('register_extract', 'Companies House extract', 'attention', `Incomplete: ${s.partial_errors.join('; ')}. Refresh.`);
            missing.push({ key: 'register_partial', from: 'register', text: 'Part of the Companies House extract could not be retrieved.' });
        } else if (age > MAX_EXTRACT_AGE_DAYS) {
            add('register_extract', 'Companies House extract', 'attention', `Retrieved ${Math.floor(age)} days ago. Refresh before deciding.`);
        } else {
            add('register_extract', 'Companies House extract', 'pass', `Complete, retrieved ${new Date(s.retrieved_at).toISOString().slice(0, 10)}.`);
        }
    }

    const p = s?.profile ?? {};
    const officers = (s?.officers ?? []).filter(activeOfficer);
    const directors = officers.filter(o => isDirectorRole(o.officer_role));
    const pscs = (s?.pscs ?? []).filter(activePsc);
    const statements = (s?.psc_statements ?? []).filter(x => !x.ceased_on);
    const indiv = pscs.filter(x => /individual/.test(String(x.kind)));
    const corp = pscs.filter(x => /corporate-entity|legal-person/.test(String(x.kind)));

    if (s) {
        // ---------- Company status, filings, registered office ----------
        const bad = p.company_status !== 'active' || p.has_insolvency_history || p.has_been_liquidated;
        add('status', 'Status and insolvency', bad ? 'attention' : 'pass',
            bad ? [p.company_status !== 'active' ? `Status "${p.company_status}${p.company_status_detail ? ` – ${p.company_status_detail}` : ''}"` : '',
                p.has_insolvency_history || p.has_been_liquidated ? 'insolvency or liquidation history' : ''].filter(Boolean).join('; ') + '.'
                : 'Active; no insolvency history.');
        const overdue = [p.accounts?.overdue ? `accounts (due ${p.accounts?.next_due ?? '—'})` : '', p.confirmation_statement?.overdue ? `confirmation statement (due ${p.confirmation_statement?.next_due ?? '—'})` : ''].filter(Boolean);
        add('filings', 'Accounts and confirmation statement', overdue.length ? 'attention' : 'pass', overdue.length ? `Overdue: ${overdue.join(', ')}.` : 'Up to date.');
        const roa = [p.registered_office_is_in_dispute ? 'in dispute' : '', p.undeliverable_registered_office_address ? 'marked undeliverable' : ''].filter(Boolean);
        add('registered_office', 'Registered office', roa.length ? 'attention' : 'pass', roa.length ? `Registered office ${roa.join(' and ')}.` : addressLine(p.registered_office_address) || 'On the register.');

        // ---------- Officers ----------
        const dq = officers.flatMap(o => (o.disqualification?.matches ?? []).map((m: any) => `${o.name} ↔ "${m.title}" (${m.basis})`));
        const unscreened = officers.filter(o => !o.disqualification?.searched).length;
        add('disqualifications', 'Disqualified directors register', dq.length || unscreened ? 'attention' : 'pass',
            dq.length ? `Possible match: ${dq.join('; ')}.` : unscreened ? `${unscreened} current officer(s) not screened automatically. Check them manually.` : `${officers.length} current officer(s) screened; no match.`);
        const overseas = [...officers.filter(o => !isUk(o.country_of_residence)).map(o => `${o.name} (${o.country_of_residence})`),
            ...indiv.filter(x => !isUk(x.country_of_residence)).map(x => `${x.name} (${x.country_of_residence})`)];
        add('residence', 'Residence of directors and PSCs', overseas.length ? 'attention' : 'pass', overseas.length ? `Outside the UK: ${overseas.join('; ')}.` : 'All UK resident.');
        const busy = officers.filter(o => (o.appointment_count ?? 0) >= APPOINTMENTS_REVIEW_THRESHOLD).map(o => `${o.name} (${o.appointment_count})`);
        add('nominee_indicators', 'Other appointments', busy.length ? 'attention' : 'pass', busy.length ? `${busy.join('; ')}: check for nominee arrangements.` : `No officer has ${APPOINTMENTS_REVIEW_THRESHOLD} or more appointments.`);
        if (!directors.length) flags.push({ level: 'warning', area: 'Officers', text: 'No current director, member or partner on the register.' });

        // ---------- PSC register ----------
        const pscIssues = [
            !pscs.length && !statements.length ? 'no PSCs and no PSC statement' : '',
            ...statements.map(x => `statement: ${String(x.statement).replace(/-/g, ' ')}`),
            ...corp.map(x => `${x.name} is a corporate or legal-person PSC (trace the individuals behind it)`),
            pscs.some(x => /super-secure/.test(String(x.kind))) ? 'a PSC\'s details are protected' : '',
            ...pscs.filter(x => x.is_sanctioned).map(x => `${x.name} is marked sanctioned on the register`),
        ].filter(Boolean);
        add('psc_register', 'PSC register', pscIssues.length ? 'attention' : 'pass', pscIssues.length ? `${pscIssues.join('; ')}.` : `${indiv.length} individual PSC(s); no statements.`);
        if (!(p.sic_codes ?? []).length) missing.push({ key: 'sic', from: 'register', text: 'No SIC codes on the register.' });
        if (p.date_of_creation && now - Date.parse(p.date_of_creation) < 90 * 864e5) flags.push({ level: 'info', area: 'Company', text: `Incorporated recently (${p.date_of_creation}).` });
        if ((p.previous_company_names ?? []).length) flags.push({ level: 'info', area: 'Company', text: `Has ${p.previous_company_names.length} previous name(s).` });
        if (p.has_charges) flags.push({ level: 'info', area: 'Company', text: 'The company has registered charges.' });
        if (s.screening_truncated) flags.push({ level: 'info', area: 'Officers', text: 'More than 15 current officers: only the first 15 were screened automatically.' });

        // ---------- Company identity vs the customer's account details ----------
        const rows: [string, string, string, boolean | null][] = [];
        rows.push(['Company number', p.company_number ?? '', c.company_number ?? '', c.company_number ? normaliseCompanyNumber(c.company_number) === p.company_number : null]);
        rows.push(['Company name', p.company_name ?? '', c.company_name ?? '', c.company_name ? normaliseCompanyName(c.company_name) === normaliseCompanyName(p.company_name) : null]);
        if (c.business_type) {
            const t = String(c.business_type).toLowerCase(); const reg = String(p.type ?? '');
            const ok = /llp/.test(t) ? /llp/.test(reg) : /limited|ltd/.test(t) ? /ltd|private|plc|public/.test(reg) : null;
            rows.push(['Company type', reg, c.business_type, ok]);
        }
        const diffs: string[] = [];
        for (const [field, reg, cust, ok] of rows) {
            comparison.push({ field, register: reg, customer: cust, result: ok === null ? (cust ? 'review' : 'not_supplied') : ok ? 'match' : 'differs' });
            if (ok === false) {
                diffs.push(field);
                discrepancies.push({ key: `company:${field.toLowerCase().replace(/\s+/g, '_')}`, category: 'other', field, register: reg, declared: cust, text: `${field} differs: register "${reg}", customer "${cust}".` });
            }
        }
        add('company_details', 'Company name, number and type', diffs.length ? 'discrepancy' : 'pass', diffs.length ? `Differs: ${diffs.join(', ')}.` : 'Match the customer\'s details.');
    }

    // ---------- Declaration ----------
    if (!c.declaration) {
        add('declaration', 'Customer company declaration', 'missing', 'Not submitted yet.');
        missing.push({ key: 'declaration', from: 'customer', text: 'The customer has not submitted their company declaration (activity, directors, beneficial owners, ownership).' });
    } else if (c.declaration.returned_at) {
        add('declaration', 'Customer company declaration', 'missing', `Returned to the customer: ${c.declaration.returned_reason ?? ''}`);
        missing.push({ key: 'declaration', from: 'customer', text: 'Waiting for the customer to resubmit their company declaration.' });
    } else {
        add('declaration', 'Customer company declaration', 'pass', `Submitted ${new Date(c.declaration.submitted_at).toISOString().slice(0, 10)}.`);
    }

    // ---------- People: directors and beneficial owners ----------
    if (s && decl) {
        const declaredDirectors = decl.people.filter(x => x.is_director);
        const dirIssues: string[] = [];
        for (const d of declaredDirectors) {
            const onReg = directors.some(o => sameName(o.name, d.full_name));
            comparison.push({ field: 'Director', register: onReg ? 'Current director' : 'Not a current director', customer: d.full_name, result: onReg ? 'match' : 'differs' });
            if (!onReg) {
                dirIssues.push(d.full_name);
                discrepancies.push({ key: `director_not_registered:${key(d.full_name)}`, category: 'other', field: 'Director', register: 'Not a current director', declared: d.full_name, text: `${d.full_name} is declared as a director but is not a current director on the register.` });
            }
        }
        for (const o of directors.filter(o => !/corporate/.test(String(o.officer_role)))) {
            if (!declaredDirectors.some(d => sameName(o.name, d.full_name))) {
                dirIssues.push(o.name);
                comparison.push({ field: 'Director', register: o.name, customer: 'Not declared', result: 'differs' });
                discrepancies.push({ key: `director_not_declared:${key(o.name)}`, category: 'other', field: 'Director', register: o.name, declared: 'Not declared', text: `${o.name} is a current director on the register but was not declared.` });
            }
        }
        add('directors', 'Directors match the declaration', dirIssues.length ? 'discrepancy' : 'pass', dirIssues.length ? `Differences: ${dirIssues.join(', ')}.` : `${declaredDirectors.length} declared director(s) match the register.`);

        const declaredOwners = decl.people.filter(isBeneficialOwner);
        const boIssues: string[] = [];
        for (const d of declaredOwners) {
            const psc = indiv.find(x => sameName(x.name, d.full_name));
            if (!psc) {
                // An owner who holds through a declared corporate owner that is itself a PSC is expected to be absent.
                const surname = nameTokens(d.full_name).slice(-1)[0];
                const viaCorporate = !!surname && corp.length > 0 && decl.corporate_owners.some(co => co.ultimate_owners.toLowerCase().includes(surname));
                if (viaCorporate) continue;
                boIssues.push(d.full_name);
                discrepancies.push({ key: `bo_not_registered:${key(d.full_name)}`, category: 'beneficial_ownership', field: 'Beneficial owner', register: 'Not a PSC',
                    declared: `${d.full_name}${d.ownership_percent != null ? ` (${d.ownership_percent}% shares)` : ''}`, text: `${d.full_name} is declared as a beneficial owner but is not on the PSC register.` });
                continue;
            }
            comparison.push({ field: 'Beneficial owner', register: `${psc.name} (${(psc.natures_of_control ?? []).map((x: string) => x.replace(/-/g, ' ')).join('; ')})`, customer: `${d.full_name}${d.ownership_percent != null ? `, ${d.ownership_percent}% shares` : ''}${d.voting_percent != null ? `, ${d.voting_percent}% votes` : ''}`, result: 'review' });
            const regShares = pscBand(psc.natures_of_control, 'ownership-of-shares');
            if (d.ownership_percent != null && regShares !== declaredBand(d.ownership_percent)) {
                boIssues.push(`${d.full_name} (shares)`);
                discrepancies.push({ key: `bo_shares:${key(d.full_name)}`, category: 'beneficial_ownership', field: 'Nature of control (shares)', register: bandText(regShares), declared: `${d.ownership_percent}%`,
                    text: `${d.full_name}: shareholding declared as ${d.ownership_percent}% but the register shows ${bandText(regShares)}.` });
            }
            const regVotes = pscBand(psc.natures_of_control, 'voting-rights');
            if (d.voting_percent != null && regVotes !== declaredBand(d.voting_percent)) {
                boIssues.push(`${d.full_name} (votes)`);
                discrepancies.push({ key: `bo_votes:${key(d.full_name)}`, category: 'beneficial_ownership', field: 'Nature of control (votes)', register: bandText(regVotes), declared: `${d.voting_percent}%`,
                    text: `${d.full_name}: voting rights declared as ${d.voting_percent}% but the register shows ${bandText(regVotes)}.` });
            }
        }
        for (const x of indiv) {
            if (!declaredOwners.some(d => sameName(x.name, d.full_name))) {
                boIssues.push(x.name);
                discrepancies.push({ key: `psc_not_declared:${key(x.name)}`, category: 'beneficial_ownership', field: 'Person with significant control', register: x.name, declared: 'Not declared',
                    text: `${x.name} is a PSC on the register but was not declared as a beneficial owner.` });
            }
        }
        for (const x of corp) {
            if (!decl.corporate_owners.some(co => normaliseCompanyName(co.name) === normaliseCompanyName(x.name))) {
                boIssues.push(x.name);
                discrepancies.push({ key: `corporate_psc_not_declared:${normaliseCompanyName(x.name)}`, category: 'beneficial_ownership', field: 'Corporate owner', register: x.name, declared: 'Not declared',
                    text: `${x.name} is a corporate PSC on the register but was not declared as a corporate owner.` });
            }
        }
        for (const co of decl.corporate_owners) {
            if (co.ownership_percent > 25 && !corp.some(x => normaliseCompanyName(co.name) === normaliseCompanyName(x.name))) {
                boIssues.push(co.name);
                discrepancies.push({ key: `corporate_owner_not_registered:${normaliseCompanyName(co.name)}`, category: 'beneficial_ownership', field: 'Corporate owner', register: 'Not a PSC', declared: `${co.name} (${co.ownership_percent}%)`,
                    text: `${co.name} is declared as owning ${co.ownership_percent}% but is not a PSC on the register.` });
            }
        }
        add('beneficial_owners', 'Beneficial owners match the PSC register', boIssues.length ? 'discrepancy' : 'pass',
            boIssues.length ? `Differences: ${boIssues.join(', ')}.` : 'Declared owners and control match the PSC register.');

        const holder = [c.first_name, c.last_name].filter(Boolean).join(' ');
        const onRegister = [...officers.map(o => o.name), ...indiv.map(x => x.name)].some(n => sameName(n, holder));
        const asAgent = decl.applicant_role === 'authorised_person';
        add('applicant_role', 'Account holder\'s role', onRegister ? 'pass' : 'attention',
            onRegister ? `${holder} appears on the register.` : asAgent ? `${holder} acts for the company as an authorised person: "${decl.applicant_authority}". Confirm their authority.` : `${holder} does not appear as an officer or PSC.`);
        comparison.push({ field: 'Nature of business', register: (p.sic_codes ?? []).join(', ') || 'No SIC codes', customer: decl.nature_of_business, result: 'review' });
        comparison.push({ field: 'Principal place of business', register: addressLine(p.registered_office_address), customer: decl.principal_place_of_business.same_as_registered_office ? 'Same as registered office' : (decl.principal_place_of_business.address ?? ''), result: 'review' });
        if (decl.no_beneficial_owner_explanation) flags.push({ level: 'warning', area: 'Ownership', text: `Customer says no one owns or controls more than 25%: ${decl.no_beneficial_owner_explanation}` });
    } else if (s) {
        add('directors', 'Directors match the declaration', 'missing', 'Waiting for the customer\'s declaration.');
        add('beneficial_owners', 'Beneficial owners match the PSC register', 'missing', 'Waiting for the customer\'s declaration.');
    }

    // ---------- Individuals (checked separately; shown so nothing is missed) ----------
    const holderOk = c.kyc_status === 'approved' || c.kyc_status === 'verified';
    const pendingOwners = c.owners.filter(o => o.requires_verification && o.status !== 'verified');
    const uncovered = decl ? decl.people.filter(x => !x.is_account_holder && (x.is_director || isBeneficialOwner(x)))
        .filter(x => !c.owners.some(o => sameName(o.full_name, x.full_name) || (!!x.email && o.email === x.email))) : [];
    add('individual_identity', 'Identity of account holder and owners (separate check)',
        holderOk && !pendingOwners.length && !uncovered.length ? 'pass' : 'missing',
        [holderOk ? 'Account holder verified' : `Account holder: ${(c.kyc_status || 'not started').replace(/_/g, ' ')}`,
            pendingOwners.length ? `waiting for ${pendingOwners.map(o => `${o.full_name} (${(o.status ?? 'not started').replace(/_/g, ' ')})`).join(', ')}` : '',
            uncovered.length ? `not yet asked to verify: ${uncovered.map(x => x.full_name).join(', ')}` : ''].filter(Boolean).join('; ') + '.');
    if (!holderOk || pendingOwners.length || uncovered.length) missing.push({ key: 'identity', from: 'customer', text: 'Identity verification is outstanding for the account holder or an owner.' });
    add('screening', 'PEP, sanctions and adverse media (separate check)', 'not_available', 'No screening provider is connected. Record screening outside this system until one is connected and tested.');

    const attention = automated.filter(a => a.status === 'attention').length;
    return { automated, discrepancies, missing, flags, comparison, attention };
}

/** Items that need a person's judgement. Everything else is automated. */
export const JUDGEMENT = [
    { id: 'beneficial_owners', label: 'Beneficial ownership verified independently', hint: 'Not from the PSC register alone (MLR reg 28(9)). Upload evidence, or note how you verified who ultimately owns and controls the company.' },
    { id: 'activity', label: 'Business activity is consistent and acceptable', hint: 'Compare what the customer said they do with the SIC codes and anything else you know.' },
    { id: 'warnings_reviewed', label: 'Automated warnings reviewed', hint: 'Needed only when automated results show items for attention. Note what you concluded.' },
] as const;
export const JUDGEMENT_IDS = JUDGEMENT.map(i => i.id) as string[];
/** Older name kept for reports and stored data. */
export const CHECKLIST = JUDGEMENT;
export const CHECKLIST_IDS = JUDGEMENT_IDS;

export function requiredJudgement(attention: number): string[] {
    return JUDGEMENT_IDS.filter(id => id !== 'warnings_reviewed' || attention > 0);
}

/** What still stops the review being completed as satisfactory. Empty = it can be. */
export function satisfactoryBlockers(input: {
    checklist: Record<string, { done?: boolean; note?: string | null } | undefined>;
    automated: AutoResult[];
    attention: number;
    unrecordedDiscrepancies: number;
    unresolvedDiscrepancies: number;
    beneficialOwnerEvidence: number;
    riskRating?: string | null;
}): string[] {
    const out: string[] = [];
    const st = (id: string) => input.automated.find(a => a.id === id)?.status;
    if (st('register_extract') !== 'pass') out.push('Refresh the Companies House extract (missing, incomplete or out of date).');
    if (st('declaration') !== 'pass') out.push('The customer\'s company declaration is needed.');
    const disc = input.unrecordedDiscrepancies + input.unresolvedDiscrepancies;
    if (disc > 0) out.push(`Resolve ${disc} discrepancy(ies).`);
    const open = requiredJudgement(input.attention).filter(id => !input.checklist[id]?.done);
    if (open.length) out.push(`Your judgement is needed: ${open.map(id => JUDGEMENT.find(j => j.id === id)!.label.toLowerCase()).join('; ')}.`);
    const bo = input.checklist.beneficial_owners;
    if (bo?.done && !input.beneficialOwnerEvidence && !((bo.note ?? '').trim().length >= 20)) out.push('Beneficial ownership needs supporting evidence or a note of at least 20 characters.');
    const wr = input.checklist.warnings_reviewed;
    if (input.attention > 0 && wr?.done && !((wr.note ?? '').trim().length >= 10)) out.push('Note what you concluded about the automated warnings.');
    if (!input.riskRating) out.push('Choose a risk rating.');
    return out;
}

/** The single next thing to do on a check, for the queue and the banner. */
export function nextAction(x: { status: string; hasSnapshot: boolean; fetchError: string | null; openAlerts: number; unresolved: number;
    automated: AutoResult[]; blockers: string[] }): { key: string; priority: number; text: string } {
    const st = (id: string) => x.automated.find(a => a.id === id)?.status;
    if (x.openAlerts) return { key: 'review_alert', priority: 1, text: 'Review the change found on the register' };
    if (x.status === 'further_investigation') return { key: 'investigate', priority: 2, text: 'Finish the investigation and record the outcome' };
    if (x.status === 'satisfactory') return { key: 'none', priority: 9, text: 'No action: monitored daily' };
    if (!x.hasSnapshot || x.fetchError || st('register_extract') !== 'pass') return { key: 'retrieve', priority: 3, text: x.fetchError ? 'Retrieval failed: retry' : 'Refresh the Companies House extract' };
    if (x.unresolved) return { key: 'resolve_discrepancies', priority: 4, text: `Resolve ${x.unresolved} discrepancy(ies)` };
    if (st('declaration') !== 'pass') return { key: 'await_customer', priority: 7, text: 'Waiting for the customer\'s company declaration' };
    return { key: 'complete_review', priority: 5, text: x.blockers.length ? 'Complete your review' : 'Ready: complete the review' };
}
