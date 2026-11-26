import type { Metadata } from 'next';
import Link from 'next/link';
import { InformationPage } from '@/components/marketing/InformationPage';
export const metadata: Metadata = {
  title: 'Make an informed start' + ' | VirtualAddressHub',
  description: 'Business address knowledge hub',
  alternates: { canonical: '/guides' },
};
export default function Page() {
  return (
    <InformationPage title="Make an informed start" kicker="Business address knowledge hub">
      <p>Understand the different addresses a business uses before choosing yours.</p>
      <h2>Registered office or director’s service address?</h2>
      <p>
        A registered office is for official company correspondence. A director’s service address is
        for correspondence about that person’s role. Both can be public; neither should be confused
        with the residential details you must provide privately.
      </p>
      <p>
        <a href="/registered-office-address">Explore registered offices →</a>
        <br />
        <a href="/directors-service-address">Explore director’s service addresses →</a>
      </p>
      <h2>Protecting your home address</h2>
      <p>
        Choosing a separate address for new filings does not automatically remove historic
        disclosures. Check the current Companies House guidance before making changes.
      </p>
      <p>
        <a href="https://www.gov.uk/guidance/your-personal-information-on-the-companies-house-register">
          Read the official Companies House guidance →
        </a>
      </p>
      <h2>A virtual office is not a workspace</h2>
      <p>
        An address service can receive business correspondence while you work elsewhere. It does not
        establish a staffed location that customers can visit.
      </p>
      <p>
        <a href="https://support.google.com/business/answer/3038177">
          Read Google’s business representation guidelines →
        </a>
      </p>
      <h2>More practical help</h2>
      <p>
        <Link href="/blog">Browse business articles →</Link>
        <br />
        <Link href="/help">Visit the help centre →</Link>
      </p>
    </InformationPage>
  );
}
