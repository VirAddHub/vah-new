import type { Metadata } from 'next';
import { InformationPage } from '@/components/marketing/InformationPage';
export const metadata: Metadata = {
  title: 'How your London virtual office works' + ' | VirtualAddressHub',
  description: 'From application to your first letter',
  alternates: { canonical: '/how-it-works' },
};
export default function Page() {
  return (
    <InformationPage
      title="How your London virtual office works"
      kicker="From application to your first letter"
    >
      <h2>1. Choose your subscription</h2>
      <p>
        Review the current monthly and annual plans, included services and forwarding conditions.
      </p>
      <h2>2. Create your account and pay</h2>
      <p>
        Provide your account and business details and complete the checkout steps. Your subscription
        and account eligibility are separate.
      </p>
      <h2>3. Complete required checks</h2>
      <p>
        Follow identity verification instructions and provide required business and owner
        information. Additional information may be requested.
      </p>
      <h2>4. Wait for approval</h2>
      <p>
        Do not use the address until your required checks are complete and your account has been
        approved. Payment alone does not authorise address use or lift an administrative suspension.
      </p>
      <h2>5. Put your address to work</h2>
      <p>
        Once approved, use the address for permitted business purposes and update your
        correspondence details where appropriate.
      </p>
      <h2>6. Manage your mail online</h2>
      <p>
        View available scans, download documents and request eligible originals through your
        customer dashboard. Check retention and forwarding rules before you need an original.
      </p>
    </InformationPage>
  );
}
