'use client';

const steps = [
    {
        k: 'verify',
        title: 'Verify Your Account',
        description: 'Verify your account by completing the required identity checks for regulated address services.',
        icon: '/figma/how-icon-1.svg',
    },
    {
        k: 'use',
        title: 'Use Your London Address',
        description: 'Use your London address for Companies House, HMRC, and everyday business correspondence.',
        icon: '/figma/how-icon-2.svg',
    },
    {
        k: 'handle',
        title: 'We Handle Your Mail',
        description: 'We receive, log, and scan your mail and make it available the same business day through your secure dashboard.',
        icon: '/figma/how-icon-3.svg',
    }
];

export default function HowItWorks() {
    return (
        <section className="w-full bg-white py-16 sm:py-20 lg:py-28">
            <div className="safe-pad mx-auto w-full max-w-[1280px] px-6 sm:px-8 lg:px-12">
                <header className="mb-6 text-center sm:mb-8 md:mb-10 lg:mb-[60px]">
                    <h2 className="mb-2 text-2xl font-medium text-[#1A1A1A] sm:mb-3 sm:text-3xl md:text-4xl lg:text-[44px] lg:leading-[1.1]">
                        How It Works
                    </h2>
                    <p className="text-xs text-[#666666] sm:text-sm md:text-base lg:text-[18px] lg:leading-[1.4]">
                        Three steps to a professional London address
                    </p>
                </header>

                <div className="relative">
                    {/* Connector line (desktop only) */}
                    <img
                        src="/figma/how-it-works-connector.svg"
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1/2 top-[16px] hidden w-full max-w-[900px] -translate-x-1/2 md:block"
                    />

                    <div className="grid gap-8 text-center sm:gap-10 md:grid-cols-3 md:gap-12">
                        {steps.map((step, index) => (
                            <div key={step.k} className="relative z-10 flex flex-col items-center">
                                <div className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[#024E40] text-xs font-semibold text-white sm:h-[32px] sm:w-[32px] sm:text-sm">
                                    {index + 1}
                                </div>
                                <div className="mt-4 flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#F9F9F9] sm:h-[72px] sm:w-[72px] lg:h-[80px] lg:w-[80px]">
                                    <img
                                        src={step.icon}
                                        alt=""
                                        className="h-[30px] w-[30px] sm:h-[34px] sm:w-[34px] lg:h-[38px] lg:w-[38px]"
                                    />
                                </div>
                                <h3 className="mt-4 text-sm font-medium text-[#1A1A1A] sm:text-base lg:text-[18px]">
                                    {step.title}
                                </h3>
                                <p className="mt-2 text-xs leading-[1.4] text-[#666666] sm:text-sm lg:text-[16px]">
                                    {step.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
