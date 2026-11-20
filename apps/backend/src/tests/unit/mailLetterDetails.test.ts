import { describe, it, expect } from 'vitest';
import { letterDetailsFromType } from '../../services/mailLetterDetails';

describe('letter titles from the filename type (no AI)', () => {
  it('names official senders', () => {
    expect(letterDetailsFromType('hmrc')).toEqual({ subject: 'HMRC letter', senderName: 'HMRC', emailLabel: 'HMRC' });
    expect(letterDetailsFromType('companieshouse')).toEqual({ subject: 'Companies House letter', senderName: 'Companies House', emailLabel: 'Companies House' });
    expect(letterDetailsFromType('HMRC').subject).toBe('HMRC letter');
  });
  it('labels other known types without inventing a sender', () => {
    expect(letterDetailsFromType('bank')).toEqual({ subject: 'Bank letter', senderName: null, emailLabel: 'Bank' });
    expect(letterDetailsFromType('utilities').senderName).toBeNull();
  });
  it('uses "Mail received" for Other, old numbered tags and anything unrecognised', () => {
    for (const t of ['other', '3', 'reddd', 'bilan', '']) {
      expect(letterDetailsFromType(t)).toEqual({ subject: 'Mail received', senderName: null, emailLabel: null });
    }
  });
});
