"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { devError, devLog, devWarn } from "@/lib/devConsole";
import { cn } from "@/lib/utils";

type SumsubTokenResponse = {
  token: string;
};

const isDev =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

/** Error *codes* only — not user-facing; real text lives in `message` / `description`. */
const GENERIC_BFF_ERROR_CODES = new Set([
  "BACKEND_ERROR",
  "server_error",
  "sumsub_error",
  "NO_TOKEN",
  "SERVER_MISCONFIGURED",
]);

function trimString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s || undefined;
}

/** Collapse Sumsub `SnsError` (or odd payloads) into one lowercase string for matching. */
function sumsubSdkErrorFingerprint(sdkError: unknown): string {
  if (sdkError == null || sdkError === "") return "";
  if (typeof sdkError === "string") return sdkError.toLowerCase();
  if (typeof sdkError === "object" && !Array.isArray(sdkError)) {
    const o = sdkError as Record<string, unknown>;
    const bits: string[] = [];
    for (const k of ["code", "error", "reason", "message", "name", "type"] as const) {
      const v = o[k];
      if (typeof v === "string" && v.trim()) bits.push(v);
    }
    try {
      const s = JSON.stringify(o);
      if (s !== "{}") bits.push(s);
    } catch {
      /* ignore */
    }
    return bits.join(" ").toLowerCase();
  }
  return String(sdkError).toLowerCase();
}

function isEmptyPlainObject(v: unknown): boolean {
  return typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).length === 0;
}

function userMessageForSumsubSdkError(sdkError: unknown): string {
  const fp = sumsubSdkErrorFingerprint(sdkError);
  if (
    /camera|notallowed|permission|denied|getusermedia|mediadevices|device_not_found|notreadable|in use|blocked/i.test(
      fp
    )
  ) {
    return "We couldn't access your camera. Check site permissions in your browser or system settings, then tap “I have provided access” in the Sumsub window, or use “Continue on phone” if you see it.";
  }
  return "Something went wrong with identity verification. Please try again.";
}

/**
 * Prefer human text from BFF JSON; avoid using bare codes like `sumsub_error` when `message` is missing.
 */
function pickUserFacingBffDetail(data: Record<string, unknown> | undefined): string | undefined {
  if (!data || typeof data !== "object") return undefined;

  const tryString = trimString;

  const candidates: string[] = [];
  const push = (v: unknown) => {
    const s = tryString(v);
    if (s) candidates.push(s);
  };

  push(data.message);
  push(data.detail);
  const inner = data.data;
  if (inner && typeof inner === "object") {
    const d = inner as Record<string, unknown>;
    push(d.message);
    push(d.description);
    push(d.detail);
  }
  const details = data.details;
  if (details && typeof details === "object") {
    push((details as Record<string, unknown>).message);
  }

  for (const s of candidates) {
    if (!GENERIC_BFF_ERROR_CODES.has(s)) return s;
  }
  return undefined;
}

async function fetchSumsubToken(): Promise<string> {
  const res = await fetch("/api/bff/kyc/sumsub-token", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {},
  });

  const text = await res.text();

  let data: any;
  let jsonOk = true;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    jsonOk = false;
    data = { raw: text };
  }

  if (!res.ok) {
    if (res.status === 501 || data?.code === "SUMSUB_NOT_CONFIGURED" || data?.data?.code === "SUMSUB_NOT_CONFIGURED") {
      throw new Error("SUMSUB_NOT_CONFIGURED");
    }

    if (res.status === 502 || res.status === 503 || res.status === 504) {
      devWarn("[SumsubKycWidget] Sumsub token route upstream error", res.status, data);
      throw new Error(
        "The verification service is temporarily unavailable. Please try again in a few minutes."
      );
    }

    if (res.status === 403) {
      const code = typeof data?.error === "string" ? data.error : "";
      const detail = pickUserFacingBffDetail(data) || trimString(data?.message);
      if (
        code === "csrf_token_missing" ||
        code === "csrf_token_invalid" ||
        /csrf/i.test(code) ||
        /csrf/i.test(detail || "")
      ) {
        throw new Error(
          "Your session security token expired or is missing. Refresh this page and try again."
        );
      }
      if (code === "forbidden" || code === "Forbidden") {
        throw new Error(detail || "You do not have permission to start verification.");
      }
      throw new Error(detail || "Request was blocked. Refresh the page and try again.");
    }

    if (res.status === 401) {
      const errorMsg =
        pickUserFacingBffDetail(data) ||
        trimString(data?.message) ||
        trimString(data?.error) ||
        trimString(data?.data?.error) ||
        trimString(data?.details?.message) ||
        "Authentication required";
      if (
        errorMsg.includes("already") ||
        errorMsg.includes("complete") ||
        errorMsg.includes("approved")
      ) {
        throw new Error("KYC already complete");
      }
      throw new Error(
        errorMsg.includes("log in") || errorMsg.includes("Please log")
          ? errorMsg
          : "Please log in to start verification."
      );
    }

    if (res.status >= 500) {
      devWarn("[SumsubKycWidget] Sumsub token fetch failed", {
        status: res.status,
        jsonOk,
        body: data,
        textPreview: text.slice(0, 600),
      });

      const fromPayload = pickUserFacingBffDetail(data);
      if (fromPayload) {
        throw new Error(fromPayload);
      }

      if (!jsonOk && typeof data?.raw === "string" && data.raw.length > 0) {
        throw new Error(
          isDev
            ? `Verification request failed (${res.status}): response was not JSON. Check the Network tab for /api/bff/kyc/sumsub-token.`
            : "We could not reach the verification service. Please try again in a few minutes."
        );
      }

      throw new Error(
        "We couldn't start verification. This is often due to Sumsub setup (API credentials or SUMSUB_LEVEL) or a temporary outage. Please try again or contact support."
      );
    }

    devWarn("[SumsubKycWidget] Sumsub token fetch failed", res.status, data);
    const errorMsg =
      (typeof data?.message === "string" && data.message) ||
      data?.error ||
      data?.data?.error ||
      data?.data?.message ||
      data?.details?.message ||
      `Failed to fetch Sumsub access token (status ${res.status})`;
    throw new Error(
      errorMsg === "BACKEND_ERROR" || errorMsg === "server_error"
        ? "We couldn't reach the verification service. Please try again."
        : errorMsg
    );
  }

  if (!data.token) {
    throw new Error(data?.error || "No token field in Sumsub token response");
  }

  return data.token as string;
}

async function postSyncKycFromSumsub(): Promise<{ ok: boolean; kyc_status?: string; message?: string }> {
  const res = await fetch("/api/bff/kyc/sync-from-sumsub", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: "{}",
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: { kyc_status?: string };
    message?: string;
  };
  return {
    ok: res.ok && data.ok !== false,
    kyc_status: data.data?.kyc_status,
    message: typeof data.message === "string" ? data.message : undefined,
  };
}

export type SumsubKycWidgetProps = {
  /** When true, skip the extra title/blurb (parent card already explains). */
  hideIntro?: boolean;
};

export function SumsubKycWidget({ hideIntro = false }: SumsubKycWidgetProps) {
  const sdkRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [alreadyComplete, setAlreadyComplete] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  /** Token fetched; triggers mount effect once container is in the DOM */
  const [launchToken, setLaunchToken] = useState<string | null>(null);
  const [showSdkContainer, setShowSdkContainer] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState(false);

  const destroySdk = useCallback(() => {
    if (sdkRef.current && typeof sdkRef.current.destroy === "function") {
      try {
        sdkRef.current.destroy();
      } catch {
        /* ignore */
      }
      sdkRef.current = null;
    }
  }, []);

  const handleRestart = useCallback(() => {
    destroySdk();
    setStarted(false);
    setLaunchToken(null);
    setShowSdkContainer(false);
    setError(null);
    setNotConfigured(false);
  }, [destroySdk]);

  const startVerification = useCallback(async () => {
    setError(null);
    setNotConfigured(false);
    setLoading(true);
    try {
      const accessToken = await fetchSumsubToken();
      setShowSdkContainer(true);
      setLaunchToken(accessToken);
    } catch (err) {
      devWarn("[SumsubKycWidget] startVerification", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unable to start identity verification. Please try again.";

      if (errorMessage === "SUMSUB_NOT_CONFIGURED") {
        setNotConfigured(true);
        setError(null);
      } else if (errorMessage.includes("already complete") || errorMessage.includes("already approved")) {
        setAlreadyComplete(true);
        setError(null);
      } else {
        setError(errorMessage);
      }
      setShowSdkContainer(false);
      setLaunchToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefreshVerificationStatus = useCallback(async () => {
    setSyncingStatus(true);
    setError(null);
    try {
      const r = await postSyncKycFromSumsub();
      if (!r.ok) {
        setError(
          r.message ||
            "Could not refresh your verification status from Sumsub. Try again in a minute, or contact support if this persists."
        );
        return;
      }
      window.location.reload();
    } finally {
      setSyncingStatus(false);
    }
  }, []);

  useEffect(() => {
    if (!launchToken || !showSdkContainer) return;

    let cancelled = false;

    const syncThenReload = async () => {
      await new Promise((r) => setTimeout(r, 1200));
      if (cancelled) return;
      try {
        const sync = await postSyncKycFromSumsub();
        if (!sync.ok) {
          devWarn("[SumsubKycWidget] post-completion sync failed", sync);
        }
      } catch (e) {
        devWarn("[SumsubKycWidget] post-completion sync error", e);
      }
      if (!cancelled) {
        window.location.reload();
      }
    };

    const mountSdk = async () => {
      try {
        const { default: snsWebSdk } = await import("@sumsub/websdk");
        if (cancelled) return;

        const tokenRefreshCallback = async () => fetchSumsubToken();

        const instance = snsWebSdk
          .init(launchToken, tokenRefreshCallback)
          .withConf({ lang: "en", theme: "light" })
          .on("idCheck.onError", (sdkError: unknown) => {
            devWarn("[SumsubKycWidget] idCheck.onError", sdkError);
            // Sumsub often fires this with `{}` while still showing its own UI (e.g. camera denied).
            if (isEmptyPlainObject(sdkError)) {
              return;
            }
            setError(userMessageForSumsubSdkError(sdkError));
          })
          .on("idCheck.onReady", () => {
            devLog("[SumsubKycWidget] Sumsub ready");
          })
          .onMessage((type: string, payload: any) => {
            devLog("[SumsubKycWidget] onMessage", type);

            if (type === "idCheck.applicantStatus") {
              const reviewStatus = payload?.reviewStatus;
              const reviewAnswer = payload?.reviewResult?.reviewAnswer;
              const green = String(reviewAnswer || "").toUpperCase() === "GREEN";
              const done =
                green ||
                reviewStatus === "completed" ||
                reviewStatus === "approved";

              if (done) {
                devLog("[SumsubKycWidget] Verification completed/approved");
                void syncThenReload();
              }
            }

            if (type === "onApplicantApproved" || type === "onApplicantSubmitted") {
              devLog("[SumsubKycWidget] Applicant approved/submitted");
              void syncThenReload();
            }
          })
          .build();

        sdkRef.current = instance;

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        if (cancelled) return;

        const el = document.getElementById("sumsub-websdk-container");
        if (!el) {
          setError("Could not load the verification window. Please try again.");
          return;
        }

        instance.launch("#sumsub-websdk-container");
        setStarted(true);
      } catch (e) {
        devError("[SumsubKycWidget] mountSdk failed", e);
        setError(
          e instanceof Error ? e.message : "Unable to start identity verification. Please try again."
        );
        setShowSdkContainer(false);
        setLaunchToken(null);
      }
    };

    mountSdk();

    return () => {
      cancelled = true;
      destroySdk();
    };
  }, [launchToken, showSdkContainer, destroySdk]);

  const showStartButton = !started && !notConfigured && !alreadyComplete;

  return (
    <div className="space-y-4">
      {!hideIntro && (
        <div>
          <h2 className="text-h4 font-semibold text-foreground">Identity verification</h2>
          <p className="text-body-sm text-muted-foreground mt-1">
            Complete your identity check to fully activate your VirtualAddressHub account.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {showStartButton && (
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full sm:w-auto touch-manipulation"
            onClick={startVerification}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Starting…
              </>
            ) : (
              "Start identity verification"
            )}
          </Button>
        )}

        {started && (
          <Button type="button" variant="outline" size="sm" onClick={handleRestart} className="w-full sm:w-auto">
            Start over
          </Button>
        )}

        {hideIntro && (started || showSdkContainer) && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto touch-manipulation"
            onClick={handleRefreshVerificationStatus}
            disabled={syncingStatus}
          >
            {syncingStatus ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Updating status…
              </>
            ) : (
              "Refresh verification status"
            )}
          </Button>
        )}
      </div>

      {notConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-body-sm font-medium text-amber-800 dark:text-amber-200">
            Identity verification is currently unavailable
          </p>
          <p className="mt-1 text-caption text-amber-700 dark:text-amber-300">
            KYC will be available once the verification service is configured. Contact support if you need help.
          </p>
        </div>
      )}

      {alreadyComplete && (
        <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
          <p className="text-body-sm font-medium text-primary">Identity verification already complete</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
          <p className="text-body-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      {/* Sumsub mounts here only after the user taps Start — same page on mobile and desktop */}
      {showSdkContainer && !alreadyComplete && !notConfigured && (
        <div className="mt-2 space-y-2">
          {!started && (
            <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Opening secure verification…
            </p>
          )}
          <div
            id="sumsub-websdk-container"
            className={cn(
              "w-full overflow-hidden",
              started ? "min-h-[min(72dvh,560px)]" : "min-h-[200px]"
            )}
          />
        </div>
      )}
    </div>
  );
}
