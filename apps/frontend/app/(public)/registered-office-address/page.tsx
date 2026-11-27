import type { Metadata } from 'next';
import { OG_IMAGES } from '@/lib/site';
import { ServicePage } from '@/components/marketing/ServicePage';
const title = 'Registered Office Address London: Company Requirements' + ' | VirtualAddressHub';
const description =
  'Understand registered office address use for eligible companies in England and Wales, jurisdiction rules and changing your address. Included in the VirtualAddressHub subscription.';
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/registered-office-address' },
  openGraph: {
    images: OG_IMAGES, title, description, url: '/registered-office-address', type: 'website' },
};
export default function Page() {
  return <ServicePage slug="registered-office-address" />;
}
