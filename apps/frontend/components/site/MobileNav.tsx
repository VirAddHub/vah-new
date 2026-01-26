"use client";
import { useState } from "react";
import Link from "next/link";

export default function MobileNav() {
    const [open, setOpen] = useState(false);
    return (
        <div className="safe-pad sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between">
                <Link href="/" aria-label="Home" className="tt-min inline-flex items-center px-1">VAH</Link>
                <button
                    className="tt-min inline-flex items-center rounded-xl border border-zinc-300 px-3 text-sm"
                    onClick={() => setOpen(!open)}
                    aria-expanded={open}
                    aria-controls="mnav"
                    aria-label="Toggle menu"
                >
                    Menu
                </button>
            </div>
            {open && (
                <nav id="mnav" className="safe-pad mx-auto max-w-screen-xl pb-2">
                    <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
                        <li><Link className="block px-4 py-3 tt-min" href="/pricing">Pricing</Link></li>
                        {/* Standardized to "Help Centre" for consistency across all pages */}
                        <li><Link className="block px-4 py-3 tt-min" href="/help">Help Centre</Link></li>
                        <li><Link className="block px-4 py-3 tt-min" href="/login">Login</Link></li>
                    </ul>
                </nav>
            )}
        </div>
    );
}
