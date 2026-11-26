import type { Metadata } from 'next';
import { LondonShowcase } from '@/components/marketing/LondonShowcase';
import s from '@/components/marketing/Marketing.module.css';
export const metadata: Metadata = {
  title: 'Our London business address' + ' | VirtualAddressHub',
  description:
    'A professional Central London virtual office for business correspondence, eligible registered office and director’s service address use, with online mail management.',
  alternates: { canonical: '/london-address' },
};
export default function Page() {
  return (
    <div className={s.site}>
      <LondonShowcase standalone />
      <section className={s.section}>
        <div className={`${s.wrap} ${s.guide}`}>
          <h2 className="mt-10">What you can use it for</h2>
          <p>
            Business correspondence, your website and invoices, and eligible registered office and
            director’s service address use. You must complete the required checks and receive
            approval first.
          </p>
          <h2>What the service does not include</h2>
          <p>
            Workspace, desks, meeting rooms, customer visits, parcel handling or telephone services.
            Please do not describe the address as premises where your business physically operates.
          </p>
        </div>
      </section>
    </div>
  );
}
