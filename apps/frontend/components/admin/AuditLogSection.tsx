'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import {
  actionLabel,
  actorLabel,
  AuditData,
  AuditEntry,
  AuditView,
  changes,
  DEFAULT_VIEW,
  facts,
  formatAuditDate,
  humanize,
  readView,
  saveView,
  summary,
  targetLabel,
  valueText,
} from './audit-log-model';
import styles from './audit-log.module.css';
import { AuditMailPreview } from './AuditMailPreview';

const PAGE_SIZE = 25;
const EMPTY: AuditData = { items: [], total: 0, actions: [], actors: [] };

function RecordedValue({ value }: { value: unknown }) {
  if (value && typeof value === 'object' && !Array.isArray(value))
    return (
      <dl className={styles.facts}>
        {Object.entries(value).map(([key, item]) => (
          <div key={key}>
            <dt>{humanize(key)}</dt>
            <dd>
              <RecordedValue value={item} />
            </dd>
          </div>
        ))}
      </dl>
    );
  return <span>{valueText(value)}</span>;
}

export function AuditLogSection() {
  const [view, setView] = useState<AuditView>(DEFAULT_VIEW);
  const [draft, setDraft] = useState<AuditView>(DEFAULT_VIEW);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AuditData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const restore = () => {
      const next = readView();
      setView(next);
      setDraft(next);
      setReady(true);
    };
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveView(view);
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const params = new URLSearchParams({
      type: view.tab,
      limit: String(PAGE_SIZE),
      offset: String(view.offset),
    });
    for (const key of ['q', 'from', 'to', 'actor', 'action'] as const)
      if (view[key]) params.set(key, view[key]);
    if (view.tab === 'admin') params.set('target', 'user');
    fetch(`/api/admin-audit?${params}`, {
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 403 || response.status === 401
              ? 'Admin access is required to view the audit log.'
              : response.status === 503
                ? 'This audit source is not available in this environment.'
                : 'The audit log could not be loaded. Please try again.',
          );
        const next = await response.json();
        if (controller.signal.aborted) return;
        if (!next.ok || !Array.isArray(next.items) || !Number.isInteger(next.total))
          throw new Error('The audit service returned an unexpected response.');
        if (view.offset > 0 && view.offset >= next.total) {
          setView((current) => ({
            ...current,
            offset: Math.max(0, Math.ceil(next.total / PAGE_SIZE) - 1) * PAGE_SIZE,
          }));
          return;
        }
        setData(next);
      })
      .catch((cause: Error) => {
        if (!controller.signal.aborted) setError(cause.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [view, ready, refresh]);

  const update = (next: AuditView) => {
    if (next.tab !== view.tab) setData(EMPTY);
    setView(next);
    setDraft(next);
    setSelected(null);
  };
  const filtered = Boolean(view.q || view.from || view.to || view.actor || view.action);
  const detailFacts = selected ? facts(selected) : {};
  const recordedChanges = selected ? changes(selected) : [];

  return (
    <section className={styles.audit} aria-labelledby="audit-title">
      <header className={styles.header}>
        <div>
          <h2 id="audit-title">Audit log</h2>
          <p>Investigate recorded actions and changes to customer accounts.</p>
        </div>
        <Button variant="outline" onClick={() => setRefresh((n) => n + 1)} disabled={loading}>
          Refresh
        </Button>
      </header>
      <div className={styles.tabs} role="tablist" aria-label="Audit source">
        {(['arrivals', 'admin'] as const).map((tab) => (
          <button
            key={tab}
            id={`audit-tab-${tab}`}
            role="tab"
            aria-selected={(view.tab === 'mail' ? 'arrivals' : view.tab) === tab}
            aria-controls="audit-results"
            tabIndex={(view.tab === 'mail' ? 'arrivals' : view.tab) === tab ? 0 : -1}
            onClick={() => update({ ...DEFAULT_VIEW, tab })}
            onKeyDown={(event) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const tabs = ['arrivals', 'admin'] as const;
                const next =
                  event.key === 'Home'
                    ? tabs[0]
                    : event.key === 'End'
                      ? tabs[1]
                      : tabs[(tabs.indexOf(view.tab === 'mail' ? 'arrivals' : view.tab) + 1) % 2];
                update({ ...DEFAULT_VIEW, tab: next });
                document.getElementById(`audit-tab-${next}`)?.focus();
              }
            }}
          >
            {tab === 'arrivals' ? 'Mail added' : tab === 'admin' ? 'Admin actions' : 'Mail changes'}
          </button>
        ))}
      </div>
      {view.tab !== 'admin' && <label className={styles.note}>Mail view <select aria-label="Mail view" value={view.tab} onChange={e => update({...DEFAULT_VIEW, tab:e.target.value as 'arrivals' | 'mail'})}><option value="arrivals">Mail added</option><option value="mail">Mail changes (troubleshooting)</option></select></label>}
      {view.tab === 'admin' && <p className={styles.note}>Recorded staff changes to customer accounts: profile edits, account status, password resets, verification and restoration. Only actions written to the audit log can appear here.</p>}
      {view.tab === 'arrivals' && (
        <p className={styles.note}>
          Scanned mail records added to customer accounts. Times come from record creation, not the
          physical letter date. Customer details and scan availability are current; human uploader
          identities were not recorded. Locked or deleted records do not prove a customer could view
          the scan.
        </p>
      )}
      {view.tab === 'mail' && (
        <p className={styles.note}>
          Mail changes recorded by the bulk-update workflow. This source does not contain sign-in
          events.
        </p>
      )}
      <form
        className={styles.filters}
        onSubmit={(event) => {
          event.preventDefault();
          update({ ...draft, tab: view.tab, offset: 0 });
        }}
      >
        <label className={styles.search}>
          Search
          <input
            type="search"
            placeholder="Customer, company, email or record reference"
            maxLength={200}
            value={draft.q}
            onChange={(e) => setDraft({ ...draft, q: e.target.value })}
          />
        </label>
        <label>
          From
          <input
            type="date"
            value={draft.from}
            max={draft.to || undefined}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={draft.to}
            min={draft.from || undefined}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
        </label>
        <label>
          Performed by the user account
          <select
            value={draft.actor}
            onChange={(e) => setDraft({ ...draft, actor: e.target.value })}
          >
            <option value="">All staff / actors</option>
            {data.actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {[actor.first_name, actor.last_name].filter(Boolean).join(' ') ||
                  actor.email ||
                  'Account'}{' '}
                · #{actor.id}
              </option>
            ))}
            {draft.actor && !data.actors.some((a) => a.id === draft.actor) && (
              <option value={draft.actor}>Account #{draft.actor}</option>
            )}
          </select>
        </label>
        <label>
          Action
          <select
            value={draft.action}
            onChange={(e) => setDraft({ ...draft, action: e.target.value })}
          >
            <option value="">All actions</option>
            {data.actions.map((action) => (
              <option key={action} value={action}>
                {actionLabel(action)}
              </option>
            ))}
            {draft.action && !data.actions.includes(draft.action) && (
              <option value={draft.action}>{actionLabel(draft.action)}</option>
            )}
          </select>
        </label>
        <div className={styles.filterButtons}>
          <Button type="submit" variant="secondary">
            Apply filters
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => update({ ...DEFAULT_VIEW, tab: view.tab })}
          >
            Reset
          </Button>
        </div>
      </form>
      <p className={styles.note}>
        Dates use Europe/London (GMT or BST). Names and search results use current account
        information; references remain available for missing records.
      </p>
      <div
        id="audit-results"
        role="tabpanel"
        aria-labelledby={`audit-tab-${view.tab === 'mail' ? 'arrivals' : view.tab}`}
        aria-busy={loading}
      >
        {loading ? (
          <p className={styles.state} role="status">
            Loading audit events…
          </p>
        ) : error ? (
          <div className={styles.state} role="alert">
            <p>{error}</p>
            <Button variant="outline" onClick={() => setRefresh((n) => n + 1)}>
              Retry
            </Button>
          </div>
        ) : data.items.length === 0 ? (
          <div className={styles.state}>
            <h3>{filtered ? 'No matching events' : 'No events recorded'}</h3>
            <p>
              {filtered
                ? 'Try another search or reset your filters.'
                : 'Recorded events will appear here when available.'}
            </p>
            {filtered && (
              <Button variant="outline" onClick={() => update({ ...DEFAULT_VIEW, tab: view.tab })}>
                Reset filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>
                  {view.tab === 'arrivals'
                    ? 'Mail added'
                    : view.tab === 'admin'
                      ? 'Admin actions'
                      : 'Mail changes'}
                  , newest first
                </caption>
                <thead>
                  <tr>
                    {[
                      'When',
                      'Action',
                      'Customer / record',
                      'Performed by the user account',
                      'Summary',
                      '',
                    ].map((label, i) => (
                      <th scope="col" key={i}>
                        {label || <span className={styles.srOnly}>Details</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((entry) => (
                    <tr key={`${entry.source}-${entry.id}`}>
                      <td data-label="When">
                        <time dateTime={entry.created_at || undefined}>
                          {formatAuditDate(entry.created_at)}
                        </time>
                      </td>
                      <td data-label="Action">
                        <span className={styles.badge}>{actionLabel(entry.action)}</span>
                        <small className={styles.reference}>
                          {entry.source} #{entry.id}
                        </small>
                      </td>
                      <td data-label="Customer / record">
                        {entry.target.href ? (
                          <a href={entry.target.href}>{targetLabel(entry)}</a>
                        ) : (
                          <strong>{targetLabel(entry)}</strong>
                        )}
                        <small>
                          {entry.target.type === 'mail_item'
                            ? entry.target.company ||
                              entry.target.name ||
                              entry.target.email ||
                              (entry.target.customer_id
                                ? `Customer #${entry.target.customer_id}`
                                : 'Customer: Not recorded')
                            : entry.target.email}
                        </small>
                        <small className={styles.reference}>
                          {humanize(entry.target.type || 'Record')} #
                          {entry.target.id ?? 'Not recorded'}
                        </small>
                      </td>
                      <td data-label="Performed by the user account">
                        {actorLabel(entry)}
                        <small className={styles.reference}>
                          {entry.actor.id == null
                            ? entry.actor.is_system
                              ? 'Human uploader: Not recorded'
                              : 'Actor: Not recorded'
                            : `Account #${entry.actor.id}`}
                        </small>
                      </td>
                      <td data-label="Summary">
                        <span className={styles.summary}>{summary(entry)}</span>
                      </td>
                      <td>
                        <Button
                          variant="outline"
                          onClick={(event) => {
                            trigger.current = event.currentTarget;
                            setSelected(entry);
                          }}
                          aria-label={`View details for ${entry.source} event ${entry.id}`}
                        >
                          View details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className={styles.pagination}>
              <p role="status">
                {view.offset + 1}–{Math.min(view.offset + PAGE_SIZE, data.total)} of {data.total}{' '}
                events · Newest first
              </p>
              <div>
                <Button
                  variant="outline"
                  disabled={view.offset === 0}
                  onClick={() => update({ ...view, offset: Math.max(0, view.offset - PAGE_SIZE) })}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={view.offset + PAGE_SIZE >= data.total}
                  onClick={() => update({ ...view, offset: view.offset + PAGE_SIZE })}
                >
                  Next
                </Button>
              </div>
            </footer>
          </>
        )}
      </div>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent
          className={styles.panel}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          {selected && (
            <>
              <header>
                <p className={styles.eyebrow}>Event details · Read only</p>
                <DialogTitle>{actionLabel(selected.action)}</DialogTitle>
                <DialogDescription>
                  {selected.source} #{selected.id} · {selected.action}
                </DialogDescription>
              </header>
              <section>
                <h3>When</h3>
                <p>{formatAuditDate(selected.created_at, true)}</p>
                <small>
                  Europe/London ·{' '}
                  {selected.created_at
                    ? `Stored timestamp: ${selected.created_at}`
                    : 'Not recorded'}
                </small>
              </section>
              <section>
                <h3>Performed by the user account</h3>
                <p>{actorLabel(selected)}</p>
                <small>
                  {selected.actor.id == null
                    ? selected.actor.is_system
                      ? 'Human uploader: Not recorded'
                      : 'Actor identity: Not recorded'
                    : `Recorded actor ID: ${selected.actor.id}`}
                </small>
                <small>Names and email addresses reflect the current account.</small>
              </section>
              <section>
                <h3>Affected customer / record</h3>
                <p>{targetLabel(selected)}</p>
                <small>
                  {humanize(selected.target.type || 'Record')} #
                  {selected.target.id ?? 'Not recorded'}
                </small>
                <p>
                  {[selected.target.company, selected.target.name, selected.target.email]
                    .filter(Boolean)
                    .join(' · ') || 'Current customer information: Not recorded'}
                </p>
                {selected.target.customer_id && (
                  <small>Customer #{selected.target.customer_id}</small>
                )}
                <small>Current information may differ from the event-time record.</small>
                {selected.target.href && <a href={selected.target.href}>Open mail record</a>}
              </section>
              {selected.target.type === 'mail_item' && selected.target.id && (
                <AuditMailPreview key={selected.target.id} mailId={selected.target.id} />
              )}
              <section>
                <h3>Recorded explanation</h3>
                <p>{summary(selected)}</p>
              </section>
              <section>
                <h3>Reason</h3>
                <p>{valueText(detailFacts.reason)}</p>
                <h3>Outcome</h3>
                <p>{valueText(detailFacts.outcome)}</p>
              </section>
              <section>
                <h3>Before and after</h3>
                {recordedChanges.length ? (
                  <div className={styles.changes}>
                    {recordedChanges.map((change) => (
                      <div key={change.field}>
                        <h4>{humanize(change.field)}</h4>
                        <dl>
                          <div>
                            <dt>Before</dt>
                            <dd>
                              <RecordedValue value={change.before} />
                            </dd>
                          </div>
                          <div>
                            <dt>After</dt>
                            <dd>
                              <RecordedValue value={change.after} />
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Not recorded</p>
                )}
              </section>
              <section>
                <h3>Event-time details</h3>
                <RecordedValue value={selected.details} />
                {selected.before != null && (
                  <>
                    <h4>Recorded previous values</h4>
                    <RecordedValue value={selected.before} />
                  </>
                )}
                {selected.after != null && (
                  <>
                    <h4>Recorded new values</h4>
                    <RecordedValue value={selected.after} />
                  </>
                )}
                <p className={styles.note}>
                  Sensitive fields are hidden. Missing values were not recorded; current account
                  data is not used to fill historical gaps.
                </p>
              </section>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
