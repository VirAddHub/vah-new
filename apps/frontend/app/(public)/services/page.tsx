import type { Metadata } from 'next';
import { ServicesOverview } from '@/components/marketing/ServicesOverview';
const title = 'London Virtual Office & Mail Services | VirtualAddressHub';
const description =
  'One subscription for a Central London business address, eligible registered office and director’s address use, digital mail scanning and online mail management. See forwarding charges.';
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/services' },
  openGraph: { title, description, url: '/services', type: 'website' },
};
export default function Page() {
  return <ServicesOverview />;
}
