import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SWRConfig } from 'swr';
import UsersSection from '../components/admin/UsersSection';

const row = (over: any = {}) => ({ id: 61, email: 'pat@example.test', first_name: 'Pat', last_name: 'Founder', company_name: 'Example Newco Ltd',
  service_label: 'Verification in review', stage: 'needs_you', next_step: 'Check their identity documents and record the result.', plan_interval: 'month', ...over });
let calls: { url: string; init?: RequestInit }[] = [];
let deletedFails = false;
beforeEach(() => {
  calls = []; deletedFails = false;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    let status = 200;
    let body: any = { ok: true, data: {} };
    if (url.startsWith('/api/admin/users?')) {
      const stage = new URL(url, 'http://x').searchParams.get('stage');
      const all = [row(), row({ id: 53, first_name: 'Sam', last_name: 'Test', email: 'sam@example.test', service_label: 'Active', stage: 'active', next_step: 'Nothing to do.', locked_until: Date.now() + 600000 })];
      const items = stage ? all.filter(u => u.stage === stage) : all;
      body = { ok: true, items, total: items.length, counts: { all: 2, needs_you: 1, waiting: 0, active: 1, restricted: 0 } };
    } else if (url.startsWith('/api/admin/users/stats')) body = { ok: true, data: { total: 2, deleted: 3 } };
    else if (url.startsWith('/api/admin/users/deleted')) {
      if (deletedFails) { status = 500; body = { ok: false, error: 'database_error' }; }
      else body = { ok: true, data: [{ id: 40, email: 'deleted+40@example.test', first_name: 'Old', last_name: 'Customer', deleted_at: '2026-11-01T00:00:00Z' }], pagination: { total: 1 } };
    }
    else if (url === '/api/admin/users/61' || url === '/api/admin/users/53') body = { ok: true, data: { id: 61, email: 'pat@example.test', first_name: 'Pat', last_name: 'Founder', kyc_status: 'pending' } };
    else if (url.includes('/identity')) body = { ok: true, data: { account_holder: { name: 'Pat Founder', status: 'pending' }, owners: [], records: [] } };
    return { ok: status < 400, status, json: async () => body } as any;
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const wrap = () => render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}><UsersSection /></SWRConfig>);

describe('Admin › Customers', () => {
  it('opens on every account, with the to-do lists as tabs and counts', async () => {
    wrap();
    expect(await screen.findByText('Pat Founder')).toBeInTheDocument();
    expect(screen.getByText('Sam Test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All 2/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Closed 3/ })).toBeInTheDocument();
    expect(calls.some(c => c.url.includes('stage='))).toBe(false);
    // Groups are labelled, people who need an administrator first.
    const text = document.body.textContent ?? '';
    expect(text.indexOf('Needs you1Pat Founder')).toBeGreaterThan(-1);
    expect(text.indexOf('Pat Founder')).toBeLessThan(text.indexOf('Sam Test'));
    fireEvent.click(screen.getByRole('button', { name: /Needs you 1/ }));
    await waitFor(() => expect(screen.queryByText('Sam Test')).toBeNull());
    expect(calls.some(c => c.url.includes('stage=needs_you'))).toBe(true);
  });

  it('selecting a customer shows what happens next and the actions, with no hand-set identity or plan status', async () => {
    wrap();
    fireEvent.click(await screen.findByText('Pat Founder'));
    expect(await screen.findByText('Check their identity documents and record the result.')).toBeInTheDocument();
    for (const name of ['Change legal name…', 'Edit email or company', 'Send password reset', 'Suspend, restore or close…']) expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /KYC/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /plan status/i })).toBeNull();
    expect(await screen.findByText('Record result…')).toBeInTheDocument();
  });

  it('search is sent to the server after typing pauses', async () => {
    wrap();
    await screen.findByText('Pat Founder');
    fireEvent.change(screen.getByLabelText('Find a customer'), { target: { value: 'Northstar' } });
    await waitFor(() => expect(calls.some(c => c.url.includes('search=Northstar'))).toBe(true));
  });

  it('a locked sign-in can be cleared from the customer', async () => {
    wrap();
    fireEvent.click(await screen.findByText('Sam Test'));
    fireEvent.click(await screen.findByRole('button', { name: /Clear block/ }));
    await waitFor(() => expect(calls.some(c => c.url === '/api/admin/users/53/unlock-account' && c.init?.method === 'POST')).toBe(true));
  });

  it('closed accounts load from their own list; a failure says so and can be retried', async () => {
    deletedFails = true;
    wrap();
    fireEvent.click(await screen.findByRole('button', { name: /Closed/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load closed accounts');
    expect(screen.queryByText(/No closed accounts/)).toBeNull();
    deletedFails = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Old Customer')).toBeInTheDocument();
  });

  it('a legal name change needs the document checked, and the general edit has no name fields', async () => {
    wrap();
    fireEvent.click(await screen.findByText('Pat Founder'));
    await screen.findByText('Check their identity documents and record the result.');
    await waitFor(() => expect(screen.getByRole('button', { name: /Change legal name/ })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /Edit email or company/ }));
    expect(screen.queryByLabelText('First name')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: /Change legal name/ }));
    fireEvent.change(screen.getByLabelText('New last name'), { target: { value: 'Smith' } });
    const save = screen.getByRole('button', { name: 'Change name' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Document checked'), { target: { value: 'Marriage certificate' } });
    fireEvent.change(screen.getByLabelText('Where the copy is kept'), { target: { value: 'KYC/61' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(calls.find(c => c.url === '/api/admin/users/61/name-change')).toBeTruthy());
    expect(JSON.parse(String(calls.find(c => c.url === '/api/admin/users/61/name-change')!.init!.body))).toMatchObject({ first_name: 'Pat', last_name: 'Smith', reason: 'marriage', evidence: 'Marriage certificate', reference: 'KYC/61' });
  });

  it('permanent delete needs the email typed and points to closing instead', async () => {
    wrap();
    fireEvent.click(await screen.findByText('Pat Founder'));
    fireEvent.click(await screen.findByText('Delete permanently'));
    expect(screen.getByText(/use Suspend, restore or close/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently…' }));
    const go = screen.getAllByRole('button', { name: 'Delete permanently' }).at(-1)!;
    expect(go).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Type pat@example.test to confirm/), { target: { value: 'pat@example.test' } });
    expect(go).toBeEnabled();
  });
});
