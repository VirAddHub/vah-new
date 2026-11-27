import type { Metadata } from 'next';
import { OG_IMAGES } from '@/lib/site';
import { HelpPage } from '@/components/HelpPage';
const title = 'Help Centre | VirtualAddressHub';
const description =
  'Practical help with your London business address, digital mail, billing, verification and account. Search support answers and step-by-step guides.';
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/help' },
  openGraph: {
    images: OG_IMAGES, title, description, url: '/help', type: 'website' },
};
export default function Help() {
  return <HelpPage />;
}
