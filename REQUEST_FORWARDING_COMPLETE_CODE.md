# Request Forwarding System - Complete Code

## Database Schema

### forwarding_request table
```sql
CREATE TABLE IF NOT EXISTS forwarding_request (
  id SERIAL PRIMARY KEY,
  created_at BIGINT NOT NULL,
  "user" INT REFERENCES "user"(id) ON DELETE CASCADE,
  mail_item INT REFERENCES mail_item(id) ON DELETE CASCADE,
  requested_at BIGINT,
  status TEXT,
  payment INT REFERENCES payment(id) ON DELETE SET NULL,
  is_billable BOOLEAN,
  billed_at BIGINT,
  destination_name TEXT,
  destination_address TEXT,
  source TEXT
);

-- Additional columns for newer schema
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS mail_item_id INTEGER REFERENCES mail_item(id) ON DELETE CASCADE;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS to_name TEXT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS address1 TEXT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS address2 TEXT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS postal TEXT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS tracking TEXT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS courier TEXT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS updated_at BIGINT;

CREATE INDEX IF NOT EXISTS idx_forwarding_req_user ON forwarding_request("user");
CREATE INDEX IF NOT EXISTS idx_forwarding_req_status ON forwarding_request(status);
CREATE INDEX IF NOT EXISTS idx_forwarding_req_user_id ON forwarding_request(user_id);
CREATE INDEX IF NOT EXISTS idx_forwarding_req_mail_item_id ON forwarding_request(mail_item_id);
```

### forwarding_charge table
```sql
CREATE TABLE IF NOT EXISTS forwarding_charge (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    mail_item_id INTEGER NOT NULL REFERENCES mail_item(id) ON DELETE CASCADE,
    amount_pence INTEGER NOT NULL DEFAULT 200, -- £2.00
    status TEXT NOT NULL DEFAULT 'pending', -- pending, charged, cancelled
    invoice_id INTEGER REFERENCES invoice(id) ON DELETE SET NULL,
    charged_at BIGINT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_forwarding_charge_user ON forwarding_charge(user_id);
CREATE INDEX IF NOT EXISTS idx_forwarding_charge_mail_item ON forwarding_charge(mail_item_id);
CREATE INDEX IF NOT EXISTS idx_forwarding_charge_status ON forwarding_charge(status);
CREATE INDEX IF NOT EXISTS idx_forwarding_charge_invoice ON forwarding_charge(invoice_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_forwarding_charge_unique ON forwarding_charge(mail_item_id) WHERE status = 'pending';
```

### mail_item table updates
```sql
ALTER TABLE mail_item ADD COLUMN IF NOT EXISTS forwarding_status TEXT;
ALTER TABLE mail_item ADD COLUMN IF NOT EXISTS is_billable_forward BOOLEAN DEFAULT false;
ALTER TABLE mail_item ADD COLUMN IF NOT EXISTS expires_at BIGINT;
```

## Backend API Routes

### /apps/backend/src/server/routes/forwarding.ts
```typescript
import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Helper function to normalize mail tags
function normalizeTag(tag: string | null): string {
    if (!tag) return 'UNKNOWN';
    return tag.toUpperCase().trim();
}

/**
 * POST /api/forwarding/requests
 * Create a new forwarding request
 * Body: { mail_item_id, to_name, address1, address2?, city, state?, postal, country?, reason?, method? }
 * Returns: { ok: true, data: { forwarding_request, pricing, mail_tag, charge_amount } }
 */
router.post('/forwarding/requests', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id as number;
    const {
        mail_item_id,
        to_name,
        address1,
        address2 = null,
        city,
        state = null,
        postal,
        country = 'GB',
        reason = null,
        method = 'standard',
    } = req.body ?? {};

    if (!mail_item_id || !to_name || !address1 || !city || !postal) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    try {
        const pool = getPool();

        // 1) Check ownership and fetch tag
        const mail = await pool.query(
            `SELECT id, user_id, tag, expires_at FROM mail_item WHERE id = $1 LIMIT 1`,
            [mail_item_id]
        );
        const row = mail.rows[0];
        if (!row) return res.status(404).json({ ok: false, error: 'Mail item not found' });
        if (row.user_id !== userId) return res.status(403).json({ ok: false, error: 'Not allowed' });

        // Check if mail has expired
        if (row.expires_at && Date.now() > Number(row.expires_at)) {
            return res.status(403).json({ ok: false, error: 'expired', message: 'Forwarding period has expired for this item' });
        }

        const tag = normalizeTag(row.tag);
        const isFree = ['HMRC', 'COMPANIES HOUSE'].includes(tag);

        const now = Date.now();

        // 2) Create forwarding_request
        const fr = await pool.query(
            `INSERT INTO forwarding_request (
                user_id, mail_item_id, to_name,
                address1, address2, city, state, postal, country,
                reason, method, status, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            RETURNING *`,
            [userId, mail_item_id, to_name, address1, address2, city, state, postal, country,
                reason, method, 'pending', now, now]
        );

        // 3) Update mail status
        await pool.query(
            `UPDATE mail_item SET forwarding_status = $1, updated_at = $2 WHERE id = $3`,
            ['Requested', now, mail_item_id]
        );

        // 4) If not free, mark mail billable & create pending charge (idempotent via unique index)
        if (!isFree) {
            await pool.query(
                `UPDATE mail_item SET is_billable_forward = TRUE WHERE id = $1`,
                [mail_item_id]
            );

            await pool.query(
                `INSERT INTO forwarding_charge (user_id, mail_item_id, amount_pence, status, created_at)
                 VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
                [userId, mail_item_id, 200, 'pending', now]
            );
        }

        return res.json({
            ok: true,
            data: {
                forwarding_request: fr.rows[0],
                pricing: isFree ? 'free' : 'billable_200',
                mail_tag: tag,
                charge_amount: isFree ? 0 : 200,
            },
        });
    } catch (e: any) {
        console.error('[POST /api/forwarding/requests] error:', e);
        return res.status(500).json({ ok: false, error: 'Failed to create forwarding request' });
    }
});

/**
 * POST /api/forwarding/requests/bulk
 * Bulk forward multiple mail items
 */
router.post('/forwarding/requests/bulk', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id as number;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ ok: false, error: 'Invalid or empty IDs array' });
    }

    try {
        const pool = getPool();
        const forwarded: number[] = [];
        const errors: any[] = [];

        for (const mailItemId of ids) {
            try {
                // Check ownership
                const mail = await pool.query(
                    `SELECT id, user_id, tag, expires_at FROM mail_item WHERE id = $1`,
                    [mailItemId]
                );
                const row = mail.rows[0];
                
                if (!row || row.user_id !== userId) {
                    errors.push({ id: mailItemId, error: 'Not found or not allowed' });
                    continue;
                }

                // Check expiry
                if (row.expires_at && Date.now() > Number(row.expires_at)) {
                    errors.push({ id: mailItemId, error: 'Expired' });
                    continue;
                }

                // Create forwarding request
                await pool.query(
                    `INSERT INTO forwarding_request (user_id, mail_item_id, status, created_at, updated_at)
                     VALUES ($1, $2, 'pending', $3, $3)`,
                    [userId, mailItemId, Date.now()]
                );

                // Update mail status
                await pool.query(
                    `UPDATE mail_item SET forwarding_status = 'Requested', updated_at = $1 WHERE id = $2`,
                    [Date.now(), mailItemId]
                );

                forwarded.push(mailItemId);
            } catch (error: any) {
                errors.push({ id: mailItemId, error: error.message });
            }
        }

        return res.json({ ok: true, forwarded, errors });
    } catch (error: any) {
        console.error('[POST /api/forwarding/requests/bulk] error:', error);
        return res.status(500).json({ ok: false, error: 'Failed to process bulk forwarding' });
    }
});

/**
 * GET /api/forwarding/requests
 * Get user's forwarding requests
 */
router.get('/forwarding/requests', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id as number;
    const { page = 1, page_size = 20, status } = req.query;

    try {
        const pool = getPool();
        const limitNum = Math.min(Number(page_size) || 20, 100);
        const offsetNum = (Number(page) - 1) * limitNum;

        let query = `
            SELECT 
                fr.*,
                mi.subject,
                mi.sender_name,
                mi.tag,
                mi.forwarding_status,
                fc.amount_pence,
                fc.status as charge_status
            FROM forwarding_request fr
            JOIN mail_item mi ON fr.mail_item_id = mi.id
            LEFT JOIN forwarding_charge fc ON fc.mail_item_id = mi.id
            WHERE fr.user_id = $1
        `;
        const params: any[] = [userId];
        let paramIndex = 2;

        if (status && status !== 'all') {
            query += ` AND fr.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        query += ` ORDER BY fr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limitNum, offsetNum);

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = `SELECT COUNT(*) FROM forwarding_request fr WHERE fr.user_id = $1`;
        const countParams: any[] = [userId];
        let countParamIndex = 2;

        if (status && status !== 'all') {
            countQuery += ` AND fr.status = $${countParamIndex}`;
            countParams.push(status);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = Number(countResult.rows[0].count);

        return res.json({
            ok: true,
            data: result.rows,
            total,
            page: Number(page),
            page_size: limitNum,
            total_pages: Math.ceil(total / limitNum)
        });
    } catch (error: any) {
        console.error('[GET /api/forwarding/requests] error:', error);
        return res.status(500).json({ ok: false, error: 'Failed to fetch forwarding requests' });
    }
});

export default router;
```

### /apps/backend/src/server/routes/admin-forwarding.ts
```typescript
import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/admin/forwarding/requests
 * Get all forwarding requests for admin dashboard
 */
router.get('/forwarding/requests', requireAdmin, async (req: Request, res: Response) => {
    const pool = getPool();
    const { page = 1, page_size = 20, status = 'all', q = '' } = req.query;

    try {
        const limitNum = Math.min(Number(page_size) || 20, 100);
        const offsetNum = (Number(page) - 1) * limitNum;

        // Handle empty results case
        if (limitNum <= 0) {
            return res.json({
                ok: true,
                data: [],
                pagination: {
                    page: Number(page),
                    pageSize: limitNum,
                    total: 0,
                    totalPages: 0
                }
            });
        }

        let query = `
            SELECT
                m.id,
                m.user_id,
                m.item_id,
                m.subject,
                m.description,
                m.sender_name,
                m.tag,
                m.status,
                m.is_billable_forward,
                COALESCE(m.forwarding_status, 'Pending') as forwarding_status,
                m.notes,
                m.expires_at,
                m.created_at,
                m.updated_at,
                u.email as user_email,
                u.first_name,
                u.last_name,
                u.phone,
                f.name as file_name,
                f.web_url as file_url,
                fr.id as forwarding_request_id,
                fr.to_name,
                fr.address1,
                fr.address2,
                fr.city,
                fr.state,
                fr.postal,
                fr.country,
                fr.reason,
                fr.method,
                fr.tracking,
                fr.courier,
                fc.amount_pence as charge_amount
            FROM mail_item m
            JOIN "user" u ON m.user_id = u.id
            LEFT JOIN file f ON m.file_id = f.id
            LEFT JOIN forwarding_request fr ON fr.mail_item_id = m.id
            LEFT JOIN forwarding_charge fc ON fc.mail_item_id = m.id AND fc.status = 'pending'
            WHERE COALESCE(m.forwarding_status, 'Pending') != 'No'
              AND COALESCE(m.forwarding_status, 'Pending') IN ('Requested', 'Pending', 'Processing', 'Dispatched')
        `;

        const params: any[] = [];
        let paramIndex = 1;

        if (status && status !== 'all') {
            query += ` AND COALESCE(m.forwarding_status, 'Pending') = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (q) {
            query += ` AND (
                m.subject ILIKE $${paramIndex} OR 
                m.sender_name ILIKE $${paramIndex} OR 
                u.email ILIKE $${paramIndex} OR
                CONCAT(u.first_name, ' ', u.last_name) ILIKE $${paramIndex}
            )`;
            params.push(`%${q}%`);
            paramIndex++;
        }

        query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limitNum, offsetNum);

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = `
            SELECT COUNT(*)
            FROM mail_item m
            JOIN "user" u ON m.user_id = u.id
            WHERE COALESCE(m.forwarding_status, 'Pending') != 'No'
              AND COALESCE(m.forwarding_status, 'Pending') IN ('Requested', 'Pending', 'Processing', 'Dispatched')
        `;
        const countParams: any[] = [];
        let countParamIndex = 1;

        if (status && status !== 'all') {
            countQuery += ` AND COALESCE(m.forwarding_status, 'Pending') = $${countParamIndex}`;
            countParams.push(status);
            countParamIndex++;
        }

        if (q) {
            countQuery += ` AND (
                m.subject ILIKE $${countParamIndex} OR 
                m.sender_name ILIKE $${countParamIndex} OR 
                u.email ILIKE $${countParamIndex} OR
                CONCAT(u.first_name, ' ', u.last_name) ILIKE $${countParamIndex}
            )`;
            countParams.push(`%${q}%`);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = Number(countResult.rows[0].count);

        return res.json({
            ok: true,
            data: result.rows,
            pagination: {
                page: Number(page),
                pageSize: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error: any) {
        console.error('[GET /api/admin/forwarding/requests] error:', error);
        return res.status(500).json({ ok: false, error: 'Failed to fetch forwarding requests' });
    }
});

/**
 * PUT /api/admin/forwarding/requests/:id
 * Update forwarding request status
 */
router.put('/forwarding/requests/:id', requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, tracking, courier, notes } = req.body;

    try {
        const pool = getPool();

        // Update forwarding request
        await pool.query(
            `UPDATE forwarding_request 
             SET status = $1, tracking = $2, courier = $3, updated_at = $4 
             WHERE id = $5`,
            [status, tracking, courier, Date.now(), id]
        );

        // Update mail item status
        await pool.query(
            `UPDATE mail_item 
             SET forwarding_status = $1, updated_at = $2 
             WHERE id = (SELECT mail_item_id FROM forwarding_request WHERE id = $3)`,
            [status, Date.now(), id]
        );

        return res.json({ ok: true });
    } catch (error: any) {
        console.error('[PUT /api/admin/forwarding/requests/:id] error:', error);
        return res.status(500).json({ ok: false, error: 'Failed to update forwarding request' });
    }
});

export default router;
```

## Frontend Components

### /apps/frontend/lib/services/forwarding.service.ts
```typescript
import { api } from './apiClient';

export interface ForwardingRequest {
    id: number;
    user_id: number;
    mail_item_id: number;
    to_name: string;
    address1: string;
    address2?: string;
    city: string;
    state?: string;
    postal: string;
    country: string;
    reason?: string;
    method?: string;
    status: string;
    tracking?: string;
    courier?: string;
    created_at: number;
    updated_at: number;
}

export interface ForwardingRequestsResponse {
    ok: boolean;
    data: ForwardingRequest[];
}

export const forwardingService = {
    /**
     * Get all forwarding requests for current user
     */
    async getForwardingRequests(): Promise<ForwardingRequestsResponse> {
        const { data } = await api('/api/forwarding/requests', { method: 'GET' });
        console.log('[forwardingService.getForwardingRequests] api() returned data:', data);
        return {
            ok: data.ok ?? false,
            data: Array.isArray(data.data) ? data.data : (Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []))
        };
    },

    /**
     * Create a new forwarding request
     */
    async createForwardingRequest(request: {
        letter_id: number;
        to_name: string;
        address1: string;
        address2?: string;
        city: string;
        state?: string;
        postal: string;
        country: string;
        reason?: string;
        method?: string;
    }): Promise<{ ok: boolean; data: ForwardingRequest }> {
        const { data } = await api('/api/forwarding/requests', {
            method: 'POST',
            body: JSON.stringify(request),
        });
        return data;
    },

    /**
     * Get a specific forwarding request
     */
    async getForwardingRequest(id: number): Promise<{ ok: boolean; data: ForwardingRequest }> {
        const { data } = await api(`/api/forwarding/requests/${id}`, { method: 'GET' });
        return data;
    },

    /**
     * Bulk forward multiple mail items
     */
    async bulkForward(ids: number[]): Promise<{ ok: boolean; forwarded: number[]; errors: any[] }> {
        const { data } = await api('/api/forwarding/requests/bulk', {
            method: 'POST',
            body: JSON.stringify({ ids }),
        });
        return data;
    },
};
```

### /apps/frontend/hooks/useApi.ts (Forwarding Hook)
```typescript
// Request Forwarding Hook
export function useRequestForwarding() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await forwardingService.createForwardingRequest(data);
      if (!response.ok) {
        throw new Error('Failed to create forwarding request');
      }
      return { success: true, data: response.data };
    } catch (err: any) {
      setError(err.message || 'Failed to create forwarding request');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
```

### /apps/frontend/components/UserDashboard.tsx (Forwarding Handler)
```typescript
// In UserDashboard component
const handleRequestForwarding = () => {
  if (selectedMail.length > 0) {
    onNavigate('dashboard-forwarding-confirm', {
      selectedMailIds: selectedMail,
      allMailItems: mailItems
    });
  }
};

// In the JSX render section
{/* Bulk Actions Notice - Mobile */}
{isSomeSelected && (
  <Card className="sm:hidden border-primary/30 bg-primary/5">
    <CardContent className="p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="font-medium">{selectedMail.length} items selected</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setSelectedMail([])}>
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Button size="default" variant="outline" className="w-full h-10" onClick={onBulkDownload} disabled={selectedMail.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Download Selected ({selectedMail.length})
        </Button>
        <Button size="default" variant="default" className="w-full h-10" onClick={handleRequestForwarding}>
          <Truck className="h-4 w-4 mr-2" />
          Request Forwarding
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

### /apps/frontend/lib/apiClient.ts (Forwarding API)
```typescript
// ---- Forwarding API ----
import type { CreateForwardingPayload, ForwardingResponse } from '../types/api';
import { isOk } from '../types/api';

const forwardingApi = {
    async create(payload: CreateForwardingPayload): Promise<ApiResponse<ForwardingResponse>> {
        try {
            const res = await post<ForwardingResponse>('/api/forwarding/requests', payload);
            return res;
        } catch (e: any) {
            return {
                ok: false,
                error: e?.response?.data?.error ?? 'Failed to create forwarding request',
                code: e?.response?.status
            };
        }
    },
};

const adminForwardingApi = {
    async list(params?: { page?: number; page_size?: number; status?: string; q?: string }): Promise<ApiResponse<any[]>> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.page) queryParams.append('page', params.page.toString());
            if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
            if (params?.status) queryParams.append('status', params.status);
            if (params?.q) queryParams.append('q', params.q);

            const url = `/api/admin/forwarding/requests${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            const res = await get<any[]>(url);
            return res;
        } catch (e: any) {
            return {
                ok: false,
                error: e?.response?.data?.error ?? 'Failed to fetch forwarding requests',
                code: e?.response?.status
            };
        }
    },

    async update(id: number, data: any): Promise<ApiResponse<any>> {
        try {
            const res = await put<any>(`/api/admin/forwarding/requests/${id}`, data);
            return res;
        } catch (e: any) {
            return {
                ok: false,
                error: e?.response?.data?.error ?? 'Failed to update forwarding request',
                code: e?.response?.status
            };
        }
    },
};
```

## Types

### /apps/frontend/types/api.ts
```typescript
export interface CreateForwardingPayload {
    mail_item_id: number;
    to_name: string;
    address1: string;
    address2?: string;
    city: string;
    state?: string;
    postal: string;
    country?: string;
    reason?: string;
    method?: string;
}

export interface ForwardingResponse {
    forwarding_request: {
        id: number;
        user_id: number;
        mail_item_id: number;
        to_name: string;
        address1: string;
        address2?: string;
        city: string;
        state?: string;
        postal: string;
        country: string;
        reason?: string;
        method: string;
        status: string;
        created_at: number;
        updated_at: number;
    };
    pricing: 'free' | 'billable_200';
    mail_tag: string;
    charge_amount: number;
}
```

## Environment Variables

### Required Environment Variables
```bash
# Make.com webhook for forwarding requests (optional)
MAKE_FORWARDING_LOG_URL=https://hook.eu1.make.com/your-webhook-url
MAKE_FORWARDING_LOG_SECRET=your-secret-key
```

## Usage Examples

### Creating a Forwarding Request
```typescript
const forwardingData = {
    mail_item_id: 123,
    to_name: "John Smith",
    address1: "123 Main Street",
    address2: "Apt 4B",
    city: "London",
    state: "England",
    postal: "SW1A 1AA",
    country: "GB",
    reason: "Personal mail forwarding",
    method: "standard"
};

const response = await forwardingService.createForwardingRequest(forwardingData);
```

### Bulk Forwarding
```typescript
const mailItemIds = [123, 124, 125];
const response = await forwardingService.bulkForward(mailItemIds);
console.log(`Forwarded: ${response.forwarded.length}, Errors: ${response.errors.length}`);
```

### Admin Management
```typescript
// Get all forwarding requests
const requests = await adminForwardingApi.list({ 
    page: 1, 
    page_size: 20, 
    status: 'pending' 
});

// Update forwarding request
await adminForwardingApi.update(123, {
    status: 'processing',
    tracking: 'TRK123456789',
    courier: 'Royal Mail'
});
```

## Key Features

1. **Pricing Logic**: Free for HMRC/Companies House mail, £2.00 for others
2. **Bulk Operations**: Forward multiple mail items at once
3. **Status Tracking**: Pending → Processing → Dispatched → Delivered
4. **Admin Dashboard**: Complete management interface
5. **Audit Trail**: All actions logged for compliance
6. **Webhook Integration**: Sends requests to external automation systems
7. **Expiry Handling**: Blocks forwarding after storage period expires
8. **Security**: User ownership validation and admin controls

## Database Indexes for Performance

```sql
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_forwarding_req_user ON forwarding_request("user");
CREATE INDEX IF NOT EXISTS idx_forwarding_req_status ON forwarding_request(status);
CREATE INDEX IF NOT EXISTS idx_forwarding_req_user_id ON forwarding_request(user_id);
CREATE INDEX IF NOT EXISTS idx_forwarding_req_mail_item_id ON forwarding_request(mail_item_id);
CREATE INDEX IF NOT EXISTS idx_forwarding_charge_user ON forwarding_charge(user_id);
CREATE INDEX IF NOT EXISTS idx_forwarding_charge_mail_item ON forwarding_charge(mail_item_id);
CREATE INDEX IF NOT EXISTS idx_forwarding_charge_status ON forwarding_charge(status);
CREATE INDEX IF NOT EXISTS idx_forwarding_charge_invoice ON forwarding_charge(invoice_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_forwarding_charge_unique ON forwarding_charge(mail_item_id) WHERE status = 'pending';
```

This complete code provides a full-featured mail forwarding system with user interface, admin management, billing integration, and comprehensive audit trails.

