// Comprehensive API Client for VirtualAddressHub
// Based on server-reference.md with all 67+ endpoints

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

// Example usage function
export async function whoAmI() {
  const r = await fetch(`${API_BASE}/auth/whoami`, { credentials: 'include' });
  if (!r.ok) throw new Error('whoami failed');
  return r.json();
}

// Input validation and sanitization utilities
function sanitizeString(input: any): string {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): boolean {
  return Boolean(password && password.length >= 6);
}

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface User {
  id: number;
  email: string;
  name?: string;
  role: 'user' | 'admin';
  is_admin: 0 | 1;
  kyc_status?: 'pending' | 'verified' | 'rejected';
  created_at: string;
  updated_at: string;
}

interface MailItem {
  id: string;
  user_id: number;
  sender_name: string;
  description: string;
  received_date: string;
  status: 'received' | 'scanned' | 'forwarded' | 'deleted';
  admin_notes?: string;
  scan_file_url?: string;
}

interface ForwardingRequest {
  id: number;
  user_id: number;
  letter_id: string;
  to_name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  reason?: string;
  method: 'forward_physical' | 'scan';
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  admin_id?: number;
  note?: string;
  courier?: string;
  tracking?: string;
  created_at: string;
  updated_at: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Generic HTTP methods for flexibility
  async get<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // ==================== AUTHENTICATION APIs ====================
  
  async login(email: string, password: string): Promise<ApiResponse<{ user: User }>> {
    // Validate inputs
    if (!validateEmail(email)) {
      return { ok: false, error: 'Invalid email format' };
    }
    
    if (!validatePassword(password)) {
      return { ok: false, error: 'Password must be at least 6 characters' };
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeString(email);
    const sanitizedPassword = sanitizeString(password);

    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email: sanitizedEmail, 
        password: sanitizedPassword 
      }),
    });
  }

  async signup(email: string, password: string, firstName: string, lastName: string): Promise<ApiResponse<{ user: User }>> {
    // Validate inputs
    if (!validateEmail(email)) {
      return { ok: false, error: 'Invalid email format' };
    }
    
    if (!validatePassword(password)) {
      return { ok: false, error: 'Password must be at least 6 characters' };
    }

    if (!firstName || !lastName) {
      return { ok: false, error: 'First name and last name are required' };
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeString(email);
    const sanitizedPassword = sanitizeString(password);
    const sanitizedFirstName = sanitizeString(firstName);
    const sanitizedLastName = sanitizeString(lastName);

    return this.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ 
        email: sanitizedEmail, 
        password: sanitizedPassword,
        first_name: sanitizedFirstName,
        last_name: sanitizedLastName
      }),
    });
  }

  async logout(): Promise<ApiResponse> {
    return this.request('/api/auth/logout', {
      method: 'POST',
    });
  }

  async whoami(): Promise<ApiResponse<{ user: User }>> {
    return this.request('/api/auth/whoami');
  }

  async ping(): Promise<ApiResponse<{ handler: string }>> {
    return this.request('/api/auth/ping');
  }

  async dbCheck(): Promise<ApiResponse<{ user_count: number }>> {
    return this.request('/api/auth/db-check');
  }

  async hashCheck(password: string, hash: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request('/api/auth/hash-check', {
      method: 'POST',
      body: JSON.stringify({ password, hash }),
    });
  }

  async logoutAll(): Promise<ApiResponse> {
    return this.request('/api/auth/logout-all', {
      method: 'POST',
    });
  }

  // ==================== PROFILE APIs ====================
  
  async getProfile(): Promise<ApiResponse<{ profile: any }>> {
    return this.request('/api/profile');
  }

  async requestPasswordReset(email: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.request('/api/profile/reset-password-request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.request('/api/profile/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ ok: boolean; message: string }>> {
    return this.request('/api/profile/update-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  // ==================== MAIL APIs ====================
  
  async getMailItems(): Promise<ApiResponse<MailItem[]>> {
    return this.request('/api/mail-items');
  }

  async updateMailItem(id: string, data: Partial<MailItem>): Promise<ApiResponse> {
    return this.request(`/api/mail-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async forwardMail(data: any): Promise<ApiResponse> {
    return this.request('/api/mail/forward', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMailScanUrl(id: string): Promise<ApiResponse<{ url: string; expires_at: string }>> {
    return this.request(`/api/mail-items/${id}/scan-url`);
  }

  async getScanFile(token: string): Promise<ApiResponse<{ file_url: string }>> {
    return this.request(`/api/scans/${token}`);
  }

  async bulkForwardMail(ids: number[]): Promise<ApiResponse<{ forwarded: number[]; errors: any[]; message: string }>> {
    return this.request('/api/mail/forward/bulk', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  async searchMail(query: string, limit = 20, offset = 0): Promise<ApiResponse<{ total: number; items: MailItem[] }>> {
    return this.request(`/api/search/mail?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
  }

  // ==================== FORWARDING APIs ====================
  
  async getForwardingRequests(): Promise<ApiResponse<ForwardingRequest[]>> {
    return this.request('/api/forwarding-requests');
  }

  async createForwardingRequest(data: Omit<ForwardingRequest, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<ForwardingRequest>> {
    return this.request('/api/forwarding-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getForwardingRequest(id: number): Promise<ApiResponse<ForwardingRequest>> {
    return this.request(`/api/forwarding-requests/${id}`);
  }

  // ==================== BILLING APIs ====================
  
  async getBilling(): Promise<ApiResponse> {
    return this.request('/api/billing');
  }

  async getInvoices(): Promise<ApiResponse<any[]>> {
    return this.request('/api/billing/invoices');
  }


  // ==================== PAYMENTS APIs ====================
  
  async createRedirectFlow(): Promise<ApiResponse<{ redirect_flow_id: string; redirect_url: string }>> {
    return this.request('/api/payments/redirect-flows', {
      method: 'POST',
    });
  }

  async getSubscriptionStatus(): Promise<ApiResponse<{ plan_status: string }>> {
    return this.request('/api/payments/subscriptions/status');
  }

  async manageSubscription(action: string): Promise<ApiResponse> {
    return this.request('/api/payments/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  // ==================== PLANS APIs ====================
  
  async getPlans(): Promise<ApiResponse<any[]>> {
    return this.request('/api/plans');
  }

  // ==================== KYC APIs ====================
  
  async startKyc(): Promise<ApiResponse<{ token: string; applicantId: string }>> {
    return this.request('/api/kyc/start', {
      method: 'POST',
    });
  }

  async uploadKycDocuments(data: any): Promise<ApiResponse<{ sdk_token: string }>> {
    return this.request('/api/kyc/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getKycStatus(): Promise<ApiResponse<{ status: string }>> {
    return this.request('/api/kyc/status');
  }

  // ==================== SUPPORT APIs ====================
  
  async createSupportTicket(data: any): Promise<ApiResponse<{ id: number; status: string }>> {
    return this.request('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async closeSupportTicket(id: number): Promise<ApiResponse> {
    return this.request(`/api/support/tickets/${id}/close`, {
      method: 'POST',
    });
  }

  // ==================== EMAIL PREFERENCES APIs ====================
  
  async getEmailPrefs(): Promise<ApiResponse<{ prefs: any }>> {
    return this.request('/api/email-prefs');
  }

  async createEmailPrefs(data: any): Promise<ApiResponse> {
    return this.request('/api/email-prefs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmailPrefs(data: any): Promise<ApiResponse> {
    return this.request('/api/email-prefs', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ==================== ONBOARDING APIs ====================
  
  async submitBusinessInfo(data: {
    business_name: string;
    trading_name?: string;
    companies_house_number?: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    postcode: string;
    phone: string;
    email: string;
  }): Promise<ApiResponse> {
    return this.request('/api/onboarding/business', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== CONTACT APIs ====================
  
  async submitContactForm(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
    company?: string;
    inquiryType?: string;
    website?: string;
  }): Promise<ApiResponse> {
    // Validate required fields
    if (!data.name || !data.email || !data.subject || !data.message) {
      return { ok: false, error: 'All required fields must be provided' };
    }

    // Validate email format
    if (!validateEmail(data.email)) {
      return { ok: false, error: 'Invalid email format' };
    }

    // Sanitize all string inputs
    const sanitizedData = sanitizeObject(data);

    return this.request('/api/contact', {
      method: 'POST',
      body: JSON.stringify(sanitizedData),
    });
  }

  // ==================== HEALTH APIs ====================
  
  async getHealth(): Promise<ApiResponse<{ status: string; timestamp: string; uptime: number; version: string }>> {
    return this.request('/api/health');
  }

  async getReady(): Promise<ApiResponse<{ status: string }>> {
    return this.request('/api/ready');
  }

  async getHealthz(): Promise<ApiResponse<{ ok: boolean; ts: number }>> {
    return this.request('/api/healthz');
  }

  // ==================== ADMIN APIs ====================
  
  async getAdminUsers(): Promise<ApiResponse<any[]>> {
    return this.request('/api/admin/users');
  }

  async updateAdminUser(id: number, data: any): Promise<ApiResponse> {
    return this.request(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateUserKycStatus(id: number, status: string): Promise<ApiResponse> {
    return this.request(`/api/admin/users/${id}/kyc-status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getAdminPlans(): Promise<ApiResponse<any[]>> {
    return this.request('/api/admin/plans');
  }

  async updateAdminPlan(id: number, data: any): Promise<ApiResponse> {
    return this.request(`/api/admin/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getAdminMailItem(id: string): Promise<ApiResponse<{ id: string }>> {
    return this.request(`/api/admin/mail-items/${id}`);
  }

  async updateAdminMailItem(id: string, data: any): Promise<ApiResponse> {
    return this.request(`/api/admin/mail-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async logPhysicalDispatch(id: string, data: any): Promise<ApiResponse> {
    return this.request(`/api/admin/mail-items/${id}/log-physical-dispatch`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAdminInvoices(params?: {
    user_id?: string;
    from?: string;
    to?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ data: any[]; total: number; limit: number; offset: number }>> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return this.request(`/api/admin/invoices?${query.toString()}`);
  }

  async getAdminInvoice(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/admin/invoices/${id}`);
  }

  async getInvoiceLink(id: string): Promise<ApiResponse<{ url: string; expires_in_minutes: number }>> {
    return this.request(`/api/admin/invoices/${id}/link`, {
      method: 'POST',
    });
  }

  async resendInvoice(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/admin/invoices/${id}/resend`, {
      method: 'POST',
    });
  }

  async createAdminUser(data: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }): Promise<ApiResponse<{ user_id: number; message: string }>> {
    return this.request('/api/create-admin-user', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types
export type { User, MailItem, ForwardingRequest, ApiResponse };
