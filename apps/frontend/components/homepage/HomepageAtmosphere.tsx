/**
 * Decorative background layers for the marketing homepage.
 * Behind content only; pair sections with `relative z-10` on inner wrappers.
 */

const radial = (value: string) => ({ background: value });

export function AmbientHero() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div
                className="absolute inset-0"
                style={radial(
                    'radial-gradient(ellipse 90% 60% at 50% -18%, hsl(var(--primary) / 0.1) 0%, transparent 58%)',
                )}
            />
            <div className="absolute -right-16 top-[-10%] h-[min(26rem,75vw)] w-[min(26rem,75vw)] rounded-full bg-primary/[0.055] blur-[100px] sm:right-0" />
            <div className="absolute -left-20 bottom-[-5%] h-72 w-72 rounded-full bg-primary/[0.045] blur-[88px] md:h-80 md:w-80" />
        </div>
    );
}

export function AmbientWhatsIncluded() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div
                className="absolute inset-0 opacity-[0.42]"
                style={{
                    backgroundImage: `linear-gradient(hsl(var(--foreground) / 0.035) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground) / 0.035) 1px, transparent 1px)`,
                    backgroundSize: '2.75rem 2.75rem',
                    maskImage: 'radial-gradient(ellipse 75% 65% at 50% 45%, black 20%, transparent 72%)',
                    WebkitMaskImage:
                        'radial-gradient(ellipse 75% 65% at 50% 45%, black 20%, transparent 72%)',
                }}
            />
            <div className="absolute -right-24 top-1/2 h-[22rem] w-[22rem] -translate-y-1/2 rounded-full bg-primary/[0.06] blur-[100px]" />
            <div className="absolute left-0 top-0 h-48 w-48 rounded-full bg-primary/[0.04] blur-[72px]" />
        </div>
    );
}

export function AmbientPricing() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div
                className="absolute inset-0"
                style={radial(
                    'radial-gradient(ellipse 70% 50% at 50% 0%, hsl(var(--primary) / 0.06) 0%, transparent 62%)',
                )}
            />
            <div className="absolute left-1/2 top-[60%] h-px w-[min(90%,48rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        </div>
    );
}

export function AmbientHowItWorks() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div
                className="absolute inset-0"
                style={radial(
                    'radial-gradient(circle at 15% 25%, hsl(var(--primary) / 0.07) 0%, transparent 42%), radial-gradient(circle at 88% 70%, hsl(var(--primary) / 0.05) 0%, transparent 40%)',
                )}
            />
            <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/[0.12] to-transparent opacity-70" />
            <div className="absolute bottom-8 left-1/4 h-40 w-40 rounded-full bg-muted-foreground/[0.05] blur-[64px]" />
        </div>
    );
}

export function AmbientCoreValue() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div
                className="absolute inset-0"
                style={radial(
                    'linear-gradient(to bottom right, hsl(var(--primary) / 0.035) 0%, transparent 45%, hsl(var(--primary) / 0.05) 100%)',
                )}
            />
            <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-primary/[0.045] blur-[96px]" />
        </div>
    );
}

export function AmbientFinalCtaSection() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div
                className="absolute inset-0"
                style={radial(
                    'radial-gradient(ellipse 100% 70% at 50% -10%, hsl(var(--primary) / 0.11) 0%, transparent 55%)',
                )}
            />
            <div className="absolute right-[-20%] top-1/3 h-[min(28rem,90vw)] w-[min(28rem,90vw)] rounded-full bg-primary/[0.08] blur-[120px]" />
            <div className="absolute left-[-15%] bottom-0 h-72 w-72 rounded-full bg-primary/[0.06] blur-[100px]" />
            <div
                className="absolute inset-0 opacity-[0.18]"
                style={{
                    backgroundImage: `linear-gradient(hsl(var(--foreground) / 0.05) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground) / 0.05) 1px, transparent 1px)`,
                    backgroundSize: '4rem 4rem',
                    maskImage: 'linear-gradient(to bottom, black, transparent 85%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 85%)',
                }}
            />
        </div>
    );
}

export function AmbientFinalCtaCard() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
            <div
                className="absolute inset-0"
                style={radial(
                    'radial-gradient(ellipse 60% 50% at 100% 0%, hsl(var(--primary) / 0.12) 0%, transparent 50%), radial-gradient(ellipse 50% 45% at 0% 100%, hsl(var(--background) / 0.28) 0%, transparent 55%)',
                )}
            />
        </div>
    );
}

export function AmbientFooter() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div
                className="absolute inset-0"
                style={radial(
                    'radial-gradient(ellipse 95% 80% at 50% 100%, hsl(var(--primary) / 0.09) 0%, transparent 60%)',
                )}
            />
            <div className="absolute top-0 left-1/2 h-px w-[min(100%,56rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </div>
    );
}
