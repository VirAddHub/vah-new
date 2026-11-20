/**
 * OneDrive Mail Ingestion Worker
 * 
 * This worker:
 * 1. Lists all PDFs in the OneDrive mail inbox folder
 * 2. Parses filenames to extract userId and sourceSlug
 * 3. Calls the backend webhook to create mail items
 * 4. For newly created imports (not duplicates), moves files to processed folder (if configured)
 * 
 * Render Deployment:
 * 
 * Create a Background Worker service on Render:
 *   - Command: cd apps/backend && node dist/src/workers/onedriveMailIngest.js
 *   - The worker runs as a daemon (never exits) to prevent false "Instance failed" messages
 *   - Runs immediately on startup, then every 5 minutes (configurable)
 *   - Prevents overlapping runs automatically
 * 
 * Environment variables:
 * - MAIL_IMPORT_WEBHOOK_URL (required) - URL of the internal backend endpoint
 * - MAIL_IMPORT_WEBHOOK_SECRET (required) - Shared secret for authentication
 * - ONEDRIVE_MAIL_POLL_INTERVAL_MS (optional) - Polling interval in ms (default: 300000 = 5 minutes)
 * - ONEDRIVE_MAIL_PROCESSED_FOLDER_ID or GRAPH_MAIL_PROCESSED_FOLDER_ID (optional) - OneDrive folder ID for processed/archive folder
 *   - If set, files are moved here once they are on the customer's account. A file whose move was
 *     interrupted is moved on a later run (the website confirms it is the same OneDrive file).
 *   - If not set, files remain in inbox for manual review
 *
 * No AI: the customer, date and letter type come only from the filename (Filenames tool).
 * The PDF content is never read or sent anywhere by this worker.
 * 
 * To change the interval:
 *   - Set ONEDRIVE_MAIL_POLL_INTERVAL_MS environment variable
 *   - Examples: 120000 (2 min), 300000 (5 min), 600000 (10 min)
 */

import { logger } from '../lib/logger';
import {
  listInboxFiles,
  moveFileToProcessed,
  type OneDriveFile,
} from '../services/onedriveClient';
import { parseMailFilename } from '../services/mailFilenameParser';
import { classifyListError, type ImporterReport, type ImportIssueReason } from '../services/mailImportStatus';

type RunIssue = { fileName: string; reason: ImportIssueReason; detail?: string | null };

/**
 * Files that cannot be filed until a person fixes them (wrong name, unknown customer number).
 * Keyed by inbox snapshot: renaming or replacing the file changes the key, so it is tried again.
 * This stops the worker re-sending the same stuck file to the website every run.
 */
const stuckSnapshots = new Map<string, RunIssue>();

/** Map a webhook error to something staff can act on; null = temporary, try again next run. */
function permanentIssueFor(fileName: string, status: number, error: unknown): RunIssue | null {
  const code = typeof error === 'string' ? error : '';
  if (code === 'user_not_found' || status === 404) {
    return { fileName, reason: 'customer_not_found', detail: 'No customer has the number in this filename.' };
  }
  if (code === 'no_business' || status === 422) {
    return { fileName, reason: 'no_business', detail: 'This customer has no business on their account to attach mail to.' };
  }
  if (code === 'invalid_filename_date') {
    return { fileName, reason: 'bad_filename', detail: 'The date in the name is missing or not a real date (DD-MM-YY).' };
  }
  if (code === 'filename_date_in_future') {
    return { fileName, reason: 'bad_filename', detail: 'The date in the name is in the future.' };
  }
  if (code === 'file_already_imported_for_other_customer' || status === 409) {
    return { fileName, reason: 'conflict', detail: 'This file is already on another customer\'s account. Check the customer number.' };
  }
  if (code === 'validation_error' || code === 'invalid_payload' || status === 400) {
    return { fileName, reason: 'bad_filename', detail: 'The importer rejected the details read from this filename.' };
  }
  return null;
}

/**
 * OneDrive keeps the same drive item `id` when you replace a file in place. Deduping only on `id`
 * would skip the webhook forever after the first import. Include revision metadata so a new upload
 * (new lastModified / size) is processed again in the same worker session.
 */
function inboxSnapshotKey(file: OneDriveFile): string {
  return `${file.id}|${file.lastModifiedDateTime ?? ''}|${file.size ?? ''}`;
}

const WEBHOOK_URL = process.env.MAIL_IMPORT_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.MAIL_IMPORT_WEBHOOK_SECRET;

if (!WEBHOOK_URL) {
  throw new Error('MAIL_IMPORT_WEBHOOK_URL environment variable is required');
}

if (!WEBHOOK_SECRET) {
  throw new Error('MAIL_IMPORT_WEBHOOK_SECRET environment variable is required');
}

// TypeScript: ensure these are strings (not undefined) after validation
const WEBHOOK_URL_STRING: string = WEBHOOK_URL;
const WEBHOOK_SECRET_STRING: string = WEBHOOK_SECRET;

// In-memory dedupe: track processed inbox snapshots (id + lastModified + size) per worker process.
// Backend dedupe remains the safety net for true duplicates.
const processedInboxSnapshots = new Set<string>();

/** Base URL of the internal import routes (WEBHOOK_URL without its trailing /from-onedrive). */
const IMPORT_BASE_URL = WEBHOOK_URL_STRING.replace(/\/from-onedrive\/?$/, '');

/** Store the file's stable link on the letter. Returns false if the website did not accept it. */
async function updateScanLink(mailId: number | string, fileName: string, webUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${IMPORT_BASE_URL}/from-onedrive/${mailId}/scan-url`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-mail-import-secret': WEBHOOK_SECRET_STRING },
      body: JSON.stringify({ scanFileUrl: webUrl }),
    });
    if (!res.ok) {
      logger.error('[onedriveMailIngest] Website did not accept the new file link', { fileName, mailId, status: res.status });
      return false;
    }
    return true;
  } catch (err: any) {
    logger.error('[onedriveMailIngest] Could not send the new file link', { fileName, mailId, error: err?.message });
    return false;
  }
}

/**
 * Move a file that is on a customer's account into Processed_Mail and point the letter at its new place.
 * Returns true when the file is out of the inbox (or no processed folder is configured).
 */
async function finishFiling(
  file: OneDriveFile,
  mailId: number | string,
  report: (issue: RunIssue, permanent: boolean) => void
): Promise<boolean> {
  const processedFolderId = process.env.ONEDRIVE_MAIL_PROCESSED_FOLDER_ID || process.env.GRAPH_MAIL_PROCESSED_FOLDER_ID;
  if (!processedFolderId) {
    return true; // files stay in the inbox by configuration; the letter already links to it
  }

  let moved: OneDriveFile;
  try {
    moved = await moveFileToProcessed(file.id);
  } catch (err: any) {
    logger.error('[onedriveMailIngest] Could not move file to Processed_Mail (letter is on the account; will retry)', {
      fileName: file.name,
      mailId,
      error: err?.message,
    });
    report({
      fileName: file.name,
      reason: 'move_pending',
      detail: 'On the customer\'s account, but not yet moved to Processed_Mail. Retrying each run.',
    }, false);
    return false;
  }

  logger.info('[onedriveMailIngest] Moved file to Processed_Mail', {
    fileName: file.name,
    mailId,
    renamed: moved.name && moved.name !== file.name ? moved.name : undefined,
  });

  if (moved.webUrl) {
    const linked = await updateScanLink(mailId, file.name, moved.webUrl);
    if (!linked) {
      // The viewer also looks in Processed_Mail when a file is missing from Scanned_Mail.
      report({
        fileName: file.name,
        reason: 'move_pending',
        detail: 'Moved to Processed_Mail, but the letter\'s link could not be updated.',
      }, false);
    }
  }
  return true;
}

/**
 * Process a single file: check the name, add it to the customer's account, move it to Processed_Mail.
 * Returns: 'created' | 'skipped' | 'failed'
 */
async function processFile(
  file: OneDriveFile,
  report: (issue: RunIssue, permanent: boolean) => void = () => {}
): Promise<'created' | 'skipped' | 'failed'> {
  // The customer, date and type come only from the name. Never guess the recipient.
  const parsed = parseMailFilename(file.name);

  if (!parsed) {
    logger.warn(`[onedriveMailIngest] Skipping file "${file.name}" (filename pattern did not match)`);
    report({
      fileName: file.name,
      reason: 'bad_filename',
      detail: 'The name does not follow user{number}_{DD-MM-YY}_{TYPE}.pdf. Use the Filenames tool.',
    }, true);
    return 'failed';
  }

  const createdAt = parsed.dateIso ? `${parsed.dateIso}T00:00:00.000Z` : file.createdDateTime;

  const payload = {
    userId: parsed.userId,
    sourceSlug: parsed.sourceSlug,
    fileName: file.name,
    oneDriveFileId: file.id,
    // Stable SharePoint link only (what the viewer opens); never a temporary download link
    oneDriveDownloadUrl: file.webUrl ?? null,
    createdAt,
  };

  let response: Response;
  let responseData: any = null;

  try {
    logger.info(`[onedriveMailIngest] Calling webhook for file "${file.name}"`, { userId: parsed.userId });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      response = await fetch(WEBHOOK_URL_STRING, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-mail-import-secret': WEBHOOK_SECRET_STRING,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    try {
      responseData = await response.json();
    } catch {
      logger.error(`[onedriveMailIngest] Website reply was not JSON for "${file.name}"`, { status: response.status });
      responseData = null;
    }
  } catch (err: any) {
    logger.error(`[onedriveMailIngest] Failed to call webhook for file "${file.name}"`, {
      error: err?.message,
      errorName: err?.name,
    });
    report({ fileName: file.name, reason: 'import_failed', detail: 'Could not reach the website; will retry.' }, false);
    return 'failed';
  }

  if (!response.ok || !responseData?.ok) {
    const errorMsg = responseData?.error || `HTTP ${response.status}`;
    logger.error(`[onedriveMailIngest] Failed to import file "${file.name}"`, { status: response.status, error: errorMsg });
    const permanent = permanentIssueFor(file.name, response.status, responseData?.error);
    report(
      permanent || { fileName: file.name, reason: 'import_failed', detail: `The website returned an error (${errorMsg}); will retry.` },
      Boolean(permanent)
    );
    return 'failed';
  }

  const mailId = responseData.data?.mailId || responseData.mailId;

  if (responseData.skipped) {
    if (responseData.data?.sameFile === undefined) {
      // An older website that does not say whether this is the same file (e.g. mid-deploy):
      // do nothing now and ask again next run, rather than guess either way.
      logger.warn('[onedriveMailIngest] Website did not confirm whether this is the same file; will retry', { fileName: file.name });
      return 'failed';
    }
    if (responseData.data.sameFile && mailId) {
      // Already on the account from this very file: an earlier move was interrupted. Finish it.
      logger.info('[onedriveMailIngest] File already on the account; finishing its move', { fileName: file.name, mailId });
      const done = await finishFiling(file, mailId, report);
      return done ? 'skipped' : 'failed';
    }
    // A different file reuses a name that was already filed: never attach it to the old letter.
    report({
      fileName: file.name,
      reason: 'conflict',
      detail: 'A letter with this name is already on the account. If this is a different letter, rename it with the next letter number.',
    }, true);
    return 'failed';
  }

  logger.info('[onedriveMailIngest] Imported new file', { fileName: file.name, userId: parsed.userId, mailId, tag: parsed.sourceSlug });
  await finishFiling(file, mailId, report);
  return 'created';
}

/**
 * Run the ingestion process once
 */
async function runOnce(): Promise<void> {
  logger.info('[onedriveMailIngest] Starting mail ingestion...');
  const runIssues: RunIssue[] = [];

  try {
    // List all PDF files in inbox
    let files: OneDriveFile[];
    try {
      files = await listInboxFiles();
    } catch (listErr: any) {
      const { problem, detail } = classifyListError(listErr?.message || String(listErr));
      await reportStatus({ ok: false, problem, problemDetail: detail });
      throw listErr;
    }
    logger.info(`[onedriveMailIngest] 📦 Found ${files.length} PDF file(s) in inbox`);
    logger.info(`[onedriveMailIngest] 📊 In-memory dedupe cache: ${processedInboxSnapshots.size} snapshot(s) already processed`);

    if (files.length === 0) {
      logger.info('[onedriveMailIngest] No files to process');
      await reportStatus({ ok: true, filesInInbox: 0, imported: 0, issues: [] });
      return;
    }

    // Process each file sequentially (errors are logged but don't stop other files)
    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const file of files) {
      const oneDriveFileId = file.id;

      if (!oneDriveFileId) {
        logger.warn(`[onedriveMailIngest] Skipping file "${file.name}" (no file ID)`);
        failedCount++;
        continue;
      }

      const snapshotKey = inboxSnapshotKey(file);

      // Still stuck from an earlier run and unchanged since: report it again without re-processing
      const stuck = stuckSnapshots.get(snapshotKey);
      if (stuck) {
        runIssues.push(stuck);
        failedCount++;
        continue;
      }

      // Skip if we've already processed this exact inbox snapshot in this worker process
      if (processedInboxSnapshots.has(snapshotKey)) {
        logger.info('[onedriveMailIngest] ⏭️  SKIPPING already-processed file (in-memory dedupe)', {
          oneDriveFileId,
          fileName: file.name,
          lastModifiedDateTime: file.lastModifiedDateTime,
          size: file.size,
          reason: 'Same id + lastModified + size already processed in this worker process',
          processedCount: processedInboxSnapshots.size,
        });
        skippedCount++;
        continue;
      }

      try {
        let pending = false;
        const result = await processFile(file, (issue, permanent) => {
          runIssues.push(issue);
          if (permanent) stuckSnapshots.set(snapshotKey, issue);
          else pending = true;
        });

        // Remember the file as done only when it is fully filed; anything pending is retried next run
        if ((result === 'created' || result === 'skipped') && !pending) {
          processedInboxSnapshots.add(snapshotKey);
          logger.info('[onedriveMailIngest] ✅ Marked file as processed (in-memory)', {
            oneDriveFileId,
            fileName: file.name,
            lastModifiedDateTime: file.lastModifiedDateTime,
            size: file.size,
            result,
            totalProcessed: processedInboxSnapshots.size,
          });
        }

        if (result === 'created') {
          createdCount++;
        } else if (result === 'skipped') {
          skippedCount++;
        } else {
          failedCount++;
        }
      } catch (err: any) {
        logger.error(`[onedriveMailIngest] Error processing file "${file.name}"`, { error: err?.message });
        runIssues.push({ fileName: file.name, reason: 'import_failed', detail: 'Unexpected error; will retry.' });
        failedCount++;
        // Continue with next file
      }
    }

    logger.info(`[onedriveMailIngest] ✅ Mail ingestion completed:`, {
      created: createdCount,
      skipped: skippedCount,
      failed: failedCount,
      totalInCache: processedInboxSnapshots.size,
      summary: `${createdCount} new, ${skippedCount} skipped (${skippedCount > 0 ? 'in-memory dedupe' : 'none'}), ${failedCount} failed`,
    });

    // Files still in the inbox = everything listed, minus what was imported and moved out this run
    const movesOut = Boolean(process.env.ONEDRIVE_MAIL_PROCESSED_FOLDER_ID || process.env.GRAPH_MAIL_PROCESSED_FOLDER_ID);
    await reportStatus({
      ok: true,
      filesInInbox: Math.max(0, files.length - (movesOut ? createdCount : 0)),
      imported: createdCount,
      issues: runIssues,
    });

    // Give a small delay to ensure all async operations (like fetch) complete
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (err: any) {
    logger.error('[onedriveMailIngest] Fatal error during ingestion', { error: err?.message });
    throw err;
  }
}

/**
 * Tell the website how this run went, for the importer panel staff see on the Mail and Filenames pages.
 * Never throws: a failed report must not stop mail being imported.
 */
async function reportStatus(report: Omit<ImporterReport, 'intervalMs'>): Promise<void> {
  try {
    const statusUrl = `${WEBHOOK_URL_STRING.replace(/\/+$/, '')}/status`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(statusUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-mail-import-secret': WEBHOOK_SECRET_STRING },
        body: JSON.stringify({
          ...report,
          intervalMs: Number(process.env.ONEDRIVE_MAIL_POLL_INTERVAL_MS ?? '300000'),
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        logger.warn('[onedriveMailIngest] Status report was not accepted', { status: res.status });
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err: any) {
    logger.warn('[onedriveMailIngest] Could not send status report', { error: err?.message });
  }
}

// ---------------------------------------------
// Simple sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Track if ingest is already running
let isRunning = false;

async function runOnceSafely(): Promise<void> {
  if (isRunning) {
    logger.warn('[onedriveMailIngest] Previous run still in progress — skipping');
    return;
  }

  isRunning = true;
  try {
    await runOnce();
  } catch (err: any) {
    logger.error('[onedriveMailIngest] Error during runOnce', { error: err?.message });
    // Do NOT exit. Log error and continue.
  } finally {
    isRunning = false;
  }
}

async function startDaemon(): Promise<void> {
  // Get interval from env or default to 5 minutes
  const intervalMs = Number(process.env.ONEDRIVE_MAIL_POLL_INTERVAL_MS ?? '300000');
  const intervalMinutes = intervalMs / (60 * 1000);

  logger.info(`[onedriveMailIngest] Starting daemon loop (interval = ${intervalMinutes} minutes)`);
  logger.info('[onedriveMailIngest] Filing from filenames only (no AI): customer, date and letter type come from the name');

  // Run immediately on boot
  await runOnceSafely();

  // Loop forever
  while (true) {
    await sleep(intervalMs);
    await runOnceSafely();
  }
}

// Run if called directly
if (require.main === module) {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('[onedriveMailIngest] Unhandled promise rejection:', reason);
    // Don't exit - log and continue
  });

  startDaemon().catch(err => {
    logger.error('[onedriveMailIngest] Fatal error:', err);
    // Only exit on *real* fatal errors
    process.exit(1);
  });
}

