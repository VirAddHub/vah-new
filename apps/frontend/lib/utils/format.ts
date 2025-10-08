// Utility functions for formatting data in the UI

/**
 * Format forwarding request ID with friendly prefix
 * @param id - The forwarding request ID
 * @returns Formatted ID like "FR-000003"
 */
export const formatFRId = (id: number | string): string => {
  return `FR-${String(id).padStart(6, '0')}`;
};

/**
 * Format date in UK format, handling both epoch milliseconds and ISO strings
 * @param input - Date as epoch ms (number), ISO string, or null/undefined
 * @returns Formatted UK date string or "—" if invalid
 */
export function formatDateUK(input: number | string | null | undefined): string {
  if (input == null) return '—';
  
  const n = typeof input === 'string' ? Number(input) : input;
  const d = !Number.isNaN(n) && n > 10_000_000_000 ? new Date(n) : new Date(input);
  
  if (Number.isNaN(d.getTime())) return '—';
  
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false, 
    timeZone: 'Europe/London'
  }).format(d);
}

/**
 * Format date with both relative and absolute display
 * @param input - Date as epoch ms (number), ISO string, or null/undefined
 * @returns Object with formatted date and ISO string for tooltip
 */
export function formatDateWithTooltip(input: number | string | null | undefined) {
  if (input == null) return { formatted: '—', isoString: '' };
  
  const n = typeof input === 'string' ? Number(input) : input;
  const d = !Number.isNaN(n) && n > 10_000_000_000 ? new Date(n) : new Date(input);
  
  if (Number.isNaN(d.getTime())) return { formatted: '—', isoString: '' };
  
  const formatted = formatDateUK(input);
  const isoString = d.toISOString();
  
  return { formatted, isoString };
}
