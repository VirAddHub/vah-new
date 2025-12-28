"use client";

import { useCallback, useRef, useState } from "react";

type SumsubTokenResponse = {
  token: string;
};

async function fetchSumsubToken(): Promise<string> {
  const res = await fetch("/api/bff/kyc/sumsub-token", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const text = await res.text();

  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    console.error("Sumsub token fetch failed", res.status, data);

    // Handle specific error cases
    if (res.status === 401 || res.status === 403) {
      const errorMsg = data?.error || data?.details?.message || "Authentication required";
      if (errorMsg.includes("already") || errorMsg.includes("complete") || errorMsg.includes("approved")) {
        throw new Error("KYC already complete");
      }
      throw new Error("Please log in to start verification");
    }

    // Return detailed error message from backend
    const errorMsg = data?.error || data?.details?.message || `Failed to fetch Sumsub access token (status ${res.status})`;
    throw new Error(errorMsg);
  }

  if (!data.token) {
    throw new Error(data?.error || "No token field in Sumsub token response");
  }

  return data.token as string;
}

export function SumsubKycWidget() {
  const sdkRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [alreadyComplete, setAlreadyComplete] = useState(false);

  const startVerification = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // Dynamically import the SDK on the client only
      const [{ default: snsWebSdk }, accessToken] = await Promise.all([
        import("@sumsub/websdk"),
        fetchSumsubToken(),
      ]);

      // Token refresh callback
      const tokenRefreshCallback = async () => {
        const newToken = await fetchSumsubToken();
        return Promise.resolve(newToken);
      };

      const instance = snsWebSdk
        .init(accessToken, tokenRefreshCallback)
        .withConf({
          lang: "en",
        })
        .on("idCheck.onError", (error: unknown) => {
          console.error("Sumsub onError", error);
          setError("Something went wrong with identity verification. Please try again.");
        })
        .on("idCheck.onReady", () => {
          console.log("Sumsub ready");
        })
        .onMessage((type: string, payload: unknown) => {
          console.log("Sumsub onMessage", type, payload);
          // You can react to messages here, e.g. when verification is completed
          // type === "onApplicantApproved" etc.
        })
        .build();

      sdkRef.current = instance;

      // Launch into our container
      instance.launch("#sumsub-websdk-container");

      setStarted(true);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Unable to start identity verification. Please try again.";

      // Check if KYC is already complete
      if (errorMessage.includes("already complete") || errorMessage.includes("already approved")) {
        setAlreadyComplete(true);
        setError(null); // Don't show error for already complete
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRestart = useCallback(() => {
    if (sdkRef.current && typeof sdkRef.current.destroy === "function") {
      sdkRef.current.destroy();
      sdkRef.current = null;
    }
    setStarted(false);
    setError(null);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Identity verification</h2>
        <p className="text-sm text-muted-foreground">
          Complete your Sumsub identity check to fully activate your VirtualAddressHub account.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {!started && (
          <button
            type="button"
            onClick={startVerification}
            disabled={loading}
            className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            {loading ? "Starting..." : "Start verification"}
          </button>
        )}

        {started && (
          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Restart widget
          </button>
        )}
      </div>

      {alreadyComplete && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
            ✓ Identity verification already complete
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Container for Sumsub WebSDK */}
      {!alreadyComplete && (
        <div
          id="sumsub-websdk-container"
          className="mt-2 min-h-[420px] rounded-lg border border-dashed border-border bg-card"
        />
      )}
    </div>
  );
}

