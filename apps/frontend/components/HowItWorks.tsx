'use client';

const steps = [
    {
        k: 'verify',
        n: '1',
        title: 'Verify Your Account',
        description: 'Verify your account by completing the required identity checks for regulated address services.',
        iconSrc: '/figma/how-step-1.png',
    },
    {
        k: 'use',
        n: '2',
        title: 'Use Your London Address',
        description: 'Use your London address for Companies House, HMRC, and everyday business correspondence.',
        iconSrc: '/figma/how-step-2.png',
    },
    {
        k: 'handle',
        n: '3',
        title: 'We Handle Your Mail',
        description: 'We receive, log, and scan your mail and make it available the same business day through your secure dashboard.',
        iconSrc: '/figma/how-step-3.png',
    },
];

export default function HowItWorks() {
    return (
        <section className="w-full bg-white py-[100px]">
            <div className="mx-auto w-full max-w-[1196px] px-[118px]" style={{ fontFamily: "Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" }}>
                <header className="text-center mb-[60px]">
                    <h2 className="text-[44px] font-medium leading-[1.1] text-[#1A1A1A]">
                        How It Works
                    </h2>
                    <p className="mt-4 text-[16px] leading-[1.4] text-[#666666]">
                        Three steps to a professional London address
                    </p>
                </header>

                <div className="relative mx-auto h-[426px] w-[1196px]">
                    {/* dotted connector svg from Figma */}
                    <img
                        src="/figma/how-it-works-connector.svg"
                        alt=""
                        className="absolute left-[187px] top-[97px] h-[157px] w-[824px]"
                        aria-hidden="true"
                    />

                    <div className="absolute left-0 top-[24px] h-[402px] w-[370px] rounded-[20px] bg-[#FCFBF8]" />
                    <div className="absolute left-[826px] top-[34px] h-[391px] w-[370px] rounded-[20px] bg-[#FCFBF8]" />

                    <div className="absolute left-[5px] top-0 flex items-center gap-[42px]">
                        {steps.map((s) => (
                            <div key={s.k} className="flex w-[370px] flex-col items-center text-center">
                                <div className="h-[40px] w-[40px] rounded-full bg-[#024E40] flex items-center justify-center text-white text-[18px] font-medium">
                                    {s.n}
                                </div>
                                <div className="mt-8 flex h-[80px] w-[80px] items-center justify-center rounded-full bg-[#FCFBF8]">
                                    {/* fallback: lucide icons weren't identical; these are left as placeholders */}
                                    <div className="h-[32px] w-[32px] rounded bg-[#024E40]" />
                                </div>
                                <div className="mt-8 text-[22px] font-medium text-[#1A1A1A]">{s.title}</div>
                                <div className="mt-3 max-w-[280px] text-[14px] leading-[1.6] text-[#666666]">{s.description}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
