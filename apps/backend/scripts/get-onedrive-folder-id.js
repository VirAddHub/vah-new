#!/usr/bin/env node
/**
 * Helper script to get OneDrive folder ID
 * 
 * Usage:
 *   node scripts/get-onedrive-folder-id.js <folder-path>
 * 
 * Example:
 *   node scripts/get-onedrive-folder-id.js "Documents/Scanned_Mail"
 *   node scripts/get-onedrive-folder-id.js "Scanned_Mail"
 */

const path = process.argv[2];

if (!path) {
  console.error('Usage: node scripts/get-onedrive-folder-id.js <folder-path>');
  console.error('Example: node scripts/get-onedrive-folder-id.js "Documents/Scanned_Mail"');
  process.exit(1);
}

async function getFolderId() {
  const { getGraphToken } = require('../dist/src/lib/msGraph');
  const userUpn = process.env.ONEDRIVE_USER_UPN || process.env.MS_SHAREPOINT_USER_UPN || process.env.GRAPH_USER_UPN || 'ops@virtualaddresshub.co.uk';
  
  if (!userUpn) {
    console.error('Error: ONEDRIVE_USER_UPN environment variable is required');
    process.exit(1);
  }

  try {
    const token = await getGraphToken();
    
    // Encode the path
    const encodedPath = path.split('/').map(seg => encodeURIComponent(seg)).join('/');
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userUpn)}/drive/root:/${encodedPath}:`;
    
    console.log(`Looking up folder: ${path}`);
    console.log(`Graph API URL: ${url}`);
    console.log('');
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error: ${response.status} ${response.statusText}`);
      console.error(errorText);
      process.exit(1);
    }

    const data = await response.json();
    
    console.log('✅ Folder found!');
    console.log('');
    console.log('Folder ID:', data.id);
    console.log('Folder Name:', data.name);
    console.log('Web URL:', data.webUrl);
    console.log('');
    console.log('Add this to your Render environment variables:');
    console.log(`ONEDRIVE_MAIL_INBOX_FOLDER_ID=${data.id}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

getFolderId();

