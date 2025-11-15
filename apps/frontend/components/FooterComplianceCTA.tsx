"use client";

export default function FooterComplianceCTA() {
    const handleClick = () => {
        window.location.href = '/compliance-check';
    };

    return (
        <section className="mx-auto my-16 max-w-5xl rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-sm">
            <h3 className="text-2xl font-semibold text-foreground">Still unsure about compliance?</h3>
            <p className="mx-auto mt-3 max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">
                Take the <strong>free 3-minute Compliance Check</strong> to see if your current setup meets UK Companies House and HMRC requirements under the Economic Crime Act.
            </p>
            <div className="mt-4">
                <button
                    onClick={handleClick}
                    className="inline-flex items-center justify-center rounded-xl bg-[#FF6B00] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40"
                >
                    Start Now
                </button>
            </div>
        </section>
    );
}

