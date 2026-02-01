# Invoice System Documentation

## Overview

The invoice system generates PDF invoices for users based on their subscription billing periods and any additional charges (e.g., mail forwarding fees). Invoices are automatically generated at the end of billing periods and sent via email to users.

---

## Invoice Generation

### When Invoices Are Created

1. **Automatic Generation (End of Billing Period)**
   - Triggered by cron job: `POST /api/internal/billing/generate-invoices`
   - Runs at the end of each billing period (monthly or annual)
   - Generates invoices for all active users with active subscriptions
   - Only generates if current date >= period end date

2. **Payment Confirmation (GoCardless Webhook)**
   - When a payment is confirmed via GoCardless webhook
   - Links invoice to payment via `gocardless_payment_id`
   - Sets invoice status to 'paid'

3. **Manual Generation (Admin)**
   - Admin endpoint: `POST /api/admin/billing/generate-invoice`
   - Allows manual invoice generation for specific users/periods

### Invoice Creation Process

1. **Check for Existing Invoice**
   - First checks by `gocardless_payment_id` (if payment ID provided)
   - Otherwise checks by `(user_id, period_start, period_end)`
   - If exists, updates amount and returns existing invoice (idempotent)

2. **Calculate Invoice Amount**
   - Base subscription fee (from plan or default: £9.99/month or £89.99/year)
   - Plus all pending charges for the period (mail forwarding, etc.)
   - Total = base fee + charges

3. **Generate Invoice Number**
   - Format: `VAH-{YEAR}-{SEQUENCE}` (e.g., `VAH-2025-000001`)
   - Uses `invoices_seq` table with year-based sequence
   - Sequence increments per year

4. **Create Invoice Record**
   - Status: 'issued' (if no payment ID) or 'paid' (if payment ID provided)
   - Stores: user_id, period_start, period_end, amount_pence, currency, invoice_number

5. **Attach Charges**
   - Finds all pending charges for the period
   - Updates charges: `status = 'billed'`, `invoice_id = {invoice.id}`, `billed_at = NOW()`

6. **Generate PDF**
   - Creates PDF file in: `data/invoices/{YEAR}/{user_id}/invoice-{invoice_id}.pdf`
   - Updates invoice record with `pdf_path`

7. **Send Email**
   - Sends invoice available email (idempotent - only if `email_sent_at` is NULL)
   - Uses Postmark template ID: 40508791
   - Includes: invoice amount, billing period, billing URL

---

## Dates Used in Invoices

### Invoice Date
- **Source**: `invoices.created_at` (stored as epoch milliseconds)
- **Fallback**: Current date if `created_at` is missing
- **Format**: `YYYY-MM-DD` (e.g., "2025-01-15")
- **Display**: Shown as "Invoice date: 2025-01-15"

### Billing Period

#### Period Start (`period_start`)
- **Monthly**: First day of the current month (e.g., `2025-01-01`)
- **Annual**: January 1st of the current year (e.g., `2025-01-01`)
- **Format**: `YYYY-MM-DD`
- **Calculation**: Uses UTC date boundaries for consistency

#### Period End (`period_end`)
- **Monthly**: Last day of the current month (e.g., `2025-01-31`)
- **Annual**: December 31st of the current year (e.g., `2025-12-31`)
- **Format**: `YYYY-MM-DD`
- **Calculation**: Uses UTC date boundaries

#### Period Calculation Logic
```typescript
// Monthly
const start = `${year}-${month}-01`;
const end = last day of month (calculated via Date.UTC)

// Annual
const start = `${year}-01-01`;
const end = `${year}-12-31`;
```

#### Display Format
- **PDF**: "Billing period: 2025-01-01 – 2025-01-31"
- **Email**: "1–31 January 2025" (formatted via `formatBillingPeriod()`)

### First Invoice Period
- If user has no previous invoices:
  - Uses `user.plan_start_date` if available
  - Otherwise defaults to last 30 days from today
  - Period start = plan_start_date or (today - 30 days)
  - Period end = today

### Next Invoice Period
- Calculated from last invoice's `period_end`
- Period start = last invoice's period_end + 1 day
- Period end = today (or end of current period if not yet reached)

---

## Invoice Content

### Invoice Number
- **Format**: `VAH-{YEAR}-{SEQUENCE}`
- **Example**: `VAH-2025-000001`, `VAH-2025-000002`
- **Sequence**: Year-based, auto-increments per invoice
- **Storage**: Stored in `invoices.invoice_number`

### Invoice Amount

#### Base Subscription Fee
- **Monthly**: £9.99 (999 pence)
- **Annual**: £89.99 (8999 pence)
- **Source**: From `plans` table or hardcoded defaults
- **Note**: This is the base plan price, not including charges

#### Additional Charges
- Mail forwarding fees
- Other service charges
- **Source**: `charge` table with `status = 'pending'` and `service_date` within period
- **Status**: Charges are marked as `'billed'` when attached to invoice

#### Total Amount
- **Formula**: `invoice.amount_pence = base_subscription_fee + sum(all_charges)`
- **Currency**: GBP (pence stored as integer)
- **Recomputation**: Invoice amount is recomputed from attached charges before PDF generation

### Customer Information

#### Bill To Section
- **Company Name**: `user.company_name` (if available)
- **Customer Name**: `user.first_name + user.last_name` (or "Customer" if missing)
- **Email**: `user.email`

#### Source Data
```sql
SELECT email, first_name, last_name, company_name 
FROM "user" 
WHERE id = {user_id}
```

### Line Items

#### Subscription Charge
- **Description**: "Subscription fee" or from charge description
- **Date**: Service date from charge record (or period start if no charge record)
- **Amount**: Base subscription fee

#### Additional Charges
- **Description**: From `charge.description` (e.g., "Mail forwarding", "Non-HMRC/Companies House forwarding")
- **Date**: `charge.service_date` (formatted as YYYY-MM-DD)
- **Amount**: `charge.amount_pence`

#### Line Item Table Structure
- **Columns**: Description | Date | Amount
- **Sorting**: By `service_date ASC, created_at ASC`
- **Display**: All charges with `invoice_id = {invoice.id}` and `status = 'billed'`

#### Charge Cleanup
- Legacy descriptions are cleaned: removes `(legacy)` suffix
- Example: "Non-HMRC/Companies House forwarding (legacy)" → "Non-HMRC/Companies House forwarding"

### Invoice Status

#### Status Values
- **'issued'**: Invoice created but payment not yet confirmed
- **'paid'**: Payment confirmed (has `gocardless_payment_id`)
- **'void'**: Invoice voided/cancelled
- **'failed'**: Payment failed

#### Status Updates
- Set to 'paid' when `gocardless_payment_id` is provided
- Set to 'issued' when created without payment ID
- Updated via GoCardless webhooks

---

## PDF Structure

### Header
- **Logo**: VirtualAddressHub logo (left side)
  - Tries: `apps/frontend/public/email/logo.png`
  - Fallback: `apps/frontend/public/images/logo.png`
  - Max dimensions: 140px width × 36px height
- **Company Address** (right side):
  - Second Floor, Tanner Place
  - 54–58 Tanner Street
  - London SE1 3PH

### Invoice Details Section
- **Invoice**: `{invoice_number}` (e.g., "VAH-2025-000001")
- **Invoice date**: `{invoice_date}` (YYYY-MM-DD format)
- **Billing period**: `{period_start} – {period_end}` (YYYY-MM-DD format)

### Bill To Section
- **Label**: "Bill to:"
- **Content**:
  - Company name (if available)
  - Customer name (first_name + last_name)
  - Email address

### Items Table
- **Header Row**: Description | Date | Amount
- **Line Items**: Each charge with description, service date, and amount
- **Total Row**: "Total" with formatted amount (e.g., "GBP 9.99")

### Footer
- **Message**: "Thank you for your business."

### PDF File Storage
- **Directory**: `data/invoices/{YEAR}/{user_id}/`
- **Filename**: `invoice-{invoice_id}.pdf`
- **Full Path Example**: `data/invoices/2025/123/invoice-456.pdf`
- **Relative Path**: `/invoices/{YEAR}/{user_id}/invoice-{invoice_id}.pdf`

### PDF Generation
- **Library**: PDFKit
- **Page Size**: A4
- **Margins**: 50px (all sides)
- **Fonts**: Helvetica (regular and bold)
- **Colors**: 
  - Text: #111 (dark gray)
  - Muted: #444, #666
  - Borders: #E6E6E6 (light gray)

---

## Email Notification

### When Email Is Sent
- After PDF is generated
- Only if `email_sent_at` is NULL (idempotent)
- Sent once per invoice

### Email Template
- **Service**: Postmark
- **Template ID**: 40508791
- **Template Alias**: `Templates.InvoiceAvailable`
- **From**: support@virtualaddresshub.co.uk
- **Reply-To**: support@virtualaddresshub.co.uk

### Email Content Variables
- **firstName**: `user.first_name`
- **name**: `user.name`
- **invoice_amount**: Formatted amount (e.g., "9.99")
- **billing_period**: Formatted period (e.g., "1–31 January 2025")
- **billing_url**: Link to billing page (e.g., `https://virtualaddresshub.com/billing#invoices`)

### Email Tracking
- **Field**: `invoices.email_sent_at` (timestamp)
- **Error Field**: `invoices.email_send_error` (stores error message if send fails)
- **Idempotency**: Email only sent if `email_sent_at` is NULL

---

## Database Schema

### invoices Table
```sql
- id: SERIAL PRIMARY KEY
- user_id: INTEGER (references user.id)
- gocardless_payment_id: TEXT (nullable, links to GoCardless payment)
- period_start: TEXT (YYYY-MM-DD format)
- period_end: TEXT (YYYY-MM-DD format)
- amount_pence: INTEGER (total in pence)
- currency: TEXT (default: 'GBP')
- status: TEXT ('issued', 'paid', 'void', 'failed')
- pdf_path: TEXT (nullable, relative path to PDF file)
- invoice_number: TEXT (nullable, e.g., 'VAH-2025-000001')
- created_at: BIGINT (epoch milliseconds)
- email_sent_at: TIMESTAMP (nullable, when email was sent)
- email_send_error: TEXT (nullable, error message if email failed)
```

### invoices_seq Table
```sql
- year: INTEGER PRIMARY KEY
- sequence: INTEGER (auto-increments per year)
- created_at: BIGINT
- updated_at: BIGINT
```

### charge Table (Related)
```sql
- id: UUID PRIMARY KEY
- user_id: INTEGER
- invoice_id: INTEGER (nullable, links to invoice)
- amount_pence: INTEGER
- description: TEXT
- service_date: DATE
- status: TEXT ('pending', 'billed', 'cancelled')
- billed_at: TIMESTAMP (nullable, when attached to invoice)
```

---

## Invoice Amount Recalculation

### When Recalculated
- Before PDF generation
- Before email sending
- After charges are attached
- Via `recomputeInvoiceAmount()` function

### Recalculation Logic
```sql
SELECT COALESCE(SUM(amount_pence), 0)::bigint AS total_pence
FROM charge
WHERE invoice_id = {invoice_id}
  AND status = 'billed'
```

### Invariant
- **Rule**: `invoice.amount_pence = SUM(charge.amount_pence WHERE invoice_id = invoice.id AND status='billed')`
- **Enforcement**: Amount is recomputed from charges before finalizing invoice
- **Logging**: Warns if invoice amount doesn't match sum of charges

---

## Invoice Numbering

### Format
- **Pattern**: `VAH-{YEAR}-{SEQUENCE}`
- **Example**: `VAH-2025-000001`, `VAH-2025-000002`
- **Sequence**: Padded to 6 digits with leading zeros

### Sequence Management
- **Table**: `invoices_seq`
- **Key**: `year` (unique per year)
- **Logic**: 
  - Insert with sequence=1 for new year
  - On conflict, increment sequence
  - Returns new sequence number

### Fallback
- If `invoices_seq` table doesn't exist:
  - Format: `INV-{user_id}-{period_start}`
  - Example: `INV-123-2025-01-01`

---

## Idempotency

### Invoice Creation
- **By Payment ID**: If `gocardless_payment_id` provided, checks for existing invoice
- **By Period**: If no payment ID, checks for existing invoice by `(user_id, period_start, period_end)`
- **Behavior**: Updates existing invoice amount if found, otherwise creates new

### PDF Generation
- **Idempotent**: Can be re-run safely (overwrites file, updates `pdf_path`)
- **Trigger**: Regenerates if PDF doesn't exist or invoice amount changed

### Email Sending
- **Idempotent**: Only sends if `email_sent_at` is NULL
- **Guard**: Checks `email_sent_at` before sending
- **Update**: Sets `email_sent_at = NOW()` after successful send

### Charge Attachment
- **Idempotent**: Only attaches charges with `status = 'pending'` and `invoice_id IS NULL`
- **Update**: Sets `status = 'billed'`, `invoice_id = {invoice.id}`, `billed_at = NOW()`

---

## API Endpoints

### User-Facing
- **GET** `/api/bff/billing/invoices` - List user's invoices
- **GET** `/api/bff/billing/invoices/{id}/download` - Download invoice PDF
- **GET** `/api/bff/billing/overview` - Get billing overview (includes latest invoice)

### Internal/Admin
- **POST** `/api/internal/billing/generate-invoices` - Generate invoices for all active users (cron)
- **POST** `/api/admin/billing/generate-invoice` - Manually generate invoice for user
- **GET** `/api/admin/invoices` - List all invoices (admin)

---

## Key Functions

### `createInvoiceForPayment(opts)`
- Creates invoice record and generates PDF
- Handles existing invoice lookup
- Attaches pending charges
- Sends email notification

### `generateInvoicePdf(opts)`
- Generates PDF file
- Returns relative path to PDF
- Includes all line items and formatting

### `ensureInvoicePdfAndEmail(invoiceId)`
- Ensures PDF exists and email is sent
- Idempotent operations
- Used for end-of-period finalization

### `recomputeInvoiceAmount(opts)`
- Recalculates invoice total from attached charges
- Updates `invoice.amount_pence`
- Enforces amount = sum of charges invariant

### `sendInvoiceAvailableEmail(invoice)`
- Sends invoice email via Postmark
- Idempotent (only if `email_sent_at` is NULL)
- Handles errors gracefully

---

## Important Notes

1. **Amount Calculation**: Invoice amount is always recomputed from charges before PDF generation to ensure accuracy.

2. **Period Boundaries**: Uses UTC date boundaries for consistency across timezones.

3. **Charge Status Flow**: 
   - `pending` → `billed` (when attached to invoice)
   - Charges must have `service_date` within invoice period

4. **Frozen Invoices**: Once `email_sent_at` or `gocardless_payment_id` is set, invoice is considered "frozen" and new charges cannot be added.

5. **Currency**: Currently hardcoded to GBP (pence stored as integer).

6. **PDF Storage**: PDFs are stored in `data/invoices/` directory structure by year and user ID.

7. **Email Failures**: Email send failures are logged but don't prevent invoice creation (non-blocking).

---

## Example Invoice Data

```json
{
  "id": 123,
  "user_id": 456,
  "invoice_number": "VAH-2025-000001",
  "period_start": "2025-01-01",
  "period_end": "2025-01-31",
  "amount_pence": 999,
  "currency": "GBP",
  "status": "paid",
  "gocardless_payment_id": "PM123456",
  "pdf_path": "/invoices/2025/456/invoice-123.pdf",
  "created_at": 1704067200000,
  "email_sent_at": "2025-01-31T23:00:00Z"
}
```

---

## Related Systems

- **GoCardless Webhooks**: Trigger invoice creation/updates on payment confirmation
- **Charge System**: Creates charges for mail forwarding and other services
- **Subscription System**: Determines billing interval (monthly/annual) and base price
- **Email System**: Sends invoice notifications via Postmark
