/**
 * OneDrive Client Helper
 * 
 * Provides functions to interact with Microsoft OneDrive via Graph API
 * using app-only (client credentials) authentication.
 * 
 * Environment variables:
 * - MS_TENANT_ID or GRAPH_TENANT_ID
 * - MS_CLIENT_ID or GRAPH_CLIENT_ID
 * - MS_CLIENT_SECRET or GRAPH_CLIENT_SECRET
 * - ONEDRIVE_DRIVE_ID (optional, specific drive ID - cannot be "me" for app-only auth)
 * - ONEDRIVE_USER_UPN (optional, user principal name like "ops@virtualaddresshub.co.uk" - used if drive ID not set)
 * - ONEDRIVE_MAIL_INBOX_FOLDER_ID (OneDrive folder ID for inbox)
 * - ONEDRIVE_MAIL_PROCESSED_FOLDER_ID or GRAPH_MAIL_PROCESSED_FOLDER_ID (optional, OneDrive folder ID for processed/archive folder - files are moved here after successful import)
 */

import { getGraphToken } from '../lib/msGraph';

export type OneDriveFile = {
  id: string;
  name: string;
  createdDateTime: string;
  downloadUrl?: string;
  size?: number;
};

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get Microsoft Graph access token using client credentials flow
 */
async function getGraphAccessToken(): Promise<string> {
  // Use existing token if still valid (with 5 minute buffer)
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const token = await getGraphToken();

  // Cache token for 55 minutes (tokens typically expire in 1 hour)
  cachedToken = {
    token,
    expiresAt: now + 55 * 60 * 1000,
  };

  return token;
}

/**
 * List all PDF files in the OneDrive inbox folder
 */
export async function listInboxFiles(): Promise<OneDriveFile[]> {
  const token = await getGraphAccessToken();
  const inboxFolderId = process.env.ONEDRIVE_MAIL_INBOX_FOLDER_ID;
  const driveId = process.env.ONEDRIVE_DRIVE_ID;
  const userUpn = process.env.ONEDRIVE_USER_UPN || process.env.MS_SHAREPOINT_USER_UPN || process.env.GRAPH_USER_UPN;

  if (!inboxFolderId) {
    throw new Error('ONEDRIVE_MAIL_INBOX_FOLDER_ID environment variable is required');
  }

  // Build the Graph API URL
  // For app-only auth, we need either:
  // 1. A specific drive ID: /drives/{driveId}
  // 2. A user UPN: /users/{upn}/drive
  // We cannot use /me/drive with app-only auth
  let baseUrl: string;
  if (driveId && driveId !== 'me') {
    baseUrl = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}`;
  } else if (userUpn) {
    baseUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userUpn)}/drive`;
  } else {
    throw new Error('Either ONEDRIVE_DRIVE_ID (not "me") or ONEDRIVE_USER_UPN must be set for app-only authentication');
  }

  const url = `${baseUrl}/items/${encodeURIComponent(inboxFolderId)}/children?$select=id,name,createdDateTime,size,@microsoft.graph.downloadUrl,webUrl,file`;

  console.log(`[onedriveClient] Attempting to list files from folder ID: ${inboxFolderId}`);
  console.log(`[onedriveClient] Using base URL: ${baseUrl}`);
  console.log(`[onedriveClient] Fetching inbox children via URL: ${url}`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`[onedriveClient] Failed to list OneDrive files: ${response.status}`);
    console.error(`[onedriveClient] URL attempted: ${url}`);
    console.error(`[onedriveClient] Error details: ${errorText}`);

    if (response.status === 404) {
      throw new Error(`OneDrive folder not found (404). Check ONEDRIVE_MAIL_INBOX_FOLDER_ID="${inboxFolderId}". The folder ID may be incorrect or the folder doesn't exist. Use Microsoft Graph Explorer to find the correct folder ID.`);
    }

    throw new Error(`Failed to list OneDrive files: ${response.status} ${errorText}`);
  }

  const data = await response.json() as { value?: Array<any> };

  if (!Array.isArray(data.value)) {
    console.error('[onedriveClient] Unexpected Graph response format:', data);
    return [];
  }

  const files: OneDriveFile[] = [];
  const pdfCandidates = data.value.filter((item: any) => {
    if (!item) return false;

    const name = (item.name || '').toLowerCase();
    const extMatch = name.endsWith('.pdf');
    const mimeMatch =
      item.file &&
      typeof item.file.mimeType === 'string' &&
      item.file.mimeType.toLowerCase() === 'application/pdf';

    return extMatch || mimeMatch;
  });

  console.log(`[onedriveClient] Received ${data.value.length} items, ${pdfCandidates.length} PDF(s) after filtering`);

  for (const item of pdfCandidates) {
    if (!item.file) continue;

    files.push({
      id: item.id,
      name: item.name,
      createdDateTime: item.createdDateTime,
      downloadUrl: item.webUrl || item['@microsoft.graph.downloadUrl'], // Prefer webUrl (stable SharePoint URL) over downloadUrl (temporary)
      size: item.size,
    });
  }

  return files;
}

/**
 * Move a file from the inbox folder to the processed/archive folder
 * Returns the moved file's metadata including the new download URL
 */
export async function moveFileToProcessed(fileId: string): Promise<OneDriveFile> {
  const token = await getGraphAccessToken();
  // Support both naming conventions
  const processedFolderId = process.env.ONEDRIVE_MAIL_PROCESSED_FOLDER_ID || process.env.GRAPH_MAIL_PROCESSED_FOLDER_ID;
  const driveId = process.env.ONEDRIVE_DRIVE_ID;
  const userUpn = process.env.ONEDRIVE_USER_UPN || process.env.MS_SHAREPOINT_USER_UPN || process.env.GRAPH_USER_UPN;

  if (!processedFolderId) {
    throw new Error('ONEDRIVE_MAIL_PROCESSED_FOLDER_ID or GRAPH_MAIL_PROCESSED_FOLDER_ID environment variable is required');
  }

  // Build the Graph API URL (same logic as listInboxFiles)
  let baseUrl: string;
  if (driveId && driveId !== 'me') {
    baseUrl = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}`;
  } else if (userUpn) {
    baseUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userUpn)}/drive`;
  } else {
    throw new Error('Either ONEDRIVE_DRIVE_ID (not "me") or ONEDRIVE_USER_UPN must be set for app-only authentication');
  }

  // Move file using PATCH with parentReference
  // Request webUrl (stable SharePoint URL) and downloadUrl in the response
  const url = `${baseUrl}/items/${encodeURIComponent(fileId)}?$select=id,name,createdDateTime,size,webUrl,@microsoft.graph.downloadUrl,file`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parentReference: {
        id: processedFolderId,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to move file to processed folder: ${response.status} ${errorText}`);
  }

  // Parse the moved file's metadata from PATCH response
  const movedItem = await response.json() as { id: string; name?: string; createdDateTime?: string; size?: number; webUrl?: string; '@microsoft.graph.downloadUrl'?: string };

  // Fetch the item again to ensure we get the updated webUrl (SharePoint URLs may not update immediately in PATCH response)
  const getUrl = `${baseUrl}/items/${encodeURIComponent(movedItem.id)}?$select=id,name,createdDateTime,size,webUrl,@microsoft.graph.downloadUrl,file`;
  const getResponse = await fetch(getUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  let finalItem = movedItem;
  if (getResponse.ok) {
    finalItem = await getResponse.json() as typeof movedItem;
    console.log(`[onedriveClient] Fetched moved file to verify URL`, {
      fileId: finalItem.id,
      hasWebUrl: !!finalItem.webUrl,
      webUrlContainsProcessed: finalItem.webUrl ? finalItem.webUrl.toLowerCase().includes('processed_mail') : false,
    });
  } else {
    console.warn(`[onedriveClient] Failed to fetch moved file for URL verification, using PATCH response`, {
      status: getResponse.status,
    });
  }

  return {
    id: finalItem.id,
    name: finalItem.name || '',
    createdDateTime: finalItem.createdDateTime || '',
    downloadUrl: finalItem.webUrl || finalItem['@microsoft.graph.downloadUrl'] || '', // Prefer webUrl (stable SharePoint URL) over downloadUrl (temporary)
    size: finalItem.size || 0,
  };
}

