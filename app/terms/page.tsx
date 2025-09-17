import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/Footer';

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 py-20">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="prose prose-invert max-w-none">
                        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
                        <p className="text-lg text-gray-300 mb-8">
                            Last updated: {new Date().toLocaleDateString('en-GB')}
                        </p>

                        <div className="space-y-8">
                            <section>
                                <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    By accessing and using Virtual Address Hub's services, you accept and agree to be bound 
                                    by the terms and provision of this agreement. If you do not agree to abide by the above, 
                                    please do not use this service.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    Virtual Address Hub provides virtual business address services, including:
                                </p>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Professional UK business address for company registration</li>
                                    <li>Mail receiving, scanning, and digital delivery services</li>
                                    <li>Mail forwarding to your preferred address</li>
                                    <li>Proof of address certificates</li>
                                    <li>Identity verification (KYC) services</li>
                                    <li>Secure online dashboard for mail management</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
                                
                                <h3 className="text-xl font-medium mb-3">3.1 Account Requirements</h3>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Provide accurate and complete information during registration</li>
                                    <li>Maintain the security of your account credentials</li>
                                    <li>Notify us immediately of any unauthorized use</li>
                                    <li>Complete identity verification (KYC) as required</li>
                                </ul>

                                <h3 className="text-xl font-medium mb-3 mt-6">3.2 Prohibited Uses</h3>
                                <p className="text-gray-300 leading-relaxed mb-4">You may not use our service for:</p>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Illegal activities or fraud</li>
                                    <li>Money laundering or terrorist financing</li>
                                    <li>Receiving mail for third parties without authorization</li>
                                    <li>Using the address for purposes not disclosed during registration</li>
                                    <li>Violating any applicable laws or regulations</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">4. Mail Handling Terms</h2>
                                
                                <h3 className="text-xl font-medium mb-3">4.1 Mail Processing</h3>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Mail is scanned and digitized within 24 hours of receipt</li>
                                    <li>Physical mail is held for 14 days before disposal</li>
                                    <li>You must provide forwarding instructions within the retention period</li>
                                    <li>We reserve the right to refuse certain types of mail</li>
                                </ul>

                                <h3 className="text-xl font-medium mb-3 mt-6">4.2 Prohibited Mail Items</h3>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Hazardous materials or dangerous goods</li>
                                    <li>Perishable items requiring refrigeration</li>
                                    <li>Cash, jewelry, or other valuables</li>
                                    <li>Items requiring special handling or signatures</li>
                                    <li>Mail addressed to third parties</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">5. Payment Terms</h2>
                                
                                <h3 className="text-xl font-medium mb-3">5.1 Subscription Fees</h3>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Fees are charged in advance on a monthly or annual basis</li>
                                    <li>All prices are exclusive of VAT unless otherwise stated</li>
                                    <li>Payment is due immediately upon invoice generation</li>
                                    <li>Failed payments may result in service suspension</li>
                                </ul>

                                <h3 className="text-xl font-medium mb-3 mt-6">5.2 Additional Charges</h3>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Mail forwarding fees apply per item</li>
                                    <li>Excess mail charges for plans with limits</li>
                                    <li>Express processing fees for priority handling</li>
                                    <li>Storage fees for extended mail retention</li>
                                </ul>

                                <h3 className="text-xl font-medium mb-3 mt-6">5.3 Refunds</h3>
                                <p className="text-gray-300 leading-relaxed">
                                    Refunds are provided at our discretion and may be subject to administrative fees. 
                                    No refunds for services already provided or mail already processed.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">6. Service Availability</h2>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>We strive for 99.9% uptime but cannot guarantee uninterrupted service</li>
                                    <li>Scheduled maintenance will be announced in advance when possible</li>
                                    <li>We are not liable for service interruptions due to circumstances beyond our control</li>
                                    <li>Emergency maintenance may be performed without notice</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">7. Data Protection and Privacy</h2>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    Your privacy is important to us. Our data practices are governed by our Privacy Policy, 
                                    which is incorporated into these terms by reference. We comply with GDPR and UK data 
                                    protection laws.
                                </p>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>All mail content is treated as confidential</li>
                                    <li>We implement appropriate security measures</li>
                                    <li>You have rights regarding your personal data</li>
                                    <li>We may be required to disclose information to authorities when legally required</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Our service, including software and content, is protected by intellectual property laws</li>
                                    <li>You may not copy, modify, or distribute our proprietary materials</li>
                                    <li>You retain ownership of your mail content</li>
                                    <li>You grant us a license to process and store your mail as necessary for service delivery</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    To the maximum extent permitted by law, Virtual Address Hub shall not be liable for:
                                </p>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Loss or damage to mail items</li>
                                    <li>Delays in mail processing or delivery</li>
                                    <li>Consequential, indirect, or special damages</li>
                                    <li>Loss of profits, data, or business opportunities</li>
                                    <li>Damages exceeding the amount paid for services in the 12 months preceding the claim</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
                                
                                <h3 className="text-xl font-medium mb-3">10.1 Termination by You</h3>
                                <p className="text-gray-300 leading-relaxed">
                                    You may terminate your account at any time with 30 days' written notice. 
                                    You remain responsible for all charges incurred up to the termination date.
                                </p>

                                <h3 className="text-xl font-medium mb-3 mt-6">10.2 Termination by Us</h3>
                                <p className="text-gray-300 leading-relaxed mb-4">We may terminate your account if:</p>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>You breach these terms of service</li>
                                    <li>You fail to pay fees when due</li>
                                    <li>We suspect fraudulent or illegal activity</li>
                                    <li>Required by law or regulatory authority</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">11. Compliance and Legal Requirements</h2>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>You must comply with all applicable laws and regulations</li>
                                    <li>We may be required to report suspicious activities to authorities</li>
                                    <li>We reserve the right to refuse service to anyone</li>
                                    <li>You are responsible for ensuring your use of our address is lawful</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    We may modify these terms at any time. We will notify you of material changes 
                                    via email or through our service. Continued use of our service after changes 
                                    constitutes acceptance of the new terms.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    These terms are governed by the laws of England and Wales. Any disputes 
                                    will be subject to the exclusive jurisdiction of the courts of England and Wales.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    For questions about these Terms of Service, please contact us:
                                </p>
                                <div className="bg-white/5 rounded-lg p-6">
                                    <p className="text-gray-300">
                                        <strong>Email:</strong> legal@virtualaddresshub.co.uk<br/>
                                        <strong>Address:</strong> Virtual Address Hub, [Your Business Address]<br/>
                                        <strong>Phone:</strong> [Your Phone Number]
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
