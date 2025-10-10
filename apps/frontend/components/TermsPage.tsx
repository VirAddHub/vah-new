'use client';

import { useMemo } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowLeft, FileText, ShieldCheck, CheckCircle, XCircle } from "lucide-react";

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
      heading: "4. Payment Terms",
      body: `• Subscription fees are charged monthly or annually in advance
• All prices are in GBP and include VAT where applicable
• Payment is due on the anniversary of your signup date
• Failed payments may result in service suspension
• Refunds are available within 14 days of initial signup
• Additional forwarding charges are billed separately`,
    },
    {
      heading: "5. Data Protection & Privacy",
      body: `• We are GDPR compliant and ICO registered
• Your personal data is processed securely and confidentially
• We only share data with third parties as required for service delivery
• You have the right to access, correct, or delete your personal data
• Mail content is scanned and stored securely for your access
• We retain data only as long as necessary for service provision`,
    },
    {
      heading: "6. Service Availability & Limitations",
      body: `• Mail scanning is available on business days (Monday-Friday)
• We aim to scan mail within 24 hours of receipt
• Service may be temporarily unavailable for maintenance
• We are not responsible for mail lost in transit to our address
• Forwarding services are subject to postal service availability
• We reserve the right to modify service features with notice`,
    },
    {
      heading: "7. Termination",
      body: `• You may cancel your subscription at any time
• Cancellation takes effect at the end of your current billing period
• We may terminate service for breach of these terms
• Upon termination, you must update your registered address with Companies House
• We will forward any remaining mail for 30 days after termination
• Data will be securely deleted after the retention period`,
    },
    {
      heading: "8. Limitation of Liability",
      body: `• Our liability is limited to the amount paid for the service
• We are not liable for indirect or consequential damages
• We do not guarantee specific business outcomes from using our service
• Force majeure events may affect service delivery
• This limitation does not affect your statutory rights
• Professional indemnity insurance covers our operations`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container-modern py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => go('home')}
              className="btn-outline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <h1 className="text-2xl font-bold">Terms of Service</h1>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-b from-background to-muted/30">
        <div className="container-modern">
          <div className="text-center mb-16">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-bold leading-tight text-[clamp(2rem,5vw,4rem)] text-balance mb-6">
              Terms of <span className="text-gradient">Service</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
              Please read these terms carefully before using our virtual address services. 
              By using our service, you agree to be bound by these terms.
            </p>
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="section-padding">
        <div className="container-modern">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {sections.map((section, index) => (
                <Card key={index} className="card-modern">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      {section.heading}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-gray max-w-none">
                      <div className="whitespace-pre-line text-muted-foreground leading-relaxed">
                        {section.body}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="section-padding bg-gradient-to-b from-muted/30 to-background">
        <div className="container-modern">
          <div className="max-w-4xl mx-auto">
            <Card className="card-modern p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-warning to-warning/90 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                  <ShieldCheck className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Important Notice</h3>
                <p className="text-muted-foreground mb-6 text-balance">
                  These terms are effective as of the date you sign up for our service. 
                  We may update these terms from time to time, and we'll notify you of any changes.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  <Badge variant="success" className="bg-success/20 text-success">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    GDPR Compliant
                  </Badge>
                  <Badge variant="secondary" className="bg-primary/20 text-primary">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    ICO Registered
                  </Badge>
                  <Badge variant="secondary" className="bg-secondary/20 text-secondary">
                    <FileText className="w-3 h-3 mr-1" />
                    Legal Review
                  </Badge>
                </div>
                <Button
                  onClick={() => go('contact')}
                  className="btn-primary"
                >
                  Questions About These Terms?
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}