/**
 * Mail Filename Parser
 *
 * Parses OneDrive mail filenames: user{userId}_{date}_{sourceSlug}.pdf
 *
 * Expected format: user{userId}_{DD-MM-YY|DD-MM-YYYY}_{tag}.pdf
 * Examples:
 * - user4_02-12-2025_companieshouse.pdf
 * - user4_02-12-25_hmrc.pdf (2-digit year)
 * - user12_2025-11-01_bank.pdf (ISO date)
 * - user007_15-03-2026_bank.pdf
 *
 * Extracts: userId, sourceSlug, and dateIso (YYYY-MM-DD) when present.
 */

export type ParsedMailFilename = {
  userId: number;
  sourceSlug: string;
  /** ISO date from filename (YYYY-MM-DD), or null if not parseable */
  dateIso: string | null;
};

/**
 * Parse date segment (DD-MM-YY, DD-MM-YYYY, or YYYY-MM-DD) to ISO date string.
 */
function parseDateSegment(segment: string): string | null {
  const s = segment.replace(/_/g, '-').trim();
  // DD-MM-YYYY or DD-MM-YY
  const uk = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (uk) {
    const dd = uk[1].padStart(2, '0');
    const mm = uk[2].padStart(2, '0');
    const yyyy = uk[3].length === 2 ? `20${uk[3]}` : uk[3];
    const iso = `${yyyy}-${mm}-${dd}`;
    const d = new Date(iso + 'T00:00:00.000Z');
    if (!Number.isNaN(d.getTime()) && d.getUTCDate() === parseInt(dd, 10) && d.getUTCMonth() + 1 === parseInt(mm, 10)) {
      return iso;
    }
    return null;
  }
  // YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    const padded = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    const d = new Date(padded + 'T00:00:00.000Z');
    if (!Number.isNaN(d.getTime())) return padded;
  }
  return null;
}

/**
 * Parse a mail filename to extract userId, sourceSlug, and optional date.
 *
 * @param filename - e.g. "user4_02-12-2025_companieshouse.pdf"
 * @returns ParsedMailFilename with userId, sourceSlug, dateIso, or null if parsing fails
 */
export function parseMailFilename(filename: string): ParsedMailFilename | null {
  if (!filename || typeof filename !== 'string') {
    return null;
  }

  const baseName = filename.replace(/\.pdf$/i, '');

  // Capture: userId, date segment, sourceSlug
  // Pattern: user0*(\d+)[_-]([0-9_-]+)[_-]([^_\-\.]+)
  const pattern = /^user0*([0-9]+)[_-]([0-9_-]+)[_-]([^_\-\.]+)/i;
  const match = baseName.match(pattern);

  if (!match) {
    return null;
  }

  const userId = parseInt(match[1], 10);
  const dateSegment = match[2];
  const sourceSlug = match[3].toLowerCase().trim();

  if (isNaN(userId) || userId <= 0 || !sourceSlug) {
    return null;
  }

  const dateIso = parseDateSegment(dateSegment);

  return {
    userId,
    sourceSlug,
    dateIso,
  };
}

