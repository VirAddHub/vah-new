import { describe, expect, it } from 'vitest';
import { parseAuditValue, safeAuditValue } from '../../server/audit/details';
import { auditQuery } from '../../server/audit/query';

describe('legacy audit details', () => {
  it('reproduces the character-index bug and normalizes the TEXT writer format', () => {
    const stored = JSON.stringify({ reason: 'manual_admin_unlock', active: true });
    expect(Object.entries(stored).slice(0, 2)).toEqual([
      ['0', '{'],
      ['1', '"'],
    ]);
    expect(safeAuditValue(stored)).toEqual({ reason: 'manual_admin_unlock', active: true });
  });
  it.each([null, undefined, '', 'null'])('handles missing %s', (raw) =>
    expect(safeAuditValue(raw)).toBeNull(),
  );
  it('handles structured, double-encoded, plain, scalar and malformed legacy values', () => {
    expect(parseAuditValue(JSON.stringify(JSON.stringify({ status: 'active' })))).toEqual({
      status: 'active',
    });
    expect(safeAuditValue({ status: 'active' })).toEqual({ status: 'active' });
    expect(safeAuditValue('Operator note')).toBe('Operator note');
    expect(safeAuditValue('false')).toBe(false);
    expect(safeAuditValue('0')).toBe(0);
    expect(safeAuditValue('{broken json')).toContain('Malformed');
  });
  it('redacts nested secrets, serialized objects, arrays, URL credentials and opaque auth payloads', () => {
    const cleaned = safeAuditValue({
      Password: 'DO-NOT-RETURN',
      data: [{ refreshToken: 'DO-NOT-RETURN' }],
      nested: '{"client_secret":"DO-NOT-RETURN"}',
      reason: 'https://example.test/?token=DO-NOT-RETURN',
    });
    expect(JSON.stringify(cleaned)).not.toContain('DO-NOT-RETURN');
    expect(
      safeAuditValue(
        '{"email":"a@example.test","reason":"bad_password","raw":{"anything":"secret-value"}}',
        true,
      ),
    ).toEqual({ email: 'a@example.test', reason: 'bad_password' });
    expect(safeAuditValue({ reason: '{"payload":"DO-NOT-RETURN"}' }, true)).toEqual({});
    expect(safeAuditValue('https://user:DO-NOT-RETURN@example.test')).toBe(
      '[Sensitive details hidden]',
    );
    expect(safeAuditValue('unrestricted authentication payload', true)).toBe(
      '[Sensitive details hidden]',
    );
  });
});
describe('audit filters', () => {
  it.each([
    { limit: '1.2' },
    { offset: '-1' },
    { limit: '101' },
    { offset: 'Infinity' },
    { from: '2026-02-30' },
    { from: '2026-05-01', to: '2026-04-01' },
    { actor: '1 OR 1=1' },
    { q: ['array'] },
  ])('rejects invalid input %j', (query) => expect(() => auditQuery('admin', query)).toThrow());
  it('binds all filters and escapes wildcard characters', () => {
    const built = auditQuery('admin', {
      q: "O'Reilly_%",
      actor: '50',
      action: 'update_user',
      from: '2026-03-29',
      to: '2026-03-29',
      offset: '25',
    });
    expect(built.sql).not.toContain("O'Reilly");
    expect(built.params).toEqual([
      "%O'Reilly\\_\\%%",
      '50',
      'update_user',
      '2026-03-29',
      '2026-03-29',
      25,
      25,
    ]);
    expect(built.sql).toContain('ORDER BY occurred_at DESC NULLS LAST, id DESC');
  });
});
