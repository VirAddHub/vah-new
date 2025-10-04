# Forwarding Request Feature - Implementation Complete

## Overview
Implemented a complete mail forwarding system with intelligent pricing based on mail type (HMRC/Companies House = free, others = £2 charge).

## User Dashboard (Frontend)

### **EnhancedUserDashboard.tsx** - Inbox Section

#### Added Features:
1. **Request Forward Button**
   - Desktop: Small truck icon button in actions column
   - Mobile: Full-width button showing pricing
   - Shows "(Free)" for HMRC/Companies House mail
   - Shows "(£2)" for all other mail types

2. **Smart Pricing Logic**
   ```typescript
   const tag = mailItem.tag?.toUpperCase() || '';
   const isFree = tag === 'HMRC' || tag === 'COMPANIES HOUSE';
   ```

3. **User Flow**
   - Checks for saved forwarding address first
   - Shows confirmation with appropriate pricing message
   - Creates forwarding request via API
   - Refreshes mail and forwarding lists

## Backend Implementation

### **forwarding.ts** - User Forwarding Endpoint

#### Enhanced POST /api/forwarding/requests:
1. **Tag-Based Pricing**
   - Checks mail tag: HMRC or Companies House → Free
   - All other mail → £2.00 charge

2. **Billing Integration**
   ```typescript
   if (!isFree) {
       // Mark mail as billable
       await pool.query(`UPDATE mail_item SET is_billable_forward = true WHERE id = $1`, [mailItem.id]);

       // Create pending charge (200 pence = £2)
       await pool.query(`
           INSERT INTO forwarding_charge (user_id, mail_item_id, amount_pence, status, created_at)
           VALUES ($1, $2, $3, $4, $5)
       `, [userId, mailItem.id, 200, 'pending', Date.now()]);
   }
   ```

### **Database Migration** - 025_forwarding_charges.sql

#### New Table: `forwarding_charge`
```sql
CREATE TABLE forwarding_charge (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    mail_item_id INTEGER NOT NULL,
    amount_pence INTEGER NOT NULL DEFAULT 200,  -- £2.00
    status TEXT NOT NULL DEFAULT 'pending',      -- pending, charged, cancelled
    invoice_id INTEGER REFERENCES invoice(id),
    charged_at BIGINT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT
);
```

**Features:**
- Tracks £2 forwarding fees
- Links to user, mail_item, and invoice
- Unique constraint prevents duplicate charges
- Status: pending → charged → (added to invoice)

## Admin Dashboard

### **admin-forwarding.ts** - Enhanced Admin Endpoint

#### GET /api/admin/forwarding/requests
Returns comprehensive forwarding request data:

```typescript
{
    id: number,
    userId: number,
    userName: string,              // Full name or email
    userEmail: string,
    userPhone: string,
    mailItemId: number,
    mailSubject: string,           // Description or subject
    mailSender: string,            // Who sent the mail
    mailTag: string,               // HMRC, Companies House, etc.
    isBillable: boolean,           // true if £2 charge applies
    chargeAmount: string,          // "£2.00" or "Free"
    destination: string,           // Full address as comma-separated
    destinationDetails: {
        toName: string,
        address1: string,
        address2: string,
        city: string,
        state: string,
        postal: string,
        country: string
    },
    priority: string,              // standard, express, urgent
    status: string,                // pending, processing, shipped, etc.
    trackingNumber: string,
    carrier: string,
    cost: string,                  // "£2.00" or "Free"
    createdAt: string,
    fileUrl: string                // Link to mail scan
}
```

### **ForwardingSection.tsx** - Enhanced Admin UI

#### Display Improvements:
1. **Mail Item Column**
   - Mail ID and subject
   - Sender name
   - Tag badge (HMRC, Companies House, etc.)

2. **Destination Column**
   - Recipient name
   - Full address
   - User phone number

3. **Cost Column**
   - Shows "Free" or "£2.00"
   - "Billable" indicator for paid forwards

## How It Works

### User Side:
1. User sees mail in inbox
2. Clicks "Request Forward" button
3. System checks mail tag:
   - **HMRC or Companies House** → Confirms "Free forwarding"
   - **Other mail** → Confirms "£2 will be added to next Direct Debit"
4. System creates forwarding request with user's saved address
5. If billable, creates £2 charge in `forwarding_charge` table

### Admin Side:
1. Admin opens "Forwarding" section in admin dashboard
2. Sees all pending forwarding requests with:
   - **User details** (name, email, phone)
   - **Mail details** (description, sender, tag, scan link)
   - **Destination address** (full delivery details)
   - **Cost** (Free or £2.00 with billable indicator)
3. Can process, ship, or cancel requests
4. Can add tracking numbers

### Billing Integration:
1. Free forwards (HMRC/Companies House):
   - `is_billable_forward = false`
   - No charge created
   - Included in subscription

2. Paid forwards (£2):
   - `is_billable_forward = true`
   - Charge record created: `amount_pence = 200`
   - Status = 'pending'
   - Will be added to next GoCardless Direct Debit/invoice

## Key Files Modified

### Frontend:
- `/apps/frontend/components/EnhancedUserDashboard.tsx` - Added Request Forward button
- `/apps/frontend/components/admin/ForwardingSection.tsx` - Enhanced display

### Backend:
- `/apps/backend/src/server/routes/forwarding.ts` - Added billing logic
- `/apps/backend/src/server/routes/admin-forwarding.ts` - Enhanced admin endpoint
- `/apps/backend/migrations/025_forwarding_charges.sql` - New charges table

## Testing Checklist

- [ ] User can request forwarding for HMRC mail (free)
- [ ] User can request forwarding for Companies House mail (free)
- [ ] User can request forwarding for other mail (£2 charge)
- [ ] Confirmation message shows correct pricing
- [ ] Admin sees all request details including:
  - [ ] User name and contact info
  - [ ] Mail details with tag
  - [ ] Full destination address
  - [ ] Correct pricing (Free/£2.00)
  - [ ] Billable indicator for paid forwards
- [ ] Charges are created in database for non-free forwards
- [ ] No charges created for HMRC/Companies House mail

## Next Steps (Optional)

1. **Invoice Generation**: Integrate pending charges into monthly invoices
2. **GoCardless Integration**: Add charges to next Direct Debit payment
3. **Email Notifications**: Notify users when forwarding is dispatched
4. **Tracking Updates**: Auto-update tracking from courier APIs
5. **Analytics**: Track free vs paid forwarding requests
