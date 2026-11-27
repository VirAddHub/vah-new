import { describe, it, expect, vi } from 'vitest';
import { analyse, nextAction, normaliseCompanyName, requiredJudgement, satisfactoryBlockers } from '../../server/services/companyChecks/analysis';
import { fetchSnapshot, diffSnapshots, sameName, nameTokens } from '../../server/services/companyChecks/snapshot';
import { createChClient, normaliseCompanyNumber, ChError } from '../../server/services/companyChecks/chClient';
import { DeclarationSchema } from '../../server/services/companyChecks/declaration';
import { decide, verificationOf } from '../../server/services/access';
import { fakeChClient, fakeCompany, defaultOfficers, declaration } from '../helpers/fakeCompaniesHouse';

const customer = (o: any = {}) => ({ user_id: 1, email: 'c@example.com', first_name: 'Test', last_name: 'User', kyc_status: 'approved',
    business_type: 'limited_company', company_name: 'Example Trading Limited', company_number: '12345678', trading_name: null, owners: [],
    declaration: { data: declaration(), submitted_at: new Date().toISOString() }, ...o });
const status = (a: ReturnType<typeof analyse>, id: string) => a.automated.find(x => x.id === id)?.status;

describe('helpers', () => {
    it('normalises company numbers and names', () => {
        expect(normaliseCompanyNumber(' 1234567 ')).toBe('01234567');
        expect(normaliseCompanyNumber('sc123456')).toBe('SC123456');
        expect(normaliseCompanyNumber('12-34')).toBeNull();
        expect(normaliseCompanyName('Example Trading Ltd.')).toBe(normaliseCompanyName('EXAMPLE TRADING LIMITED'));
        expect(nameTokens('SMITH, John Paul')).toEqual(['john', 'paul', 'smith']);
        expect(sameName('SMITH, John Paul', 'Mr John Smith')).toBe(true);
        expect(sameName('SMITH, John', 'Jane Smith')).toBe(false);
    });
    it('Companies House errors are distinct and never contain the key', async () => {
        await expect(createChClient('').get('/company/1')).rejects.toMatchObject({ code: 'not_configured' });
        await expect(createChClient('k', vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }))).get('/x')).rejects.toMatchObject({ code: 'rate_limited' });
        const err = await createChClient('secret-key', vi.fn(async () => { throw new Error('ECONNRESET'); })).get('/x').catch(e => e);
        expect(err).toBeInstanceOf(ChError);
        expect(String(err.message)).not.toContain('secret-key');
        expect(await createChClient('k', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }))).get('/x', { optional: true })).toBeNull();
    });
});

describe('declaration', () => {
    it('accepts a complete declaration', () => expect(DeclarationSchema.safeParse(declaration()).success).toBe(true));
    it('requires a director, the account holder once, beneficial owners or an explanation, and emails for others', () => {
        const msg = (d: any) => (DeclarationSchema.safeParse(d) as any).error?.issues.map((i: any) => i.message).join(' | ') ?? '';
        expect(msg(declaration({ people: [{ ...declaration().people[0], is_director: false }] }))).toMatch(/at least one director/);
        expect(msg(declaration({ people: [{ ...declaration().people[0], is_beneficial_owner: false }] }))).toMatch(/explain why no one owns/);
        expect(msg(declaration({ people: [...declaration().people, { ...declaration().people[0], full_name: 'Other Person', is_account_holder: false, email: null }] }))).toMatch(/email address/);
        expect(msg(declaration({ people: [{ ...declaration().people[0], is_account_holder: false }] }))).toMatch(/Include yourself once/);
        expect(msg(declaration({ principal_place_of_business: { same_as_registered_office: false } }))).toMatch(/principal place of business/);
        expect(msg(declaration({ confirmation: false }))).toMatch(/Confirm/);
    });
});

describe('automated analysis', () => {
    it('a clean company that matches the declaration passes every automated check without anyone ticking anything', async () => {
        const a = analyse(await fetchSnapshot(fakeChClient(), '12345678'), customer());
        expect(a.automated.filter(x => !['pass', 'not_available'].includes(x.status))).toEqual([]);
        expect(a.discrepancies).toEqual([]);
        expect(a.attention).toBe(0);
        expect(requiredJudgement(a.attention)).toEqual(['beneficial_owners', 'activity']);
        expect(status(a, 'screening')).toBe('not_available'); // never claimed as done
    });

    it('missing information is not a discrepancy', async () => {
        const a = analyse(await fetchSnapshot(fakeChClient(), '12345678'), customer({ declaration: null }));
        expect(status(a, 'declaration')).toBe('missing');
        expect(status(a, 'beneficial_owners')).toBe('missing');
        expect(a.discrepancies).toEqual([]);
        expect(a.missing.map(m => m.key)).toContain('declaration');
        expect(status(analyse(null, customer()), 'register_extract')).toBe('missing');
    });

    it('register risks are attention items with the reason', async () => {
        const s = await fetchSnapshot(fakeChClient({
            company: fakeCompany({ company_status: 'liquidation', has_insolvency_history: true, accounts: { overdue: true, next_due: '2026-01-01' } }),
            officers: [...defaultOfficers(), { name: 'OTHER, Anna', officer_role: 'director', country_of_residence: 'France', date_of_birth: { month: 1, year: 1970 }, links: { officer: { appointments: '/officers/zz/appointments' } } }],
            disqualified: [{ title: 'Anna OTHER', date_of_birth: '1970-01-15' }], appointments: 25,
        }), '12345678');
        const a = analyse(s, customer());
        for (const id of ['status', 'filings', 'disqualifications', 'residence', 'nominee_indicators']) expect(status(a, id)).toBe('attention');
        expect(a.automated.find(x => x.id === 'disqualifications')!.detail).toMatch(/OTHER, Anna/);
        expect(requiredJudgement(a.attention)).toContain('warnings_reviewed');
    });

    it('ignores a disqualified officer with the same name but a different date of birth', async () => {
        const s = await fetchSnapshot(fakeChClient({ disqualified: [{ title: 'Test USER', date_of_birth: '1950-02-01' }] }), '12345678');
        expect(s.officers[0].disqualification.matches).toEqual([]);
    });

    it('directors and company-details differences are "other" discrepancies (never reportable)', async () => {
        const s = await fetchSnapshot(fakeChClient({ officers: [...defaultOfficers(), { name: 'OTHER, Anna', officer_role: 'director', country_of_residence: 'England', links: {} }] }), '12345678');
        const a = analyse(s, customer({ company_name: 'Different Name Ltd' }));
        const d = a.discrepancies.map(x => `${x.category}:${x.key}`);
        expect(d).toContain('other:director_not_declared:anna other');
        expect(d).toContain('other:company:company_name');
        expect(a.discrepancies.every(x => x.category === 'other')).toBe(true);
    });

    it('PSC differences are beneficial-ownership discrepancies: missing PSC, undeclared PSC, wrong band, undeclared corporate owner', async () => {
        const s = await fetchSnapshot(fakeChClient({ pscs: [
            { name: 'Mr Test User', kind: 'individual-person-with-significant-control', natures_of_control: ['ownership-of-shares-25-to-50-percent'], country_of_residence: 'England' },
            { name: 'Ms Hidden Owner', kind: 'individual-person-with-significant-control', natures_of_control: ['ownership-of-shares-25-to-50-percent'], country_of_residence: 'England' },
            { name: 'HOLDCO LIMITED', kind: 'corporate-entity-person-with-significant-control', natures_of_control: ['ownership-of-shares-25-to-50-percent'] },
        ] }), '12345678');
        const decl = declaration({ people: [declaration().people[0], { full_name: 'Absent Person', email: 'a@example.com', is_account_holder: false, is_director: false, is_beneficial_owner: true, ownership_percent: 30, voting_percent: null, other_control: false, country_of_residence: 'England' }] });
        const a = analyse(s, customer({ declaration: { data: decl, submitted_at: new Date().toISOString() } }));
        const keys = a.discrepancies.filter(x => x.category === 'beneficial_ownership').map(x => x.key.split(':')[0]);
        expect(keys).toEqual(expect.arrayContaining(['bo_shares', 'psc_not_declared', 'corporate_psc_not_declared', 'bo_not_registered']));
        expect(status(a, 'beneficial_owners')).toBe('discrepancy');
        expect(status(a, 'psc_register')).toBe('attention'); // corporate PSC: trace the individuals
    });

    it('identity of the people the customer named is tracked as a separate, outstanding check', async () => {
        const decl = declaration({ people: [declaration().people[0], { full_name: 'New Director', email: 'nd@example.com', is_account_holder: false, is_director: true, is_beneficial_owner: false, other_control: false, country_of_residence: 'England' }] });
        const a = analyse(await fetchSnapshot(fakeChClient(), '12345678'), customer({ kyc_status: 'pending', declaration: { data: decl, submitted_at: new Date().toISOString() } }));
        expect(status(a, 'individual_identity')).toBe('missing');
        expect(a.automated.find(x => x.id === 'individual_identity')!.detail).toMatch(/not yet asked to verify: New Director/);
    });

    it('monitoring ignores key order and sees real changes', async () => {
        const before = await fetchSnapshot(fakeChClient(), '12345678');
        const reordered = JSON.parse(JSON.stringify(before));
        reordered.profile.registered_office_address = Object.fromEntries(Object.entries(before.profile.registered_office_address).reverse());
        expect(diffSnapshots(reordered, await fetchSnapshot(fakeChClient(), '12345678'))).toEqual([]);
        const after = await fetchSnapshot(fakeChClient({ company: fakeCompany({ company_status: 'dissolved' }) }), '12345678');
        expect(diffSnapshots(before, after).map(d => d.field)).toEqual(['company_status']);
    });
});

describe('completing a review', () => {
    const done = { beneficial_owners: { done: true, note: 'Share register and certified ID reviewed' }, activity: { done: true } };
    const base = (a: any, over: any = {}) => ({ checklist: done, automated: a.automated, attention: a.attention, unrecordedDiscrepancies: 0, unresolvedDiscrepancies: 0, beneficialOwnerEvidence: 0, riskRating: 'low', ...over });
    it('needs only two judgements and a risk rating when everything automated passed', async () => {
        const a = analyse(await fetchSnapshot(fakeChClient(), '12345678'), customer());
        expect(satisfactoryBlockers(base(a))).toEqual([]);
        expect(satisfactoryBlockers(base(a, { riskRating: null }))).toEqual(['Choose a risk rating.']);
    });
    it('never accepts the PSC register alone for beneficial ownership', async () => {
        const a = analyse(await fetchSnapshot(fakeChClient(), '12345678'), customer());
        expect(satisfactoryBlockers(base(a, { checklist: { ...done, beneficial_owners: { done: true, note: 'ok' } } })).join(' ')).toMatch(/evidence or a note/);
        expect(satisfactoryBlockers(base(a, { checklist: { ...done, beneficial_owners: { done: true } }, beneficialOwnerEvidence: 1 }))).toEqual([]);
    });
    it('blocks on missing declaration, stale extract, discrepancies and unreviewed warnings', async () => {
        const noDecl = analyse(await fetchSnapshot(fakeChClient(), '12345678'), customer({ declaration: null }));
        expect(satisfactoryBlockers(base(noDecl)).join(' ')).toMatch(/declaration is needed/);
        const stale = analyse(await fetchSnapshot(fakeChClient(), '12345678', new Date(Date.now() - 40 * 864e5)), customer());
        expect(satisfactoryBlockers(base(stale)).join(' ')).toMatch(/Refresh/);
        const a = analyse(await fetchSnapshot(fakeChClient(), '12345678'), customer());
        expect(satisfactoryBlockers(base(a, { unresolvedDiscrepancies: 1 })).join(' ')).toMatch(/Resolve 1/);
        const risky = analyse(await fetchSnapshot(fakeChClient({ appointments: 30 }), '12345678'), customer());
        expect(satisfactoryBlockers(base(risky)).join(' ')).toMatch(/automated warnings reviewed/);
    });
    it('the next action puts alerts and investigations first and customers we are waiting for last', async () => {
        const a = analyse(await fetchSnapshot(fakeChClient(), '12345678'), customer());
        const n = (o: any) => nextAction({ status: 'in_progress', hasSnapshot: true, fetchError: null, openAlerts: 0, unresolved: 0, automated: a.automated, blockers: [], ...o });
        expect(n({ openAlerts: 1 }).key).toBe('review_alert');
        expect(n({ status: 'further_investigation' }).key).toBe('investigate');
        expect(n({ hasSnapshot: false }).key).toBe('retrieve');
        expect(n({ unresolved: 2 }).text).toBe('Resolve 2 discrepancy(ies)');
        expect(n({}).key).toBe('complete_review');
        const waiting = analyse(await fetchSnapshot(fakeChClient(), '12345678'), customer({ declaration: null }));
        expect(n({ automated: waiting.automated }).key).toBe('await_customer');
        expect(n({ status: 'satisfactory' }).key).toBe('none');
    });
});

describe('access rule', () => {
    const paid = { state: 'active' as const, entitled: true, paidThroughMs: null, cancelAtPeriodEnd: false };
    it('customers without a company number are unaffected; others need a satisfactory check', () => {
        expect(decide('good', paid, verificationOf('approved', 0)).level).toBe('full');
        const d = decide('good', paid, verificationOf('approved', 0), { required: 1, satisfactory: 0, investigating: 0, declarationNeeded: true });
        expect(d.missing).toContain('company_checks_pending');
        expect(d.next).toBe('company');
        expect(decide('good', paid, verificationOf('approved', 0), { required: 1, satisfactory: 1, investigating: 0 }).level).toBe('full');
    });
    it('a satisfactory company check never replaces identity or payment', () => {
        const d = decide('good', { ...paid, entitled: false, state: 'none' }, verificationOf('pending', 0), { required: 1, satisfactory: 1, investigating: 0 });
        expect(d.level).toBe('onboarding');
        expect(d.missing).toEqual(expect.arrayContaining(['payment_required', 'identity_in_review']));
    });
});
