"use client";

export default function ComplianceBanner() {
    const handleClick = () => {
        window.location.href = '/compliance-check';
    };

    return (
        <section className="mx-auto my-12 max-w-5xl rounded-2xl border border-border bg-muted/30 px-6 py-8 shadow-sm">
            <div className="grid items-center gap-6 sm:grid-cols-2">
                <div>
                    <h2 className="text-2xl font-semibold text-foreground">
                        ⚖️ Is Your Business Address HMRC-Compliant?
                    </h2>
                    <p className="mx-auto mt-3 max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">
                        Most founders don't realise their current virtual office can fail new Companies House rules. Take the free 3-minute check and get instant recommendations.
                    </p>
                </div>
                <div className="sm:text-right">
                    <button
                        onClick={handleClick}
                        className="inline-flex items-center justify-center rounded-xl bg-[#FF6B00] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40"
                    >
                        Take the Free Quiz
                    </button>
                    <p className="mt-2 text-xs text-muted-foreground">Quick, free, no obligation.</p>
                </div>
            </div>
        </section>
    );
}

