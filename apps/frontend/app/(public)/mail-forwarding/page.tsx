import type { Metadata } from 'next';
import { ServicePage } from '@/components/marketing/ServicePage';
import { services } from '@/lib/marketing';
const service = services.find((v) => v.slug === 'mail-forwarding')!;
export const metadata: Metadata = {
  title: `${service.title} | VirtualAddressHub`,
  description: service.intro,
  alternates: { canonical: '/mail-forwarding' },
};
export default function Page() {
  return <ServicePage slug="mail-forwarding" />;
}
