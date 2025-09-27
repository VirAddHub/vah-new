export type UnknownRecord = Record<string, unknown>;
export type AnyFn<R = unknown> = (...args: unknown[]) => R;

export type ApiResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; status?: number };

export type Paginated<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

// Common API response shapes
export type User = {
    id: string;
    email: string;
    name?: string;
    role?: string;
    created_at?: string;
    updated_at?: string;
};

export type Invoice = {
    id: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    due_date?: string;
};

export type MailItem = {
    id: string;
    recipient: string;
    sender: string;
    subject: string;
    received_at: string;
    status: string;
};

export type ForwardingRequest = {
    id: string;
    user_id: string;
    from_address: string;
    to_address: string;
    status: string;
    created_at: string;
};

export type SystemSettings = {
    general: {
        siteName: string;
        siteUrl: string;
        adminEmail: string;
        timezone: string;
        maintenanceMode: boolean;
    };
    notifications: {
        emailNotifications: boolean;
        smsNotifications: boolean;
        pushNotifications: boolean;
        adminAlerts: boolean;
        userAlerts: boolean;
    };
    integrations: {
        mailProvider: string;
        paymentProvider: string;
        kycProvider: string;
        analyticsProvider: string;
        emailProvider: string;
    };
    security: {
        twoFactorAuth: boolean;
        sessionTimeout: number;
        passwordPolicy: string;
        ipWhitelist: string[];
        auditLogging: boolean;
    };
};
