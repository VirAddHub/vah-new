// apps/backend/src/modules/forwarding/state.ts
export const LegalTransitions = {
    Pending: ['Requested'],
    Requested: ['Processing', 'Cancelled'],
    Processing: ['Dispatched', 'Cancelled'],
    Dispatched: ['Delivered'],
    Delivered: [],
    Cancelled: [],
} as const;

export type ForwardingState = keyof typeof LegalTransitions;

export function canTransition(from: ForwardingState, to: ForwardingState): boolean {
    // @ts-expect-error
    return (LegalTransitions[from] || []).includes(to);
}
