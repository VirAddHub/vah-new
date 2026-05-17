"use client";

import React from "react";
import Link from "next/link";
import { VAHLogo } from "./VAHLogo";

interface FooterProps {
  onNavigate?: (page: string) => void;
}

const ALL_LINKS = [
  { label: 'Pricing',         href: '/pricing'  },
  { label: 'How it works',    href: '/#how'     },
  { label: 'Help',            href: '/help'     },
  { label: 'Blog',            href: '/blog'     },
  { label: 'Privacy',         href: '/privacy'  },
  { label: 'Terms',           href: '/terms'    },
  { label: 'KYC policy',      href: '/kyc'      },
  { label: 'Contact',         href: '/contact'  },
] as const;

const DESKTOP_COLUMNS = [
  {
    title: 'Explore',
    items: [
      { label: 'Pricing',      href: '/pricing' },
      { label: 'How it works', href: '/#how'    },
      { label: 'Help centre',  href: '/help'    },
      { label: 'Blog',         href: '/blog'    },
    ],
  },
  {
    title: 'Legal',
    items: [
      { label: 'Privacy policy',   href: '/privacy' },
      { label: 'Terms of service', href: '/terms'   },
      { label: 'KYC policy',       href: '/kyc'     },
    ],
  },
  {
    title: 'Contact',
    items: [
      { label: 'hello@virtualaddresshub.co.uk', href: 'mailto:hello@virtualaddresshub.co.uk' },
      { label: 'Contact support',               href: '/contact' },
    ],
  },
] as const;

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-mix-paper-deep text-mix-ink border-t border-mix-rule px-6 sm:px-10 lg:px-14 pt-8 pb-6 lg:pt-14 lg:pb-9">

      {/* ── Mobile (< lg) — compact single block ── */}
      <div className="lg:hidden flex flex-col items-center gap-5 text-center">
        <VAHLogo onNavigate={onNavigate} size="md" />

        {/* Flat wrap of all links */}
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {ALL_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="font-dmsans text-[13px] font-medium text-mix-ink hover:opacity-70 transition-opacity no-underline"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Compliance + copyright */}
        <div className="pt-4 border-t border-mix-rule w-full font-plex text-[11px] text-mix-ink2 tracking-[0.05em] flex flex-col items-center gap-1.5">
          <div>HMRC AML XRML00000123456 · ICO ZA123456</div>
          <div>© 2026 VirtualAddressHub Ltd.</div>
        </div>
      </div>

      {/* ── Desktop (≥ lg) — full 4-col grid ── */}
      <div className="hidden lg:grid lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-12">
        {/* Brand col */}
        <div>
          <VAHLogo onNavigate={onNavigate} size="lg" />
          <p className="font-newsreader text-[16px] text-mix-ink2 leading-[1.6] mt-4 max-w-[280px]">
            Professional virtual address for UK businesses. Central London.
          </p>
        </div>

        {DESKTOP_COLUMNS.map(({ title, items }) => (
          <div key={title}>
            <div className="font-plex text-[11px] text-mix-muted tracking-[0.15em] uppercase mb-4">
              {title}
            </div>
            <div className="flex flex-col">
              {items.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="font-newsreader text-[16px] text-mix-ink2 py-1.5 hover:opacity-70 transition-opacity no-underline"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop compliance strip */}
      <div className="hidden lg:flex mt-12 pt-6 border-t border-mix-rule justify-between gap-2 font-plex text-[12px] text-mix-ink2 tracking-[0.05em]">
        <div>HMRC AML XRML00000123456 · ICO ZA123456</div>
        <div>© 2026 VirtualAddressHub Ltd.</div>
      </div>
    </footer>
  );
}
