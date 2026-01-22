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
        <section className="w-full bg-white py-8 sm:py-12 md:py-16 lg:py-[100px]">
            <div className="safe-pad mx-auto w-full max-w-[1196px] px-4 sm:px-6 md:px-12 lg:px-[118px]">
                <header className="mb-6 text-center sm:mb-8 md:mb-10 lg:mb-[60px]">
                    <h2 className="mb-2 text-2xl font-medium text-[#1A1A1A] sm:mb-3 sm:text-3xl md:text-4xl lg:text-[44px] lg:leading-[1.1]">
                        How It Works
                    </h2>
                    <p className="text-xs text-[#666666] sm:text-sm md:text-base lg:text-[18px] lg:leading-[1.4]">
                        Three steps to a professional London address
                    </p>
                </header>

                {/* Three overlapping cards with background rectangles */}
                <div className="flex flex-col items-center gap-6 sm:gap-8 md:flex-row md:justify-center md:gap-[30px] lg:gap-[42px]">
                    {steps.map((step, index) => (
                        <div
                            key={step.k}
                            className="relative w-full max-w-sm md:max-w-none"
                            style={{ zIndex: 10 - index }}
                        >
                            {/* Cream background card */}
                            <div className="absolute inset-0 rounded-[15px] bg-[#FCFBF8] sm:rounded-[20px]" />

                            {/* Foreground card content */}
                            <div className="relative flex flex-col items-center px-5 py-8 sm:px-6 sm:py-10 md:w-[280px] md:px-0 lg:w-[368px] lg:py-12">
                                {/* Number circle */}
                                <div className="mb-8 flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#024E40] p-[2px] sm:mb-12 sm:h-[55px] sm:w-[55px] lg:mb-[74px] lg:h-[60px] lg:w-[60px]">
                                    <div className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#024E40] px-[14px] py-[7px] sm:h-[48px] sm:w-[48px] lg:h-[52px] lg:w-[52px] lg:px-[17px] lg:py-[9px]">
                                        <span className="text-center text-[22px] font-normal leading-[1.1] text-white sm:text-[24px] lg:text-[28px]" style={{ fontFamily: 'Potta One, ui-sans-serif' }}>
                                            {index + 1}
                                        </span>
                                    </div>
                                </div>

                                {/* Icon */}
                                <div className="mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#F9F9F9] sm:mb-8 sm:h-20 sm:w-20 lg:mb-[42px] lg:h-24 lg:w-24">
                                    <img src={step.icon} alt="" className="h-[32px] w-[32px] sm:h-[36px] sm:w-[36px] lg:h-[42px] lg:w-[42px]" />
                                </div>

                                {/* Title + Description */}
                                <div className="w-full space-y-2 text-center sm:space-y-[10px] md:w-[280px] lg:w-[368px]">
                                    <h3 className="text-lg font-medium uppercase leading-[1.1] text-[#1A1A1A] sm:text-xl md:text-[22px] lg:text-[24px]">
                                        {step.title}
                                    </h3>
                                    <p className="text-xs leading-[1.4] text-[#666666] sm:text-sm md:text-base lg:text-[16px]">
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
