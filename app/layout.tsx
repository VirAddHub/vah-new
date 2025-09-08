import './globals.css';
import { ReactNode } from 'react';
import { Navbar } from '@/components/layout/Navbar';

export const metadata = { title: 'VirtualAddressHub', description: 'Your digital mailroom' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </body>
    </html>
  );
}
