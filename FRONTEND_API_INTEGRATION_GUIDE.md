# Frontend API Integration Guide

## Overview

Your backend has a comprehensive API structure with multiple integration patterns available. Here are the best approaches for frontend integration:

## 🏗️ Architecture Patterns

### 1. **BFF (Backend for Frontend) Pattern** ⭐ **RECOMMENDED**
Your app uses a BFF pattern where Next.js API routes proxy to your backend:

```
Frontend → /api/bff/* → Backend (localhost:4000)
```

**Benefits:**
- Single origin (no CORS issues)
- Automatic cookie/session handling
- CSRF protection built-in
- Type-safe with TypeScript

### 2. **Direct Backend Integration**
Connect directly to your backend API:

```
Frontend → Backend (localhost:4000) directly
```

**Benefits:**
- Lower latency
- Direct control
- Simpler debugging

**Challenges:**
- CORS configuration needed
- Manual session management
- CSRF token handling

## 🛠️ Integration Methods

### Method 1: Using Existing API Client (Recommended)

```typescript
// lib/api-client.ts - Already exists!
import { apiClient, API_ENDPOINTS } from '@/lib/api-client';

// Example: Get user profile
const profile = await apiClient.get(API_ENDPOINTS.profile.get);

// Example: Send contact form
const result = await apiClient.post('/api/contact', {
  name: 'John Doe',
  email: 'john@example.com',
  subject: 'Hello',
  message: 'Test message'
});
```

### Method 2: Using Simplified API Helpers

```typescript
// lib/api.ts - Already exists!
import { apiGet, apiPost, apiPostCSRF } from '@/lib/api';

// Example: Get mail items
const mailItems = await apiGet('/api/bff/mail');

// Example: CSRF-protected POST
const result = await apiPostCSRF('/api/bff/profile', {
  name: 'Updated Name'
});
```

### Method 3: Direct Fetch with BFF Routes

```typescript
// Direct calls to your BFF endpoints
const response = await fetch('/api/bff/profile', {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
});
const data = await response.json();
```

## 📋 Available API Endpoints

### Authentication
- `GET /api/bff/auth/whoami` - Get current user
- `GET /api/bff/auth/csrf` - Get CSRF token
- `POST /api/bff/auth/login` - Login
- `POST /api/bff/auth/logout` - Logout

### Mail Management
- `GET /api/bff/mail` - List mail items
- `GET /api/bff/mail/[id]` - Get specific mail item
- `POST /api/bff/mail/scan` - Scan for new mail
- `POST /api/bff/mail/bulk/mark-read` - Mark multiple as read

### Address Services
- `GET /api/bff/address/search?postcode=SW1A1AA` - Search addresses
- `GET /api/bff/address/autocomplete?q=query` - Address autocomplete
- `GET /api/bff/address/find/[postcode]` - Find addresses by postcode
- `GET /api/bff/address/get/[id]` - Get specific address

### Company Information
- `GET /api/bff/companies/search?q=query` - Search companies
- `GET /api/bff/companies/[number]` - Get company details

### Profile Management
- `GET /api/bff/profile` - Get user profile
- `POST /api/bff/profile` - Update profile

### Invoices
- `GET /api/bff/invoices` - List invoices
- `GET /api/invoices/[token]` - Download invoice

## 🎯 Implementation Examples

### 1. Contact Form Integration

```typescript
// components/ContactForm.tsx
import { apiClient } from '@/lib/api-client';

export function ContactForm() {
  const handleSubmit = async (formData: ContactFormData) => {
    try {
      const result = await apiClient.post('/api/contact', formData);
      // Handle success
    } catch (error) {
      // Handle error
      console.error('Contact form error:', error);
    }
  };
}
```

### 2. Mail Dashboard Integration

```typescript
// components/MailDashboard.tsx
import { apiGet } from '@/lib/api';
import { useEffect, useState } from 'react';

export function MailDashboard() {
  const [mailItems, setMailItems] = useState([]);
  
  useEffect(() => {
    const fetchMail = async () => {
      try {
        const items = await apiGet('/api/bff/mail');
        setMailItems(items);
      } catch (error) {
        console.error('Failed to fetch mail:', error);
      }
    };
    
    fetchMail();
  }, []);
  
  return (
    <div>
      {mailItems.map(item => (
        <MailItem key={item.id} item={item} />
      ))}
    </div>
  );
}
```

### 3. Address Search Integration

```typescript
// components/AddressSearch.tsx
import { apiClient } from '@/lib/api-client';

export function AddressSearch() {
  const searchAddresses = async (postcode: string) => {
    try {
      const result = await apiClient.get(`/api/bff/address/search?postcode=${postcode}`);
      return result.addresses;
    } catch (error) {
      console.error('Address search failed:', error);
      return [];
    }
  };
}
```

### 4. Authentication Integration

```typescript
// hooks/useAuth.ts
import { apiClient, API_ENDPOINTS } from '@/lib/api-client';

export function useAuth() {
  const login = async (email: string, password: string) => {
    try {
      const result = await apiClient.post(API_ENDPOINTS.auth.login, {
        email,
        password
      });
      return result;
    } catch (error) {
      throw new Error('Login failed');
    }
  };
  
  const logout = async () => {
    await apiClient.post(API_ENDPOINTS.auth.logout);
  };
  
  const getCurrentUser = async () => {
    return await apiClient.get(API_ENDPOINTS.auth.whoami);
  };
  
  return { login, logout, getCurrentUser };
}
```

## 🔧 Environment Configuration

### For BFF Pattern (Recommended)
```bash
# .env.local
NEXT_PUBLIC_API_BASE=""  # Empty = use BFF routes
```

### For Direct Backend Integration
```bash
# .env.local
NEXT_PUBLIC_API_BASE="http://localhost:4000"
```

## 🚀 Getting Started Steps

1. **Choose your integration method** (BFF recommended)
2. **Set up environment variables**
3. **Import the appropriate API client**
4. **Start with simple GET requests**
5. **Add error handling**
6. **Implement authentication flows**
7. **Add loading states and optimistic updates**

## 🛡️ Security Considerations

- **CSRF Protection**: Use `apiPostCSRF` for state-changing operations
- **Session Management**: Cookies are handled automatically with BFF
- **Error Handling**: Always wrap API calls in try-catch blocks
- **Type Safety**: Use TypeScript interfaces for API responses

## 📚 Next Steps

1. Start with the contact form (already implemented)
2. Add mail dashboard functionality
3. Implement address search features
4. Add user authentication flows
5. Create admin interfaces

The BFF pattern is already set up and ready to use - just import the API clients and start making requests!
