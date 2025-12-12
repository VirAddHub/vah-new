"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { InvoicesTable } from '@/components/dashboard/InvoicesTable';
import { usePlans } from '@/hooks/usePlans';
import { apiClient } from "@/lib/apiClient";

export default function BillingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [setupStatus, setSetupStatus] = useState<"idle" | "completing" | "done" | "error">("idle");
  const [setupMessage, setSetupMessage] = useState<string>("");

  // Get dynamic pricing from plans API
  const { getMonthlyPlan } = usePlans();
  const monthlyPlan = getMonthlyPlan();
  const monthlyPrice = monthlyPlan ? (monthlyPlan.price_pence / 100).toFixed(2) : '9.97';

  const billingRequestFlowId = useMemo(() => {
    return searchParams?.get("billing_request_flow_id");
  }, [searchParams]);

  // When GoCardless redirects back to APP_URL/billing, it includes ?billing_request_flow_id=...
  useEffect(() => {
    const run = async () => {
      if (!billingRequestFlowId) return;
      if (setupStatus !== "idle") return;

      setSetupStatus("completing");
      setSetupMessage("Finalising your Direct Debit mandate…");
      try {
        const resp = await apiClient.post(`/api/payments/redirect-flows/${encodeURIComponent(billingRequestFlowId)}/complete`, {});
        if (!resp.ok) {
          throw new Error(resp.error || "Failed to complete GoCardless setup");
        }
        setSetupStatus("done");
        setSetupMessage("Payment method connected successfully.");

        // Remove the query param from the URL (keeps the page clean on refresh)
        const next = new URL(window.location.href);
        next.searchParams.delete("billing_request_flow_id");
        router.replace(next.pathname + next.search);
      } catch (e: any) {
        setSetupStatus("error");
        setSetupMessage(e?.message || "Failed to complete payment setup.");
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingRequestFlowId]);

  return (
    <main className="px-6 py-8 lg:px-10 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Account & Billing
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          View your plan, business details and monthly invoices.
        </p>
      </div>

      {setupStatus !== "idle" && (
        <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
          setupStatus === "done"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : setupStatus === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-gray-200 bg-white text-gray-700"
        }`}>
          {setupMessage}
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Payments card */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Digital Mailbox Plan</h2>
            <p className="text-sm mt-2">
              <span className="font-semibold" style={{ color: "#00FF00" }}>
                £{monthlyPrice}
              </span>{" "}
              billed monthly
            </p>
            <p className="text-sm text-gray-600 mt-3">
              Your plan renews automatically each month via GoCardless.
            </p>
          </div>
          <button className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 transition">
            Manage plan
          </button>
        </div>

        {/* Business info card */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
            <div className="mt-4 space-y-2 text-sm text-gray-700">
              <div>
                <span className="font-medium">Main contact:</span> Liban Adan
              </div>
              <div>
                <span className="font-medium">Email:</span> hello@example.com
              </div>
              <div>
                <span className="font-medium">Forwarding address:</span>
                <div className="mt-1 text-gray-600">
                  123 Business Street<br />
                  London, SW1A 1AA
                </div>
              </div>
            </div>
          </div>
          <button className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 transition">
            Manage details
          </button>
        </div>
      </div>

      {/* Invoices section */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
          <p className="text-xs text-gray-500">
            Keep a record of your monthly VirtualAddressHub charges.
          </p>
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-4 sm:p-6">
          <InvoicesTable />
        </div>
      </section>
    </main>
  );
}
