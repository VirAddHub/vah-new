import type { Metadata } from 'next';
import { ServicePage } from '@/components/marketing/ServicePage';
const title = 'Director’s Service Address: Privacy & Correspondence' + ' | VirtualAddressHub';
const description =
  'Understand a director’s service address, how it differs from a residential or registered office address, and what it can and cannot do for privacy.';
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/directors-service-address' },
  openGraph: { title, description, url: '/directors-service-address', type: 'website' },
};
export default function Page() {
  return <ServicePage slug="directors-service-address" />;
}
