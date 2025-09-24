"use client";

import { useMemo } from "react";
import { Button } from "./ui/button";

interface PrivacyPolicyPageProps {
  onNavigate?: (page: string) => void; // e.g. onNavigate("contact")
}

export function PrivacyPolicyPage({
  onNavigate,
}: PrivacyPolicyPageProps) {
  const go = (page: string) => onNavigate?.(page);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-6 py-12 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">
            Your privacy matters to us
          </p>
        </header>

        <section className="space-y-3">
          <p className="text-muted-foreground">
            At VirtualAddressHub, your privacy matters. We only
            collect the information we need to deliver your
            service securely, legally, and efficiently. This
            policy explains how we handle your data in
            accordance with the UK GDPR and the Data Protection
            Act 2018.
          </p>
        </section>

        {/* 1. Who We Are */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            1. Who We Are
          </h2>
          <div className="text-muted-foreground space-y-1">
            <p>
              <span className="font-medium text-foreground">
                Business name:
              </span>{" "}
              VirtualAddressHub
            </p>
            {/* Registered address removed as requested */}
            <p>
              <span className="font-medium text-foreground">
                Company number:
              </span>{" "}
              [INSERT COMPANY NUMBER]
            </p>
            <p>
              <span className="font-medium text-foreground">
                ICO registration number:
              </span>{" "}
              [INSERT ICO NUMBER]
            </p>
            <p>
              <span className="font-medium text-foreground">
                HMRC AML supervision number:
              </span>{" "}
              [INSERT HMRC AML NUMBER]
            </p>
            <p>
              <span className="font-medium text-foreground">
                Contact email:
              </span>{" "}
              support@virtualaddresshub.co.uk
            </p>
          </div>
        </section>

        {/* 2. What We Collect */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            2. What We Collect
          </h2>
          <p className="text-muted-foreground">
            Depending on how you use our service, we may
            collect:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Your name</li>
            <li>Email address and phone number</li>
            <li>Billing and forwarding address</li>
            <li>
              Scanned mail sent to your VirtualAddressHub
              address
            </li>
            <li>
              Proof of ID and address (for legal compliance)
            </li>
            <li>
              Login and usage logs (e.g. IP address, browser
              type, device info)
            </li>
            <li>Essential cookie data (see Section 6)</li>
          </ul>
          <p className="text-muted-foreground">
            Scanned mail is stored via secure cloud folders
            accessible only to you and authorised staff.
          </p>
        </section>

        {/* 3. Why We Use Your Data */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            3. Why We Use Your Data
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>
              Provide your virtual address and mail-handling
              service
            </li>
            <li>
              Verify your identity (to meet HMRC AML
              regulations)
            </li>
            <li>Notify you when mail is received</li>
            <li>Deliver scanned post through your dashboard</li>
            <li>Forward mail when requested</li>
            <li>Manage your subscription and billing</li>
            <li>Improve the platform and user experience</li>
            <li>
              Meet legal obligations (e.g. record-keeping,
              invoicing)
            </li>
          </ul>
        </section>

        {/* 4. Legal Grounds */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            4. Legal Grounds for Processing
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>
              <span className="font-medium text-foreground">
                Contract
              </span>{" "}
              – to deliver the service you've signed up for
            </li>
            <li>
              <span className="font-medium text-foreground">
                Legal obligation
              </span>{" "}
              – for ID checks and HMRC compliance
            </li>
          </ul>
        </section>

        {/* 5. Data Retention */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            5. Data Retention
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>
              Scanned post is stored securely while your account
              is active
            </li>
            <li>
              You may request deletion of specific scans or your
              full archive
            </li>
            <li>
              After cancellation, scans are deleted after 30
              days unless legally required to retain
            </li>
          </ul>
        </section>

        {/* 6. Cookies */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            6. 🍪 Cookie Policy
          </h2>
          <p className="text-muted-foreground">
            We only use essential cookies set by our website
            platform. These are required to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Keep you securely logged in</li>
            <li>Maintain session activity</li>
            <li>Prevent security threats (e.g. CSRF)</li>
            <li>Load pages efficiently</li>
          </ul>
          <p className="text-muted-foreground">
            We do NOT use cookies for:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Analytics</li>
            <li>Marketing</li>
            <li>Tracking</li>
            <li>Advertising</li>
            <li>Embedded ads or media</li>
          </ul>
          <p className="text-muted-foreground">
            Because we only use strictly necessary cookies, no
            cookie banner is required under PECR or UK GDPR. If
            we ever introduce optional cookies, we will ask for
            your consent first.
          </p>
        </section>

        {/* 7. Your Rights */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            7. Your Rights
          </h2>
          <p className="text-muted-foreground">
            Under UK GDPR, you have the right to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Access your personal data</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your data</li>
            <li>Restrict or object to how your data is used</li>
            <li>Request data portability</li>
            <li>Withdraw consent (where applicable)</li>
            <li>Lodge a complaint with the ICO</li>
          </ul>
        </section>

        {/* 8. Security */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            8. How We Keep Your Data Safe
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>All data is stored securely within the UK</li>
            <li>
              Scanned documents are delivered via secure
              download links
            </li>
            <li>Files are encrypted and access-controlled</li>
            <li>
              Only trained, KYC-verified staff may access mail
            </li>
            <li>
              All systems use enterprise-grade authentication
              and infrastructure
            </li>
          </ul>
        </section>

        {/* 9. Payment Information */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            9. Payment Information
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>
              We use a regulated third-party provider to process
              Direct Debit payments
            </li>
            <li>We do NOT store your full bank details</li>
            <li>
              Payment information is encrypted and securely
              handled
            </li>
            <li>
              We retain metadata (e.g. payment status,
              timestamps) for billing and audit purposes
            </li>
            <li>
              You can view their privacy policy at any time via
              their platform:&nbsp;
              <a
                href="https://gocardless.com/legal/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
              >
                GoCardless Privacy Policy
              </a>
            </li>
          </ul>
        </section>

        {/* 10. Sharing */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            10. Who We Share Your Data With
          </h2>
          <p className="text-muted-foreground">
            We only share your data with trusted service
            providers where strictly necessary to deliver your
            service or comply with UK law. This includes:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>
              Payment processing partners – for secure billing
            </li>
            <li>
              Email service providers – for account
              notifications
            </li>
            <li>
              Cloud storage providers – to store your scanned
              mail
            </li>
            <li>
              Identity verification providers – to meet UK AML
              obligations
            </li>
            <li>
              Postal carriers – when you request a physical mail
              item to be forwarded
            </li>
          </ul>
          <p className="text-muted-foreground">
            We do NOT share or sell your data to advertisers or
            marketing companies. Your personal information is
            handled with strict confidentiality and care.
          </p>
        </section>

        {/* 11. Transfers */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            11. International Data Transfers
          </h2>
          <p className="text-muted-foreground">
            All data is currently hosted within the UK. If this
            ever changes:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>
              We will only transfer data to countries approved
              by the UK government, or
            </li>
            <li>
              Use appropriate safeguards such as standard
              contractual clauses
            </li>
          </ul>
        </section>

        {/* 12. External Services */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            12. External Services
          </h2>
          <p className="text-muted-foreground">
            Some dashboard features may link to third-party
            providers (e.g. for ID verification or payment
            setup). We recommend reviewing their privacy
            policies before submitting any information via
            external platforms.
          </p>
        </section>

        {/* 13. Contact */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            13. How to Contact Us
          </h2>
          <p className="text-muted-foreground">
            To make a request or ask a question:
          </p>
          <p className="text-muted-foreground">
            📧 Email: support@virtualaddresshub.co.uk
          </p>
          <p className="text-muted-foreground">
            💬 WhatsApp: Our dedicated WhatsApp Business line for secure support
          </p>
          <div className="space-y-2 pt-2">
            <div>
              <a
                href="https://wa.me/YOURWHATSAPPNUMBER"
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors mr-4"
              >
                Message on WhatsApp
              </a>
              <Button
                variant="outline"
                onClick={() => go?.("contact")}
              >
                Go to Contact Form
              </Button>
            </div>
          </div>
        </section>

        {/* 14. Updates */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            14. Policy Updates
          </h2>
          <p className="text-muted-foreground">
            We may update this policy from time to time. The
            latest version will always be published on our
            website. If we make any significant changes, we will
            notify you directly.
          </p>
        </section>
      </main>
    </div>
  );
}
