'use client';

const steps = [
    {
        k: 'verify',
        title: 'Verify Your Account',
        description: 'Verify your account by completing the required identity checks for regulated address services.',
    },
    {
        k: 'use',
        title: 'Start using your address',
        description: 'Once approved, you can begin using your address across your company records and business communications.',
    },
    {
        k: 'handle',
        title: 'We process your post',
        description: 'Incoming mail is logged, scanned, and added to your dashboard for secure online access.',
    },
];

export default function HowItWorks() {
    return (
        <section
            className="w-full bg-background py-16 sm:py-20 lg:py-28"
            aria-labelledby="how-it-works-heading"
        >
            <div className="mx-auto w-full max-w-5xl px-6 sm:px-8 lg:px-12">

                {/* Section header */}
                <div className="mb-10 text-center sm:mb-12 lg:mb-14">
                    <h2
                        id="how-it-works-heading"
                        className="text-h2 font-poppins !font-normal text-foreground sm:text-h1 md:text-display lg:text-display leading-tight tracking-tight"
                    >
                        How It Works
                    </h2>
                </div>

                {/* ── Mobile: vertical stack with connecting line (below md) ── */}
                <div className="md:hidden mx-auto max-w-sm">
                    {steps.map((step, index) => (
                        <div key={step.k} className="flex items-start gap-5">

                            {/* Left column: dot + line segment running to next dot */}
                            <div className="flex flex-col items-center self-stretch shrink-0 pt-0.5">
                                <div className="relative z-10 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-white shrink-0" />
                                {index < steps.length - 1 && (
                                    <div className="flex-1 w-px bg-gray-200" />
                                )}
                            </div>

                            {/* Right column: title + description */}
                            <div className={index < steps.length - 1 ? 'pb-10' : ''}>
                                <h3 className="font-poppins font-semibold text-base text-foreground">
                                    {step.title}
                                </h3>
                                <p className="mt-1.5 font-poppins font-normal text-sm text-muted-foreground">
                                    {step.description}
                                </p>
                            </div>

                        </div>
                    ))}
                </div>

                {/* ── Desktop: horizontal layout with connecting line (md and above) ── */}
                <div className="hidden md:flex">
                    {steps.map((step, index) => (
                        <div key={step.k} className="flex flex-col items-center flex-1">

                            {/* Dot row — line segments flank each dot, dot-to-dot only */}
                            <div className="flex items-center w-full">
                                {index > 0
                                    ? <div className="flex-1 h-px bg-gray-200" />
                                    : <div className="flex-1" />
                                }
                                <div className="relative z-10 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-white shrink-0" />
                                {index < steps.length - 1
                                    ? <div className="flex-1 h-px bg-gray-200" />
                                    : <div className="flex-1" />
                                }
                            </div>

                            {/* Content centered below dot */}
                            <div className="mt-8 text-center px-4 max-w-[240px]">
                                <h3 className="font-poppins font-semibold text-base text-foreground">
                                    {step.title}
                                </h3>
                                <p className="mt-2 font-poppins font-normal text-sm text-muted-foreground">
                                    {step.description}
                                </p>
                            </div>

                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
}
