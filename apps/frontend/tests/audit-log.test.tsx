import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AuditLogSection } from '../components/admin/AuditLogSection';
import {
  actionLabel,
  AuditEntry,
  changes,
  formatAuditDate,
  valueText,
} from '../components/admin/audit-log-model';

const event: AuditEntry = {
  id: '51',
  source: 'admin',
  action: 'account_restore',
  created_at: '2026-11-21T12:44:00.000Z',
  actor: { id: '50', name: 'Example Staff' },
  target: { type: 'user', id: '53', name: 'Example Customer' },
  details: { reason: 'Customer requested restoration' },
  before: null,
  after: null,
};
const data = (items = [event], total = 51) => ({
  ok: true,
  items,
  total,
  actions: ['account_restore', 'unknown_event'],
  actors: [{ id: '50', first_name: 'Example', last_name: 'Staff' }],
});
const response = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status === 200, status, json: async () => body });
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  sessionStorage.clear();
  history.replaceState({}, '', '/admin/dashboard?section=audit&audit_tab=admin');
  fetchMock = vi.fn().mockImplementation(() => response(data()));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const loaded = () => screen.findByRole('button', { name: /View details for admin event 51/ });

describe('audit investigation', () => {
  it('loads automatically, shows readable facts, and preserves filters through pagination, refresh and remount', async () => {
    const first = render(<AuditLogSection />);
    await loaded();
    expect(within(screen.getByRole('table')).getByText('Account restored')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), {
      target: { value: 'Example Company' },
    });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-03-29' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-25' } });
    fireEvent.change(screen.getByLabelText('Performed by the user account'), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'account_restore' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await loaded();
    let url = String(fetchMock.mock.calls.at(-1)![0]);
    expect(url).toContain('q=Example+Company');
    expect(url).toContain('from=2026-03-29');
    expect(url).toContain('actor=50');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await loaded();
    expect(screen.getByText('26–50 of 51 events · Newest first')).toBeInTheDocument();
    url = String(fetchMock.mock.calls.at(-1)![0]);
    expect(url).toContain('offset=25');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await loaded();
    expect(fetchMock.mock.calls.at(-1)![0]).toBe(url);
    first.unmount();
    history.replaceState({}, '', '/admin/dashboard?section=audit');
    render(<AuditLogSection />);
    await loaded();
    expect(fetchMock.mock.calls.at(-1)![0]).toBe(url);
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await loaded();
    expect(fetchMock.mock.calls.at(-1)![0]).not.toContain('q=');
    expect(fetchMock.mock.calls.at(-1)![0]).toContain('offset=0');
  });
  it('opens a read-only panel, closes on Escape, and restores focus', async () => {
    render(<AuditLogSection />);
    const button = await loaded();
    button.focus();
    fireEvent.click(button);
    const panel = await screen.findByRole('dialog');
    expect(within(panel).getByRole('heading', { name: 'Account restored' })).toBeInTheDocument();
    expect(within(panel).getByText(/21 Nov 2026.*12:44:00.000 GMT/)).toBeInTheDocument();
    expect(within(panel).getAllByText('Not recorded').length).toBeGreaterThan(0);
    expect(panel).toContainElement(document.activeElement as HTMLElement);
    fireEvent.keyDown(document.activeElement!, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(button).toHaveFocus());
  });
  it('switches to the actual mail source, supports keyboard tabs and missing actors / targets', async () => {
    render(<AuditLogSection />);
    await loaded();
    fetchMock.mockImplementation(() =>
      response(
        data([
          {
            ...event,
            source: 'mail',
            action: 'bulk_update',
            details: null,
            actor: { id: '999', name: null },
            target: { type: 'mail_item', id: '92' },
            after: { status: 'processed' },
          },
        ]),
      ),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Mail added' }));
    fireEvent.change(screen.getByLabelText('Mail view'), {target:{value:'mail'}});
    await screen.findByRole('button', { name: /View details for mail event/ });
    expect(fetchMock.mock.calls.at(-1)![0]).toContain('type=mail');
    expect(screen.getByText('Mail #92')).toBeInTheDocument();
    expect(screen.getAllByText('Account #999').length).toBeGreaterThan(0);
    expect(screen.queryByRole('tab', { name: 'Mail history' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Mail view')).toHaveValue('mail');
    expect(screen.getByText('Recorded new values: Status: processed')).toBeInTheDocument();
  });
  it('handles errors, retry, no results and empty sources', async () => {
    fetchMock.mockImplementationOnce(() => response({}, 503));
    render(<AuditLogSection />);
    expect(await screen.findByRole('alert')).toHaveTextContent('not available');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await loaded();
    fetchMock.mockImplementation(() => response(data([], 0)));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(await screen.findByText('No matching events')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(await screen.findByText('No events recorded')).toBeInTheDocument();
  });
  it('ignores responses from an older tab request', async () => {
    let resolveOld!: (value: unknown) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    render(<AuditLogSection />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fetchMock.mockImplementation(() => response(data([], 0)));
    fireEvent.click(screen.getByRole('tab', { name: 'Mail added' }));
    fireEvent.change(screen.getByLabelText('Mail view'), {target:{value:'mail'}});
    await screen.findByText('No events recorded');
    await act(async () => {
      resolveOld({ ok: true, json: async () => data() });
    });
    expect(screen.queryByText('Example Customer')).not.toBeInTheDocument();
  });
  it('renders unknown labels and preserves historical gaps', () => {
    expect(actionLabel('future_action')).toBe('Future action');
    expect(valueText(null)).toBe('Not recorded');
    expect(valueText(false)).toBe('No');
    expect(changes({ ...event, details: { status: 'active' } })).toEqual([]);
    expect(changes({ ...event, details: null, after: { status: 'active' } })).toEqual([
      { field: 'status', before: undefined, after: 'active' },
    ]);
    expect(formatAuditDate('2026-03-29T00:30:00Z')).toContain('00:30 GMT');
    expect(formatAuditDate('2026-03-29T01:30:00Z')).toContain('02:30 BST');
    expect(formatAuditDate('2026-10-25T01:30:00Z')).toContain('01:30 GMT');
    expect(formatAuditDate('invalid')).toBe('Not recorded');
  });
});

vi.mock('../lib/verifiedAdminSession', () => ({ buildAdminBffHeaders: () => ({}) }));
import { AuditMailPreview } from '../components/admin/AuditMailPreview';
it('loads a scan through protected mail metadata and offers the full document', async () => {
  fetchMock.mockImplementation(() =>
    response({ ok: true, data: { file_url: 'https://example.test/scan.pdf' } }),
  );
  render(<AuditMailPreview mailId="92" />);
  expect(await screen.findByTitle('Scan of mail #92')).toHaveAttribute(
    'src',
    'https://example.test/scan.pdf',
  );
  expect(screen.getByRole('link', { name: 'Open scanned mail' })).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
  expect(fetchMock.mock.calls[0][0]).toBe('/api/bff/admin/mail-items/92');
});
it('shows unavailable for a missing scan and rejects unsafe URLs', async () => {
  fetchMock.mockImplementation(() =>
    response({ ok: true, data: { file_url: 'javascript:alert(1)' } }),
  );
  render(<AuditMailPreview mailId="93" />);
  expect(await screen.findByText('Scan unavailable')).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

it('defaults to Mail added and explains automated imports without inventing an employee', async () => {
  history.replaceState({}, '', '/admin/dashboard?section=audit');
  fetchMock.mockImplementation(() =>
    response(
      data([
        {
          ...event,
          source: 'arrivals',
          action: 'mail_added',
          actor: { id: null, name: 'System · OneDrive import', is_system: true },
          target: { type: 'mail_item', id: '19402' },
          details: { explanation: 'Scanned mail record created for a customer account' },
        },
      ]),
    ),
  );
  render(<AuditLogSection />);
  await screen.findByRole('button', { name: 'View details for arrivals event 51' });
  expect(screen.getByRole('tab', { name: 'Mail added' })).toHaveAttribute('aria-selected', 'true');
  expect(String(fetchMock.mock.calls[0][0])).toContain('type=arrivals');
  expect(screen.getByText('System · OneDrive import')).toBeInTheDocument();
  expect(screen.getByText('Human uploader: Not recorded')).toBeInTheDocument();
});

vi.mock('../lib/apiClient', () => ({safe:(v:any,d:any)=>v ?? d,apiClient:{post:vi.fn(async()=>({ok:true})),get:vi.fn(async(url:string)=>url.includes('bff/plans')?{ok:true,data:[{id:37,name:'Business annual',interval:'year',price_pence:12000,active:true},{id:91,name:'Legacy monthly',interval:'month',price_pence:1234,active:true}]}:{ok:false,error:'unavailable'})},adminApi:{updateUser:vi.fn(async()=>({ok:true})),userStats:vi.fn(async()=>({ok:true,data:{total:80,active:80,suspended:0,pending:0,deleted:1}})),deletedUsers:vi.fn(async()=>({ok:true,data:{items:[],total:0}}))}}));
vi.mock('../components/ui/use-toast', () => ({useToast:()=>({toast:vi.fn()})}));

vi.mock('../lib/useAuthedSWR', () => ({useAuthedSWR:vi.fn()}));
import {useAuthedSWR} from '../lib/useAuthedSWR';
import {apiClient} from '../lib/apiClient';
import ChVerificationQueue from '../components/admin/ChVerificationQueue';
import {MailSection} from '../components/admin/MailSection';
import PlansSection from '../components/admin/PlansSection';
it('cancelling the approval prompt never approves a Companies House submission', async () => {
  vi.mocked(useAuthedSWR).mockReturnValue({data:{items:[{id:53,email:'jamie@example.test',ch_verification_status:'submitted'}]},mutate:vi.fn(),isLoading:false} as any);
  vi.spyOn(window,'prompt').mockReturnValue(null);
  vi.mocked(apiClient.post).mockClear();
  render(<ChVerificationQueue />);
  fireEvent.click(screen.getByRole('button',{name:'Approve'}));
  expect(apiClient.post).not.toHaveBeenCalled();
  vi.mocked(window.prompt).mockRestore();
});
it('mail load failures show an error and retry rather than an empty success', () => {
  const mutate=vi.fn();
  vi.mocked(useAuthedSWR).mockReturnValue({error:new Error('Unavailable'),mutate,isLoading:false} as any);
  render(<MailSection />);
  expect(screen.getByRole('alert')).toHaveTextContent('Could not load mail');
  fireEvent.click(screen.getByRole('button',{name:'Retry'}));expect(mutate).toHaveBeenCalled();
  expect(screen.queryByText('No scanned mail items found')).not.toBeInTheDocument();
});
it('plans expose a persistent load error with retry', async () => {
  render(<PlansSection />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load plans');
});
it('blocks duplicate plan submissions while saving', async () => {
  vi.mocked(apiClient.get).mockResolvedValueOnce({ok:true,data:[]} as any);
  let finish: (value:any)=>void=()=>{};
  vi.mocked(apiClient.post).mockClear();
  vi.mocked(apiClient.post).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}) as any);
  render(<PlansSection />);
  fireEvent.click(screen.getByRole('button',{name:'Create New Plan'}));
  fireEvent.click(screen.getByRole('button',{name:'Create Plan'}));
  expect(screen.getByRole('button',{name:'Saving…'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Saving…'}));
  expect(apiClient.post).toHaveBeenCalledTimes(1);
  await act(async()=>finish({ok:false,error:'test failure'}));
  expect(screen.getByRole('button',{name:'Create Plan'})).toBeEnabled();
});

it('never labels mail eligible when the server refuses destruction eligibility', () => {
 // An old local expires_at must not override the server's decision.
 vi.mocked(useAuthedSWR).mockReturnValue({data:{items:[{id:77,user_id:53,user_email:'test@example.test',subject:'Recent receipt',past_30_days:false,destruction_state:'not_yet',destroy_from:new Date(Date.now()+20*86400000).toISOString(),received_at_ms:Date.now(),expires_at:1,status:'received'}],total:1,counts:{all:1,needsDestruction:0}},isLoading:false,mutate:vi.fn()} as any);
 render(<MailSection />);
 expect(screen.getByText(/^Keep until/)).toBeInTheDocument();
 expect(screen.queryByText(/Due since/)).not.toBeInTheDocument();
 expect(screen.queryByText(/01\/01\/1970|1 Jan 1970/)).not.toBeInTheDocument();
});
