import type { Metadata } from 'next';
import { ServicePage } from '@/components/marketing/ServicePage';
import { services } from '@/lib/marketing';
const service = services.find((v) => v.slug === 'directors-service-address')!;
export const metadata: Metadata = {
  title: `${service.title} | VirtualAddressHub`,
  description: service.intro,
  alternates: { canonical: '/directors-service-address' },
};
export default function Page() {
  return <ServicePage slug="directors-service-address" />;
}
