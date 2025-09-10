import { HowItWorks } from '@/components/HowItWorks';
import { Card } from '@/components/ui/card';

export default function HowItWorksPage() {
    return (
        <div className="py-20">
            <div className="max-w-4xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold mb-6">How It Works</h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        Get your digital mailroom up and running in just a few simple steps.
                    </p>
                </div>

                <HowItWorks />

                {/* Additional Details */}
                <div className="mt-20">
                    <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>

                    <div className="grid md:grid-cols-2 gap-8">
                        <Card className="p-6 bg-white/5 border-white/10">
                            <h3 className="text-xl font-semibold mb-3">How quickly is my mail scanned?</h3>
                            <p className="text-gray-400">
                                We scan all incoming mail within 24 hours of arrival. Priority plans get same-day scanning.
                            </p>
                        </Card>

                        <Card className="p-6 bg-white/5 border-white/10">
                            <h3 className="text-xl font-semibold mb-3">Is my mail secure?</h3>
                            <p className="text-gray-400">
                                Absolutely. We use bank-level encryption and secure facilities. Your privacy is our top priority.
                            </p>
                        </Card>

                        <Card className="p-6 bg-white/5 border-white/10">
                            <h3 className="text-xl font-semibold mb-3">Can I forward physical mail?</h3>
                            <p className="text-gray-400">
                                Yes! You can set up forwarding rules to automatically forward important mail to your real address.
                            </p>
                        </Card>

                        <Card className="p-6 bg-white/5 border-white/10">
                            <h3 className="text-xl font-semibold mb-3">What types of mail do you accept?</h3>
                            <p className="text-gray-400">
                                We accept all standard mail including letters, packages, and documents. Some restrictions apply to hazardous materials.
                            </p>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
