'use client';
import Link from 'next/link';
import { VAHLogo } from './VAHLogo';
import { services } from '@/lib/marketing';
import { VAH_ADDRESS_LINES } from '@/lib/address';
export function Footer({ onNavigate }: { onNavigate?: (page: string) => void }) {
  return (
    <footer className="bg-white text-[#123d30] border-t border-[#dce4dc] px-6 py-14">
      <div className="max-w-7xl mx-auto grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <VAHLogo onNavigate={onNavigate} size="lg" />
          <p className="mt-5 text-sm leading-7">
            One London address.
            <br />
            Multiple business uses.
            <br />
            One straightforward subscription.
          </p>
        </div>
        <div>
          <h2 className="font-semibold mb-5">Our services</h2>
          <ul className="space-y-3 text-sm">
            {services.map((v) => (
              <li key={v.slug}>
                <Link href={`/${v.slug}`}>{v.title}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-semibold mb-5">Explore & learn</h2>
          <ul className="space-y-3 text-sm">
            {[
              ['Our London address', '/london-address'],
              ['Pricing', '/pricing'],
              ['How it works', '/how-it-works'],
              ['Business guides', '/guides'],
              ['Blog', '/blog'],
              ['Help centre', '/help'],
              ['About us', '/about'],
            ].map(([label, href]) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-semibold mb-5">Get in touch</h2>
          <address className="text-sm leading-7 not-italic">
            {VAH_ADDRESS_LINES.map((v) => (
              <div key={v}>{v}</div>
            ))}
          </address>
          <p className="mt-4 text-sm">
            <a href="mailto:support@virtualaddresshub.co.uk">support@virtualaddresshub.co.uk</a>
          </p>
          <p className="mt-4 text-sm">
            <Link href="/contact">Contact our team →</Link>
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-[#dce4dc] flex flex-wrap justify-between gap-5 text-xs">
        <span>© {new Date().getFullYear()} VirtualAddressHub</span>
        <div className="flex flex-wrap gap-5">
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms of service</Link>
          <Link href="/cookies">Cookie information</Link>
          <Link href="/kyc">Identity verification</Link>
        </div>
      </div>
    </footer>
  );
}
