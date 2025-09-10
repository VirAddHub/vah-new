import './globals.css';
import { ReactNode } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Virtual Address Hub - Your Digital Mailroom',
  description: 'Secure mail scanning, forwarding & proof of address. Get a professional UK address and manage your mail digitally.',
  keywords: 'virtual address, mail forwarding, digital mailroom, UK address, mail scanning',
  openGraph: {
    title: 'Virtual Address Hub - Your Digital Mailroom',
    description: 'Secure mail scanning, forwarding & proof of address. Get a professional UK address and manage your mail digitally.',
    type: 'website',
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-900 text-white">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
