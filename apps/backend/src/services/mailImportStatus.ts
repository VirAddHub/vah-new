/**
 * What the OneDrive importer last reported, so staff can see it in the dashboard.
 *
 * The worker posts a report after every run (every 5 minutes by default). The report is kept in
 * memory on the API: after an API restart the panel shows "waiting for the importer" until the
 * next run, which is at most one interval away. Nothing here is customer data beyond file names.
 */

export type ImportIssueReason =
  | 'bad_filename'
  | 'customer_not_found'
  | 'no_business'
  | 'conflict'
  | 'move_pending'
  | 'import_failed';

export interface ImportIssue {
  fileName: string;
  reason: ImportIssueReason;
  detail?: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
}

export type ImporterProblem =
  | 'onedrive_access_denied'
  | 'onedrive_folder_not_found'
  | 'microsoft_sign_in_failed'
  | 'not_configured'
  | 'onedrive_error';

export interface ImporterReport {
  ok: boolean;
  problem?: ImporterProblem | null;
  problemDetail?: string | null;
  filesInInbox?: number | null;
  imported?: number | null;
  issues?: Array<{ fileName: string; reason: ImportIssueReason; detail?: string | null }>;
  intervalMs?: number | null;
}

interface ImporterState {
  lastReportAt: string | null;
  lastSuccessAt: string | null;
  problem: ImporterProblem | null;
  problemDetail: string | null;
  problemSince: string | null;
  filesInInbox: number | null;
  importedLastRun: number | null;
  intervalMs: number;
  issues: ImportIssue[];
}

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const MAX_ISSUES = 200;

let state: ImporterState = freshState();

function freshState(): ImporterState {
  return {
    lastReportAt: null,
    lastSuccessAt: null,
    problem: null,
    problemDetail: null,
    problemSince: null,
    filesInInbox: null,
    importedLastRun: null,
    intervalMs: DEFAULT_INTERVAL_MS,
    issues: [],
  };
}

/** For tests. */
export function resetImporterStatus(): void {
  state = freshState();
}

const clip = (value: unknown, max: number): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value);
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

export function recordImporterReport(report: ImporterReport, now: Date = new Date()): void {
  const at = now.toISOString();
  state.lastReportAt = at;
  if (typeof report.intervalMs === 'number' && report.intervalMs > 0) {
    state.intervalMs = report.intervalMs;
  }

  if (report.ok) {
    state.lastSuccessAt = at;
    state.problem = null;
    state.problemDetail = null;
    state.problemSince = null;
    state.filesInInbox = typeof report.filesInInbox === 'number' ? report.filesInInbox : null;
    state.importedLastRun = typeof report.imported === 'number' ? report.imported : null;

    // The issue list is replaced each successful run: a file that was fixed or removed disappears.
    const previous = new Map(state.issues.map((i) => [`${i.fileName}|${i.reason}`, i]));
    state.issues = (report.issues || []).slice(0, MAX_ISSUES).map((issue) => {
      const key = `${issue.fileName}|${issue.reason}`;
      return {
        fileName: clip(issue.fileName, 255) || '(no name)',
        reason: issue.reason,
        detail: clip(issue.detail, 300),
        firstSeenAt: previous.get(key)?.firstSeenAt || at,
        lastSeenAt: at,
      };
    });
  } else {
    const problem = report.problem || 'onedrive_error';
    if (state.problem !== problem) {
      state.problemSince = at;
    }
    state.problem = problem;
    state.problemDetail = clip(report.problemDetail, 300);
    // Keep the last known file issues: the inbox could not be read this time.
  }
}

export function getImporterStatus(now: Date = new Date()) {
  const lastReportMs = state.lastReportAt ? Date.parse(state.lastReportAt) : null;
  // Two missed runs (plus a minute's grace) means the worker itself is not running.
  const staleAfterMs = state.intervalMs * 2 + 60_000;
  const workerSilent = lastReportMs === null || now.getTime() - lastReportMs > staleAfterMs;

  let health: 'ok' | 'problem' | 'no_report';
  if (lastReportMs === null) health = 'no_report';
  else if (workerSilent || state.problem) health = 'problem';
  else health = 'ok';

  return {
    health,
    workerSilent: lastReportMs !== null && workerSilent,
    lastReportAt: state.lastReportAt,
    lastSuccessAt: state.lastSuccessAt,
    problem: state.problem,
    problemDetail: state.problemDetail,
    problemSince: state.problemSince,
    filesInInbox: state.filesInInbox,
    importedLastRun: state.importedLastRun,
    intervalMinutes: Math.round(state.intervalMs / 60000),
    issues: state.issues,
  };
}

/** Classify an error thrown while listing the OneDrive inbox. */
export function classifyListError(message: string): { problem: ImporterProblem; detail: string } {
  const text = String(message || '');
  if (/environment variable|must be set|Missing required environment/i.test(text)) {
    return { problem: 'not_configured', detail: 'The importer is missing part of its OneDrive configuration.' };
  }
  if (/\[graph token\]/i.test(text)) {
    return { problem: 'microsoft_sign_in_failed', detail: 'Microsoft refused the importer\'s sign-in (app registration or client secret).' };
  }
  if (/\b404\b|not found/i.test(text)) {
    return { problem: 'onedrive_folder_not_found', detail: 'The OneDrive inbox folder could not be found.' };
  }
  if (/\b(401|403)\b/.test(text)) {
    return { problem: 'onedrive_access_denied', detail: 'Microsoft signed the importer in, but refused access to the OneDrive inbox folder.' };
  }
  return { problem: 'onedrive_error', detail: 'OneDrive returned an error when the importer tried to read the inbox.' };
}
