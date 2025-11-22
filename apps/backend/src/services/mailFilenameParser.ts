/**
 * Mail Filename Parser
 * 
 * Parses OneDrive mail filenames to extract userId and sourceSlug.
 * 
 * Expected format: user{userId}_{date}_{sourceSlug}.pdf
 * Examples:
 * - user4_02-12-2025_companieshouse.pdf
 * - user12_01-01-2026_hmrc.pdf
 * - user007_15-03-2026_bank.pdf
 * - user0007-15-03-2026-hmrc.pdf (with dashes)
 * - user12_2025-11-01_bank-letter.pdf (multi-word source)
 * 
 * Regex pattern: ^user0*([0-9]+)[_-](?:[0-9_-]+)[_-]([^_\-\.]+)
 * - Group 1: userId (number, e.g. 4, 12, 7)
 * - Group 2: sourceSlug (e.g. "companieshouse", "hmrc", "bank")
 */

export type ParsedMailFilename = {
  userId: number;
  sourceSlug: string;
};

/**
 * Parse a mail filename to extract userId and sourceSlug
 * 
 * @param filename - The filename to parse (e.g. "user4_02-12-2025_companieshouse.pdf")
 * @returns ParsedMailFilename with userId and sourceSlug, or null if parsing fails
 */
export function parseMailFilename(filename: string): ParsedMailFilename | null {
  if (!filename || typeof filename !== 'string') {
    return null;
  }

  // Remove .pdf extension if present
  const baseName = filename.replace(/\.pdf$/i, '');

  // Regex pattern: ^user0*([0-9]+)[_-](?:[0-9_-]+)[_-]([^_\-\.]+)
  // - ^user0*([0-9]+) - matches "user" followed by optional zeros and then the userId
  // - [_-] - matches underscore or dash separator
  // - (?:[0-9_-]+) - non-capturing group for date (we don't need it)
  // - [_-] - another separator
  // - ([^_\-\.]+) - captures the source slug (everything until next underscore, dash, or dot)
  const pattern = /^user0*([0-9]+)[_-](?:[0-9_-]+)[_-]([^_\-\.]+)/i;
  const match = baseName.match(pattern);

  if (!match) {
    return null;
  }

  const userId = parseInt(match[1], 10);
  const sourceSlug = match[2].toLowerCase().trim();

  // Validate userId is a positive number
  if (isNaN(userId) || userId <= 0) {
    return null;
  }

  // Validate sourceSlug is not empty
  if (!sourceSlug || sourceSlug.length === 0) {
    return null;
  }

  return {
    userId,
    sourceSlug,
  };
}

