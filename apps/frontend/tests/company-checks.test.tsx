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
      { id: 7, company_number: '12345678', company_name: 'EXAMPLE TRADING LTD', customer_name: 'Test User', email: 'customer@example.com', status: 'in_progress', open_alerts: 0, risk_rating: null, next: { key: 'resolve_discrepancies', priority: 4, text: 'Resolve 2 discrepancy(ies)' } }] } };
    else if (url === '/api/admin/company-checks/7') body = detail();
    else if (url === '/api/bff/company-declaration' && (!init || init.method !== 'POST')) body = { ok: true, data: declarationState };
    else if (url === '/api/bff/company-declaration') body = { ok: true, data: { owners_invited: [] } };
    return { ok: true, status: url.endsWith('/resolve') ? 200 : 200, json: async () => body } as any;
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const wrap = (el: React.ReactElement) => render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{el}</SWRConfig>);
const openCheck = async () => { wrap(<CompanyChecksSection />); fireEvent.click(await screen.findByText('EXAMPLE TRADING LTD')); await screen.findByText('Automated results'); };

describe('Company checks: admin', () => {
  it('the queue shows counts and the next action for each company', async () => {
    wrap(<CompanyChecksSection />);
    expect(await screen.findByRole('button', { name: /Needs action\s*1/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Waiting for customer\s*3/ })).toBeInTheDocument();
    expect(screen.getAllByText('Resolve 2 discrepancy(ies)').length).toBeGreaterThan(0);
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

  it('shows nothing when there is no company number', async () => {
    declarationState = { required: false };
    const { container } = wrap(<CompanyDeclarationCard />);
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(container.textContent).toBe('');
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
  it('identity wording does not promise an online check that is not connected', () => {
    const a = { ...access(['identity_required']), verification: { state: 'not_started' as const, primaryApproved: false, pendingOwners: 0 } };
    expect(stepsFor(a).find(s => s.key === 'identity')?.detail).not.toMatch(/few minutes/);
  });
});
