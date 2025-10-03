# Migration 020: Add is_read column to mail_item table

## Problem
The PATCH /api/mail-items/:id endpoint is failing with 500 error because it's trying to update an `is_read` column that doesn't exist in the database.

## Solution
Add the missing `is_read` column to the mail_item table.

## Migration Command
Run this SQL command in your Render PostgreSQL database:

```sql
-- Add is_read column to mail_item table
-- This column tracks whether a user has read/viewed a mail item

ALTER TABLE mail_item 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Add index for better performance when filtering by read status
CREATE INDEX IF NOT EXISTS idx_mail_item_user_read ON mail_item(user_id, is_read);

-- Add comment to document the column
COMMENT ON COLUMN mail_item.is_read IS 'Whether the user has read/viewed this mail item';
```

## How to Run
1. Go to your Render dashboard
2. Open your PostgreSQL database
3. Go to the "Shell" tab
4. Run the SQL command above

## Expected Result
After running this migration:
- ✅ PATCH /api/mail-items/:id will work correctly
- ✅ Users can mark mail items as read/unread
- ✅ Frontend can update mail item read status
- ✅ No more 500 errors when updating mail items

## Verification
After running the migration, test the endpoint:
```bash
curl -X PATCH https://vah-api-staging.onrender.com/api/mail-items/7 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"is_read": true}'
```

Should return 200 OK instead of 500 error.
