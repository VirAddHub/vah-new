# Admin API Reference 🔧

## 🔐 **Admin Authentication**

All admin APIs require:
- **Authentication**: Valid session cookie or Bearer JWT
- **Authorization**: User must have `is_admin: 1` or `role: 'admin'`
- **CSRF Protection**: CSRF token required for state-changing operations

### **Admin User Detection**
```javascript
// Admin users are identified by:
req.user.is_admin === 1
// OR
req.user.role === 'admin'
```

---

## 📋 **Complete Admin API List**

### **👥 User Management APIs**

#### `GET /api/admin/users`
**Purpose**: List all users
**Response**: `{ ok: true, data: [] }`
**Notes**: Currently returns empty array (placeholder)

#### `PATCH /api/admin/users/:id`
**Purpose**: Update user details
**Body**: `{ name, email, status, ... }`
**Response**: `{ error: 'not_found' }` (404)
**Notes**: Currently returns 404 (placeholder)

#### `PUT /api/admin/users/:id/kyc-status`
**Purpose**: Update user KYC verification status
**Body**: `{ status: 'verified' | 'rejected' | 'pending' }`
**Response**: `{ error: 'not_found' }` (404)
**Notes**: Currently returns 404 (placeholder)

---

### **📦 Subscription Plans APIs**

#### `GET /api/admin/plans`
**Purpose**: List all subscription plans
**Response**: `{ ok: true, data: [] }`
**Notes**: Currently returns empty array (placeholder)

#### `PATCH /api/admin/plans/:id`
**Purpose**: Update subscription plan
**Body**: `{ name, price, features, status, ... }`
**Response**: `{ error: 'not_found' }` (404)
**Notes**: Currently returns 404 (placeholder)

---

### **📮 Mail Management APIs**

#### `GET /api/admin/mail-items/:id`
**Purpose**: Get mail item details
**Response**: `{ ok: true, data: { id: "mail_id" } }`
**Headers**: `ETag: W/"stub"`
**Notes**: Returns basic mail item info with ETag for caching

#### `PUT /api/admin/mail-items/:id`
**Purpose**: Update mail item
**Body**: `{ status, notes, admin_notes, ... }`
**Response**: `{ ok: true }`
**Notes**: Updates mail item status and admin notes

#### `POST /api/admin/mail-items/:id/log-physical-dispatch`
**Purpose**: Log physical mail dispatch
**Body**: `{ courier, tracking_number, dispatch_date, ... }`
**Response**: `{ ok: true }`
**Notes**: Records when physical mail is dispatched

---

### **🚚 Forwarding Management APIs**

#### `GET /api/admin/forwarding/requests`
**Purpose**: List all forwarding requests
**Query Parameters**: 
- `?status=pending` - Filter by status
- `?status=approved` - Filter by status
- `?status=fulfilled` - Filter by status
**Response**: `{ ok: true, data: [forwardingRequests] }`
**Notes**: Returns all forwarding requests, optionally filtered

#### `PATCH /api/admin/forwarding/requests/:id`
**Purpose**: Update forwarding request
**Body**: `{ status, note, admin_id, courier, tracking }`
**Response**: `{ ok: true, data: updatedRequest }`
**Notes**: Updates forwarding request status and admin details

#### `POST /api/admin/forwarding/requests/:id/fulfill`
**Purpose**: Mark forwarding request as fulfilled
**Body**: `{ courier, tracking }`
**Response**: `{ ok: true, data: fulfilledRequest }`
**Notes**: Helper endpoint to mark request as fulfilled with courier info

---

## 🔧 **Admin Middleware Stack**

### **Authentication Flow**
1. **Session/JWT Check** → `requireAuth` middleware
2. **Admin Role Check** → `requireAdmin` middleware  
3. **CSRF Protection** → `csrfAfterAuth` middleware
4. **Route Handler** → Admin API endpoint

### **Admin Detection Logic**
```javascript
// In requireAdmin middleware
if (!req.user) return res.status(401).json({ error: 'unauthorized' });
if (req.user.is_admin === 1) return next();
return res.status(403).json({ error: 'forbidden' });
```

---

## 📊 **Admin Data Models**

### **Forwarding Request**
```typescript
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
```

### **Mail Item**
```typescript
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
```

### **User**
```typescript
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
```

---

## 🎯 **Admin Workflow Examples**

### **Forwarding Request Management**
```typescript
// 1. List all pending requests
const pending = await fetch('/api/admin/forwarding/requests?status=pending');

// 2. Approve a request
await fetch('/api/admin/forwarding/requests/123', {
  method: 'PATCH',
  body: JSON.stringify({ status: 'approved', admin_id: 1 })
});

// 3. Mark as fulfilled
await fetch('/api/admin/forwarding/requests/123/fulfill', {
  method: 'POST',
  body: JSON.stringify({ 
    courier: 'Royal Mail', 
    tracking: 'RM123456789' 
  })
});
```

### **Mail Item Management**
```typescript
// 1. Get mail item details
const mailItem = await fetch('/api/admin/mail-items/456');

// 2. Update mail item
await fetch('/api/admin/mail-items/456', {
  method: 'PUT',
  body: JSON.stringify({ 
    status: 'scanned',
    admin_notes: 'Scanned and ready for forwarding'
  })
});

// 3. Log physical dispatch
await fetch('/api/admin/mail-items/456/log-physical-dispatch', {
  method: 'POST',
  body: JSON.stringify({
    courier: 'DPD',
    tracking_number: 'DPD123456789',
    dispatch_date: '2025-01-15T10:00:00Z'
  })
});
```

---

## 🛡️ **Security Considerations**

### **Admin Access Control**
- All admin routes require `requireAdmin` middleware
- Admin status checked via `req.user.is_admin === 1`
- CSRF protection on all state-changing operations
- Rate limiting applied to all admin endpoints

### **Data Validation**
- Input sanitization on all admin endpoints
- SQL injection protection via prepared statements
- XSS protection via proper escaping
- File upload validation for mail scans

### **Audit Logging**
- All admin actions should be logged
- User ID and timestamp recorded
- Action type and affected resources tracked
- Sensitive operations require additional confirmation

---

## 🚀 **Frontend Integration**

### **Admin Dashboard Components**
```typescript
// Admin forwarding management
const AdminForwardingDashboard = () => {
  const [requests, setRequests] = useState([]);
  
  useEffect(() => {
    fetch('/api/admin/forwarding/requests')
      .then(res => res.json())
      .then(data => setRequests(data.data));
  }, []);
  
  return (
    <div>
      <h1>Forwarding Requests</h1>
      {requests.map(req => (
        <ForwardingRequestCard 
          key={req.id} 
          request={req}
          onUpdate={handleUpdate}
        />
      ))}
    </div>
  );
};
```

### **API Client Integration**
```typescript
// Using your existing API client
import { apiClient } from '@/lib/api-client';

// Admin API calls
const adminApi = {
  getForwardingRequests: (status?: string) => 
    apiClient.get(`/api/admin/forwarding/requests${status ? `?status=${status}` : ''}`),
    
  updateForwardingRequest: (id: number, data: any) =>
    apiClient.patch(`/api/admin/forwarding/requests/${id}`, data),
    
  fulfillForwardingRequest: (id: number, courier: string, tracking: string) =>
    apiClient.post(`/api/admin/forwarding/requests/${id}/fulfill`, { courier, tracking }),
    
  getMailItem: (id: string) =>
    apiClient.get(`/api/admin/mail-items/${id}`),
    
  updateMailItem: (id: string, data: any) =>
    apiClient.put(`/api/admin/mail-items/${id}`, data),
    
  logPhysicalDispatch: (id: string, dispatchData: any) =>
    apiClient.post(`/api/admin/mail-items/${id}/log-physical-dispatch`, dispatchData)
};
```

---

## 📈 **Admin API Status**

### **✅ Implemented & Working**
- Forwarding request management (list, update, fulfill)
- Mail item management (get, update, log dispatch)
- Admin authentication and authorization
- CSRF protection

### **🚧 Placeholder/Stub Endpoints**
- User management (returns 404)
- Subscription plans (returns empty arrays)
- KYC status updates (returns 404)

### **🔮 Future Enhancements**
- User search and filtering
- Bulk operations for mail items
- Advanced reporting and analytics
- Audit log viewing
- System configuration management

---

**Total Admin APIs: 8 endpoints** covering user management, plans, mail, and forwarding operations! 🔧
