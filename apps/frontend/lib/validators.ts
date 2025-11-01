/**
 * Centralized validation utilities
 * Replaces ad-hoc validation logic across forms
 */

export const isEmail = (v: string): boolean => {
    if (!v) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
};

export const isStrongPassword = (v: string): boolean => {
    if (!v) return false;
    // min 8 chars, at least one letter and one digit
    return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(v);
};

export const isUKPhone = (v: string): boolean => {
    if (!v) return false;
    // Simple UK mobile format: +44 or 0 followed by 7 and 9 digits
    return /^(?:\+?44|0)7\d{9}$/.test(v.replace(/\s+/g, ""));
};

export function validateRequired(name: string, v: string): void {
    if (!String(v || "").trim()) {
        throw new Error(`${name} is required`);
    }
}

export function validateEmail(v: string): void {
    if (!v) {
        throw new Error("Email is required");
    }
    if (!isEmail(v)) {
        throw new Error("Please enter a valid email address");
    }
}

export function validatePassword(v: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!v) {
        errors.push("Password is required");
        return { valid: false, errors };
    }

    if (v.length < 8) {
        errors.push("Password must be at least 8 characters");
    }

    if (!/[A-Za-z]/.test(v)) {
        errors.push("Password must contain at least one letter");
    }

    if (!/\d/.test(v)) {
        errors.push("Password must contain at least one number");
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

export function validatePhone(v: string, required: boolean = false): void {
    if (!v && !required) return;

    if (!v && required) {
        throw new Error("Phone number is required");
    }

    if (v && !isUKPhone(v)) {
        throw new Error("Please enter a valid UK phone number");
    }
}

