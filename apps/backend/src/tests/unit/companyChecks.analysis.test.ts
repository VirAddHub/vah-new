import { describe, it, expect, vi } from 'vitest';
import { analyse, normaliseCompanyName, satisfactoryBlockers, CHECKLIST } from '../../server/services/companyChecks/analysis';
import { fetchSnapshot, diffSnapshots, sameName, nameTokens } from '../../server/services/companyChecks/snapshot';
import { createChClient, normaliseCompanyNumber, ChError } from '../../server/services/companyChecks/chClient';
import { decide, verificationOf } from '../../server/services/access';
import { fakeChClient, fakeCompany, defaultOfficers } from '../helpers/fakeCompaniesHouse';

const customer = (o: any = {}) => ({ user_id: 1, email: 'c@example.com', first_name: 'Test', last_name: 'User', kyc_status: 'approved',
    business_type: 'limited_company', company_name: 'Example Trading Limited', company_number: '12345678', trading_name: null, owners: [], ...o });
const allDone = () => Object.fromEntries(CHECKLIST.map(i => [i.id, { done: true, note: i.id === 'beneficial_owners' ? 'Share register and ID checked on call' : null }]));

describe('company check helpers', () => {
    it('normalises company numbers the way Companies House stores them', () => {
        expect(normaliseCompanyNumber(' 1234567 ')).toBe('01234567');
        expect(normaliseCompanyNumber('sc123456')).toBe('SC123456');
        expect(normaliseCompanyNumber('12-34')).toBeNull();
        expect(normaliseCompanyNumber('123456789')).toBeNull();
    });
    it('matches names across register formats', () => {
        expect(nameTokens('SMITH, John Paul')).toEqual(['john', 'paul', 'smith']);
        expect(sameName('SMITH, John Paul', 'Mr John Smith')).toBe(true);
        expect(sameName('SMITH, John', 'Jane Smith')).toBe(false);
        expect(normaliseCompanyName('Example Trading Ltd.')).toBe(normaliseCompanyName('EXAMPLE TRADING LIMITED'));
    });
});

describe('Companies House client', () => {
    it('reports a missing key, rate limiting and outages as distinct errors, without the key in messages', async () => {
        await expect(createChClient('').get('/company/1')).rejects.toMatchObject({ code: 'not_configured' });
        const f429 = vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }));
        await expect(createChClient('secret-key', f429).get('/company/1')).rejects.toMatchObject({ code: 'rate_limited' });
        const fdown = vi.fn(async () => { throw new Error('ECONNRESET'); });
        const err = await createChClient('secret-key', fdown).get('/company/1').catch(e => e);
        expect(err).toBeInstanceOf(ChError);
        expect(String(err.message)).not.toContain('secret-key');
        const f404 = vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }));
        expect(await createChClient('k', f404).get('/company/1/insolvency', { optional: true })).toBeNull();
        expect((f404.mock.calls[0] as any)[1].headers.Authorization).toBe(`Basic ${Buffer.from('k:').toString('base64')}`);
    });
});

describe('analysis', () => {
    it('a clean company matching the customer raises no warnings', async () => {
        const s = await fetchSnapshot(fakeChClient(), '12345678');
        const a = analyse(s, customer());
        expect(a.flags.filter(f => f.level === 'warning')).toEqual([]);
        expect(a.comparison.find(r => r.field === 'Company name')?.result).toBe('match');
        expect(a.comparison.find(r => r.field === 'Account holder on the register')?.result).toBe('match');
    });

    it('flags status, insolvency, overdue filings, overseas and undeclared people, corporate PSCs and disqualification matches', async () => {
        const s = await fetchSnapshot(fakeChClient({
            company: fakeCompany({ company_status: 'liquidation', has_insolvency_history: true, accounts: { overdue: true, next_due: '2026-01-01' } }),
            officers: [...defaultOfficers(), { name: 'OTHER, Anna', officer_role: 'director', country_of_residence: 'France', date_of_birth: { month: 1, year: 1970 },
                links: { officer: { appointments: '/officers/zz/appointments' } } }],
            pscs: [{ name: 'HOLDCO LIMITED', kind: 'corporate-entity-person-with-significant-control', natures_of_control: ['ownership-of-shares-75-to-100-percent'] }],
            disqualified: [{ title: 'Anna OTHER', date_of_birth: '1970-01-15', links: { self: '/disqualified-officers/natural/x' } }],
            appointments: 25,
        }), '12345678');
        const a = analyse(s, customer({ company_name: 'Different Name Ltd' }));
        const text = a.flags.map(f => f.text).join('\n');
        expect(text).toMatch(/status is "liquidation"/);
        expect(text).toMatch(/insolvency/);
        expect(text).toMatch(/Accounts are overdue/);
        expect(text).toMatch(/outside the UK \(France\)/);
        expect(text).toMatch(/corporate PSC/);
        expect(text).toMatch(/disqualified-director match for OTHER, Anna/);
        expect(text).toMatch(/25 appointments/);
        expect(a.comparison.find(r => r.field === 'Company name')?.result).toBe('differs');
        expect(a.comparison.some(r => r.field === 'Director/PSC not declared by customer' && r.register === 'OTHER, Anna')).toBe(true);
    });

    it('ignores a disqualified officer with the same name but a different date of birth', async () => {
        const s = await fetchSnapshot(fakeChClient({ disqualified: [{ title: 'Test USER', date_of_birth: '1950-02-01' }] }), '12345678');
        expect(s.officers[0].disqualification.matches).toEqual([]);
    });

    it('monitoring sees changes to watched fields only', async () => {
        const before = await fetchSnapshot(fakeChClient(), '12345678');
        const same = await fetchSnapshot(fakeChClient(), '12345678', new Date(Date.now() + 1000));
        expect(diffSnapshots(before, same)).toEqual([]);
        // Postgres jsonb re-orders object keys: a stored copy must still compare equal.
        const reordered = JSON.parse(JSON.stringify(before));
        reordered.profile.registered_office_address = Object.fromEntries(Object.entries(before.profile.registered_office_address).reverse());
        expect(diffSnapshots(reordered, same)).toEqual([]);
        const after = await fetchSnapshot(fakeChClient({ company: fakeCompany({ company_status: 'dissolved' }) }), '12345678');
        expect(diffSnapshots(before, after).map(d => d.field)).toEqual(['company_status']);
    });
});

describe('satisfactory decision rules', () => {
    const base = { checklist: allDone(), fetchedAt: new Date(), hasSnapshot: true, partialErrors: 0, unresolvedDiscrepancies: 0, beneficialOwnerEvidence: 0 };
    it('allows a decision only when every item is ticked', () => {
        expect(satisfactoryBlockers(base)).toEqual([]);
        const missing = { ...base, checklist: { ...allDone(), psc: { done: false } } };
        expect(satisfactoryBlockers(missing).join(' ')).toMatch(/PSC register/);
    });
    it('never accepts the PSC register alone as beneficial ownership', () => {
        const noEvidence = { ...base, checklist: { ...allDone(), beneficial_owners: { done: true, note: '' } } };
        expect(satisfactoryBlockers(noEvidence).join(' ')).toMatch(/evidence or a note/);
        expect(satisfactoryBlockers({ ...noEvidence, beneficialOwnerEvidence: 1 })).toEqual([]);
    });
    it('blocks on open discrepancies, stale or partial extracts', () => {
        expect(satisfactoryBlockers({ ...base, unresolvedDiscrepancies: 1 }).join(' ')).toMatch(/discrepanc/);
        expect(satisfactoryBlockers({ ...base, fetchedAt: new Date(Date.now() - 40 * 864e5) }).join(' ')).toMatch(/more than 30 days/);
        expect(satisfactoryBlockers({ ...base, partialErrors: 1 }).join(' ')).toMatch(/could not be retrieved/);
        expect(satisfactoryBlockers({ ...base, hasSnapshot: false, fetchedAt: null }).join(' ')).toMatch(/Retrieve/);
    });
});

describe('access rule', () => {
    const paid = { state: 'active' as const, entitled: true, paidThroughMs: null, cancelAtPeriodEnd: false };
    it('keeps customers without a company number unaffected', () => {
        expect(decide('good', paid, verificationOf('approved', 0)).level).toBe('full');
    });
    it('needs a satisfactory company check for every company number on file', () => {
        const d = decide('good', paid, verificationOf('approved', 0), { required: 1, satisfactory: 0, investigating: 0 });
        expect(d.level).toBe('onboarding');
        expect(d.missing).toContain('company_checks_pending');
        expect(decide('good', paid, verificationOf('approved', 0), { required: 2, satisfactory: 1, investigating: 0 }).level).toBe('onboarding');
        expect(decide('good', paid, verificationOf('approved', 0), { required: 1, satisfactory: 1, investigating: 0 }).level).toBe('full');
    });
    it('a company check never replaces identity or payment', () => {
        const d = decide('good', { ...paid, entitled: false, state: 'none' }, verificationOf('pending', 0), { required: 1, satisfactory: 1, investigating: 0 });
        expect(d.level).toBe('onboarding');
        expect(d.missing).toEqual(expect.arrayContaining(['payment_required', 'identity_in_review']));
    });
});
