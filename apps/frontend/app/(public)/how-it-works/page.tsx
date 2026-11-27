import type { Metadata } from 'next';
import { OG_IMAGES } from '@/lib/site';
import { HowItWorks } from '@/components/marketing/HowItWorks';
const title = 'How It Works: Your London Address & Mail | VirtualAddressHub';
const description =
  'From choosing a subscription and completing verification to account approval, receiving your address, reading scans and requesting original letters.';
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/how-it-works' },
  openGraph: {
    images: OG_IMAGES, title, description, url: '/how-it-works', type: 'website' },
};
export default function Page() {
  return <HowItWorks />;
}
