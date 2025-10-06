function pick(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

export const AZURE_CONFIG = {
  // Accept both naming schemes
  TENANT_ID: pick('MS_TENANT_ID', 'GRAPH_TENANT_ID', 'AZURE_TENANT_ID'),
  CLIENT_ID: pick('MS_CLIENT_ID', 'GRAPH_CLIENT_ID', 'AZURE_CLIENT_ID'),
  CLIENT_SECRET: pick('MS_CLIENT_SECRET', 'GRAPH_CLIENT_SECRET', 'AZURE_CLIENT_SECRET'),
  // UPN for the OneDrive/SharePoint drive to read from
  SHAREPOINT_USER_UPN: pick('MS_SHAREPOINT_USER_UPN', 'GRAPH_USER_UPN', 'GRAPH_SITE_UPN') || 'ops@virtualaddresshub.co.uk',

  // Optional site-based config (if you ever use site/drive instead of user UPN)
  SITE_ROOT: pick('GRAPH_SITE_ROOT'),
  SITE_PATH: pick('GRAPH_SITE_PATH'),
};

export function graphCredsPresent(): boolean {
  return !!(AZURE_CONFIG.TENANT_ID && AZURE_CONFIG.CLIENT_ID && AZURE_CONFIG.CLIENT_SECRET);
}

export function logGraphConfigAtStartup() {
  console.info('[GRAPH CONFIG] tenant:', !!AZURE_CONFIG.TENANT_ID,
               'clientId:', !!AZURE_CONFIG.CLIENT_ID,
               'secret:', !!AZURE_CONFIG.CLIENT_SECRET,
               'upn:', AZURE_CONFIG.SHAREPOINT_USER_UPN);
}
