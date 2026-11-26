import type { Metadata } from 'next';
import { InformationPage } from '@/components/marketing/InformationPage';
export const metadata: Metadata = {
  title: 'Cookie information' + ' | VirtualAddressHub',
  description: 'Your privacy',
  alternates: { canonical: '/cookies' },
};
export default function Page() {
  return (
    <InformationPage title="Cookie information" kicker="Your privacy">
      <p>
        VirtualAddressHub uses cookies to support account sessions and security checks. Read our
        privacy policy for information about personal data and contact the team with questions about
        your browser settings.
      </p>
      <p>
        Blocking essential session cookies may prevent you from signing in or using protected
        account features.
      </p>
      <p>
        <a href="/privacy">Read the privacy policy →</a>
      </p>
    </InformationPage>
  );
}
