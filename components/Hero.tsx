'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';

export function Hero() {
    return (
        <section className="py-20 text-center">
            <div className="max-w-4xl mx-auto px-4">
                <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
                    Virtual Address Hub
                </h1>
                <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                    Your secure digital mailroom. Get a professional UK address, receive mail digitally,
                    and never miss important documents again.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                    <Button asChild size="lg" className="bg-green-600 hover:bg-green-700 text-white">
                        <Link href="/(auth)/signup">Get Started Free</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/how-it-works">How It Works</Link>
                    </Button>
                </div>

                {/* Feature Cards */}
                <div className="grid md:grid-cols-3 gap-6 mt-16">
                    <Card className="p-6 bg-white/5 border-white/10">
                        <div className="text-green-400 text-3xl mb-4">📧</div>
                        <h3 className="text-xl font-semibold mb-2">Digital Mail</h3>
                        <p className="text-gray-400">
                            Receive and view your mail digitally. No more waiting for physical delivery.
                        </p>
                    </Card>

                    <Card className="p-6 bg-white/5 border-white/10">
                        <div className="text-green-400 text-3xl mb-4">🔒</div>
                        <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
                        <p className="text-gray-400">
                            Bank-level security for all your documents. Your privacy is our priority.
                        </p>
                    </Card>

                    <Card className="p-6 bg-white/5 border-white/10">
                        <div className="text-green-400 text-3xl mb-4">⚡</div>
                        <h3 className="text-xl font-semibold mb-2">Instant Access</h3>
                        <p className="text-gray-400">
                            Access your mail anywhere, anytime. Forward, download, or archive with one click.
                        </p>
                    </Card>
                </div>
            </div>
        </section>
    );
}
