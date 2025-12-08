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
 *   - If set, files are moved here after successful import (new imports only, not duplicates)
 *   - If not set, files remain in inbox for manual review
 * 
 * To change the interval:
 *   - Set ONEDRIVE_MAIL_POLL_INTERVAL_MS environment variable
 *   - Examples: 120000 (2 min), 300000 (5 min), 600000 (10 min)
 */

import { listInboxFiles, moveFileToProcessed } from '../services/onedriveClient';
import { parseMailFilename } from '../services/mailFilenameParser';

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

// In-memory dedupe: track processed OneDrive file IDs to avoid re-sending same files
// This prevents the worker from repeatedly POSTing files that were already processed
// in this worker process lifetime (backend dedupe is still the safety net)
const processedOneDriveFileIds = new Set<string>();

/**
 * Process a single file: parse, call webhook
 * Returns: 'created' | 'skipped' | 'failed'
 */
async function processFile(file: { id: string; name: string; createdDateTime: string; downloadUrl?: string }): Promise<'created' | 'skipped' | 'failed'> {
  // Parse filename
  const parsed = parseMailFilename(file.name);
  
  if (!parsed) {
    console.warn(`[onedriveMailIngest] Skipping file "${file.name}" (filename pattern did not match)`);
    return 'failed';
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
  let responseData: any = null;

  try {
    console.log(`[onedriveMailIngest] Calling webhook for file "${file.name}"`, {
      webhookUrl: WEBHOOK_URL_STRING,
      userId: parsed.userId,
    });

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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

    // Parse JSON safely
    try {
      responseData = await response.json();
    } catch (parseError) {
      // If JSON parse fails, try to get text for debugging
      const text = await response.text().catch(() => 'Unable to read response');
      console.error(`[onedriveMailIngest] Failed to parse JSON response for "${file.name}"`, {
        status: response.status,
        statusText: response.statusText,
        responseText: text.substring(0, 500),
      });
      responseData = null;
    }
  } catch (err: any) {
    // Handle fetch errors (network, timeout, etc.)
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      console.error(`[onedriveMailIngest] Webhook call timed out for file "${file.name}"`, {
        webhookUrl: WEBHOOK_URL_STRING,
        error: err.message,
      });
    } else {
      console.error(`[onedriveMailIngest] Failed to call webhook for file "${file.name}"`, {
        webhookUrl: WEBHOOK_URL_STRING,
        error: err.message,
        errorName: err.name,
      });
    }
    return 'failed';
  }

  // Check response
  if (!response.ok || !responseData?.ok) {
    const errorMsg = responseData?.error || `HTTP ${response.status}`;
    console.error(`[onedriveMailIngest] Failed to import file "${file.name}"`, {
      status: response.status,
      error: errorMsg,
      body: responseData,
    });
    return 'failed';
  }

  // Extract mailId from response (could be in data.mailId or mailId directly)
  const mailId = responseData.data?.mailId || responseData.mailId || 'unknown';

  // Check if this was a duplicate (skipped)
  if (responseData.skipped) {
    console.log(`[onedriveMailIngest] Skipped duplicate file`, {
      fileName: file.name,
      userId: parsed.userId,
      mailId: mailId,
      reason: responseData.reason || 'duplicate_file_for_user',
    });
    return 'skipped';
  }

  // New file was created
  console.log(`[onedriveMailIngest] Imported new file`, {
    fileName: file.name,
    userId: parsed.userId,
    mailId: mailId,
    tag: parsed.sourceSlug,
  });

  // Move file to processed folder (only for newly created imports, not duplicates)
  // This is optional - if ONEDRIVE_MAIL_PROCESSED_FOLDER_ID is not set, files remain in inbox
  const processedFolderId = process.env.ONEDRIVE_MAIL_PROCESSED_FOLDER_ID || process.env.GRAPH_MAIL_PROCESSED_FOLDER_ID;
  let finalScanUrl: string | null = null;

  if (processedFolderId) {
    try {
      // Move file and get the moved file's metadata (including new download URL)
      const movedFile = await moveFileToProcessed(file.id);
      finalScanUrl = movedFile.downloadUrl || null;

      console.log(`[onedriveMailIngest] Moved file to processed folder`, {
        fileName: file.name,
        fileId: file.id,
        processedFolderId,
        newFileId: movedFile.id,
        hasDownloadUrl: !!finalScanUrl,
        finalScanUrl: finalScanUrl ? finalScanUrl.substring(0, 200) : null, // Log first 200 chars for debugging
        // Check if URL contains Processed_Mail to verify it's the new location
        containsProcessedMail: finalScanUrl ? finalScanUrl.toLowerCase().includes('processed_mail') : false,
      });

      // Update the mail item's scan_file_url with the final location
      if (finalScanUrl) {
        try {
          // Construct update URL: remove trailing /from-onedrive and add /from-onedrive/:mailId/scan-url
          const baseUrl = WEBHOOK_URL_STRING.replace(/\/from-onedrive\/?$/, '');
          const updateUrl = `${baseUrl}/from-onedrive/${mailId}/scan-url`;
          const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'content-type': 'application/json',
              'x-mail-import-secret': WEBHOOK_SECRET_STRING,
            },
            body: JSON.stringify({
              scanFileUrl: finalScanUrl,
            }),
          });

          if (!updateResponse.ok) {
            const updateError = await updateResponse.json().catch(() => ({}));
            console.error(`[onedriveMailIngest] Failed to update scan_file_url (file was moved but URL not updated)`, {
              fileName: file.name,
              mailId,
              status: updateResponse.status,
              error: updateError,
            });
          } else {
            const updateData = await updateResponse.json().catch(() => ({}));
            console.log(`[onedriveMailIngest] Updated scan_file_url for mail item`, {
              fileName: file.name,
              mailId,
              scanFileUrl: finalScanUrl ? finalScanUrl.substring(0, 100) + '...' : null, // Log first 100 chars
              updateResponse: updateData,
            });
          }
        } catch (updateError: any) {
          console.error(`[onedriveMailIngest] Failed to call update endpoint for scan_file_url`, {
            fileName: file.name,
            mailId,
            error: updateError.message,
          });
        }
      } else {
        console.warn(`[onedriveMailIngest] Moved file but no download URL in response`, {
          fileName: file.name,
          fileId: file.id,
          movedFileId: movedFile.id,
        });
      }
    } catch (moveError: any) {
      // Don't fail the import if move fails - log it and continue
      console.error(`[onedriveMailIngest] Failed to move file to processed folder (import still succeeded)`, {
        fileName: file.name,
        fileId: file.id,
        error: moveError.message,
      });
    }
  } else {
    // No processed folder configured - use original URL
    // Update mail item with original download URL
    if (file.downloadUrl) {
      try {
        // Construct update URL: remove trailing /from-onedrive and add /from-onedrive/:mailId/scan-url
        const baseUrl = WEBHOOK_URL_STRING.replace(/\/from-onedrive\/?$/, '');
        const updateUrl = `${baseUrl}/from-onedrive/${mailId}/scan-url`;
        const updateResponse = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            'x-mail-import-secret': WEBHOOK_SECRET_STRING,
          },
          body: JSON.stringify({
            scanFileUrl: file.downloadUrl,
          }),
        });

        if (!updateResponse.ok) {
          console.error(`[onedriveMailIngest] Failed to update scan_file_url with original URL`, {
            fileName: file.name,
            mailId,
            status: updateResponse.status,
          });
        }
      } catch (updateError: any) {
        console.error(`[onedriveMailIngest] Failed to call update endpoint for scan_file_url`, {
          fileName: file.name,
          mailId,
          error: updateError.message,
        });
      }
    }
  }
  
  return 'created';
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

    // Process each file sequentially (errors are logged but don't stop other files)
    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    
    for (const file of files) {
      const oneDriveFileId = file.id;
      
      if (!oneDriveFileId) {
        console.warn(`[onedriveMailIngest] Skipping file "${file.name}" (no file ID)`);
        failedCount++;
        continue;
      }
      
      // Skip if we've already processed this file in this worker process
      if (processedOneDriveFileIds.has(oneDriveFileId)) {
        console.log('[onedriveMailIngest] Skipping already-processed file', {
          oneDriveFileId,
          name: file.name,
        });
        skippedCount++;
        continue;
      }
      
      try {
        const result = await processFile(file);
        
        // Only mark as processed after a successful call (created or skipped by backend)
        if (result === 'created' || result === 'skipped') {
          processedOneDriveFileIds.add(oneDriveFileId);
        }
        
        if (result === 'created') {
          createdCount++;
        } else if (result === 'skipped') {
          skippedCount++;
        } else {
          failedCount++;
        }
      } catch (err: any) {
        console.error(`[onedriveMailIngest] Error processing file "${file.name}":`, err.message);
        failedCount++;
        // Continue with next file
      }
    }

    console.log(`[onedriveMailIngest] Mail ingestion completed:`, {
      created: createdCount,
      skipped: skippedCount,
      failed: failedCount,
    });

    // Give a small delay to ensure all async operations (like fetch) complete
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (err: any) {
    console.error('[onedriveMailIngest] Fatal error during ingestion:', err.message);
    throw err;
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
    console.warn('[onedriveMailIngest] Previous run still in progress — skipping');
    return;
  }

  isRunning = true;
  try {
    await runOnce();
  } catch (err: any) {
    console.error('[onedriveMailIngest] Error during runOnce:', err);
    // Do NOT exit. Log error and continue.
  } finally {
    isRunning = false;
  }
}

async function startDaemon(): Promise<void> {
  // Get interval from env or default to 5 minutes
  const intervalMs = Number(process.env.ONEDRIVE_MAIL_POLL_INTERVAL_MS ?? '300000');
  const intervalMinutes = intervalMs / (60 * 1000);
  
  console.log(`[onedriveMailIngest] Starting daemon loop (interval = ${intervalMinutes} minutes)`);

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
    console.error('[onedriveMailIngest] Unhandled promise rejection:', reason);
    // Don't exit - log and continue
  });

  startDaemon().catch(err => {
    console.error('[onedriveMailIngest] Fatal error:', err);
    // Only exit on *real* fatal errors
    process.exit(1);
  });
}

