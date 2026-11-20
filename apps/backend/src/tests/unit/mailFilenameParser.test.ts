import { describe, it, expect } from 'vitest';
import { parseMailFilename } from '../../services/mailFilenameParser';

describe('parseMailFilename', () => {
  it('reads the Filenames tool format', () => {
    expect(parseMailFilename('user52_20-11-26_HMRC.pdf')).toEqual({ userId: 52, sourceSlug: 'hmrc', dateIso: '2026-11-20' });
    expect(parseMailFilename('user52_20-11-26_CompaniesHouse.pdf')?.sourceSlug).toBe('companieshouse');
  });

  it('reads a second letter of the same type on the same day as the same type', () => {
    const second = parseMailFilename('user52_20-11-26_HMRC_2.pdf');
    expect(second).toEqual({ userId: 52, sourceSlug: 'hmrc', dateIso: '2026-11-20' });
  });

  it('ignores the copy number OneDrive adds when a name already exists', () => {
    expect(parseMailFilename('user52_20-11-26_HMRC 1.pdf')?.sourceSlug).toBe('hmrc');
  });

  it('still reads the older numbered tags', () => {
    expect(parseMailFilename('user4_02-12-25_3.pdf')).toMatchObject({ userId: 4, sourceSlug: '3' });
  });

  it('rejects names that are not in the format', () => {
    expect(parseMailFilename('scan0001.pdf')).toBeNull();
    expect(parseMailFilename('52_20-11-26_HMRC.pdf')).toBeNull();
  });
});

describe('parseMailFilename dates', () => {
  it('rejects impossible dates in either format', () => {
    expect(parseMailFilename('user4_31-02-26_HMRC.pdf')?.dateIso).toBeNull();
    expect(parseMailFilename('user4_2026-02-31_HMRC.pdf')?.dateIso).toBeNull();
    expect(parseMailFilename('user4_0000_hmrc.pdf')?.dateIso).toBeNull();
  });
  it('accepts real dates in either format', () => {
    expect(parseMailFilename('user4_2026-11-15_HMRC.pdf')?.dateIso).toBe('2026-11-15');
    expect(parseMailFilename('user4_29-02-28_HMRC.pdf')?.dateIso).toBe('2028-02-29');
  });
});
