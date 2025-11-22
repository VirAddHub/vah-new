/**
 * OneDrive Mail Ingestion Worker
 * 
 * This worker:
 * 1. Lists all PDFs in the OneDrive mail inbox folder
 * 2. Parses filenames to extract userId and sourceSlug
 * 3. Calls the backend webhook to create mail items
 * 4. Moves processed files to the archive folder
 * 
 * Usage:
 *   Run once:
 *     ONEDRIVE_MAIL_WATCH_MODE=once npm run ingest-onedrive-mail
 * 
 *   Run in interval mode:
 *     ONEDRIVE_MAIL_WATCH_MODE=interval ONEDRIVE_MAIL_POLL_INTERVAL_MS=60000 npm run ingest-onedrive-mail
 * 
 * Environment variables:
 * - MAIL_IMPORT_WEBHOOK_URL (required) - URL of the internal backend endpoint
 * - MAIL_IMPORT_WEBHOOK_SECRET (required) - Shared secret for authentication
 * - ONEDRIVE_MAIL_WATCH_MODE (optional) - "once" or "interval" (default: "once")
 * - ONEDRIVE_MAIL_POLL_INTERVAL_MS (optional) - Polling interval in ms (default: 60000)
 */

import { listInboxFiles } from '../services/onedriveClient';
import { parseMailFilename } from '../services/mailFilenameParser';

const WEBHOOK_URL = process.env.MAIL_IMPORT_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.MAIL_IMPORT_WEBHOOK_SECRET;

if (!WEBHOOK_URL) {
  throw new Error('MAIL_IMPORT_WEBHOOK_URL environment variable is required');
}

if (!WEBHOOK_SECRET) {
  throw new Error('MAIL_IMPORT_WEBHOOK_SECRET environment variable is required');
}

/**
 * Process a single file: parse, call webhook, move if successful
 */
async function processFile(file: { id: string; name: string; createdDateTime: string; downloadUrl?: string }): Promise<void> {
  // Parse filename
  const parsed = parseMailFilename(file.name);
  
  if (!parsed) {
    console.warn(`[onedriveMailIngest] Skipping file "${file.name}" (filename pattern did not match)`);
    return;
  }

  // Build payload
  const payload = {
    userId: parsed.userId,
    sourceSlug: parsed.sourceSlug,
    fileName: file.name,
    oneDriveFileId: file.id,
    oneDriveDownloadUrl: file.downloadUrl ?? null,
    createdAt: file.createdDateTime,
  };

  // Call webhook
  let response: Response;
  let responseData: any;

  try {
    response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-mail-import-secret': WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    });

    responseData = await response.json().catch(() => ({}));
  } catch (err: any) {
    console.error(`[onedriveMailIngest] Failed to call webhook for file "${file.name}":`, err.message);
    return; // Don't move file if webhook call failed
  }

  // Check response
  if (!response.ok || !responseData.ok) {
    const errorMsg = responseData.error || `HTTP ${response.status}`;
    console.error(`[onedriveMailIngest] Failed to import file "${file.name}" (status ${response.status} or ok=false: ${errorMsg})`);
    return; // Don't move file if webhook returned error
  }

  // Webhook succeeded - file stays in inbox (not moved to archive)
  const mailId = responseData.data?.mailId || 'unknown';
  console.log(`[onedriveMailIngest] Imported file ${file.name} → mailId=${mailId}, userId=${parsed.userId}, tag=${parsed.sourceSlug}`);
  
  // Note: Files are NOT moved to an archive folder - they remain in the inbox.
  // This allows manual review and prevents accidental data loss.
}

/**
 * Run the ingestion process once
 */
async function runOnce(): Promise<void> {
  console.log('[onedriveMailIngest] Starting mail ingestion...');

  try {
    // List all PDF files in inbox
    const files = await listInboxFiles();
    console.log(`[onedriveMailIngest] Found ${files.length} PDF file(s) in inbox`);

    if (files.length === 0) {
      console.log('[onedriveMailIngest] No files to process');
      return;
    }

    // Process each file (errors are logged but don't stop other files)
    for (const file of files) {
      try {
        await processFile(file);
      } catch (err: any) {
        console.error(`[onedriveMailIngest] Error processing file "${file.name}":`, err.message);
        // Continue with next file
      }
    }

    console.log('[onedriveMailIngest] Mail ingestion completed');
  } catch (err: any) {
    console.error('[onedriveMailIngest] Fatal error during ingestion:', err.message);
    throw err;
  }
}

/**
 * Main entry point
 */
async function main() {
  const mode = process.env.ONEDRIVE_MAIL_WATCH_MODE ?? 'once';
  const intervalMs = Number(process.env.ONEDRIVE_MAIL_POLL_INTERVAL_MS ?? '60000');

  if (mode === 'interval') {
    console.log(`[onedriveMailIngest] Starting OneDrive mail ingest in interval mode (polling every ${intervalMs}ms)...`);
    
    // Run once immediately
    await runOnce().catch(err => {
      console.error('[onedriveMailIngest] Initial runOnce error:', err);
    });

    // Then set up interval
    setInterval(() => {
      runOnce().catch(err => {
        console.error('[onedriveMailIngest] runOnce error:', err);
      });
    }, intervalMs);
  } else {
    console.log('[onedriveMailIngest] Running OneDrive mail ingest once...');
    await runOnce();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('[onedriveMailIngest] Fatal error:', err);
    process.exit(1);
  });
}

