"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FWD_LABEL = exports.FWD_STATUS = void 0;
exports.parseForwardingStatus = parseForwardingStatus;
exports.FWD_STATUS = {
    requested: 'requested',
    in_progress: 'in_progress',
    dispatched: 'dispatched',
    cancelled: 'cancelled',
};
exports.FWD_LABEL = {
    requested: 'Requested',
    in_progress: 'In Progress',
    dispatched: 'Dispatched',
    cancelled: 'Cancelled',
};
const NORMALISE = (s) => s.toLowerCase().trim().replace(/[\s-]+/g, '_'); // "In Progress", "in-progress" → in_progress
const ALIASES = {
    requested: 'requested',
    request: 'requested',
    inprogress: 'in_progress',
    in_progress: 'in_progress',
    'in progress': 'in_progress',
    dispatched: 'dispatched',
    shipped: 'dispatched',
    cancelled: 'cancelled',
    canceled: 'cancelled',
};
function parseForwardingStatus(input) {
    if (typeof input !== 'string')
        throw new Error('invalid_status: missing');
    const key = NORMALISE(input);
    const hit = ALIASES[key] ?? exports.FWD_STATUS[key];
    if (!hit)
        throw new Error(`invalid_status: ${input}`);
    return hit;
}
