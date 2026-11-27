import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SWRConfig } from 'swr';
import CompanyChecksSection from '../components/admin/CompanyChecksSection';
import { CompanyDeclarationCard } from '../components/account/CompanyDeclarationCard';
import { stepsFor, sidebarStatusFor } from '../components/account/AccessNotice';
import type { AccessDecision } from '../hooks/useAccess';

const JUDGEMENT = [
  { id: 'beneficial_owners', label: 'Beneficial ownership verified independently', hint: 'Not from the PSC register alone' },
  { id: 'activity', label: 'Business activity is consistent and acceptable', hint: 'h' },
  { id: 'warnings_reviewed', label: 'Automated warnings reviewed', hint: 'h' },
];
const detail = (over: any = {}) => ({
  ok: true,
  data: {
    check: { id: 7, user_id: 53, company_number: '12345678', company_name: 'EXAMPLE TRADING LTD', status: 'in_progress', monitoring: false, fetched_at: '2026-11-27T10:00:00Z', checklist: {}, risk_rating: null,
      snapshot: { profile: { company_name: 'EXAMPLE TRADING LTD', company_status: 'active', sic_codes: ['62020'] }, officers: [], pscs: [], psc_statements: [], filing_history: [], partial_errors: [] } },
    customer: { first_name: 'Test', last_name: 'User', email: 'customer@example.com', owners: [], declaration: { submitted_at: '2026-11-27T09:00:00Z', data: { expected_monthly_mail: '0-10', applicant_role: 'director' } } },
    entries: [{ id: 21, kind: 'discrepancy', category: 'beneficial_ownership', source: 'system', admin_id: 0, body: 'Ms Hidden Owner is a PSC on the register but was not declared as a beneficial owner.', ch_value: 'Ms Hidden Owner', customer_value: 'Not declared', created_at: '2026-11-27T10:00:00Z', resolved_at: null },
              { id: 22, kind: 'discrepancy', category: 'other', source: 'system', admin_id: 0, body: 'Anna Other is a current director but was not declared.', created_at: '2026-11-27T10:00:00Z', resolved_at: null }],
    evidence: [], reports: [], alerts: [], identity: [],
    analysis: {
      automated: [
        { id: 'register_extract', label: 'Companies House extract', status: 'pass', detail: 'Complete.' },
        { id: 'residence', label: 'Residence of directors and PSCs', status: 'attention', detail: 'Outside the UK: OTHER, Anna (France).' },
        { id: 'screening', label: 'PEP, sanctions and adverse media (separate check)', status: 'not_available', detail: 'No screening provider is connected.' },
      ],
      missing: [{ key: 'identity', from: 'customer', text: 'Identity verification is outstanding for an owner.' }],
      discrepancies: [], flags: [], attention: 1,
      comparison: [{ field: 'Company name', register: 'EXAMPLE TRADING LTD', customer: 'Example Trading Limited', result: 'match' }],
    },
    next: { key: 'resolve_discrepancies', priority: 4, text: 'Resolve 2 discrepancy(ies)' },
    judgement_items: JUDGEMENT,
    shared_with: [{ check_id: 8, user_id: 54, email: 'other@example.com', status: 'in_progress' }],
    satisfactory_blockers: ['Resolve 2 discrepancy(ies).', 'Choose a risk rating.'],
    ...over,
  },
});

let calls: { url: string; init?: RequestInit }[] = [];
let declarationState: any;
beforeEach(() => {
  calls = [];
  declarationState = { required: true, company_number: '12345678', company_name: 'Example Trading Ltd', account_holder: { full_name: 'Test User', email: 't@example.com' }, declaration: null, editable: true };
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    let body: any = { ok: true };
    if (url.startsWith('/api/admin/company-checks?')) body = { ok: true, data: { counts: { action: 1, waiting: 3, satisfactory: 5, all: 9 }, items: [
      { id: 7, company_number: '12345678', company_name: 'EXAMPLE TRADING LTD', customer_name: 'Test User', email: 'customer@example.com', status: 'in_progress', open_alerts: 0, risk_rating: null, shared_count: 3, next: { key: 'resolve_discrepancies', priority: 4, text: 'Resolve 2 discrepancy(ies)' } },
      { id: 'pre-4', kind: 'pre_incorporation', company_number: null, company_name: 'Example Newco Ltd', customer_name: 'Pre Customer', email: 'pre@example.com', status: 'submitted', open_alerts: 0, shared_count: 0, next: { key: 'review_proposed', priority: 4, text: 'Review the proposed company' } }] } };
    else if (url === '/api/admin/company-checks/7') body = detail();
    else if (url === '/api/admin/company-checks/pre/4') body = { ok: true, data: { deadline_days: 30, history: [], flags: ['Anna Other lives outside the UK (France).'],
      identity: { account_holder: 'approved', others: [{ name: 'Anna Other', status: 'not_started' }] },
      customer: { first_name: 'Pre', last_name: 'Customer', email: 'pre@example.com', owners: [] },
      pre: { id: 4, user_id: 60, proposed_name: 'Example Newco Ltd', status: 'submitted', submitted_at: '2026-11-27T09:00:00Z', deadline_at: null,
        declaration: { nature_of_business: 'Software consultancy for small firms', applicant_role: 'director_and_beneficial_owner', expected_monthly_mail: '0-10', principal_place_of_business: { same_as_registered_office: true },
          people: [{ full_name: 'Pre Customer', is_account_holder: true, is_director: true, is_beneficial_owner: true, ownership_percent: 60, voting_percent: 60, country_of_residence: 'United Kingdom' },
                   { full_name: 'Anna Other', is_account_holder: false, is_director: true, is_beneficial_owner: true, ownership_percent: 40, voting_percent: 40, country_of_residence: 'France' }] } } } };
    else if (url === '/api/bff/company-declaration' && (!init || init.method !== 'POST')) body = { ok: true, data: declarationState };
    else if (url === '/api/bff/company-declaration') body = { ok: true, data: { owners_invited: [] } };
    return { ok: true, status: url.endsWith('/resolve') ? 200 : 200, json: async () => body } as any;
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const wrap = (el: React.ReactElement) => render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{el}</SWRConfig>);
const openCheck = async () => { wrap(<CompanyChecksSection />); fireEvent.click(await screen.findByText('Test User')); await screen.findByText('Automated results'); };

describe('Company checks: admin', () => {
  it('the queue shows counts and the next action for each company', async () => {
    wrap(<CompanyChecksSection />);
    expect(await screen.findByRole('button', { name: /To do\s*1/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Waiting on customer\s*3/ })).toBeInTheDocument();
    expect(screen.getAllByText('Resolve 2 discrepancy(ies)').length).toBeGreaterThan(0);
    expect(screen.getByText('Test User')).toBeInTheDocument(); // customer first
    expect(screen.getByText(/on 4 accounts/)).toBeInTheDocument();
  });

  it('warns when the company number is on other accounts', async () => {
    await openCheck();
    expect(screen.getByText(/also on 1 other account/)).toBeInTheDocument();
  });

  it('opens with the next action, automated results kept apart from the judgements, and nothing automated to tick', async () => {
    await openCheck();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Checked by the system: no ticking needed')).toBeInTheDocument();
    expect(screen.getByText('Outside the UK: OTHER, Anna (France).')).toBeInTheDocument();
    expect(screen.getByText('Not connected')).toBeInTheDocument(); // screening never shown as done
    expect(screen.queryByRole('checkbox', { name: 'Companies House extract' })).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Beneficial ownership verified independently' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Automated warnings reviewed' })).toBeInTheDocument(); // shown because one item needs attention
    expect(screen.getByText('Not discrepancies')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Complete review: satisfactory/ })).toBeDisabled();
  });

  it('a beneficial-ownership discrepancy asks about materiality; an "other" one is never reportable', async () => {
    await openCheck();
    const [boRow, otherRow] = screen.getAllByRole('button', { name: 'Resolve…' });
    fireEvent.click(otherRow);
    expect(screen.getByText(/Not reportable to Companies House/)).toBeInTheDocument();
    fireEvent.click(boRow);
    const material = screen.getByRole('radio', { name: /Material: reported to Companies House/ });
    fireEvent.click(material);
    expect(screen.getByPlaceholderText('Companies House report reference')).toBeInTheDocument();
    const forms = document.querySelectorAll('form');
    const boForm = Array.from(forms).find(f => f.textContent?.includes('MLR reg 30A'))!;
    fireEvent.change(within(boForm as HTMLElement).getByLabelText('Resolution'), { target: { value: 'Reported to Companies House' } });
    fireEvent.change(within(boForm as HTMLElement).getByLabelText('Report reference'), { target: { value: 'DR-1' } });
    fireEvent.click(within(boForm as HTMLElement).getByRole('button', { name: 'Resolve' }));
    await waitFor(() => expect(calls.some(c => c.url.endsWith('/entries/21/resolve'))).toBe(true));
    expect(JSON.parse(String(calls.find(c => c.url.endsWith('/entries/21/resolve'))!.init!.body))).toEqual({ resolution: 'Reported to Companies House', materiality: 'material', reference: 'DR-1' });
    await waitFor(() => expect(calls.filter(c => c.url.startsWith('/api/admin/company-checks?')).length).toBeGreaterThanOrEqual(2));
  });
});

describe('Company declaration: customer', () => {
  it('starts with the account holder filled in, and submits the declaration', async () => {
    wrap(<CompanyDeclarationCard />);
    expect(await screen.findByDisplayValue('Test User')).toHaveAttribute('readonly');
    fireEvent.change(screen.getByLabelText(/What does your business do/), { target: { value: 'Software consultancy for small firms' } });
    fireEvent.change(screen.getByLabelText('Person 1 share percentage'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit company details' }));
    await waitFor(() => expect(calls.some(c => c.url === '/api/bff/company-declaration' && c.init?.method === 'POST')).toBe(true));
    const sent = JSON.parse(String(calls.find(c => c.init?.method === 'POST')!.init!.body));
    expect(sent.people[0]).toMatchObject({ full_name: 'Test User', is_account_holder: true, is_director: true, is_beneficial_owner: true, ownership_percent: 100 });
    expect(sent.confirmation).toBe(true);
    expect(await screen.findByText(/We will check your company details/)).toBeInTheDocument();
  });

  it('a returned declaration (saved numbers) can be corrected and resubmitted', async () => {
    declarationState = { ...declarationState, editable: true, declaration: { submitted_at: '2026-11-27T14:25:00Z', returned_at: '2026-11-27T14:30:00Z', returned_reason: 'Please add the second owner',
      data: { nature_of_business: 'Software consultancy', principal_place_of_business: { same_as_registered_office: true, address: null }, applicant_role: 'director_and_beneficial_owner',
        people: [{ full_name: 'Test User', email: null, is_account_holder: true, is_director: true, is_beneficial_owner: true, ownership_percent: 100, voting_percent: 100, other_control: false, country_of_residence: 'England', date_of_birth: null }],
        corporate_owners: [{ name: 'Holdco Ltd', registration_number: null, country: 'England', ownership_percent: 30, ultimate_owners: 'Test User' }], expected_monthly_mail: '11-50' } } };
    wrap(<CompanyDeclarationCard />);
    expect(await screen.findByText(/Please add the second owner/)).toBeInTheDocument();
    expect(screen.getByLabelText('Person 1 share percentage')).toHaveValue('100');
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit company details' }));
    await waitFor(() => expect(calls.some(c => c.init?.method === 'POST')).toBe(true));
    const sent = JSON.parse(String(calls.find(c => c.init?.method === 'POST')!.init!.body));
    expect(sent.people[0]).toMatchObject({ ownership_percent: 100, voting_percent: 100 });
    expect(sent.corporate_owners[0]).toMatchObject({ name: 'Holdco Ltd', ownership_percent: 30 });
  });

  it('says which person needs an email instead of failing silently', async () => {
    wrap(<CompanyDeclarationCard />);
    await screen.findByDisplayValue('Test User');
    fireEvent.change(screen.getByLabelText(/What does your business do/), { target: { value: 'Software consultancy for small firms' } });
    fireEvent.click(screen.getByRole('button', { name: /Add a person/ }));
    fireEvent.change(screen.getByLabelText('Person 2 name'), { target: { value: 'Anna Other' } });
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Director' })[1]);
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit company details' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Add an email address for Anna Other');
    expect(calls.some(c => c.init?.method === 'POST')).toBe(false);
  });

  it('shows nothing when there is no company number', async () => {
    declarationState = { required: false };
    const { container } = wrap(<CompanyDeclarationCard />);
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(container.textContent).toBe('');
  });
});

describe('pre-incorporation', () => {
  it('a customer without a company number tells us about the company they are forming', async () => {
    declarationState = { required: true, mode: 'proposed', deadline_days: 30, account_holder: { full_name: 'Test User', email: 't@example.com' }, pre_incorporation: null, declaration: null, editable: true };
    wrap(<CompanyDeclarationCard />);
    const nameField = await screen.findByLabelText(/Proposed company name/);
    expect(screen.getByText(/30 days to register it/)).toBeInTheDocument();
    fireEvent.submit(nameField.closest('form')!); // the browser's required-field check is bypassed: our own check must catch it
    expect(await screen.findByText('Enter the name you plan to register the company under.')).toBeInTheDocument();
    expect(calls.some(c => c.init?.method === 'POST')).toBe(false);
    fireEvent.change(nameField, { target: { value: 'Example Newco Ltd' } });
    expect((nameField as HTMLInputElement).value).toBe('Example Newco Ltd');
  });

  it('after approval it shows the company and the date the number is due', async () => {
    declarationState = { required: true, mode: 'proposed', deadline_days: 30, account_holder: { full_name: 'Test User', email: 't@example.com' }, editable: false,
      pre_incorporation: { status: 'approved', proposed_name: 'Example Newco Ltd', deadline_at: '2026-12-27T12:00:00Z', reason: null }, declaration: { data: {}, submitted_at: '2026-11-27T09:00:00Z' } };
    wrap(<CompanyDeclarationCard />);
    expect(await screen.findByText(/Approved for/)).toHaveTextContent('Approved for Example Newco Ltd. Register the company and add its company number in Companies House details above by 27 December 2026.');
    expect(screen.queryByLabelText(/Proposed company name/)).toBeNull();
  });

  it('administrators review the proposed company from the queue and approve it for that company only', async () => {
    wrap(<CompanyChecksSection />);
    fireEvent.click(await screen.findByText('Pre Customer'));
    expect(await screen.findByText(/Approval lets the customer use the address/)).toBeInTheDocument();
    expect(await screen.findByText('Anna Other lives outside the UK (France).')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Approve for Example Newco Ltd/ }));
    await waitFor(() => expect(calls.find(c => c.url === '/api/admin/company-checks/pre/4/decision')).toBeTruthy());
    expect(JSON.parse(String(calls.find(c => c.url === '/api/admin/company-checks/pre/4/decision')!.init!.body))).toEqual({ decision: 'approve' });
    expect(await screen.findByText(/Approved. The customer has 30 days/)).toBeInTheDocument();
  });

  it('returning it needs a reason the customer will see', async () => {
    wrap(<CompanyChecksSection />);
    fireEvent.click(await screen.findByText('Pre Customer'));
    fireEvent.click(await screen.findByRole('button', { name: 'Ask the customer to correct it…' }));
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/What should the customer correct/), { target: { value: 'Add the second shareholder.' } });
    fireEvent.click(confirm);
    await waitFor(() => expect(calls.some(c => c.url === '/api/admin/company-checks/pre/4/decision')).toBe(true));
    expect(JSON.parse(String(calls.find(c => c.url === '/api/admin/company-checks/pre/4/decision')!.init!.body))).toEqual({ decision: 'return', reason: 'Add the second shareholder.' });
    expect(await screen.findByText('Returned to the customer.')).toBeInTheDocument();
  });
});

describe('customer notice', () => {
  const access = (missing: AccessDecision['missing'], declarationNeeded = false): AccessDecision => ({
    level: 'onboarding', standing: 'good', payment: { state: 'active', entitled: true, paidThroughMs: null, cancelAtPeriodEnd: false },
    verification: { state: 'complete', primaryApproved: true, pendingOwners: 0 }, company: { required: 1, satisfactory: 0, investigating: 0, declarationNeeded },
    missing, next: declarationNeeded ? 'company' : 'mail', mailWaiting: null, isAdmin: false,
  });
  it('asks for the company declaration first, then explains the check', () => {
    expect(stepsFor(access(['company_checks_pending'], true)).find(s => s.key === 'company')).toMatchObject({ label: 'Tell us about your company', href: '/account/verification#company' });
    expect(stepsFor(access(['company_checks_pending'], false)).find(s => s.key === 'company')?.label).toBe('Company checks');
    expect(sidebarStatusFor(access(['company_checks_pending'], true))?.title).toBe('Company details needed');
  });
  it('explains each pre-incorporation stage', () => {
    const pre = (state: any, missing: AccessDecision['missing']) => ({ ...access(missing, state === 'needed'), company: { required: 1, satisfactory: 0, investigating: 0, declarationNeeded: state === 'needed', preIncorporation: state } });
    expect(stepsFor(pre('needed', ['company_checks_pending'])).find(s => s.key === 'company')?.detail).toMatch(/company you are forming/);
    expect(stepsFor(pre('in_review', ['company_checks_pending'])).find(s => s.key === 'company')?.label).toBe('Proposed company in review');
    expect(stepsFor(pre('lapsed', ['company_number_overdue'])).find(s => s.key === 'company')).toMatchObject({ label: 'Add your company number', href: '/account/verification#company' });
    expect(stepsFor(pre('refused', ['pre_incorporation_refused'])).find(s => s.key === 'company')?.href).toBe('/account/support');
    expect(sidebarStatusFor(pre('lapsed', ['company_number_overdue']))?.title).toBe('Company number needed');
  });
  it('identity wording does not promise an online check that is not connected', () => {
    const a = { ...access(['identity_required']), verification: { state: 'not_started' as const, primaryApproved: false, pendingOwners: 0 } };
    expect(stepsFor(a).find(s => s.key === 'identity')?.detail).not.toMatch(/few minutes/);
  });
});
