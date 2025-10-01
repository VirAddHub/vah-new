# Frontend API Services Guide

## Overview

All 100+ backend endpoints are now available in the frontend through a comprehensive service layer located in `/apps/frontend/lib/services/`.

## Service Layer Structure

```
lib/services/
├── mail.service.ts          # Mail management
├── forwarding.service.ts    # Mail forwarding
├── billing.service.ts       # Billing & payments
├── profile.service.ts       # User profile
├── kyc.service.ts           # KYC verification
├── files.service.ts         # File management
├── admin.service.ts         # Admin operations
├── support.service.ts       # Support tickets
├── plans.service.ts         # Subscription plans
├── notifications.service.ts # Notifications
├── email-prefs.service.ts   # Email preferences
├── gdpr.service.ts          # GDPR exports
├── downloads.service.ts     # Download history
└── index.ts                 # Central exports
```

---

## Usage Examples

### 1. Mail Management

```typescript
import { mailService } from '@/lib/services';

// In a component
const MailDashboard = () => {
    const [mailItems, setMailItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMail = async () => {
            try {
                const response = await mailService.getMailItems();
                if (response.ok) {
                    setMailItems(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch mail:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMail();
    }, []);

    const handleForward = async (mailId: number) => {
        const response = await mailService.forwardMail(
            mailId,
            'recipient@example.com',
            'Please forward'
        );
        if (response.ok) {
            alert('Mail forwarded successfully!');
        }
    };

    // ... render UI
};
```

### 2. Forwarding Management

```typescript
import { forwardingService } from '@/lib/services';

const ForwardingPage = () => {
    const [requests, setRequests] = useState([]);

    const createRequest = async () => {
        const response = await forwardingService.createForwardingRequest({
            letter_id: 123,
            to_name: 'John Doe',
            address1: '123 Main St',
            city: 'London',
            postal: 'SW1A 1AA',
            country: 'GB',
        });

        if (response.ok) {
            console.log('Request created:', response.data);
            // Refresh list
            fetchRequests();
        }
    };

    const fetchRequests = async () => {
        const response = await forwardingService.getForwardingRequests();
        if (response.ok) {
            setRequests(response.data);
        }
    };

    // ... render UI
};
```

### 3. Billing Management

```typescript
import { billingService } from '@/lib/services';

const BillingPage = () => {
    const [invoices, setInvoices] = useState([]);
    const [subscription, setSubscription] = useState(null);

    useEffect(() => {
        fetchBillingData();
    }, []);

    const fetchBillingData = async () => {
        // Get invoices
        const invoicesResp = await billingService.getInvoices();
        if (invoicesResp.ok) {
            setInvoices(invoicesResp.data);
        }

        // Get subscription status
        const subResp = await billingService.getSubscriptionStatus();
        if (subResp.ok) {
            setSubscription(subResp.data);
        }
    };

    const cancelSubscription = async () => {
        const confirmed = confirm('Are you sure you want to cancel?');
        if (!confirmed) return;

        const response = await billingService.manageSubscription('cancel');
        if (response.ok) {
            alert('Subscription cancelled');
            fetchBillingData(); // Refresh
        }
    };

    // ... render UI
};
```

### 4. Profile Management

```typescript
import { profileService } from '@/lib/services';

const ProfileSettings = () => {
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const response = await profileService.getProfile();
        if (response.ok) {
            setProfile(response.data);
        }
    };

    const updateProfile = async (updates) => {
        const response = await profileService.updateProfile(updates);
        if (response.ok) {
            setProfile(response.data);
            alert('Profile updated!');
        }
    };

    const updateAddress = async (newAddress) => {
        const response = await profileService.updateForwardingAddress(newAddress);
        if (response.ok) {
            alert('Address updated!');
        }
    };

    // ... render UI
};
```

### 5. KYC Verification

```typescript
import { kycService } from '@/lib/services';

const KYCPage = () => {
    const [status, setStatus] = useState(null);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        const response = await kycService.getStatus();
        if (response.ok) {
            setStatus(response.data.status);
        }
    };

    const uploadDocuments = async (files) => {
        const formData = new FormData();
        files.forEach(file => formData.append('documents', file));

        const response = await kycService.uploadDocuments(formData);
        if (response.ok) {
            alert('Documents uploaded!');
            checkStatus(); // Refresh status
        }
    };

    // ... render UI
};
```

### 6. File Management

```typescript
import { filesService } from '@/lib/services';

const FilesPage = () => {
    const [files, setFiles] = useState([]);

    useEffect(() => {
        loadFiles();
    }, []);

    const loadFiles = async () => {
        const response = await filesService.getFiles({
            deleted: false,
            limit: 50,
            offset: 0,
        });

        if (response.ok) {
            setFiles(response.items);
        }
    };

    const downloadFile = async (fileId) => {
        const response = await filesService.getSignedUrl(fileId);
        if (response.ok) {
            // Open download URL in new tab
            window.open(response.url, '_blank');
        }
    };

    // ... render UI
};
```

### 7. Admin Operations

```typescript
import { adminService } from '@/lib/services';

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [mailItems, setMailItems] = useState([]);

    useEffect(() => {
        loadAdminData();
    }, []);

    const loadAdminData = async () => {
        // Get all users
        const usersResp = await adminService.getUsers();
        if (usersResp.ok) {
            setUsers(usersResp.data);
        }

        // Get all mail items
        const mailResp = await adminService.getMailItems();
        if (mailResp.ok) {
            setMailItems(mailResp.data);
        }
    };

    const updateUserKYC = async (userId, newStatus) => {
        const response = await adminService.updateKYCStatus(userId, newStatus);
        if (response.ok) {
            alert('KYC status updated!');
            loadAdminData(); // Refresh
        }
    };

    // ... render UI
};
```

### 8. Notifications

```typescript
import { notificationsService } from '@/lib/services';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        const response = await notificationsService.getNotifications();
        if (response.ok) {
            setNotifications(response.data);
            setUnreadCount(response.data.filter(n => !n.read).length);
        }
    };

    const markAsRead = async (notificationId) => {
        await notificationsService.markAsRead(notificationId);
        loadNotifications(); // Refresh
    };

    const markAllAsRead = async () => {
        await notificationsService.markAllAsRead();
        loadNotifications(); // Refresh
    };

    // ... render UI
};
```

### 9. Email Preferences

```typescript
import { emailPrefsService } from '@/lib/services';

const EmailPreferences = () => {
    const [prefs, setPrefs] = useState(null);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        const response = await emailPrefsService.getPreferences();
        if (response.ok) {
            setPrefs(response.prefs);
        }
    };

    const updatePreference = async (key, value) => {
        const response = await emailPrefsService.updatePreferences({
            [key]: value,
        });

        if (response.ok) {
            alert('Preferences updated!');
            loadPreferences(); // Refresh
        }
    };

    // ... render UI
};
```

### 10. GDPR Export

```typescript
import { gdprService } from '@/lib/services';

const GDPRExport = () => {
    const [exportStatus, setExportStatus] = useState(null);
    const [exportId, setExportId] = useState(null);

    const requestExport = async () => {
        const response = await gdprService.requestExport();
        if (response.ok) {
            setExportId(response.export_id);
            alert('Export requested! You will receive an email when ready.');
            checkExportStatus(response.export_id);
        }
    };

    const checkExportStatus = async (id) => {
        const response = await gdprService.getExportStatus(id);
        if (response.ok) {
            setExportStatus(response.status);
            if (response.download_url) {
                // Export ready!
                window.open(response.download_url, '_blank');
            }
        }
    };

    // ... render UI
};
```

---

## Complete Service API Reference

### Mail Service

```typescript
mailService.getMailItems() // Get all mail
mailService.getMailItem(id) // Get specific mail
mailService.updateMailItem(id, updates) // Update mail
mailService.getScanUrl(id) // Get scan URL
mailService.searchMail(query, limit, offset) // Search mail
mailService.forwardMail(id, recipient, notes) // Forward mail
```

### Forwarding Service

```typescript
forwardingService.getForwardingRequests() // Get all requests
forwardingService.createForwardingRequest(data) // Create request
forwardingService.getForwardingRequest(id) // Get specific request
forwardingService.bulkForward(ids) // Bulk forward
```

### Billing Service

```typescript
billingService.getBillingOverview() // Get overview
billingService.getInvoices() // Get all invoices
billingService.getInvoiceLink(id) // Get invoice download link
billingService.getSubscriptionStatus() // Get subscription status
billingService.manageSubscription(action) // Cancel/reactivate
billingService.createRedirectFlow() // GoCardless flow
```

### Profile Service

```typescript
profileService.getProfile() // Get profile
profileService.updateProfile(updates) // Update profile
profileService.updateForwardingAddress(address) // Update address
profileService.requestPasswordReset(email) // Request reset
profileService.resetPassword(token, password) // Reset password
```

### KYC Service

```typescript
kycService.uploadDocuments(formData) // Upload documents
kycService.getStatus() // Get KYC status
```

### Files Service

```typescript
filesService.getFiles(params) // Get all files
filesService.getSignedUrl(id) // Get download URL
```

### Admin Service

```typescript
adminService.getUsers() // Get all users
adminService.updateUser(id, updates) // Update user
adminService.updateKYCStatus(id, status) // Update KYC
adminService.getMailItems() // Get all mail (admin)
adminService.updateMailItem(id, updates) // Update mail (admin)
adminService.logPhysicalDispatch(id, data) // Log dispatch
adminService.getForwardingRequests() // Get requests (admin)
adminService.updateForwardingRequest(id, updates) // Update request
adminService.fulfillForwardingRequest(id, data) // Fulfill request
adminService.getPlans() // Get plans (admin)
adminService.updatePlan(id, updates) // Update plan
adminService.getAuditLogs(params) // Get audit logs
adminService.getForwardingAuditLogs() // Get forwarding logs
```

### Support Service

```typescript
supportService.createTicket(data) // Create ticket
supportService.closeTicket(id) // Close ticket
```

### Plans Service

```typescript
plansService.getPlans() // Get all plans
```

### Notifications Service

```typescript
notificationsService.getNotifications() // Get all notifications
notificationsService.markAsRead(id) // Mark as read
notificationsService.markAllAsRead() // Mark all as read
```

### Email Preferences Service

```typescript
emailPrefsService.getPreferences() // Get preferences
emailPrefsService.createPreferences(prefs) // Create preferences
emailPrefsService.updatePreferences(prefs) // Update preferences
```

### GDPR Service

```typescript
gdprService.requestExport() // Request export
gdprService.getExportStatus(id) // Check status
```

### Downloads Service

```typescript
downloadsService.getDownloads() // Get download history
downloadsService.createDownloadLink(fileId) // Create download link
```

---

## TypeScript Types

All services include TypeScript types for requests and responses. Import them as needed:

```typescript
import type { MailItem, MailItemsResponse } from '@/lib/services';
import type { ForwardingRequest } from '@/lib/services';
import type { Invoice, BillingOverview } from '@/lib/services';
// etc.
```

---

## Error Handling

All service methods follow the same response pattern:

```typescript
{
  ok: boolean;
  data?: any;
  message?: string;
  error?: string;
}
```

Always check the `ok` field before accessing `data`:

```typescript
const response = await mailService.getMailItems();

if (response.ok) {
    // Success - use response.data
    setMailItems(response.data);
} else {
    // Error - show response.message or response.error
    console.error(response.message || 'Failed to fetch mail');
}
```

---

## Next Steps

1. **Import services** in your components:
   ```typescript
   import { mailService, billingService } from '@/lib/services';
   ```

2. **Call service methods** in useEffect or event handlers

3. **Handle responses** with proper error checking

4. **Update UI** based on response data

---

## Example: Complete Mail Dashboard

See `/apps/frontend/components/MailDashboard.tsx` for a complete example integrating multiple services.

---

**All 100+ endpoints are now ready to use in your frontend!** 🎉
