/**
 * Physical mail retention rules, in one place.
 *
 * A paper letter is due for shredding 30 days after it was received, unless:
 *  - it has already been logged as destroyed, or
 *  - it was forwarded to the customer (it is no longer in the building), or
 *  - a forwarding request for it is still open (shredding it would destroy a letter the
 *    customer is waiting for).
 *
 * These SQL fragments expect the mail_item table aliased as `m`.
 */

export const RETENTION_DAYS = 30;

/** When the letter arrived: scan time first, then received date, then row creation. */
export const RECEIVED_AT_SQL = `COALESCE(
    to_timestamp(m.received_at_ms / 1000.0),
    m.received_date::timestamptz,
    to_timestamp(m.created_at / 1000.0)
)`;

const OPEN_FORWARDING_STATUSES = ['requested', 'processing', 'reviewed', 'pending'];
const FORWARDED_STATUSES = ['dispatched', 'delivered', 'forwarded'];

const sqlList = (values: string[]) => values.map((v) => `'${v}'`).join(', ');

/** A forwarding request for this letter is still open. */
export const FORWARDING_OPEN_SQL = `(
    lower(COALESCE(m.forwarding_status, '')) IN (${sqlList(OPEN_FORWARDING_STATUSES)})
    OR EXISTS (
        SELECT 1 FROM forwarding_request fr
        WHERE fr.mail_item_id = m.id
          AND lower(fr.status) IN (${sqlList(OPEN_FORWARDING_STATUSES)})
    )
)`;

/** The letter has been posted on to the customer. */
export const FORWARDED_SQL = `(
    lower(COALESCE(m.forwarding_status, '')) IN (${sqlList(FORWARDED_STATUSES)})
    OR lower(COALESCE(m.status, '')) = 'forwarded'
)`;

export type DestructionState = 'destroyed' | 'forwarded' | 'forwarding_open' | 'due' | 'not_yet';

/** One state per letter; the order of the WHEN clauses is the order of precedence. */
export const DESTRUCTION_STATE_SQL = `CASE
    WHEN m.physical_destruction_date IS NOT NULL THEN 'destroyed'
    WHEN ${FORWARDED_SQL} THEN 'forwarded'
    WHEN ${FORWARDING_OPEN_SQL} THEN 'forwarding_open'
    WHEN (now() - ${RECEIVED_AT_SQL}) >= INTERVAL '${RETENTION_DAYS} days' THEN 'due'
    ELSE 'not_yet'
END`;

/** Date from which the letter may be shredded. */
export const DESTROY_FROM_SQL = `(${RECEIVED_AT_SQL} + INTERVAL '${RETENTION_DAYS} days')`;
