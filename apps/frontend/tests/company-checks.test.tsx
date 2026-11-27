import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SWRConfig } from 'swr';
import CompanyChecksSection from '../components/admin/CompanyChecksSection';
import { stepsFor, sidebarStatusFor } from '../components/account/AccessNotice';
import type { AccessDecision } from '../hooks/useAccess';

const CHECKLIST = [
  { id: 'register_extract', label: 'Register extract obtained and reviewed', hint: 'h' },
  { id: 'beneficial_owners', label: 'Beneficial owners verified independently', hint: 'Not on the PSC register alone' },
];
const detail = (over: any = {}) => ({
  ok: true,
  data: {
    check: { id: 7, user_id: 53, company_number: '12345678', company_name: 'EXAMPLE TRADING LTD', status: 'in_progress', monitoring: false, fetched_at: '2026-11-27T10:00:00Z',
      checklist: { register_extract: { done: true, by: 9, at: '2026-11-27T10:05:00Z' } },
      snapshot: { profile: { company_name: 'EXAMPLE TRADING LTD', company_status: 'active', sic_codes: ['62020'], registered_office_address: { address_line_1: '1 Test Street', locality: 'London' } },
        officers: [{ name: 'USER, Test', officer_role: 'director', country_of_residence: 'England', appointment_count: 2, disqualification: { searched: true, matches: [] } }],
        pscs: [], psc_statements: [], filing_history: [], insolvency: null, partial_errors: [] } },
    customer: { email: 'customer@example.com', kyc_status: 'approved', owners: [] },
    entries: [], evidence: [], reports: [], decided_by_email: null,
    alerts: [{ id: 3, detected_at: '2026-11-27T11:00:00Z', changes: [{ field: 'company_status', label: 'Company status', before: 'active', after: 'liquidation' }], acknowledged_at: null }],
    analysis: { flags: [{ level: 'warning', area: 'PSC', text: 'No current PSCs and no PSC statement on the register.' }],
      comparison: [{ field: 'Company name', register: 'EXAMPLE TRADING LTD', customer: 'Example Trading Limited', result: 'match' }] },
    checklist_items: CHECKLIST,
    satisfactory_blockers: ['Checklist items outstanding: Beneficial owners verified independently.'],
    ...over,
  },
});

let calls: { url: string; init?: RequestInit }[] = [];
beforeEach(() => {
  calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const body = url.startsWith('/api/admin/company-checks?')
      ? { ok: true, data: { checklist_total: 11, items: [{ id: 7, company_number: '12345678', company_name: 'EXAMPLE TRADING LTD', email: 'customer@example.com', status: 'in_progress', checklist_done: 1, open_alerts: 1 }] } }
      : url === '/api/admin/company-checks/7' ? detail() : { ok: true };
    return { ok: true, status: 200, json: async () => body } as any;
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const renderSection = () => render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}><CompanyChecksSection /></SWRConfig>);

describe('Company checks section', () => {
  it('lists checks and opens one with its checklist, flags, alert and comparison', async () => {
    renderSection();
    fireEvent.click(await screen.findByRole('button', { name: /EXAMPLE TRADING LTD/ }));
    expect(await screen.findByText('1 of 2 done')).toBeInTheDocument();
    expect(screen.getByText(/No current PSCs/)).toBeInTheDocument();
    expect(screen.getByText(/Change found/)).toBeInTheDocument();
    expect(screen.getByText('Example Trading Limited')).toBeInTheDocument();
    expect(screen.getByText(/Individual identity, address, PEP, sanctions and adverse-media checks are recorded separately/)).toBeInTheDocument();
  });

  it('cannot record a satisfactory outcome while items are outstanding', async () => {
    renderSection();
    fireEvent.click(await screen.findByRole('button', { name: /EXAMPLE TRADING LTD/ }));
    await screen.findByText('Outcome');
    const btn = screen.getAllByRole('button', { name: 'Satisfactory' }).find(b => !b.hasAttribute('aria-pressed'))!;
    expect(btn).toBeDisabled();
    expect(screen.getByText(/Checklist items outstanding/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Further investigation' })).toBeDisabled(); // needs a reason
  });

  it('ticking beneficial ownership asks how it was verified and sends the note', async () => {
    renderSection();
    fireEvent.click(await screen.findByRole('button', { name: /EXAMPLE TRADING LTD/ }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Beneficial owners verified independently' }));
    const note = screen.getByPlaceholderText(/How beneficial owners were verified/);
    fireEvent.change(note, { target: { value: 'Share register and certified ID reviewed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(calls.some(c => c.url === '/api/admin/company-checks/7/checklist' && c.init?.method === 'POST')).toBe(true));
    const sent = JSON.parse(String(calls.find(c => c.url.endsWith('/checklist'))!.init!.body));
    expect(sent).toEqual({ item: 'beneficial_owners', done: true, note: 'Share register and certified ID reviewed' });
    // The list and the check reload after a change.
    await waitFor(() => expect(calls.filter(c => c.url.startsWith('/api/admin/company-checks?')).length).toBeGreaterThanOrEqual(2));
  });

  it('an alert can only be marked reviewed with a note', async () => {
    renderSection();
    fireEvent.click(await screen.findByRole('button', { name: /EXAMPLE TRADING LTD/ }));
    const ack = await screen.findByRole('button', { name: 'Mark reviewed' });
    expect(ack).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Review note'), { target: { value: 'Reviewed' } });
    expect(ack).toBeEnabled();
  });
});

describe('customer notice', () => {
  const access = (missing: AccessDecision['missing']): AccessDecision => ({
    level: 'onboarding', standing: 'good', payment: { state: 'active', entitled: true, paidThroughMs: null, cancelAtPeriodEnd: false },
    verification: { state: 'complete', primaryApproved: true, pendingOwners: 0 }, missing, next: 'mail', mailWaiting: null, isAdmin: false,
  });
  it('tells a customer their company is being checked', () => {
    const steps = stepsFor(access(['company_checks_pending']));
    expect(steps.find(s => s.key === 'company')?.done).toBe(false);
    expect(sidebarStatusFor(access(['company_checks_pending']))?.title).toBe('Company checks in progress');
  });
  it('shows nothing about company checks when none are needed', () => {
    expect(stepsFor(access([])).some(s => s.key === 'company')).toBe(false);
  });
});
