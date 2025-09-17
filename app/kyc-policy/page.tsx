import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/Footer';

export default function KycPolicyPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 py-20">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="prose prose-invert max-w-none">
                        <h1 className="text-4xl font-bold mb-8">KYC (Know Your Customer) Policy</h1>
                        <p className="text-lg text-gray-300 mb-8">
                            Last updated: {new Date().toLocaleDateString('en-GB')}
                        </p>

                        <div className="space-y-8">
                            <section>
                                <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    Virtual Address Hub is committed to maintaining the highest standards of compliance 
                                    with anti-money laundering (AML) and Know Your Customer (KYC) regulations. This policy 
                                    outlines our requirements for customer identification and verification to ensure 
                                    the integrity of our services and compliance with UK financial regulations.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">2. Legal Basis</h2>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    Our KYC procedures are designed to comply with:
                                </p>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Money Laundering, Terrorist Financing and Transfer of Funds (Information on the Payer) Regulations 2017</li>
                                    <li>Proceeds of Crime Act 2002</li>
                                    <li>Terrorism Act 2000</li>
                                    <li>Financial Services and Markets Act 2000</li>
                                    <li>General Data Protection Regulation (GDPR)</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">3. Customer Identification Requirements</h2>
                                
                                <h3 className="text-xl font-medium mb-3">3.1 Individual Customers</h3>
                                <p className="text-gray-300 leading-relaxed mb-4">We require the following documents:</p>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Valid government-issued photo ID (passport, driving license, or national ID card)</li>
                                    <li>Proof of address (utility bill, bank statement, or council tax bill dated within 3 months)</li>
                                    <li>Selfie photo for facial verification</li>
                                    <li>Additional documents may be required for enhanced due diligence</li>
                                </ul>

                                <h3 className="text-xl font-medium mb-3 mt-6">3.2 Business Customers</h3>
                                <p className="text-gray-300 leading-relaxed mb-4">For companies, we require:</p>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Certificate of Incorporation</li>
                                    <li>Memorandum and Articles of Association</li>
                                    <li>Register of Directors and Shareholders</li>
                                    <li>Proof of registered office address</li>
                                    <li>Identity verification for all directors and beneficial owners (25%+ ownership)</li>
                                    <li>Ultimate Beneficial Owner (UBO) declaration</li>
                                </ul>

                                <h3 className="text-xl font-medium mb-3 mt-6">3.3 Partnership and Trust Customers</h3>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Partnership agreement or trust deed</li>
                                    <li>Identity verification for all partners or trustees</li>
                                    <li>Proof of business address</li>
                                    <li>Beneficial ownership information</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">4. Verification Process</h2>
                                
                                <h3 className="text-xl font-medium mb-3">4.1 Document Verification</h3>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>All documents must be clear, legible, and unaltered</li>
                                    <li>Documents must be in English or accompanied by certified translations</li>
                                    <li>We use automated verification systems and manual review</li>
                                    <li>Original documents may be requested for verification</li>
                                </ul>

                                <h3 className="text-xl font-medium mb-3 mt-6">4.2 Identity Verification</h3>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Facial recognition technology for selfie verification</li>
                                    <li>Document authenticity checks using advanced algorithms</li>
                                    <li>Cross-referencing with official databases where available</li>
                                    <li>Manual review by trained compliance officers</li>
                                </ul>

                                <h3 className="text-xl font-medium mb-3 mt-6">4.3 Address Verification</h3>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Proof of address must be recent (within 3 months)</li>
                                    <li>Documents must show your full name and address</li>
                                    <li>We may conduct additional address verification checks</li>
                                    <li>Virtual addresses are not accepted as proof of residence</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">5. Enhanced Due Diligence (EDD)</h2>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    Enhanced due diligence is required for customers who present higher risk, including:
                                </p>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Politically Exposed Persons (PEPs)</li>
                                    <li>Customers from high-risk jurisdictions</li>
                                    <li>Customers with complex ownership structures</li>
                                    <li>Customers with unusual transaction patterns</li>
                                    <li>Customers in high-risk industries</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">6. Ongoing Monitoring</h2>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Regular review of customer information and risk profiles</li>
                                    <li>Monitoring of transaction patterns and behaviors</li>
                                    <li>Periodic re-verification of customer identity</li>
                                    <li>Updates to customer information as required</li>
                                    <li>Continuous screening against sanctions lists</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">7. Data Protection and Security</h2>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    We take the security of your personal information seriously:
                                </p>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>All documents are encrypted during transmission and storage</li>
                                    <li>Access to personal data is restricted to authorized personnel only</li>
                                    <li>Regular security audits and penetration testing</li>
                                    <li>Compliance with GDPR and UK data protection laws</li>
                                    <li>Secure disposal of documents after retention period</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">8. Retention of Information</h2>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>KYC documents are retained for 5 years after account closure</li>
                                    <li>Transaction records are kept for 5 years from the date of the transaction</li>
                                    <li>Correspondence and communications are retained for 7 years</li>
                                    <li>All data is securely destroyed after the retention period</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">9. Suspicious Activity Reporting</h2>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    We are required to report suspicious activities to the National Crime Agency (NCA). 
                                    This includes:
                                </p>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Unusual transaction patterns</li>
                                    <li>Attempts to avoid verification requirements</li>
                                    <li>Use of false or fraudulent documents</li>
                                    <li>Activities that may indicate money laundering or terrorist financing</li>
                                    <li>Any other activities that raise suspicion</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">10. Customer Rights</h2>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    Under GDPR and UK data protection laws, you have the right to:
                                </p>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Access your personal data</li>
                                    <li>Request correction of inaccurate information</li>
                                    <li>Request deletion of your data (subject to legal requirements)</li>
                                    <li>Object to processing of your data</li>
                                    <li>Data portability</li>
                                    <li>Withdraw consent where applicable</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">11. Consequences of Non-Compliance</h2>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    Failure to provide required documentation or comply with KYC requirements may result in:
                                </p>
                                <ul className="list-disc list-inside text-gray-300 space-y-2">
                                    <li>Account suspension or closure</li>
                                    <li>Refusal to process transactions</li>
                                    <li>Reporting to relevant authorities</li>
                                    <li>Legal action where appropriate</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">12. Changes to This Policy</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    We may update this KYC Policy from time to time to reflect changes in regulations 
                                    or our business practices. We will notify you of any material changes and post the 
                                    updated policy on our website.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">13. Contact Information</h2>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    For questions about our KYC Policy or to request information about your data, please contact us:
                                </p>
                                <div className="bg-white/5 rounded-lg p-6">
                                    <p className="text-gray-300">
                                        <strong>Compliance Team:</strong> compliance@virtualaddresshub.co.uk<br/>
                                        <strong>Data Protection Officer:</strong> dpo@virtualaddresshub.co.uk<br/>
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
