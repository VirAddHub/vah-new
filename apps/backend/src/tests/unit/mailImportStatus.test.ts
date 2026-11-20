import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordImporterReport,
  getImporterStatus,
  resetImporterStatus,
  classifyListError,
} from '../../services/mailImportStatus';

const t = (iso: string) => new Date(iso);

describe('mail importer status', () => {
  beforeEach(() => resetImporterStatus());

  it('says there is no report before the worker has run', () => {
    expect(getImporterStatus().health).toBe('no_report');
  });

  it('is healthy after a good run and lists files that could not be filed', () => {
    recordImporterReport({
      ok: true,
      filesInInbox: 2,
      imported: 1,
      intervalMs: 300000,
      issues: [{ fileName: 'scan001.pdf', reason: 'bad_filename' }],
    }, t('2026-11-20T10:00:00Z'));
    const s = getImporterStatus(t('2026-11-20T10:03:00Z'));
    expect(s.health).toBe('ok');
    expect(s.issues).toHaveLength(1);
    expect(s.issues[0]).toMatchObject({ fileName: 'scan001.pdf', reason: 'bad_filename' });
  });

  it('keeps when a stuck file was first seen, and drops it once it is fixed', () => {
    const issue = { fileName: 'user999_20-11-26_HMRC.pdf', reason: 'customer_not_found' as const };
    recordImporterReport({ ok: true, issues: [issue] }, t('2026-11-20T10:00:00Z'));
    recordImporterReport({ ok: true, issues: [issue] }, t('2026-11-20T10:05:00Z'));
    let s = getImporterStatus(t('2026-11-20T10:06:00Z'));
    expect(s.issues[0].firstSeenAt).toBe('2026-11-20T10:00:00.000Z');
    expect(s.issues[0].lastSeenAt).toBe('2026-11-20T10:05:00.000Z');

    recordImporterReport({ ok: true, issues: [] }, t('2026-11-20T10:10:00Z'));
    s = getImporterStatus(t('2026-11-20T10:11:00Z'));
    expect(s.issues).toHaveLength(0);
  });

  it('reports a OneDrive problem and when it started, keeping the last known file list', () => {
    recordImporterReport({ ok: true, issues: [{ fileName: 'a.pdf', reason: 'bad_filename' }] }, t('2026-11-20T09:55:00Z'));
    recordImporterReport({ ok: false, problem: 'onedrive_access_denied' }, t('2026-11-20T10:00:00Z'));
    recordImporterReport({ ok: false, problem: 'onedrive_access_denied' }, t('2026-11-20T10:05:00Z'));
    const s = getImporterStatus(t('2026-11-20T10:06:00Z'));
    expect(s.health).toBe('problem');
    expect(s.problem).toBe('onedrive_access_denied');
    expect(s.problemSince).toBe('2026-11-20T10:00:00.000Z');
    expect(s.issues).toHaveLength(1);
  });

  it('flags the worker as silent after two missed runs', () => {
    recordImporterReport({ ok: true, intervalMs: 300000 }, t('2026-11-20T10:00:00Z'));
    expect(getImporterStatus(t('2026-11-20T10:10:00Z')).health).toBe('ok');
    const late = getImporterStatus(t('2026-11-20T10:12:00Z'));
    expect(late.health).toBe('problem');
    expect(late.workerSilent).toBe(true);
  });
});

describe('classifyListError', () => {
  it('recognises the SharePoint 401 seen on staging as an access problem', () => {
    const msg = 'Failed to list OneDrive files: 401 {"error":{"code":"generalException","innerError":{"code":"spException"}}}';
    expect(classifyListError(msg).problem).toBe('onedrive_access_denied');
  });
  it('recognises sign-in, missing folder and missing settings', () => {
    expect(classifyListError('[graph token] 400 invalid_client').problem).toBe('microsoft_sign_in_failed');
    expect(classifyListError('OneDrive folder not found (404). Check ...').problem).toBe('onedrive_folder_not_found');
    expect(classifyListError('ONEDRIVE_MAIL_INBOX_FOLDER_ID environment variable is required').problem).toBe('not_configured');
  });
});
