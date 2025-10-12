import { MAIL_STATUS, toCanonical } from './mailStatus';

export type UIStage = "Requested" | "In Progress" | "Done";

export function uiStageFor(status: string): UIStage {
  const s = toCanonical(status);
  if (s === MAIL_STATUS.Requested) return "Requested";
  if (s === MAIL_STATUS.Processing) return "In Progress";
  // Dispatched and Delivered are "Done"
  return "Done";
}

export function isRequested(status: string) {
  return toCanonical(status) === MAIL_STATUS.Requested;
}

export function isInProgress(status: string) {
  return toCanonical(status) === MAIL_STATUS.Processing;
}

export function isDone(status: string) {
  const s = toCanonical(status);
  return s === MAIL_STATUS.Dispatched || s === MAIL_STATUS.Delivered;
}
