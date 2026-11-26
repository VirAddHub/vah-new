import type { Metadata } from 'next';
import { ServicePage } from '@/components/marketing/ServicePage';
import { services } from '@/lib/marketing';
const service = services.find((v) => v.slug === 'virtual-office-london')!;
export const metadata: Metadata = {
  title: `${service.title} | VirtualAddressHub`,
  description: service.intro,
  alternates: { canonical: '/virtual-office-london' },
};
export default function Page() {
  return <ServicePage slug="virtual-office-london" />;
}
