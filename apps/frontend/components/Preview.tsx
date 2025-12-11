"use client";

import { usePlans } from "@/hooks/usePlans";

export default function Preview({ onNavigate }: { onNavigate?: (page: string) => void }) {
    // Get dynamic pricing from plans API
    const { getMonthlyPlan } = usePlans();
    const monthlyPlan = getMonthlyPlan();
    const monthlyPrice = monthlyPlan ? (monthlyPlan.price_pence / 100).toFixed(2) : null;
    
    return (
        <main className="w-full bg-muted/30 py-16">
            <section className="mx-auto max-w-4xl px-6 text-center">
                <h2 className="mt-4 text-2xl font-semibold sm:text-3xl text-primary">London address for modern businesses</h2>
                <p className="mx-auto mt-3 max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">
                    From solo founders to established teams
                </p>

                <p className="mx-auto mt-5 max-w-3xl text-balance text-sm text-muted-foreground sm:text-base">Run your business with a credible London presence — without the overhead of a physical office. Your address is private by default, handled to UK standards, and priced simply so you can focus on the work that matters.</p>

                <ul className="mx-auto mt-5 max-w-2xl space-y-2.5 text-left">
                    {[
                        'One credible Central London address you can use everywhere',
                        'Keep your home details off public records and client documents',
                        'Simple monthly price — cancel any time',
                        'Human support in UK working hours from a real team, not a chatbot',
                    ].map((line) => (
                        <li key={line} className="flex items-start gap-3 text-sm text-muted-foreground">
                            <svg className="mt-1 h-4 w-4 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
                            <span>{line}</span>
                        </li>
                    ))}
                </ul>

                <div className="mt-6">
                    <a href="#" className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-6 py-2.5 transition hover:bg-primary/90">
                        Get Started – Secure My London Address
                    </a>
                    <p className="mt-2 text-xs text-muted-foreground">
                        £9.97/month · Cancel anytime · Letters only (no parcels)
                    </p>
                </div>
            </section>

            {/* FAQ intro follows seamlessly */}
            <section className="mx-auto max-w-4xl px-6 text-center">
                <div className="mx-auto mb-4 mt-6 h-px w-24 bg-border" />
                <h2 className="mt-4 text-2xl font-semibold sm:text-3xl text-primary">Questions, answered.</h2>
                <p className="mx-auto mt-3 max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">Everything from using your address to billing and KYC — explained in plain English.</p>

                {/* quick actions */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                        onClick={() => onNavigate?.('help')}
                        className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-5 py-2.5 text-sm text-foreground shadow-sm transition hover:bg-accent"
                    >
                        Visit Help Centre ↗
                    </button>
                    <button
                        onClick={() => onNavigate?.('contact')}
                        className="text-sm text-primary underline-offset-4 hover:underline"
                    >
                        Contact support ↗
                    </button>
                </div>

                {/* teaser FAQs to keep the flow */}
                <div className="mx-auto mt-6 grid gap-3 text-left md:max-w-3xl">
                    <button
                        onClick={() => onNavigate?.('help')}
                        className="block rounded-md border border-dashed border-border bg-card/40 p-4 hover:bg-card/60 hover:border-primary/30 transition-all cursor-pointer w-full text-left"
                    >
                        <p className="text-base font-semibold text-foreground hover:text-primary transition-colors">Can I use your address as my official Registered Office & Director's Service Address?</p>
                        <p className="mt-1 text-sm text-muted-foreground">Yes — it's compliant for both with Companies House and HMRC and meets the "appropriate address" requirements.</p>
                    </button>
                    <button
                        onClick={() => onNavigate?.('help')}
                        className="block rounded-md border border-dashed border-border bg-card/40 p-4 hover:bg-card/60 hover:border-primary/30 transition-all cursor-pointer w-full text-left"
                    >
                        <p className="text-base font-semibold text-foreground hover:text-primary transition-colors">How easy is it to cancel?</p>
                        <p className="mt-1 text-sm text-muted-foreground">Cancel any time from your dashboard or by email.</p>
                    </button>
                </div>

                <div className="mt-4">
                    <button
                        onClick={() => onNavigate?.('help')}
                        className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                        Browse all FAQs →
                    </button>
                </div>

                <p className="mt-6 text-xs text-muted-foreground">Human support · UK working hours · Typical first response within 1 business day</p>
            </section>
        </main>
    );
}
