export default function Preview() {
    return (
        <main className="min-h-screen w-full bg-neutral-50 py-16">
            <section className="mx-auto max-w-4xl px-6 text-center">
                <h2 className="font-serif text-4xl sm:text-5xl leading-tight text-neutral-900">London address for modern businesses</h2>
                <p className="mt-2 text-sm font-medium tracking-wide text-neutral-600 uppercase">
                    From solo founders to established teams
                </p>

                <p className="mx-auto mt-5 max-w-3xl text-lg leading-7 text-neutral-700">Run your business with a credible London presence — minus the admin. Private by default, handled to UK standards, and priced simply so you can focus on the work that matters.</p>

                <ul className="mx-auto mt-5 max-w-2xl space-y-2.5 text-left">
                    {[
                        'One credible London address you can use everywhere',
                        'Keep your home details off public listings',
                        'Clear monthly price — cancel any time',
                        'Human support · UK working hours',
                    ].map((line) => (
                        <li key={line} className="flex items-start gap-3 text-neutral-800">
                            <svg className="mt-1 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
                            <span>{line}</span>
                        </li>
                    ))}
                </ul>

                <div className="mt-6">
                    <a href="#" className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-6 py-2.5 text-white shadow-sm transition hover:bg-amber-700">
                        Get started — Secure my London address
                    </a>
                    <p className="mt-2 text-sm text-neutral-500">£9.99/month · cancel anytime</p>
                </div>
            </section>

            {/* FAQ intro follows seamlessly */}
            <section className="mx-auto max-w-4xl px-6 text-center">
                <div className="mx-auto mb-6 mt-8 h-px w-24 bg-neutral-200" />
                <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-neutral-900">Questions, answered.</h2>
                <p className="mt-3 text-base text-neutral-600">Everything from using your address to billing and KYC — explained in plain English.</p>

                {/* quick actions */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <a href="/help" className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm text-neutral-800 shadow-sm transition hover:bg-neutral-100">
                        Visit Help Centre ↗
                    </a>
                    <a href="/contact" className="text-sm text-amber-700 underline-offset-4 hover:underline">Contact support ↗</a>
                </div>

                {/* teaser FAQs to keep the flow */}
                <div className="mx-auto mt-8 grid gap-3 text-left md:max-w-3xl">
                    <a href="/help#vah-registered-office" className="block rounded-md border border-dashed border-neutral-200/70 bg-white/40 p-4 hover:bg-white/60">
                        <p className="font-medium text-neutral-800">Can I use your address as my official Registered Office & Director's Service Address?</p>
                        <p className="mt-1 text-sm text-neutral-600">Yes — it's compliant for both with Companies House and HMRC and meets the "appropriate address" requirements.</p>
                    </a>
                    <a href="/help#billing-cancel" className="block rounded-md border border-dashed border-neutral-200/70 bg-white/40 p-4 hover:bg-white/60">
                        <p className="font-medium text-neutral-800">How easy is it to cancel?</p>
                        <p className="mt-1 text-sm text-neutral-600">Cancel any time from your dashboard or by email. You'll keep access for 30 days after cancellation.</p>
                    </a>
                </div>

                <div className="mt-4">
                    <a href="/help" className="text-sm text-neutral-600 underline-offset-4 hover:text-neutral-800 hover:underline">Browse all FAQs →</a>
                </div>

                <p className="mt-6 text-xs text-neutral-500">Human support · UK working hours · Typical first response within 1 business day</p>
            </section>
        </main>
    );
}
