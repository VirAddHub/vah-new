// app/lib/validation.ts
// Validation utilities for frontend - synced from backend
import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const businessNameSchema = z.string().min(1, 'Business name is required');
export const postcodeSchema = z.string().regex(/^[A-Z]{1,2}[0-9]{1,2}[A-Z]? [0-9][A-Z]{2}$/i, 'Invalid UK postcode');

// User profile validation
export const profileSchema = z.object({
    business_name: businessNameSchema,
    trading_name: z.string().optional(),
    email: emailSchema,
    phone: z.string().optional(),
    forwarding_address: z.string().optional(),
});

// Address validation
export const addressSchema = z.object({
    line1: z.string().min(1, 'Address line 1 is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    postcode: postcodeSchema,
    country: z.string().default('GB'),
});

// Login validation
export const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

// Signup validation
export const signupSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    business_name: businessNameSchema,
    trading_name: z.string().optional(),
});

// Password reset validation
export const passwordResetSchema = z.object({
    email: emailSchema,
});

export const passwordResetConfirmSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: passwordSchema,
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

// Export zod for custom validations
export { z };
