'use client';

import Link from 'next/link';

interface TopLinkProps extends React.ComponentProps<typeof Link> {
  children: React.ReactNode;
}

export function TopLink({ onClick, ...props }: TopLinkProps) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented && typeof window !== 'undefined') {
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }
      }}
      scroll
    />
  );
}
