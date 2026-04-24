export type ForwardingStatus = 'requested' | 'in_progress' | 'dispatched' | 'cancelled';
export declare const FWD_STATUS: Record<ForwardingStatus, ForwardingStatus>;
export declare const FWD_LABEL: Record<ForwardingStatus, string>;
export declare function parseForwardingStatus(input: unknown): ForwardingStatus;
