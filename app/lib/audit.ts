// app/lib/audit.ts
// Frontend audit utilities - synced from backend

export interface AuditEvent {
    eventType: string;
    userId?: number;
    metadata?: Record<string, any>;
}

/**
 * Log client-side events for audit purposes
 */
export async function logClientEvent(eventType: string, metadata: Record<string, any> = {}): Promise<void> {
    try {
        const event: AuditEvent = {
            eventType,
            metadata: {
                ...metadata,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                url: window.location.href,
            }
        };

        await fetch('/api/audit/client-event', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(event),
        });
    } catch (error) {
        console.error('[audit] Failed to log client event:', error);
    }
}

/**
 * Log authentication events
 */
export async function logAuthEvent(eventType: string, metadata: Record<string, any> = {}): Promise<void> {
    await logClientEvent(`auth.${eventType}`, metadata);
}

/**
 * Log user actions
 */
export async function logUserAction(action: string, metadata: Record<string, any> = {}): Promise<void> {
    await logClientEvent(`user.${action}`, metadata);
}

/**
 * Log admin actions
 */
export async function logAdminAction(action: string, metadata: Record<string, any> = {}): Promise<void> {
    await logClientEvent(`admin.${action}`, metadata);
}

/**
 * Log billing events
 */
export async function logBillingEvent(eventType: string, metadata: Record<string, any> = {}): Promise<void> {
    await logClientEvent(`billing.${eventType}`, metadata);
}

/**
 * Log mail events
 */
export async function logMailEvent(eventType: string, metadata: Record<string, any> = {}): Promise<void> {
    await logClientEvent(`mail.${eventType}`, metadata);
}

// Common event types
export const AuthEvents = {
    LOGIN: 'login',
    LOGOUT: 'logout',
    LOGIN_FAILED: 'login_failed',
    PASSWORD_RESET_REQUEST: 'password_reset_request',
    PASSWORD_RESET_CONFIRM: 'password_reset_confirm',
} as const;

export const UserEvents = {
    PROFILE_UPDATE: 'profile_update',
    ADDRESS_UPDATE: 'address_update',
    SETTINGS_CHANGE: 'settings_change',
} as const;

export const AdminEvents = {
    USER_MANAGEMENT: 'user_management',
    PLAN_MANAGEMENT: 'plan_management',
    SYSTEM_CONFIG: 'system_config',
} as const;

export const BillingEvents = {
    INVOICE_DOWNLOAD: 'invoice_download',
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_FAILED: 'payment_failed',
    SUBSCRIPTION_CHANGE: 'subscription_change',
} as const;

export const MailEvents = {
    MAIL_FORWARD: 'mail_forward',
    MAIL_DOWNLOAD: 'mail_download',
    MAIL_DELETE: 'mail_delete',
    MAIL_SEARCH: 'mail_search',
} as const;
