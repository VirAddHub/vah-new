"use client";

import { useMemo } from "react";
import { Button } from "./ui/button";

interface KYCPolicyPageProps {
  onNavigate?: (page: string) => void;
}

export function KYCPolicyPage({ onNavigate }: KYCPolicyPageProps) {
  const go = (page: string) => onNavigate?.(page);
  const sections = [
    {
      heading: "Who Needs to Complete ID Verification?",
      body: `All VirtualAddressHub customers must complete identity verification before we can activate your service. This includes:

• Individual business owners  
• Directors and anyone with significant control (e.g. UBOs/PSCs)  
• Anyone authorised to act on behalf of the business  

This is required under UK anti-money laundering (AML) rules (HMRC supervision). Where relevant, we may need to verify ultimate beneficial owners (typically individuals with 25% or more ownership or control).`,
    },
    {
      heading: "How Verification Works (Quick Steps)",
      body: `1) Create your account and confirm your contact details.  
2) Upload your Proof of Identity and Proof of Address.  
3) Provide basic business details and list any people with significant control (PSCs/UBOs).  
4) We run automated checks; if anything needs clarifying, our compliance team may email you for more information.  
5) Approval & address issued — you'll receive your official London address and dashboard access.  
6) Ongoing compliance — please keep your details up to date and tell us about any material changes (e.g. directors/ownership).`,
    },
    {
      heading: "What Documents Do I Need?",
      body: `Proof of Identity (one of):  
• Passport  
• National ID card  
• Driving licence  
• Residence permit  

Proof of Address (issued within the last 3 months):  
• Bank statement  
• Utility bill (gas, electricity, water, internet, landline)  
• Council tax or government-issued tax bill  
• Official government correspondence (e.g. HMRC or local authority)  
• Lease agreement or mortgage statement  

Documents must be clear, unedited, show all four corners, and meet the date requirements. Screenshots are not accepted unless explicitly allowed during upload.`,
    },
    {
      heading: "International Applicants",
      body: `We support applicants from most countries and document types. You typically do not need certified copies, apostilles, or translations unless specifically requested during review.`,
    },
    {
      heading: "Corporate Shareholders (KYB)",
      body: `If your company has corporate shareholders or a complex structure, we may request supporting documentation. This can include:

• Company registration certificates  
• Details of ultimate beneficial owners (UBOs)  
• Organisational structure charts  
• Authorisation letters (if applicable)  

As a general rule, UBOs are individuals who ultimately own or control 25% or more of the business.`,
    },
    {
      heading: "When Does My Service Begin?",
      body: `Your VirtualAddressHub service becomes active once your verification is approved.

Timelines:  
• Instant approval: for most applicants  
• Manual review: up to 24 hours  
• Additional checks: 2–3 business days if more information is needed  

We'll notify you by email once your account is active and ready to receive mail.`,
    },

    {
      heading: "Need Help?",
      body: `If you have questions about document uploads or run into issues during verification:

📧 Email: support@virtualaddresshub.co.uk  
💬 WhatsApp: Our dedicated WhatsApp Business line for secure support

Our UK-based support team is here to help.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-6 py-12 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">
            KYC Policy
          </h1>
          <p className="text-muted-foreground">
            Identity verification made simple
          </p>
        </header>

        <section className="space-y-3">
          <p className="text-muted-foreground">
            Helping keep your business secure and compliant
            with UK regulations.
          </p>
        </section>

        {sections.map((section, index) => {
          // Special handling for Need Help section with WhatsApp button
          if (section.heading === "Need Help?") {
            return (
              <section key={index} className="space-y-2">
                <h2 className="text-xl font-semibold">
                  {section.heading}
                </h2>
                <p className="text-muted-foreground">
                  If you have questions about document uploads or run into issues during verification:
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
                  Our UK-based support team is here to help.
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
                  if (paragraph.trim().startsWith('•')) {
                    // Handle bullet points
                    const lines = section.body.split('\n').filter(line => 
                      line.trim().startsWith('•')
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
