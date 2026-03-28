import type { MailItem } from '@/components/dashboard/user/types';

/**
 * Best-effort instant for mail sorting / display (DB may send BIGINT ms as string).
 */
function toUtcDate(value: string | number): Date | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value < 1e11 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return null;
    // Plain digits: epoch ms (or seconds if ~10 digits) from pg BIGINT / JSON
    if (/^\d+$/.test(t)) {
      const n = Number(t);
      if (!Number.isFinite(n)) return null;
      const ms = n < 1e11 ? n * 1000 : n;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
      const [y, m, day] = t.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, day));
    }
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Pick the richest date field on a mail row (matches list + detail). */
export function getMailItemDate(item: MailItem): string | number | undefined {
  if (item.received_at_ms !== undefined && item.received_at_ms !== null && item.received_at_ms !== '') {
    return item.received_at_ms as string | number;
  }
  if (item.received_date) return item.received_date;
  if (item.received_at) return item.received_at;
  if (item.scanned_at) return item.scanned_at;
  if (item.created_at !== undefined && item.created_at !== null && item.created_at !== '') {
    return item.created_at as string | number;
  }
  return undefined;
}

/**
 * Short UK-style label with year: "9 Feb 2026" (UTC calendar parts).
 */
export function formatMailItemDate(dateValue: string | number | undefined | null): string {
  if (dateValue === undefined || dateValue === null || dateValue === '') return '';
  try {
    const date = toUtcDate(dateValue);
    if (!date) return '';
    const dateYear = date.getUTCFullYear();
    const dateDay = date.getUTCDate();
    const dateMonth = date.getUTCMonth();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[dateMonth];
    return `${dateDay} ${monthName} ${dateYear}`;
  } catch {
    return '';
  }
}

/**
 * Title fallbacks when no receipt date is shown as the primary label (subject / sender / tag / id).
 */
export function getMailItemListTitle(item: MailItem): string {
  const t = (item.user_title || item.sender_name || item.subject || '').toString().trim();
  if (t) return t;
  if (item.id !== undefined && item.id !== null && `${item.id}`.length > 0) return String(item.id);
  return 'Mail';
}

/** List row + detail headline: formatted receipt date when known, else {@link getMailItemListTitle}. */
export function getMailItemPrimaryLabel(item: MailItem): string {
  const formatted = formatMailItemDate(getMailItemDate(item));
  if (formatted) return formatted;
  return getMailItemListTitle(item);
}

/** Detail / header: date first when known, then title fallbacks. */
export function getMailItemDisplayTitle(item: MailItem): string {
  const raw = getMailItemDate(item);
  const formatted =
    raw !== undefined && raw !== null && raw !== '' ? formatMailItemDate(raw) : '';
  if (formatted) return formatted;
  const fallback = (item.user_title || item.sender_name || item.subject || '').toString().trim();
  if (fallback) return fallback;
  return 'Unknown Sender';
}
