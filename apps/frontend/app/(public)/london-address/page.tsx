import type { Metadata } from 'next';
import { InformationPage } from '@/components/marketing/InformationPage';
export const metadata: Metadata = {
  title: 'Our London business address' + ' | VirtualAddressHub',
  description: 'Tanner Street · London SE1',
  alternates: { canonical: '/london-address' },
};
export default function Page() {
  return (
    <InformationPage title="Our London business address" kicker="Tanner Street · London SE1">
      <p>A correspondence address for your approved business, with mail managed online.</p>
      <address className="not-italic text-2xl leading-relaxed">
        Second Floor, Tanner Place
        <br />
        54–58 Tanner Street
        <br />
        London SE1 3PH
        <br />
        United Kingdom
      </address>
      <h2 className="mt-10">What you can use it for</h2>
      <p>
        Business correspondence, your website and invoices, and eligible registered office and
        director’s service address use. You must complete the required checks and receive approval
        first.
      </p>
      <h2>What the service does not include</h2>
      <p>
        Workspace, desks, meeting rooms, customer visits, parcel handling or telephone services.
        Please do not describe the address as premises where your business physically operates.
      </p>
    </InformationPage>
  );
}
