/**
 * Plain titles from the letter type in the filename. No content is read from the PDF.
 * HMRC and Companies House are also the sender; for other types the sender is unknown
 * until staff fill it in.
 */
const KNOWN_LETTER_TYPES: Record<string, { label: string; sender: string | null }> = {
  hmrc: { label: 'HMRC', sender: 'HMRC' },
  companieshouse: { label: 'Companies House', sender: 'Companies House' },
  companies_house: { label: 'Companies House', sender: 'Companies House' },
  bank: { label: 'Bank', sender: null },
  insurance: { label: 'Insurance', sender: null },
  utilities: { label: 'Utilities', sender: null },
};

export const letterDetailsFromType = (tagSlug: string): { subject: string; senderName: string | null; emailLabel: string | null } => {
  const known = KNOWN_LETTER_TYPES[String(tagSlug || '').toLowerCase()];
  if (!known) {
    // "Other", the older numbered tags (1-10) and anything unrecognised
    return { subject: 'Mail received', senderName: null, emailLabel: null };
  }
  return { subject: `${known.label} letter`, senderName: known.sender, emailLabel: known.label };
};
