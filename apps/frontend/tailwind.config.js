/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
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
                // Fluid typography using clamp for responsive scaling
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
                    DEFAULT: "#0A7AFF",
                    fg: "#ffffff",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                xl: "1rem",
                "2xl": "1.25rem",
            },
            boxShadow: {
                soft: "0 10px 20px -10px rgba(0,0,0,0.2)",
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
