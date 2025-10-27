export default function Preview({ onNavigate }: { onNavigate?: (page: string) => void }) {
    return (
        <main className="min-h-screen w-full bg-muted/30 py-8">
            <section className="mx-auto max-w-4xl px-6 text-center">
                <h2 className="font-bold text-[clamp(1.75rem,4.5vw,3.5rem)] leading-tight text-primary">London address for modern businesses</h2>
                <p className="mt-2 text-base font-medium tracking-wide text-gray-600 uppercase">
                    From solo founders to established teams
                </p>

                <p className="mx-auto mt-5 max-w-3xl text-lg leading-7 text-black">Run your business with a credible London presence — minus the admin. Private by default, handled to UK standards, and priced simply so you can focus on the work that matters.</p>

                <ul className="mx-auto mt-5 max-w-2xl space-y-2.5 text-left">
                    {[
                        'One credible London address you can use everywhere',
                        'Keep your home details off public listings',
                        'Clear monthly price — cancel any time',
                        'Human support · UK working hours',
                    ].map((line) => (
                        <li key={line} className="flex items-start gap-3 text-black">
                            <svg className="mt-1 h-4 w-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
                            <span>{line}</span>
                        </li>
                    ))}
                </ul>

                <div className="mt-6">
                    <a href="#" className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-primary to-accent px-6 py-2.5 text-white shadow-sm transition hover:shadow-md">
                        Get started — Secure my London address
                    </a>
                    <p className="mt-2 text-sm text-muted-foreground">£9.99/month · cancel anytime</p>
                </div>
            </section>

            {/* FAQ intro follows seamlessly */}
            <section className="mx-auto max-w-4xl px-6 text-center">
                <div className="mx-auto mb-4 mt-6 h-px w-24 bg-border" />
                <h2 className="font-bold text-[clamp(1.75rem,4.5vw,3rem)] leading-tight text-primary">Questions, answered.</h2>
                <p className="mt-3 text-base text-black">Everything from using your address to billing and KYC — explained in plain English.</p>

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
                        <p className="font-medium text-foreground hover:text-primary transition-colors">Can I use your address as my official Registered Office & Director's Service Address?</p>
                        <p className="mt-1 text-sm text-muted-foreground">Yes — it's compliant for both with Companies House and HMRC and meets the "appropriate address" requirements.</p>
                    </button>
                    <button
                        onClick={() => onNavigate?.('help')}
                        className="block rounded-md border border-dashed border-border bg-card/40 p-4 hover:bg-card/60 hover:border-primary/30 transition-all cursor-pointer w-full text-left"
                    >
                        <p className="font-medium text-foreground hover:text-primary transition-colors">How easy is it to cancel?</p>
                        <p className="mt-1 text-sm text-muted-foreground">Cancel any time from your dashboard or by email. You'll keep access for 30 days after cancellation.</p>
                    </button>
                </div>

                <div className="mt-4">
                    <button
                        onClick={() => onNavigate?.('help')}
                        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                        Browse all FAQs →
                    </button>
                </div>

                <p className="mt-6 text-xs text-muted-foreground">Human support · UK working hours · Typical first response within 1 business day</p>
            </section>
        </main>
    );
}
