import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NavigationWrapper } from '@/components/NavigationWrapper'
import { FooterWrapper } from '@/components/FooterWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'VirtualAddressHub - Professional Virtual Address Service',
    description: 'Get a professional virtual address for your business with secure mail forwarding and premium compliance-focused services.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={`${inter.className} min-h-screen flex flex-col bg-background text-foreground`}>
                <NavigationWrapper />
                <main className="flex-1">
                    {children}
                </main>
                <FooterWrapper />
            </body>
        </html>
    )
}
