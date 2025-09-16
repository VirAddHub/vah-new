import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility function for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting utilities
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('en-GB', defaultOptions).format(dateObj);
}

export function formatDateTime(date: string | Date) {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * formatRelativeTime(date)
 * Returns strings like:
 *  - "just now", "2 minutes ago", "in 3 hours", "yesterday", "in 2 weeks"
 */
export function formatRelativeTime(input: Date | number | string | undefined | null): string {
  if (!input) return '';
  
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';

  const diffMs = d.getTime() - Date.now(); // future => positive
  const abs = Math.abs(diffMs);

  const sec = 1000;
  const min = 60 * sec;
  const hr  = 60 * min;
  const day = 24 * hr;
  const wk  = 7 * day;
  const mo  = 30 * day;  // coarse
  const yr  = 365 * day; // coarse

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (abs < 30 * sec) return 'just now';

  if (abs < min)       return rtf.format(Math.round(diffMs / sec), 'second');
  if (abs < hr)        return rtf.format(Math.round(diffMs / min), 'minute');
  if (abs < day)       return rtf.format(Math.round(diffMs / hr),  'hour');
  if (abs < wk)        return rtf.format(Math.round(diffMs / day), 'day');
  if (abs < mo)        return rtf.format(Math.round(diffMs / wk),  'week');
  if (abs < yr)        return rtf.format(Math.round(diffMs / mo),  'month');
  return rtf.format(Math.round(diffMs / yr), 'year');
}

// String utilities
export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function capitalizeFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Email utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) return email;

  const maskedLocal = localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1];
  return `${maskedLocal}@${domain}`;
}

// URL utilities
export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  return 'http://localhost:3000';
}

export function buildApiUrl(endpoint: string) {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api${endpoint}`;
}

// Local storage utilities
export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Error handling utilities
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

// Status utilities
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    active: 'text-green-600 bg-green-100',
    inactive: 'text-gray-600 bg-gray-100',
    pending: 'text-yellow-600 bg-yellow-100',
    error: 'text-red-600 bg-red-100',
    success: 'text-green-600 bg-green-100',
    warning: 'text-yellow-600 bg-yellow-100',
    info: 'text-blue-600 bg-blue-100',
  };

  return statusColors[status.toLowerCase()] || 'text-gray-600 bg-gray-100';
}

// Validation utilities
export function validatePostcode(postcode: string): boolean {
  const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2}$/i;
  return ukPostcodeRegex.test(postcode);
}

export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}