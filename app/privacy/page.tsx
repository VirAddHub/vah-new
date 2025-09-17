import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Privacy Policy | Virtual Address Hub',
  description:
    'Learn how Virtual Address Hub collects, uses and protects your personal data. GDPR-compliant processing, retention and your rights.',
};

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 py-20">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="prose prose-invert max-w-none">
                        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
                        <p className="text-lg text-gray-300 mb-8">
                            Last updated: {new Date().toLocaleDateString('en-GB')}
                        </p>

                        <div className="space-y-8">
                            <section>
                                <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    Virtual Address Hub ("we," "our," or "us") is committed to protecting your privacy.
                                    This Privacy Policy explains how we collect, use, disclose, and safeguard your
                                    information when you use our virtual address and mail management services.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

                                <h3 className="text-xl font-medium mb-3">2.1 Personal Information</h3>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Name, email address, and contact details</li>
                                    <li>Business information and company registration details</li>
                                    <li>Address information for mail forwarding</li>
                                    <li>Payment information (processed securely through third-party providers)</li>
                                    <li>Identity verification documents (KYC compliance)</li>
                                </ul>

                                <h3 className="text-xl font-medium mb-3 mt-6">2.2 Mail Content</h3>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Scanned images of your mail</li>
                                    <li>Mail metadata (sender, date, type)</li>
                                    <li>Forwarding instructions and preferences</li>
                                </ul>

                                <h3 className="text-xl font-medium mb-3 mt-6">2.3 Technical Information</h3>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>IP address and device information</li>
                                    <li>Usage data and analytics</li>
                                    <li>Cookies and similar tracking technologies</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Provide virtual address and mail management services</li>
                                    <li>Process and scan your mail</li>
                                    <li>Handle mail forwarding requests</li>
                                    <li>Verify your identity for compliance purposes</li>
                                    <li>Process payments and manage subscriptions</li>
                                    <li>Communicate with you about our services</li>
                                    <li>Improve our services and user experience</li>
                                    <li>Comply with legal and regulatory requirements</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">4. Mail Handling and Security</h2>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    We handle your mail with the highest level of security and confidentiality:
                                </p>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>All mail is scanned and stored securely</li>
                                    <li>Physical mail is held for 14 days before secure disposal</li>
                                    <li>Access to your mail is restricted to authorized personnel only</li>
                                    <li>We use encryption for data transmission and storage</li>
                                    <li>Regular security audits and monitoring</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">5. Data Sharing and Disclosure</h2>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    We do not sell your personal information. We may share your information only in the following circumstances:
                                </p>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>With your explicit consent</li>
                                    <li>To comply with legal obligations or court orders</li>
                                    <li>With trusted service providers who assist in our operations</li>
                                    <li>In case of business transfers or mergers</li>
                                    <li>To protect our rights, property, or safety</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Account information: Retained while your account is active</li>
                                    <li>Mail scans: Retained for 7 years for business records</li>
                                    <li>KYC documents: Retained as required by law (typically 5-7 years)</li>
                                    <li>Payment records: Retained as required by financial regulations</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">7. Your Rights (GDPR)</h2>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    Under GDPR, you have the following rights:
                                </p>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Right to access your personal data</li>
                                    <li>Right to rectification of inaccurate data</li>
                                    <li>Right to erasure ("right to be forgotten")</li>
                                    <li>Right to restrict processing</li>
                                    <li>Right to data portability</li>
                                    <li>Right to object to processing</li>
                                    <li>Right to withdraw consent</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking</h2>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    We use cookies and similar technologies to:
                                </p>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Remember your preferences and settings</li>
                                    <li>Analyze website usage and performance</li>
                                    <li>Provide personalized content</li>
                                    <li>Ensure security and prevent fraud</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">9. International Transfers</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    Your data may be transferred to and processed in countries outside the UK/EEA.
                                    We ensure appropriate safeguards are in place to protect your data in accordance
                                    with applicable data protection laws.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">10. Children's Privacy</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    Our services are not intended for individuals under 18 years of age.
                                    We do not knowingly collect personal information from children under 18.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    We may update this Privacy Policy from time to time. We will notify you of any
                                    material changes by posting the new Privacy Policy on this page and updating
                                    the "Last updated" date.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    If you have any questions about this Privacy Policy or our data practices, please contact us:
                                </p>
                                <div className="bg-white/5 rounded-lg p-6">
                                    <p className="text-gray-300">
                                        <strong>Email:</strong> privacy@virtualaddresshub.co.uk<br />
                                        <strong>Address:</strong> Virtual Address Hub, [Your Business Address]<br />
                                        <strong>Data Protection Officer:</strong> dpo@virtualaddresshub.co.uk
                                    </p>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
