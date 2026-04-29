/** First match wins — same order as `pickFrom` (used by `onedriveMailIngest` → `getGraphToken`). */
const GRAPH_TENANT_KEYS = ['MS_TENANT_ID', 'GRAPH_TENANT_ID', 'AZURE_TENANT_ID'] as const;
const GRAPH_CLIENT_KEYS = ['MS_CLIENT_ID', 'GRAPH_CLIENT_ID', 'AZURE_CLIENT_ID'] as const;
const GRAPH_SECRET_KEYS = ['MS_CLIENT_SECRET', 'GRAPH_CLIENT_SECRET', 'AZURE_CLIENT_SECRET'] as const;
const SHAREPOINT_UPN_KEYS = ['MS_SHAREPOINT_USER_UPN', 'GRAPH_USER_UPN', 'GRAPH_SITE_UPN'] as const;

function pickFrom(keys: readonly string[]): string | undefined {
    for (const n of keys) {
        const v = process.env[n];
        if (v && v.trim()) return v.trim();
    }
    return undefined;
}

/** Name of the first env var in `keys` that is set (non-empty); for logs / debugging only. */
export function firstEnvKeyWithValue(keys: readonly string[]): string | null {
    for (const n of keys) {
        const v = process.env[n];
        if (v && v.trim()) return n;
    }
    return null;
}

/**
 * Which env *names* currently supply Graph client-credentials (first non-empty wins per category).
 * Does not expose secret values — safe to log on Render when debugging AADSTS7000215 etc.
 */
export function graphCredentialEnvKeys(): {
    tenant: string | null;
    clientId: string | null;
    clientSecret: string | null;
    sharepointUserUpn: string | null;
} {
    return {
        tenant: firstEnvKeyWithValue(GRAPH_TENANT_KEYS),
        clientId: firstEnvKeyWithValue(GRAPH_CLIENT_KEYS),
        clientSecret: firstEnvKeyWithValue(GRAPH_SECRET_KEYS),
        sharepointUserUpn: firstEnvKeyWithValue(SHAREPOINT_UPN_KEYS),
    };
}

export const AZURE_CONFIG = {
    // Accept both naming schemes (MS_* takes precedence over GRAPH_* if both are set)
    TENANT_ID: pickFrom(GRAPH_TENANT_KEYS),
    CLIENT_ID: pickFrom(GRAPH_CLIENT_KEYS),
    CLIENT_SECRET: pickFrom(GRAPH_SECRET_KEYS),
    // UPN for the OneDrive/SharePoint drive to read from
    SHAREPOINT_USER_UPN: pickFrom(SHAREPOINT_UPN_KEYS) || 'ops@virtualaddresshub.co.uk',

    // Optional site-based config (if you ever use site/drive instead of user UPN)
    SITE_ROOT: pickFrom(['GRAPH_SITE_ROOT']),
    SITE_PATH: pickFrom(['GRAPH_SITE_PATH']),
};

export function graphCredsPresent(): boolean {
    return !!(AZURE_CONFIG.TENANT_ID && AZURE_CONFIG.CLIENT_ID && AZURE_CONFIG.CLIENT_SECRET);
}

export function logGraphConfigAtStartup() {
    const keys = graphCredentialEnvKeys();
    console.info('[GRAPH CONFIG] tenant:', !!AZURE_CONFIG.TENANT_ID,
        'clientId:', !!AZURE_CONFIG.CLIENT_ID,
        'secret:', !!AZURE_CONFIG.CLIENT_SECRET,
        'upn:', AZURE_CONFIG.SHAREPOINT_USER_UPN,
        'envKeys:', keys);
}
