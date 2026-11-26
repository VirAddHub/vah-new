import type { Metadata } from 'next';
import { ServicePage } from '@/components/marketing/ServicePage';
import { services } from '@/lib/marketing';
const service = services.find((v) => v.slug === 'registered-office-address')!;
export const metadata: Metadata = {
  title: `${service.title} | VirtualAddressHub`,
  description: service.intro,
  alternates: { canonical: '/registered-office-address' },
};
export default function Page() {
  return <ServicePage slug="registered-office-address" />;
}
