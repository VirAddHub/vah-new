# Frontend Library - Synced from Backend

This directory contains frontend utilities that have been synced from the backend server to ensure consistency and reusability across the application.

## 📁 Structure

### Core Utilities
- **`api.ts`** - Centralized API client with proper credentials and error handling
- **`urls.ts`** - URL utilities for building links and deep links
- **`validation.ts`** - Zod schemas for form validation
- **`logger.ts`** - Safe logging utilities for frontend
- **`env.ts`** - Environment configuration validation

### Services
- **`certificate.ts`** - Certificate generation and download utilities
- **`invoice.ts`** - Invoice management and formatting utilities

### Middleware & Security
- **`middleware.ts`** - Frontend middleware utilities (rate limiting, CSRF, auth)
- **`audit.ts`** - Client-side audit logging utilities

### Data & Storage
- **`database.ts`** - Frontend database client for API interactions
- **`storage.ts`** - File upload/download/storage utilities

### Existing Utilities
- **`address-finder.ts`** - Address lookup and validation
- **`companies-house.ts`** - Companies House API integration
- **`getaddress.ts`** - Address API utilities
- **`pingApi.ts`** - API health checking

## 🚀 Usage

### Import Everything
```typescript
import { api, authManager, log, validateEmail } from '@/lib';
```

### Import Specific Utilities
```typescript
import { apiClient } from '@/lib/api';
import { authManager } from '@/lib/middleware';
import { log } from '@/lib/logger';
import { emailSchema } from '@/lib/validation';
```

## 🔧 Key Features

### API Client
- Automatic cookie handling for authentication
- Centralized error handling
- Type-safe responses
- Request/response interceptors

### Authentication Management
- User state management
- Admin role checking
- Authentication event listeners
- Automatic token refresh

### Validation
- Comprehensive Zod schemas
- Form validation helpers
- Type-safe validation
- Common validation patterns

### Logging
- Safe logging (prevents infinite recursion)
- Client-side error tracking
- API error logging
- Development-only logging

### Storage
- File upload/download
- Safe filename generation
- File type validation
- Storage path management

## 📝 Examples

### API Calls
```typescript
import { api } from '@/lib';

// GET request
const user = await api.get<User>('/api/profile');

// POST request
const result = await api.post<Response>('/api/profile', { name: 'John' });
```

### Authentication
```typescript
import { authManager } from '@/lib';

// Check if user is authenticated
if (authManager.isAuthenticated()) {
    const user = authManager.getUser();
    console.log('User:', user);
}

// Subscribe to auth changes
const unsubscribe = authManager.subscribe((user) => {
    console.log('Auth state changed:', user);
});
```

### Validation
```typescript
import { emailSchema, profileSchema } from '@/lib/validation';

// Validate email
const emailResult = emailSchema.safeParse('user@example.com');

// Validate profile data
const profileResult = profileSchema.safeParse({
    business_name: 'My Company',
    email: 'user@example.com'
});
```

### Logging
```typescript
import { log, clientError, apiError } from '@/lib';

// Regular logging
log('User action completed');

// Error logging
try {
    // Some operation
} catch (error) {
    clientError(error, { context: 'user-action' });
}

// API error logging
apiError(error, '/api/profile', { userId: 123 });
```

### File Operations
```typescript
import { storage, fileUtils } from '@/lib';

// Upload file
const filePath = await storage.uploadFile(file, '/uploads/documents');

// Download file
const blob = await storage.downloadFile(filePath);

// Generate safe filename
const safeName = fileUtils.safeFilename('My Document (1).pdf');
```

## 🔄 Syncing from Backend

This library is automatically synced from the backend server utilities. When backend utilities are updated, they should be synced to this frontend library to maintain consistency.

### Backend Sources
- `server/lib/` - Core utilities
- `server/utils/` - Utility functions
- `server/middleware/` - Middleware utilities
- `server/services/` - Service utilities

### Sync Process
1. Identify backend utilities that need frontend equivalents
2. Adapt backend code for frontend use (remove server-specific dependencies)
3. Add TypeScript types and interfaces
4. Update this README with new utilities
5. Test the synced utilities

## 🧪 Testing

All utilities include proper error handling and should be tested in the frontend application. Use the existing test patterns for API calls, validation, and utility functions.

## 📚 Dependencies

- **zod** - Schema validation
- **dayjs** - Date manipulation
- **nanoid** - ID generation
- Built-in browser APIs for file operations and fetch

## 🔒 Security

- CSRF token management
- Secure file upload validation
- Input sanitization
- Safe logging (prevents sensitive data exposure)
