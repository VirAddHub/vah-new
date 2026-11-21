export type AuditSource = 'admin' | 'mail' | 'arrivals';
export class AuditQueryError extends Error {}

function scalar(value: unknown, max = 200): string {
  if (value == null) return '';
  if (typeof value !== 'string' || value.length > max) throw new AuditQueryError('Invalid filter');
  return value.trim();
}
function integer(value: unknown, fallback: number, max: number): number {
  if (value == null || value === '') return fallback;
  const text = scalar(value, 16);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text)) || Number(text) > max)
    throw new AuditQueryError('Invalid pagination');
  return Number(text);
}
function date(value: unknown): string {
  const text = scalar(value, 10);
  if (
    text &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(text) ||
      !Number.isFinite(Date.parse(text)) ||
      new Date(text).toISOString().slice(0, 10) !== text)
  )
    throw new AuditQueryError('Invalid date');
  return text;
}

export function auditQuery(source: AuditSource, query: Record<string, unknown>) {
  const limit = integer(query.limit, 25, 100);
  if (limit < 1) throw new AuditQueryError('Invalid page size');
  const offset = integer(query.offset, 0, 2147483647);
  const from = date(query.from),
    to = date(query.to);
  if (from && to && from > to) throw new AuditQueryError('Start date must be before end date');
  const q = scalar(query.q),
    actor = scalar(query.actor, 20),
    action = scalar(query.action, 100);
  if (actor && !/^\d+$/.test(actor)) throw new AuditQueryError('Invalid actor');
  const item = scalar(query.item_id, 20);
  if (item && !/^\d+$/.test(item)) throw new AuditQueryError('Invalid item');
  const params: unknown[] = [];
  const bind = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  const conditions: string[] = [];
  if (source === 'admin' && query.target === 'user') {
    conditions.push("target_type = 'user'");
    // Billing records customer self-service plan changes in admin_audit.
    conditions.push("(action <> 'plan_change' OR actor_id IS DISTINCT FROM target_id)");
  }
  if (q) {
    // Literal substring search, not caller-controlled SQL LIKE wildcards.
    const p = bind(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
    conditions.push(`search_text ILIKE ${p} ESCAPE '\\'`);
  }
  if (actor) conditions.push(`actor_id::text = ${bind(actor)}`);
  if (action) conditions.push(`action = ${bind(action)}`);
  if (item && source !== 'admin') conditions.push(`target_id::text = ${bind(item)}`);
  if (from)
    conditions.push(`occurred_at >= (${bind(from)}::date::timestamp AT TIME ZONE 'Europe/London')`);
  if (to)
    conditions.push(
      `occurred_at < ((${bind(to)}::date + 1)::timestamp AT TIME ZONE 'Europe/London')`,
    );
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const pagination = `LIMIT ${bind(limit)} OFFSET ${bind(offset)}`;
  // Both supported storage generations: epoch milliseconds and timestamptz.
  const time = `CASE WHEN a.created_at::text ~ '^[0-9]+$' THEN to_timestamp(a.created_at::text::double precision / 1000.0) ELSE a.created_at::text::timestamptz END`;
  const sourceColumns =
    source === 'arrivals'
      ? `NULL::bigint AS actor_id, 'mail_item'::text AS target_type, a.id AS target_id, json_build_object('explanation', 'Scanned mail record created for a customer account', 'evidence', 'Existing mail record: creation time and current customer association; not an immutable event-time snapshot', 'human_uploader', 'Not recorded', 'scan_availability', CASE WHEN NULLIF(to_jsonb(a)->>'scan_file_url', '') IS NOT NULL OR NULLIF(to_jsonb(a)->>'file_id', '') IS NOT NULL THEN 'Scan reference available now' ELSE 'Scan reference not available now' END, 'current_access', CASE WHEN to_jsonb(a)->>'deleted' = 'true' THEN 'Deleted' WHEN to_jsonb(a)->>'locked' = 'true' THEN 'Locked' ELSE 'Check current account access' END)::text AS details, NULL::text AS before_json, NULL::text AS after_json`
      : source === 'admin'
        ? `a.admin_id AS actor_id, a.target_type, a.target_id, a.details, NULL::text AS before_json, NULL::text AS after_json`
        : `a.user_id AS actor_id, 'mail_item'::text AS target_type, a.item_id AS target_id, NULL::text AS details, a.before_json::text, a.after_json::text`;
  const cte = `WITH events AS (
    SELECT a.id, ${source === 'arrivals' ? "'mail_added'::text AS action" : 'a.action'}, ${sourceColumns}, ${time} AS occurred_at,
      ${source === 'arrivals' ? "CASE WHEN left(to_jsonb(a)->>'idempotency_key', 9) = 'onedrive_' THEN 'OneDrive import' ELSE NULL END" : 'NULL::text'} AS import_source
    FROM ${source === 'admin' ? 'admin_audit' : source === 'arrivals' ? 'mail_item' : 'mail_audit'} a
    ${source === 'arrivals' ? "WHERE to_jsonb(a)->>'scanned' = 'true' OR NULLIF(to_jsonb(a)->>'scan_file_url', '') IS NOT NULL OR NULLIF(to_jsonb(a)->>'file_id', '') IS NOT NULL" : ''}
  ), enriched AS (
    SELECT e.*, actor.first_name AS actor_first_name, actor.last_name AS actor_last_name,
      actor.email AS actor_email, actor.is_admin AS actor_is_admin,
      CASE WHEN e.target_type = 'user' THEN e.target_id ELSE m.user_id END AS customer_id, customer.first_name AS customer_first_name,
      customer.last_name AS customer_last_name, customer.company_name, customer.email AS customer_email,
      m.id AS current_mail_id, p.id AS current_plan_id, p.name AS plan_name,
      concat_ws(' ', e.id::text, '${source} #' || e.id::text, e.target_type || ' #' || e.target_id::text,
        CASE WHEN e.target_type = 'mail_item' THEN 'mail #' || e.target_id::text END, CASE WHEN e.target_type = 'mail_item' THEN 'mail item #' || e.target_id::text END, e.target_id::text,
        customer.first_name, customer.last_name, customer.company_name, customer.email, p.name) AS search_text
    FROM events e
    LEFT JOIN "user" actor ON actor.id = e.actor_id
    LEFT JOIN mail_item m ON e.target_type = 'mail_item' AND m.id = e.target_id
    LEFT JOIN "user" customer ON customer.id = CASE WHEN e.target_type = 'user' THEN e.target_id WHEN e.target_type = 'mail_item' THEN m.user_id END
    LEFT JOIN plans p ON e.target_type = 'plan' AND p.id = e.target_id
  ), filtered AS (SELECT * FROM enriched ${where}),
  page AS (SELECT * FROM filtered ORDER BY occurred_at DESC NULLS LAST, id DESC ${pagination})`;
  // One statement gives rows, count and filter options the same database snapshot.
  const sql = `${cte}
    SELECT (SELECT count(*)::int FROM filtered) AS total,
      COALESCE((SELECT json_agg(to_jsonb(page) || jsonb_build_object('id', page.id::text, 'actor_id', page.actor_id::text, 'target_id', page.target_id::text, 'customer_id', page.customer_id::text, 'current_mail_id', page.current_mail_id::text) ORDER BY occurred_at DESC NULLS LAST, id DESC) FROM page), '[]'::json) AS items,
      COALESCE((SELECT json_agg(options ORDER BY action) FROM (SELECT DISTINCT action FROM events) options), '[]'::json) AS actions,
      COALESCE((SELECT json_agg(options ORDER BY id) FROM (
        SELECT DISTINCT actor_id::text AS id, actor_first_name AS first_name, actor_last_name AS last_name, actor_email AS email
        FROM enriched WHERE actor_id IS NOT NULL
      ) options), '[]'::json) AS actors`;
  return { sql, params, limit, offset };
}
