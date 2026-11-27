import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StaffDeclarationForm } from '../components/admin/StaffDeclarationForm';

let calls: { url: string; init?: RequestInit }[] = [];
let postReply: any = { ok: true, data: { declaration_id: 9, invited: [] } };
beforeEach(() => {
  calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.endsWith('/declaration/prefill')) return { ok: true, status: 200, json: async () => ({ ok: true, data: {
      from: 'register', sources: { phone: 'Phone call', email: 'Email' },
      data: { nature_of_business: 'SIC 62020: ', principal_place_of_business: { same_as_registered_office: true }, applicant_role: 'director_and_beneficial_owner', expected_monthly_mail: '0-10', corporate_owners: [],
        people: [{ full_name: 'USER, Test', email: 'test@example.com', is_account_holder: true, is_director: true, is_beneficial_owner: true, ownership_percent: null, voting_percent: null, other_control: false, country_of_residence: 'England', register_note: 'Director and PSC on the register: shares 75% or more' }] } } }) } as any;
    return { ok: postReply.ok, status: postReply.ok ? 201 : 400, json: async () => postReply } as any;
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); postReply = { ok: true, data: { declaration_id: 9, invited: [] } }; });

describe('staff entering company details', () => {
  it('starts from the register and shows the share band to fill in', async () => {
    render(<StaffDeclarationForm api="/api/admin/company-checks/1" onClose={() => {}} onSaved={async () => {}} />);
    expect(await screen.findByText(/Started from the Companies House register/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('USER, Test')).toBeInTheDocument();
    expect(screen.getByText(/shares 75% or more/)).toBeInTheDocument();
  });

  it('needs a note on how the customer gave the details, then saves with the source', async () => {
    const onSaved = vi.fn(async () => {});
    render(<StaffDeclarationForm api="/api/admin/company-checks/1" onClose={() => {}} onSaved={onSaved} />);
    await screen.findByDisplayValue('USER, Test');
    fireEvent.click(screen.getByRole('button', { name: /Save details/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/how the customer gave you these details/);
    expect(calls.some(c => c.init?.method === 'POST')).toBe(false);
    fireEvent.change(screen.getByLabelText('Source note'), { target: { value: 'Call with Test User, 27 Nov' } });
    fireEvent.change(screen.getByLabelText('USER, Test shares'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Save details/ }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const body = JSON.parse(String(calls.find(c => c.init?.method === 'POST')!.init!.body));
    expect(body).toMatchObject({ source: 'phone', source_note: 'Call with Test User, 27 Nov', invite: false });
    expect(body.data.people[0]).toMatchObject({ full_name: 'USER, Test', ownership_percent: 100, is_account_holder: true });
  });

  it('names the person a problem is about', async () => {
    postReply = { ok: false, error: 'validation_error', issues: [{ path: 'people.0.ownership_percent', message: 'Give the ownership or voting share' }] };
    render(<StaffDeclarationForm api="/api/admin/company-checks/1" onClose={() => {}} onSaved={async () => {}} />);
    await screen.findByDisplayValue('USER, Test');
    fireEvent.change(screen.getByLabelText('Source note'), { target: { value: 'Email from the customer' } });
    fireEvent.click(screen.getByRole('button', { name: /Save details/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('USER, Test: Give the ownership or voting share');
  });
});
