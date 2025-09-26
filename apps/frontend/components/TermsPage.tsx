'use client';

import { useMemo } from "react";
import { Button } from "./ui/button";

interface TermsPageProps {
  onNavigate?: (page: string) => void;
}

export function TermsPage({ onNavigate }: TermsPageProps) {
  const go = (page: string) => onNavigate?.(page);
  const sections = [
    {
      heading: "1. What We Offer",
      body: `VirtualAddressHub provides a prestigious London business address service including:
• A Central London address for your business use
• Mail reception and digital scanning
• Secure online dashboard access
• Optional mail forwarding to your personal address
• Customer support for all service-related queries

Your service begins after successful identity verification and payment of the first subscription (monthly or annual).`,
    },
    {
      heading: "2. How You Can Use Your Address",
      body: `You may use your VirtualAddressHub address for:
✅ UK company registration (registered office)
✅ HMRC tax registration and correspondence
✅ Companies House filings and communications
✅ Business banking
✅ Professional correspondence and marketing materials
✅ Business registration with other UK authorities

You may not use your address for:
❌ Personal mail or packages
❌ Illegal activities or prohibited businesses
❌ Reselling or subletting the address to others
❌ Registering multiple unrelated businesses without prior approval`,
    },
    {
      heading: "3. Legal Compliance & Your Responsibilities",
      body: `You must:
• Provide accurate information during signup and verification
• Complete identity verification
• Use the address only for legitimate business purposes
• Notify us of any changes to your business structure or ownership
• Comply with all applicable UK laws and regulations
• Pay all subscription fees and forwarding charges on time

We reserve the right to terminate service if you breach these requirements or if we reasonably believe the address is being used inappropriately.`,
    },
    {
      heading: "4. Service Activation",
      body: `Your virtual address becomes active after:
1. Successful payment of your first subscription (monthly or annual)
2. Completion of identity verification (KYC)
3. Email confirmation from our team

If verification fails or is incomplete after 30 days, we will refund your payment and cancel the service.`,
    },
    {
      heading: "5. Mail Handling",
      body: `When mail arrives at your address, we will:
• Scan the envelope and upload it to your secure dashboard
• Send you an email notification
• Store the physical mail securely for up to 30 days
• Forward mail to your personal address upon request (charges apply)

Mail scanning typically occurs within same day of receipt. We handle HMRC and Companies House mail with priority.`,
    },
    {
      heading: "6. Mail Forwarding",
      body: `Optional mail forwarding is available for:
• HMRC correspondence: Always free
• Companies House mail: Always free
• All other standard UK letters up to 100g: £2 per item

Heavier items, large letters, or any international forwarding will receive a custom postage quote for your approval. Once you approve, we dispatch promptly (same day or next business day where possible) and add the charge to your subscription invoice. No pre-dispatch payment is required.

All forwarding charges (including the £2 items) are added to your subscription and billed on your monthly invoice.`,
    },
    {
      heading: "7. Packages & Parcels",
      body: `We do not accept packages, parcels, or courier deliveries. Only standard postal mail is handled through our service.

If a package is delivered to your address by mistake:
• We will attempt to return it to sender
• You may be charged any associated costs
• We are not responsible for lost or damaged packages

For package delivery services, please consider alternative providers.`,
    },
    {
      heading: "8. Subscriptions & Billing",
      body: `• Monthly subscription: £9.99, charged monthly in advance
• Annual subscription: £89.99, charged yearly in advance (best value)
• Payment via Direct Debit through GoCardless
• No setup fees or long-term contracts required
• You can cancel anytime with 30 days' notice
• Forwarding charges are added to your subscription and billed monthly (even if you are on an annual plan)
• Failed payments may result in service suspension after 7 days

Annual plans renew each year; you can cancel before renewal to avoid future charges. All prices include VAT where applicable.`,
    },
    {
      heading: "9. Data & Privacy",
      body: `We take your privacy seriously:
• All scanned mail is stored securely and encrypted
• Only you and authorised staff can access your mail
• We comply with UK GDPR and Data Protection Act 2018
• Your personal information is never sold to third parties
• See our Privacy Policy for complete details

You can request deletion of scanned mail or your full account at any time.`,
    },
    {
      heading: "10. Your Responsibilities",
      body: `You are responsible for:
• Ensuring your use complies with all applicable laws
• Updating us with any changes to your contact details
• Monitoring your dashboard for important mail
• Paying all fees and charges on time
• Notifying us of any suspicious or incorrectly delivered mail

We are not responsible for mail that is lost, delayed, or delivered to the wrong address by Royal Mail or other postal services.`,
    },
    {
      heading: "11. Service Limitations",
      body: `Our service has some limitations:
• We cannot guarantee delivery times for scanned mail
• Physical mail storage is limited to 30 days
• We do not provide telephone answering or reception services — support is available by email and WhatsApp
• Mail forwarding is subject to carrier delivery times
• Service may be temporarily interrupted for maintenance

We will always notify you in advance of any planned service interruptions.`,
    },
    {
      heading: "12. Termination",
      body: `Either party may terminate this agreement:

You can cancel:
• Anytime with 30 days' written notice
• Your service will continue until the end of your current billing period
• Scanned mail will be deleted 30 days after cancellation

We can terminate:
• With 30 days' notice for any reason
• Immediately for breach of these terms
• Immediately if we reasonably believe the service is being misused

Upon termination, your access to the address and dashboard will end, and any remaining credit will be refunded.`,
    },
    {
      heading: "13. Restricted Industries",
      body: `We cannot provide services to businesses in the following industries:
• Adult entertainment or services
• Gambling or betting services
• Cryptocurrency or digital asset trading
• Debt collection or payday lending
• Multi-level marketing or pyramid schemes
• Any illegal activities under UK law

If your business operates in a restricted industry, please contact us before signing up to discuss alternative solutions.`,
    },
    {
      heading: "14. Acceptable Use & Behaviour",
      body: `You must not:
• Use threatening, abusive, or inappropriate language with our staff
• Attempt to access other customers' mail or accounts
• Share your dashboard login credentials with unauthorised persons
• Use our service for any illegal or fraudulent purposes
• Interfere with our systems or attempt to bypass security measures

Violation of these rules may result in immediate service termination without refund.`,
    },
    {
      heading: "15. Changes to Terms",
      body: `We may update these terms from time to time:
• Changes will be posted on our website
• Significant changes will be emailed to all customers
• Continued use of the service constitutes acceptance of new terms
• If you disagree with changes, you may cancel your service

The latest version of our terms will always be available on our website.`,
    },
    {
      heading: "16. Jurisdiction & Disputes",
      body: `These terms are governed by English law and subject to the jurisdiction of English courts.

For any disputes:
1. Contact our support team first: support@virtualaddresshub.co.uk
2. We aim to resolve all complaints within 5 business days
3. If unresolved, you may refer the matter to the relevant ombudsman
4. As a last resort, disputes may be taken to the English courts

We are committed to resolving any issues quickly and fairly.`,
    },
    {
      heading: "17. Contact Information",
      body: `For questions about these terms or our service:

📧 Email: support@virtualaddresshub.co.uk  
💬 WhatsApp: Our dedicated WhatsApp Business line for secure support

Our UK-based support team is available during business hours to help with any questions or concerns.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-6 py-12 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">
            Terms of Service
          </h1>
          <p className="text-muted-foreground">
            Clear, fair terms for our service
          </p>
        </header>

        <section className="space-y-3">
          <p className="text-muted-foreground">
            Welcome to VirtualAddressHub. By signing up you
            agree to the terms below. They explain what we
            provide, how our service works, and our mutual
            responsibilities.
          </p>
        </section>

        {sections.map((section, index) => {
          // Special handling for Contact Information section with WhatsApp button
          if (section.heading === "17. Contact Information") {
            return (
              <section key={index} className="space-y-2">
                <h2 className="text-xl font-semibold">
                  {section.heading}
                </h2>
                <p className="text-muted-foreground">
                  For questions about these terms or our service:
                </p>
                <p className="text-muted-foreground">
                  📧 Email: support@virtualaddresshub.co.uk
                </p>
                <p className="text-muted-foreground">
                  💬 WhatsApp: Our dedicated WhatsApp Business line for secure support
                </p>
                <div className="pt-2">
                  <a
                    href="https://wa.me/YOURWHATSAPPNUMBER"
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Message on WhatsApp
                  </a>
                </div>
                <p className="text-muted-foreground">
                  Our UK-based support team is available during business hours to help with any questions or concerns.
                </p>
              </section>
            );
          }

          // Default rendering for other sections
          return (
            <section key={index} className="space-y-2">
              <h2 className="text-xl font-semibold">
                {section.heading}
              </h2>
              <div className="text-muted-foreground space-y-1">
                {section.body.split('\n').map((paragraph, pIndex) => {
                  if (paragraph.trim().startsWith('•') || paragraph.trim().startsWith('✅') || paragraph.trim().startsWith('❌')) {
                    // Handle bullet points
                    const lines = section.body.split('\n').filter(line =>
                      line.trim().startsWith('•') || line.trim().startsWith('✅') || line.trim().startsWith('❌')
                    );
                    if (pIndex === 0) {
                      return (
                        <ul key={pIndex} className="list-disc pl-6 space-y-1">
                          {lines.map((line, lIndex) => (
                            <li key={lIndex}>{line.trim().substring(1).trim()}</li>
                          ))}
                        </ul>
                      );
                    }
                    return null;
                  } else if (paragraph.trim()) {
                    return <p key={pIndex}>{paragraph}</p>;
                  }
                  return null;
                })}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
