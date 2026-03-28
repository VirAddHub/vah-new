/**
 * Design System Foundation
 * 
 * Enterprise-grade design tokens for a calm, premium, professional interface.
 * Swiss luxury spa aesthetic - not startup SaaS clutter.
 * 
 * Principles:
 * - Restraint over decoration
 * - Clarity over cleverness
 * - Precision over approximation
 * - Calm over excitement
 */

/**
 * SPACING SCALE
 * Consistent spacing using 4px base unit
 * Use these values exclusively - no arbitrary spacing
 */
export const spacing = {
  /** 4px - Minimal gap between tightly related elements */
  xs: '0.25rem',
  /** 8px - Small gap, inline elements */
  sm: '0.5rem',
  /** 12px - Default gap between related elements */
  md: '0.75rem',
  /** 16px - Standard spacing unit */
  base: '1rem',
  /** 24px - Section spacing, card padding */
  lg: '1.5rem',
  /** 32px - Large section spacing */
  xl: '2rem',
  /** 48px - Major section breaks */
  '2xl': '3rem',
  /** 64px - Page-level spacing */
  '3xl': '4rem',
  /** 96px - Hero spacing */
  '4xl': '6rem',
} as const;

/**
 * TYPOGRAPHY SCALE
 * 
 * Single font family: Inter
 * Hierarchy via weight, size, spacing, line-height only
 * 
 * Principles:
 * - Headings: Semibold (600), tight tracking, confident
 * - Body: Regular (400), relaxed leading, calm
 * - Labels: Medium (500), subtle, clear
 * - Vertical rhythm: Consistent spacing between elements
 */
export const typography = {
  // Display - Hero headlines, landing pages
  display: {
    size: '3.5rem', // 56px
    lineHeight: '1.1',
    weight: '600',
    letterSpacing: '-0.025em',
    family: 'Inter, sans-serif',
  },
  // H1 - Page titles
  h1: {
    size: '2.25rem', // 36px
    lineHeight: '1.2',
    weight: '600',
    letterSpacing: '-0.02em',
    family: 'Inter, sans-serif',
  },
  // H2 - Section headers
  h2: {
    size: '1.875rem', // 30px
    lineHeight: '1.3',
    weight: '600',
    letterSpacing: '-0.015em',
    family: 'Inter, sans-serif',
  },
  // H3 - Subsection headers
  h3: {
    size: '1.5rem', // 24px
    lineHeight: '1.4',
    weight: '600',
    letterSpacing: '-0.01em',
    family: 'Inter, sans-serif',
  },
  // H4 - Card titles, smaller headings
  h4: {
    size: '1.25rem', // 20px
    lineHeight: '1.4',
    weight: '600',
    letterSpacing: '-0.005em',
    family: 'Inter, sans-serif',
  },
  // H5 - Smallest headings
  h5: {
    size: '1.125rem', // 18px
    lineHeight: '1.5',
    weight: '600',
    letterSpacing: '0',
    family: 'Inter, sans-serif',
  },
  // Body Large - Hero subtext, important descriptions
  bodyLg: {
    size: '1.125rem', // 18px
    lineHeight: '1.7',
    weight: '400',
    letterSpacing: '0',
    family: 'Inter, sans-serif',
  },
  // Body - Default text (most common)
  body: {
    size: '1rem', // 16px
    lineHeight: '1.6',
    weight: '400',
    letterSpacing: '0',
    family: 'Inter, sans-serif',
  },
  // Body Small - Secondary text, captions
  bodySm: {
    size: '0.875rem', // 14px
    lineHeight: '1.5',
    weight: '400',
    letterSpacing: '0',
    family: 'Inter, sans-serif',
  },
  // Label - Form labels, UI labels
  label: {
    size: '0.875rem', // 14px
    lineHeight: '1.4',
    weight: '500',
    letterSpacing: '0',
    family: 'Inter, sans-serif',
  },
  // Caption - Metadata, timestamps, tiny text
  caption: {
    size: '0.75rem', // 12px
    lineHeight: '1.4',
    weight: '400',
    letterSpacing: '0.01em',
    family: 'Inter, sans-serif',
  },
} as const;

/**
 * COLOR PALETTE
 * Minimal, cohesive, intentional
 */
export const colors = {
  // Brand primary - Deep forest green
  primary: {
    DEFAULT: '#20603A',
    hover: '#1a4d2e',
    light: '#f0fdf4',
    foreground: '#ffffff',
  },
  // Accent - Lighter green for CTAs
  accent: {
    DEFAULT: '#40C46C',
    hover: '#33a058',
    light: '#f0fdf4',
    foreground: '#024E40',
  },
  // Neutrals - Calm grays
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  // Background
  background: '#F6F6F7',
  // Text
  text: {
    primary: '#1a1a1a',
    secondary: '#525252',
    tertiary: '#737373',
    inverse: '#ffffff',
  },
  // Borders
  border: {
    light: '#e5e5e5',
    DEFAULT: '#d4d4d4',
    dark: '#a3a3a3',
  },
  // Semantic colors - use sparingly
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
} as const;

/**
 * BORDER RADIUS
 * Subtle, consistent rounding
 */
export const radius = {
  none: '0',
  sm: '0.25rem', // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.75rem', // 12px
  lg: '1rem', // 16px
  xl: '1.5rem', // 24px
  full: '9999px',
} as const;

/**
 * SHADOWS
 * Subtle elevation - use sparingly
 */
export const shadows = {
  // Minimal shadow for cards
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  // Default card shadow
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  // Elevated elements (modals, dropdowns)
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  // Maximum elevation
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  // No shadow
  none: 'none',
} as const;

/**
 * ICON GUIDELINES
 * - Use lucide-react exclusively
 * - Size: 20px (default), 24px (large), 16px (small)
 * - Stroke width: 2 (default), 1.5 (subtle)
 * - Use sparingly - not every element needs an icon
 * - Icons support meaning, they don't replace it
 */
export const iconSizes = {
  sm: 16,
  DEFAULT: 20,
  lg: 24,
  xl: 28,
} as const;

/**
 * BREAKPOINTS
 * Mobile-first responsive design
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * CONTAINER WIDTHS
 * Maximum content width for readability
 */
export const containers = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1400px',
} as const;
