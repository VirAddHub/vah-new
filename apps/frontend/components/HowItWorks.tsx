'use client';

import { User, MapPin, Mail } from 'lucide-react';

const steps = [
    {
        k: 'verify',
        title: 'Verify Your Account',
        description: 'Verify your account by completing the required identity checks for regulated address services.',
        icon: User
    },
    {
        k: 'use',
        title: 'Use Your London Address',
        description: 'Use your London address for Companies House, HMRC, and everyday business correspondence.',
        icon: MapPin
    },
    {
        k: 'handle',
        title: 'We Handle Your Mail',
        description: 'We receive, log, and scan your mail and make it available the same business day through your secure dashboard.',
        icon: Mail
    }
];

export default function HowItWorks() {
    return (
        <section className="w-full py-12 md:py-16 bg-white">
            <div className="safe-pad mx-auto max-w-6xl">
                <header className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                        How It Works
                    </h2>
                    <p className="text-base md:text-lg text-muted-foreground">
                        Three steps to a professional London address
                    </p>
                </header>

                {/* Three steps with connecting lines */}
                <div className="relative">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            return (
                                <div key={step.k} className="relative flex flex-col items-center">
                                    {/* Number Circle */}
                                    <div className="relative z-10 mb-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0d4a3d]">
                                            <span className="font-bold text-white text-lg">{index + 1}</span>
                                        </div>
                                    </div>

                                    {/* Icon Circle */}
                                    <div className="relative z-10 mb-6">
                                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 border-2 border-gray-400">
                                            <Icon className="h-10 w-10 text-gray-700" />
                                        </div>
                                    </div>

                                    {/* Connecting Dotted Line (only between steps) */}
                                    {index < steps.length - 1 && (
                                        <div className="hidden md:block absolute top-[60px] left-[50%] w-full h-0 border-t-2 border-dotted border-[#0d4a3d] z-0" 
                                             style={{ width: 'calc(100% - 80px)', left: 'calc(50% + 40px)' }}>
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="text-center max-w-xs">
                                        <h3 className="text-xl font-bold text-foreground mb-3">
                                            {step.title}
                                        </h3>
                                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
