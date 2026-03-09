'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface OwnerSumsubWidgetProps {
  /** Sumsub SDK access token from POST verify/start */
  accessToken: string;
  /** Container element id for the widget */
  containerId?: string;
  /** Called when verification is completed or submitted (webhook will update status) */
  onComplete?: () => void;
  /** Optional language */
  lang?: string;
}

/**
 * Mounts Sumsub WebSDK in-page for business owner verification.
 * Reuses the same SDK pattern as primary user flow; no token refresh (owner flow uses single session).
 */
export function OwnerSumsubWidget({
  accessToken,
  containerId = 'owner-sumsub-websdk-container',
  onComplete,
  lang = 'en',
}: OwnerSumsubWidgetProps) {
  const sdkRef = useRef<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const mountedRef = useRef(false);

  const mountWidget = useCallback(async () => {
    setError(null);
    try {
      const mod = await import('@sumsub/websdk');
      const snsWebSdk = (mod as { default: { init: (t: string, r: () => Promise<string>) => unknown } }).default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instance = (snsWebSdk.init(accessToken, () => Promise.resolve(accessToken)) as any)
        .withConf({ lang })
        .on('idCheck.onError', (err: unknown) => {
          console.error('[OwnerSumsubWidget] onError', err);
          setError('Something went wrong with identity verification. Please try again.');
        })
        .on('idCheck.onReady', () => {
          console.log('[OwnerSumsubWidget] ready');
        })
        .onMessage((type: string, payload: Record<string, unknown>) => {
          if (type === 'idCheck.applicantStatus') {
            const reviewStatus = payload?.reviewStatus;
            const reviewResult = payload?.reviewResult;
            if (
              reviewStatus === 'completed' ||
              reviewStatus === 'approved' ||
              reviewResult === 'green'
            ) {
              setCompleted(true);
              onComplete?.();
              setTimeout(() => window.location.reload(), 2000);
            }
          }
          if (type === 'onApplicantApproved' || type === 'onApplicantSubmitted') {
            setCompleted(true);
            onComplete?.();
            setTimeout(() => window.location.reload(), 2000);
          }
        })
        .build();

      sdkRef.current = instance;
      instance.launch(`#${containerId}`);
    } catch (err) {
      console.error('[OwnerSumsubWidget] mount error', err);
      setError(
        err instanceof Error ? err.message : 'Unable to load verification. Please try again.'
      );
    }
  }, [accessToken, containerId, lang, onComplete]);

  useEffect(() => {
    if (!accessToken || mountedRef.current) return;
    mountedRef.current = true;
    void mountWidget();
  }, [accessToken, mountWidget]);

  return (
    <div className="space-y-3">
      <div
        id={containerId}
        className="min-h-[420px] rounded-lg border border-dashed border-border bg-card"
      />
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      {completed && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
            Verification submitted. This page will refresh shortly.
          </p>
        </div>
      )}
    </div>
  );
}
