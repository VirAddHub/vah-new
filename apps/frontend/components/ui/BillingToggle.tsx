import React from 'react';

interface BillingToggleProps {
    billing: "monthly" | "annual";
    onChange: (billing: "monthly" | "annual") => void;
}

export function BillingToggle({ billing, onChange }: BillingToggleProps) {
    return (
        <div className="mt-4 flex justify-center mb-6">
            <div
                className="inline-flex rounded-full p-1 border border-border bg-muted font-poppins"
                role="tablist"
                aria-label="Billing period"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={billing === "monthly"}
                    onClick={() => onChange("monthly")}
                    className={`rounded-full px-5 py-2.5 text-sm font-poppins font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted select-none touch-manipulation [-webkit-tap-highlight-color:transparent] ${
                        billing === "monthly"
                            ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:bg-primary"
                            : "text-muted-foreground hover:bg-background hover:text-foreground active:bg-transparent"
                    }`}
                >
                    Monthly
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={billing === "annual"}
                    onClick={() => onChange("annual")}
                    className={`rounded-full px-5 py-2.5 text-sm font-poppins font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted select-none touch-manipulation [-webkit-tap-highlight-color:transparent] ${
                        billing === "annual"
                            ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:bg-primary"
                            : "text-muted-foreground hover:bg-background hover:text-foreground active:bg-transparent"
                    }`}
                >
                    Annual
                </button>
            </div>
        </div>
    );
}
