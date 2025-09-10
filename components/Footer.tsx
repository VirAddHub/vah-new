import Link from 'next/link';

export function Footer() {
    return (
        <footer className="border-t border-white/10 mt-20 py-12">
            <div className="max-w-6xl mx-auto px-4">
                <div className="grid md:grid-cols-4 gap-8">
                    {/* Company Info */}
                    <div className="md:col-span-2">
                        <h3 className="text-xl font-semibold mb-4 text-green-400">Virtual Address Hub</h3>
                        <p className="text-gray-400 mb-4">
                            Your secure digital mailroom. Professional UK addresses for individuals and businesses.
                        </p>
                        <div className="text-sm text-gray-500">
                            <p>© 2024 Virtual Address Hub. All rights reserved.</p>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-semibold mb-4">Quick Links</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">How It Works</Link></li>
                            <li><Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
                            <li><Link href="/about" className="text-gray-400 hover:text-white transition-colors">About</Link></li>
                            <li><Link href="/blog" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="font-semibold mb-4">Support</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/support" className="text-gray-400 hover:text-white transition-colors">Help Center</Link></li>
                            <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
                            <li><Link href="/kyc-policy" className="text-gray-400 hover:text-white transition-colors">KYC Policy</Link></li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    );
}
