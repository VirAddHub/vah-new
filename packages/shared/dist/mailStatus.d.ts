export declare const MAIL_STATUS: {
    readonly Requested: "Requested";
    readonly Processing: "Processing";
    readonly Dispatched: "Dispatched";
    readonly Delivered: "Delivered";
};
export type MailStatus = typeof MAIL_STATUS[keyof typeof MAIL_STATUS];
export declare const ALLOWED: Record<MailStatus, MailStatus[]>;
export declare const toCanonical: (s: string) => MailStatus;
export declare function isTransitionAllowed(from: MailStatus, to: MailStatus): boolean;
export declare function getNextStatuses(current: MailStatus): MailStatus[];
