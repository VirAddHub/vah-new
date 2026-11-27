import type { Metadata } from 'next';
import { OG_IMAGES } from '@/lib/site';
import { ServicesOverview } from '@/components/marketing/ServicesOverview';
const title = 'London Virtual Office & Mail Services | VirtualAddressHub';
const description =
  'One subscription for a London SE1 business address by Tower Bridge, eligible registered office and director’s address use, digital mail scanning and online mail management. See forwarding charges.';
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/services' },
  openGraph: {
    images: OG_IMAGES, title, description, url: '/services', type: 'website' },
};
export default function Page() {
  return <ServicesOverview />;
}
