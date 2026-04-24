"use strict";
// packages/shared/src/mailStatus.ts
// Single source of truth for mail forwarding statuses and transitions
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCanonical = exports.ALLOWED = exports.MAIL_STATUS = void 0;
exports.isTransitionAllowed = isTransitionAllowed;
exports.getNextStatuses = getNextStatuses;
exports.MAIL_STATUS = {
    Requested: "Requested",
    Processing: "Processing",
    Dispatched: "Dispatched",
    Delivered: "Delivered",
};
exports.ALLOWED = {
    [exports.MAIL_STATUS.Requested]: [exports.MAIL_STATUS.Processing],
    [exports.MAIL_STATUS.Processing]: [exports.MAIL_STATUS.Dispatched],
    [exports.MAIL_STATUS.Dispatched]: [exports.MAIL_STATUS.Delivered],
    [exports.MAIL_STATUS.Delivered]: [],
};
// Helper to normalize any status string to canonical form
const toCanonical = (s) => {
    const x = (s || "").toLowerCase().trim();
    switch (x) {
        case "requested":
            return exports.MAIL_STATUS.Requested;
        case "processing":
            return exports.MAIL_STATUS.Processing;
        case "dispatched":
            return exports.MAIL_STATUS.Dispatched;
        case "delivered":
            return exports.MAIL_STATUS.Delivered;
        default:
            throw new Error(`invalid_status: ${s}`);
    }
};
exports.toCanonical = toCanonical;
// Helper to check if a transition is allowed
function isTransitionAllowed(from, to) {
    return exports.ALLOWED[from].includes(to);
}
// Helper to get all possible next statuses for a given status
function getNextStatuses(current) {
    return exports.ALLOWED[current];
}
