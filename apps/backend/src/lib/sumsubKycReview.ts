/**
 * Map Sumsub review objects (webhook payload or GET /resources/applicants/{id}/one)
 * to our user.kyc_status values. Keep in sync with webhooks-sumsub + /api/kyc/sync-from-sumsub.
 */

export type KycTriState = 'pending' | 'approved' | 'rejected';

export interface SumsubReviewLike {
  reviewStatus?: string;
  reviewResult?: {
    reviewAnswer?: string;
    answer?: string;
    moderationComment?: string;
    rejectReason?: string;
  };
}

export function deriveKycStatusFromSumsubReview(review: SumsubReviewLike | null | undefined): {
  kycStatus: KycTriState;
  /** For audit / sumsub_review_status */
  statusLabel: string;
  rejectReason: string | null;
} {
  const reviewStatus = typeof review?.reviewStatus === 'string' ? review.reviewStatus.trim() : '';
  const rsLower = reviewStatus.toLowerCase();

  const rawAnswer =
    review?.reviewResult?.reviewAnswer ?? review?.reviewResult?.answer ?? '';
  const reviewAnswer = typeof rawAnswer === 'string' ? rawAnswer.trim().toUpperCase() : '';

  const rejectReason =
    (typeof review?.reviewResult?.moderationComment === 'string' && review.reviewResult.moderationComment) ||
    (typeof review?.reviewResult?.rejectReason === 'string' && review.reviewResult.rejectReason) ||
    null;

  if (reviewAnswer === 'RED' || rsLower === 'rejected') {
    return {
      kycStatus: 'rejected',
      statusLabel: reviewAnswer || reviewStatus || 'rejected',
      rejectReason,
    };
  }

  if (reviewAnswer === 'GREEN' || rsLower === 'completed') {
    return {
      kycStatus: 'approved',
      statusLabel: reviewAnswer || reviewStatus || 'completed',
      rejectReason: null,
    };
  }

  return {
    kycStatus: 'pending',
    statusLabel: reviewAnswer || reviewStatus || 'pending',
    rejectReason: null,
  };
}

export function parseSumsubExternalUserId(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}
