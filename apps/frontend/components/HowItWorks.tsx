'use client';

const steps = [
    {
        k: 'verify',
        title: 'Verify your account',
        description: 'Verify your account by completing the required identity checks for regulated address services.',
        icon: '/figma/how-icon-1.svg',
    },
    {
        k: 'use',
        title: 'Use your London address',
        description: 'Use your London address for Companies House, HMRC, and everyday business correspondence.',
        icon: '/figma/how-icon-2.svg',
    },
    {
        k: 'handle',
        title: 'We handle your mail',
        description: 'We receive, log, and scan your mail and make it available the same business day through your secure dashboard.',
        icon: '/figma/how-icon-3.svg',
    }
];

export default function HowItWorks() {
    return (
        <section className="w-full bg-white py-12 md:py-[100px]">
            <div className="safe-pad mx-auto w-full max-w-[1196px] px-5 md:px-[118px]">
                <header className="mb-10 text-center md:mb-[60px]">
                    <h2 className="mb-3 text-3xl font-medium text-[#1A1A1A] md:text-[44px] md:leading-[1.1]">
                        How It Works
                    </h2>
                    <p className="text-sm text-[#666666] md:text-[18px] md:leading-[1.4]">
                        Three steps to a professional London address
                    </p>
                </header>

                {/* Three overlapping cards with background rectangles */}
                <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:justify-center md:gap-[42px]">
                    {steps.map((step, index) => (
                        <div
                            key={step.k}
                            className="relative w-full md:w-auto"
                            style={{ zIndex: 10 - index }}
                        >
                            {/* Cream background card (368x382px) */}
                            <div className="absolute inset-0 rounded-[20px] bg-[#FCFBF8]" />

                            {/* Foreground card content (368px width, centered) */}
                            <div className="relative flex flex-col items-center px-6 py-12 md:w-[368px] md:px-0">
                                {/* Number circle (60x60 outer, 52x52 inner) */}
                                <div className="mb-[74px] flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[#024E40] p-[2px]">
                                    <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#024E40] px-[17px] py-[9px]">
                                        <span className="text-center text-[28px] font-normal leading-[1.1] text-white" style={{ fontFamily: 'Potta One, ui-sans-serif' }}>
                                            {index + 1}
                                        </span>
                                    </div>
                                </div>

                                {/* Icon (96x96 container with #F9F9F9 background) */}
                                <div className="mb-[42px] flex h-24 w-24 items-center justify-center rounded-full bg-[#F9F9F9]">
                                    <img src={step.icon} alt="" className="h-[42px] w-[42px]" />
                                </div>

                                {/* Title + Description */}
                                <div className="w-full space-y-[10px] text-center md:w-[368px]">
                                    <h3 className="text-[24px] font-medium uppercase leading-[1.1] text-[#1A1A1A]">
                                        {step.title}
                                    </h3>
                                    <p className="text-[16px] leading-[1.4] text-[#666666]">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
