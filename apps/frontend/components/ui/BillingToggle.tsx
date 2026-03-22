import React from 'react';

interface BillingToggleProps {
    billing: "monthly" | "annual";
    onChange: (billing: "monthly" | "annual") => void;
}

export function BillingToggle({ billing, onChange }: BillingToggleProps) {
    return (
        <div className="mt-4 flex justify-center mb-6">
            <div
                className="inline-flex rounded-full p-1 border border-emerald-200/80 bg-emerald-50/80 dark:bg-emerald-950/30"
                role="tablist"
                aria-label="Billing period"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={billing === "monthly"}
                    onClick={() => onChange("monthly")}
                    className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-50 dark:focus-visible:ring-offset-emerald-950/50 select-none touch-manipulation [-webkit-tap-highlight-color:transparent] ${
                        billing === "monthly"
                            ? "bg-emerald-800 text-white shadow-md hover:bg-emerald-700 active:bg-emerald-800"
                            : "text-emerald-800/80 hover:bg-emerald-200/60 hover:text-emerald-900 active:bg-transparent dark:text-emerald-200/80 dark:hover:bg-emerald-800/30 dark:hover:text-white"
                    }`}
                >
                    Monthly
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={billing === "annual"}
                    onClick={() => onChange("annual")}
                    className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-50 dark:focus-visible:ring-offset-emerald-950/50 select-none touch-manipulation [-webkit-tap-highlight-color:transparent] ${
                        billing === "annual"
                            ? "bg-emerald-800 text-white shadow-md hover:bg-emerald-700 active:bg-emerald-800"
                            : "text-emerald-800/80 hover:bg-emerald-200/60 hover:text-emerald-900 active:bg-transparent dark:text-emerald-200/80 dark:hover:bg-emerald-800/30 dark:hover:text-white"
                    }`}
                >
                    Annual
                </button>
            </div>
        </div>
    );
}
