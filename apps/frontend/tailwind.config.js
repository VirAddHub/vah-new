/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    theme: {
        container: {
            center: true,
            padding: {
                DEFAULT: "1rem",
                sm: "1rem",
                md: "1.25rem",
                lg: "2rem",
            },
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            fontFamily: {
                sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                // Accent: italic Noto Serif only for a few highlighted words in headings.
                // Include explicit fallback family per request.
                accent: ['var(--font-accent)', '"Noto Serif"', 'serif'],
            },
            screens: {
                xs: "360px",
                sm: "640px",
                md: "768px",
                lg: "1024px",
                xl: "1280px",
                "2xl": "1536px",
            },
            spacing: {
                4.5: "1.125rem",
                "safe-top": "var(--safe-top)",
                "safe-bottom": "var(--safe-bottom)",
            },
            maxWidth: {
                content: "72ch",
            },
            fontSize: {
                // ── Canonical type scale (Batch 2) ──
                display: ["clamp(2rem, 5vw, 3.5rem)", { lineHeight: "1.1", fontWeight: "600", letterSpacing: "-0.025em" }],
                h1: ["clamp(1.75rem, 4vw, 2.25rem)", { lineHeight: "1.2", fontWeight: "600", letterSpacing: "-0.02em" }],
                h2: ["clamp(1.5rem, 3vw, 1.875rem)", { lineHeight: "1.3", fontWeight: "600", letterSpacing: "-0.015em" }],
                h3: ["1.25rem", { lineHeight: "1.4", fontWeight: "600", letterSpacing: "-0.01em" }],
                h4: ["1.125rem", { lineHeight: "1.4", fontWeight: "600", letterSpacing: "-0.005em" }],
                "body-lg": ["1.125rem", { lineHeight: "1.7", fontWeight: "400" }],
                body: ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
                "body-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
                label: ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }],
                caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "400", letterSpacing: "0.01em" }],
                // ── Deprecated — remove after page-level migration ──
                "fluid-sm": ["clamp(0.9rem, 0.85rem + 0.2vw, 1rem)", { lineHeight: "1.5" }],
                "fluid-base": ["clamp(1rem, 0.95rem + 0.35vw, 1.125rem)", { lineHeight: "1.6" }],
                "fluid-lg": ["clamp(1.125rem, 1.05rem + 0.5vw, 1.25rem)", { lineHeight: "1.6" }],
                "fluid-xl": ["clamp(1.25rem, 1.1rem + 0.8vw, 1.5rem)", { lineHeight: "1.25" }],
                "fluid-2xl": ["clamp(1.5rem, 1.25rem + 1vw, 1.875rem)", { lineHeight: "1.2" }],
                "fluid-3xl": ["clamp(1.875rem, 1.5rem + 1.5vw, 2.25rem)", { lineHeight: "1.1" }],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                brand: {
                    DEFAULT: "hsl(var(--primary))",
                    fg: "hsl(var(--primary-foreground))",
                },
                success: {
                    DEFAULT: "hsl(var(--success))",
                    foreground: "hsl(var(--success-foreground))",
                },
            },
            // ── Canonical radius scale (Batch 2) ──
            borderRadius: {
                sm: "0.25rem",
                md: "0.5rem",
                lg: "0.75rem",
                xl: "1rem",
                "2xl": "1.25rem",
            },
            // ── Canonical shadow scale (Batch 2) ──
            boxShadow: {
                xs: "0 1px 2px rgba(2, 6, 23, 0.04)",
                sm: "0 1px 2px rgba(2, 6, 23, 0.06)",
                md: "0 4px 12px rgba(2, 6, 23, 0.06)",
                lg: "0 10px 24px rgba(2, 6, 23, 0.08)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: 0 },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: 0 },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
}
