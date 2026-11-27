import type { Metadata } from 'next';
import Link from 'next/link';
import { InformationPage } from '@/components/marketing/InformationPage';
const title = 'How It Works: Your London Address & Mail | VirtualAddressHub';
const description =
  'From choosing a subscription and completing verification to account approval, receiving your address, reading scans and requesting original letters.';
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/how-it-works' },
  openGraph: { title, description, url: '/how-it-works', type: 'website' },
};
const steps = [
  [
    'Choose your subscription',
    'Compare current monthly and annual plans, what is included and the forwarding conditions.',
  ],
  [
    'Create your account',
    'Provide your account and business information accurately. Keep your sign-in details secure.',
  ],
  [
    'Complete payment and required verification',
    'Follow checkout and identity verification instructions. Supply required business and owner information; further information may be requested.',
  ],
  [
    'Wait for account approval',
    'Do not use the address while checks are incomplete. Payment does not override verification requirements or an administrative suspension.',
  ],
  [
    'Access your approved business address',
    'Once approved, obtain your complete address in your account. Use it only for permitted purposes and make any required company filings yourself or through your adviser.',
  ],
  [
    'Receive business correspondence',
    'Tell relevant senders your approved address. We handle eligible letters arriving for your business; parcels and bulky items are not accepted.',
  ],
  [
    'Read available digital scans',
    'Open your customer dashboard to view and download available correspondence. Access remains subject to your subscription, account standing and required checks.',
  ],
  [
    'Request an original when you need it',
    'Request eligible physical forwarding through your account before the retention window closes. Review forwarding charges and keep your delivery details current.',
  ],
];
export default function Page() {
  return (
    <InformationPage title="From choosing your plan to reading your post." kicker="HOW IT WORKS">
      <p>
        Here is the customer journey. For a full explanation of the package,{' '}
        <Link href="/services">explore our services</Link>.
      </p>
      <ol style={{ listStyle: 'none', padding: 0 }}>
        {steps.map(([heading, body], index) => (
          <li key={heading} style={{ borderTop: '1px solid #cbd7c5', padding: '24px 0' }}>
            <p style={{ fontSize: 11, letterSpacing: '.12em', color: '#526b50' }}>
              STEP {String(index + 1).padStart(2, '0')}
            </p>
            <h2>{heading}</h2>
            <p>{body}</p>
          </li>
        ))}
      </ol>
      <p>
        Have questions about your business’s eligibility?{' '}
        <Link href="/contact">Contact us before subscribing</Link>. Review the{' '}
        <Link href="/terms">service terms</Link> for renewal, cancellation and retention conditions.
      </p>
    </InformationPage>
  );
}
