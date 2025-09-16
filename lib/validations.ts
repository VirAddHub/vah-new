import { z } from 'zod';

// Authentication schemas
export const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address'),
    password: z
        .string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password must be less than 100 characters'),
});

export const signupSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password must be less than 100 characters')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        ),
    confirmPassword: z.string(),
    firstName: z
        .string()
        .min(1, 'First name is required')
        .max(50, 'First name must be less than 50 characters'),
    lastName: z
        .string()
        .min(1, 'Last name is required')
        .max(50, 'Last name must be less than 50 characters'),
    companyName: z
        .string()
        .min(1, 'Company name is required')
        .max(100, 'Company name must be less than 100 characters'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export const resetPasswordRequestSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address'),
});

export const resetPasswordConfirmSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password must be less than 100 characters')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        ),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

// Profile schemas
export const profileUpdateSchema = z.object({
    firstName: z
        .string()
        .min(1, 'First name is required')
        .max(50, 'First name must be less than 50 characters'),
    lastName: z
        .string()
        .min(1, 'Last name is required')
        .max(50, 'Last name must be less than 50 characters'),
    companyName: z
        .string()
        .min(1, 'Company name is required')
        .max(100, 'Company name must be less than 100 characters'),
    phone: z
        .string()
        .optional()
        .refine((val) => !val || /^[\+]?[1-9][\d]{0,15}$/.test(val), {
            message: 'Please enter a valid phone number',
        }),
});

export const addressUpdateSchema = z.object({
    addressLine1: z
        .string()
        .min(1, 'Address line 1 is required')
        .max(100, 'Address line 1 must be less than 100 characters'),
    addressLine2: z
        .string()
        .max(100, 'Address line 2 must be less than 100 characters')
        .optional(),
    city: z
        .string()
        .min(1, 'City is required')
        .max(50, 'City must be less than 50 characters'),
    postcode: z
        .string()
        .min(1, 'Postcode is required')
        .max(10, 'Postcode must be less than 10 characters')
        .regex(/^[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2}$/i, 'Please enter a valid UK postcode'),
    country: z
        .string()
        .min(1, 'Country is required')
        .max(50, 'Country must be less than 50 characters'),
});

// Mail schemas
export const mailSearchSchema = z.object({
    query: z
        .string()
        .min(1, 'Search query is required')
        .max(100, 'Search query must be less than 100 characters'),
    status: z
        .enum(['all', 'unread', 'read', 'forwarded', 'scanned'])
        .optional(),
    dateFrom: z
        .string()
        .optional()
        .refine((val) => !val || !isNaN(Date.parse(val)), {
            message: 'Please enter a valid date',
        }),
    dateTo: z
        .string()
        .optional()
        .refine((val) => !val || !isNaN(Date.parse(val)), {
            message: 'Please enter a valid date',
        }),
});

export const mailScanRequestSchema = z.object({
    mailItemId: z.string().min(1, 'Mail item ID is required'),
    priority: z
        .enum(['low', 'normal', 'high'])
        .optional()
        .default('normal'),
    instructions: z
        .string()
        .max(500, 'Instructions must be less than 500 characters')
        .optional(),
});

// Support schemas
export const supportTicketSchema = z.object({
    subject: z
        .string()
        .min(1, 'Subject is required')
        .max(100, 'Subject must be less than 100 characters'),
    message: z
        .string()
        .min(10, 'Message must be at least 10 characters')
        .max(1000, 'Message must be less than 1000 characters'),
    priority: z
        .enum(['low', 'normal', 'high', 'urgent'])
        .optional()
        .default('normal'),
    category: z
        .enum(['technical', 'billing', 'general', 'feature_request'])
        .optional()
        .default('general'),
});

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ResetPasswordRequestFormData = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordConfirmFormData = z.infer<typeof resetPasswordConfirmSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type AddressUpdateFormData = z.infer<typeof addressUpdateSchema>;
export type MailSearchFormData = z.infer<typeof mailSearchSchema>;
export type MailScanRequestFormData = z.infer<typeof mailScanRequestSchema>;
export type SupportTicketFormData = z.infer<typeof supportTicketSchema>;
