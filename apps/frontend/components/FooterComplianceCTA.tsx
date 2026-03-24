"use client";

export default function FooterComplianceCTA() {
    const handleClick = () => {
        window.location.href = '/compliance-check';
    };

    return (
        <section className="mx-auto my-16 max-w-5xl rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-sm">
            <h3 className="text-h2 font-semibold text-foreground">⚖️ Unsure if your current address is compliant?</h3>
            <p className="mx-auto mt-3 max-w-2xl text-balance text-body-sm text-muted-foreground sm:text-body">
                Check your risk in 3 minutes.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-balance text-body-sm text-muted-foreground sm:text-body">
                Most founders don't realise their existing virtual office or accountant's address may not meet the new Companies House and HMRC standards under the Economic Crime and Corporate Transparency Act.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-balance text-body-sm text-muted-foreground sm:text-body">
                Use our free Compliance Check to:
            </p>
            <ul className="mx-auto mt-2 max-w-2xl space-y-1 text-body-sm text-muted-foreground text-left">
                <li>• See if your current setup meets "appropriate address" rules</li>
                <li>• Spot common red flags that can trigger mail being rejected or returned</li>
                <li>• Get clear, plain-English recommendations on what to fix (if anything)</li>
            </ul>
            <div className="mt-6">
                <button
                    onClick={handleClick}
                    className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-body-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                >
                    Take the Free Compliance Check
                </button>
                <p className="mt-2 text-caption text-muted-foreground">3 minutes · No sign-up required · Instant recommendations</p>
                <p className="mt-2 text-caption text-muted-foreground">This is a free tool to help you understand the rules — there's no obligation to switch to us.</p>
            </div>
        </section>
    );
}

