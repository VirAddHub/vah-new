export type AuditView = {
  tab: 'admin' | 'mail' | 'arrivals';
  q: string;
  from: string;
  to: string;
  actor: string;
  action: string;
  offset: number;
};
export const DEFAULT_VIEW: AuditView = {
  tab: 'arrivals',
  q: '',
  from: '',
  to: '',
  actor: '',
  action: '',
  offset: 0,
};
export const AUDIT_VIEW_KEY = 'vah.audit.view.v1';
export type AuditEntry = {
  id: string;
  source: 'admin' | 'mail' | 'arrivals';
  action: string;
  created_at: string | null;
  actor: {
    id: string | null;
    name: string | null;
    email?: string;
    is_system?: boolean;
    is_admin?: boolean;
  };
  target: {
    type: string | null;
    id: string | null;
    customer_id?: string | null;
    name?: string | null;
    company?: string;
    email?: string;
    plan_name?: string;
    href?: string | null;
  };
  details: unknown;
  before: unknown;
  after: unknown;
};
export type AuditData = {
  items: AuditEntry[];
  total: number;
  actions: string[];
  actors: { id: string; first_name?: string; last_name?: string; email?: string }[];
};
const labels: Record<string, string> = {
  mail_added: 'Scanned mail added to customer account',
  account_restore: 'Account restored',
  account_suspend: 'Account suspended',
  create_user: 'User created',
  update_user: 'User updated',
  delete_user: 'User deleted',
  restore_user: 'User restored',
  unlock_account: 'Account unlocked',
  physical_destruction_confirmed: 'Physical destruction confirmed',
  update_mail_item: 'Mail updated individually',
  log_physical_dispatch: 'Mail dispatched',
  bulk_update: 'Mail updated via bulk action',
  plan_update: 'Plan updated',
  plan_change: 'Plan changed',
  send_password_reset: 'Password reset sent',
  admin_login: 'Admin signed in',
  user_login_success: 'Sign-in succeeded',
  user_login_failed: 'Sign-in failed',
  user_logout: 'Signed out',
};
export function humanize(value: string): string {
  const text = value.replace(/[_-]+/g, ' ');
  return text ? text[0].toUpperCase() + text.slice(1) : 'Not recorded';
}
export const actionLabel = (action: string) => labels[action] || humanize(action);
export function formatAuditDate(raw: string | null, exact = false): string {
  if (!raw) return 'Not recorded';
  const date = new Date(/^\d+$/.test(raw) ? Number(raw) : raw);
  if (!Number.isFinite(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(exact ? { second: '2-digit' as const, fractionalSecondDigits: 3 as const } : {}),
    timeZoneName: 'short',
  }).format(date);
}
export function valueText(value: unknown): string {
  if (value == null || value === '') return 'Not recorded';
  if (Array.isArray(value)) return value.length ? value.map(valueText).join(', ') : 'Not recorded';
  if (typeof value === 'object')
    return (
      Object.entries(value)
        .map(([key, v]) => `${humanize(key)}: ${valueText(v)}`)
        .join('; ') || 'Not recorded'
    );
  return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
}
export function facts(entry: AuditEntry): Record<string, unknown> {
  return entry.details && typeof entry.details === 'object' && !Array.isArray(entry.details)
    ? (entry.details as Record<string, unknown>)
    : {};
}
export function changes(entry: AuditEntry): { field: string; before: unknown; after: unknown }[] {
  const d = facts(entry);
  const before = entry.before ?? d.before;
  const after = entry.after ?? d.after;
  const object = (v: unknown): Record<string, unknown> =>
    v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const b = object(before),
    a = object(after);
  const fields = [...new Set([...Object.keys(b), ...Object.keys(a)])];
  if (fields.length) return fields.map((field) => ({ field, before: b[field], after: a[field] }));
  const recordedChanges = object(d.changes);
  if ('old_price' in recordedChanges || 'new_price' in recordedChanges)
    return [
      {
        field: 'Price (pence)',
        before: recordedChanges.old_price,
        after: recordedChanges.new_price,
      },
    ];
  // update_user stores requested fields, not a verified before/after snapshot.
  return [];
}
export function summary(entry: AuditEntry): string {
  const d = facts(entry);
  if (d.explanation != null) return valueText(d.explanation);
  if (d.reason != null) return `Reason: ${valueText(d.reason)}`;
  if (entry.after != null) return `Recorded new values: ${valueText(entry.after)}`;
  return valueText(entry.details);
}
export function actorLabel(entry: AuditEntry): string {
  return (
    entry.actor.name ||
    entry.actor.email ||
    (entry.actor.id != null ? `Account #${entry.actor.id}` : 'Not recorded')
  );
}
export function targetLabel(entry: AuditEntry): string {
  const t = entry.target;
  if (t.id == null && !t.name && !t.company && !t.email && !t.plan_name) return 'Not recorded';
  if (t.type === 'mail_item') return `Mail #${t.id ?? 'Not recorded'}`;
  if (t.type === 'plan') return t.plan_name || `Plan #${t.id ?? 'Not recorded'}`;
  return (
    t.company ||
    t.name ||
    t.email ||
    `${humanize(t.type || 'Record')}${t.id == null ? '' : ` #${t.id}`}`
  );
}
export function normalizeView(raw: Partial<AuditView>): AuditView {
  const text = (value: unknown, max: number) =>
    typeof value === 'string' ? value.slice(0, max) : '';
  return {
    tab:
      !raw.tab || raw.tab === 'arrivals'
        ? 'arrivals'
        : raw.tab === 'mail' || (raw.tab as string) === 'auth'
          ? 'mail'
          : 'admin',
    q: text(raw.q, 200),
    from: text(raw.from, 10),
    to: text(raw.to, 10),
    actor: text(raw.actor, 20),
    action: text(raw.action, 100),
    offset:
      Number.isSafeInteger(Number(raw.offset)) &&
      Number(raw.offset) >= 0 &&
      Number(raw.offset) <= 2147483647
        ? Number(raw.offset)
        : 0,
  };
}
export function readView(): AuditView {
  const params = new URLSearchParams(window.location.search);
  if (params.has('audit_tab'))
    return normalizeView(
      Object.fromEntries(
        Object.keys(DEFAULT_VIEW).map((key) => [key, params.get(`audit_${key}`) ?? '']),
      ),
    );
  try {
    return normalizeView(JSON.parse(sessionStorage.getItem(AUDIT_VIEW_KEY) || '{}'));
  } catch {
    return { ...DEFAULT_VIEW };
  }
}
export function saveView(view: AuditView) {
  try {
    sessionStorage.setItem(AUDIT_VIEW_KEY, JSON.stringify(view));
  } catch {
    /* storage can be unavailable */
  }
  const url = new URL(window.location.href);
  Object.entries(view).forEach(([key, value]) => {
    if (value !== '' && (key !== 'offset' || value !== 0))
      url.searchParams.set(`audit_${key}`, String(value));
    else url.searchParams.delete(`audit_${key}`);
  });
  window.history.replaceState(window.history.state, '', url);
}
