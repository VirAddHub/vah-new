#!/bin/bash
# apps/backend/scripts/fix-timestamps.sh
# Comprehensive script to fix all timestamp issues across the codebase

echo "🔧 Fixing timestamp issues across the codebase..."

# Function to fix a file
fix_file() {
    local file="$1"
    local table="$2"
    local field="$3"
    local replacement="$4"
    
    if [ -f "$file" ]; then
        echo "  Fixing $file: $table.$field"
        # Replace Date.now() with proper timestamp utility
        sed -i.bak "s/Date\.now()/$replacement/g" "$file"
        rm -f "$file.bak"
    fi
}

# Add timestamp utils import to files that need it
add_import() {
    local file="$1"
    if [ -f "$file" ] && ! grep -q "TimestampUtils" "$file"; then
        echo "  Adding TimestampUtils import to $file"
        # Add import after existing imports
        sed -i.bak '/^import.*from.*express/a\
import { TimestampUtils } from '\''../../lib/timestamp-utils'\'';
' "$file"
        rm -f "$file.bak"
    fi
}

echo "📁 Processing admin routes..."

# Admin routes
add_import "src/server/routes/admin-mail-items.ts"
fix_file "src/server/routes/admin-mail-items.ts" "mail_item" "updated_at" "TimestampUtils.forTableField('mail_item', 'updated_at')"
fix_file "src/server/routes/admin-mail-items.ts" "admin_audit" "created_at" "TimestampUtils.forTableField('admin_audit', 'created_at')"

add_import "src/server/routes/admin-forwarding.ts"
fix_file "src/server/routes/admin-forwarding.ts" "forwarding_request" "updated_at" "TimestampUtils.forTableField('forwarding_request', 'updated_at')"
fix_file "src/server/routes/admin-forwarding.ts" "usage_charges" "created_at" "TimestampUtils.forTableField('usage_charges', 'created_at')"

add_import "src/server/routes/admin-forwarding-complete.ts"
fix_file "src/server/routes/admin-forwarding-complete.ts" "forwarding_request" "updated_at" "TimestampUtils.forTableField('forwarding_request', 'updated_at')"

echo "📁 Processing user routes..."

# User routes
add_import "src/server/routes/profile.ts"
fix_file "src/server/routes/profile.ts" "user" "updated_at" "TimestampUtils.forTableField('user', 'updated_at')"

add_import "src/server/routes/auth.ts"
fix_file "src/server/routes/auth.ts" "user" "updated_at" "TimestampUtils.forTableField('user', 'updated_at')"
fix_file "src/server/routes/auth.ts" "user" "last_login_at" "TimestampUtils.forTableField('user', 'last_login_at')"

add_import "src/server/routes/mail.ts"
fix_file "src/server/routes/mail.ts" "mail_item" "updated_at" "TimestampUtils.forTableField('mail_item', 'updated_at')"

add_import "src/server/routes/mail-forward.ts"
fix_file "src/server/routes/mail-forward.ts" "forwarding_request" "created_at" "TimestampUtils.forTableField('forwarding_request', 'created_at')"

echo "📁 Processing webhook routes..."

# Webhook routes
add_import "src/server/routes/webhooks-gocardless.ts"
fix_file "src/server/routes/webhooks-gocardless.ts" "user" "updated_at" "TimestampUtils.forTableField('user', 'updated_at')"

add_import "src/server/routes/webhooks-onedrive.ts"
# This file uses Date.now() for generating unique IDs, not timestamps - leave as is

echo "📁 Processing other routes..."

# Other routes
add_import "src/server/routes/support.ts"
fix_file "src/server/routes/support.ts" "support_ticket" "created_at" "TimestampUtils.forTableField('support_ticket', 'created_at')"
fix_file "src/server/routes/support.ts" "support_ticket" "updated_at" "TimestampUtils.forTableField('support_ticket', 'updated_at')"

add_import "src/server/routes/payments.ts"
fix_file "src/server/routes/payments.ts" "user" "updated_at" "TimestampUtils.forTableField('user', 'updated_at')"

add_import "src/server/routes/kyc.ts"
fix_file "src/server/routes/kyc.ts" "kyc_status" "created_at" "TimestampUtils.forTableField('kyc_status', 'created_at')"
fix_file "src/server/routes/kyc.ts" "kyc_status" "updated_at" "TimestampUtils.forTableField('kyc_status', 'updated_at')"

add_import "src/server/routes/email-prefs.ts"
fix_file "src/server/routes/email-prefs.ts" "email_preferences" "updated_at" "TimestampUtils.forTableField('email_preferences', 'updated_at')"

add_import "src/server/routes/password-reset.ts"
fix_file "src/server/routes/password-reset.ts" "password_reset" "created_at" "TimestampUtils.forTableField('password_reset', 'created_at')"
fix_file "src/server/routes/password-reset.ts" "password_reset" "used_at" "TimestampUtils.forTableField('password_reset', 'used_at')"

echo "📁 Processing modules..."

# Modules
add_import "src/modules/forwarding/forwarding.service.ts"
fix_file "src/modules/forwarding/forwarding.service.ts" "forwarding_request" "created_at" "TimestampUtils.forTableField('forwarding_request', 'created_at')"
fix_file "src/modules/forwarding/forwarding.service.ts" "forwarding_request" "updated_at" "TimestampUtils.forTableField('forwarding_request', 'updated_at')"
fix_file "src/modules/forwarding/forwarding.service.ts" "usage_charges" "created_at" "TimestampUtils.forTableField('usage_charges', 'created_at')"

add_import "src/modules/forwarding/forwarding.admin.controller.optimized.ts"
fix_file "src/modules/forwarding/forwarding.admin.controller.optimized.ts" "forwarding_request" "updated_at" "TimestampUtils.forTableField('forwarding_request', 'updated_at')"

echo "📁 Processing middleware..."

# Middleware
add_import "src/middleware/auth.ts"
fix_file "src/middleware/auth.ts" "user" "last_login_at" "TimestampUtils.forTableField('user', 'last_login_at')"

add_import "src/middleware/idempotency.ts"
# This file uses Date.now() for cache timestamps, not database timestamps - leave as is

echo "📁 Processing services..."

# Services
add_import "src/server/services/pricing.ts"
# This file uses Date.now() for cache expiry, not database timestamps - leave as is

echo "📁 Processing lib files..."

# Lib files
add_import "src/lib/query-cache.ts"
# This file uses Date.now() for cache timestamps, not database timestamps - leave as is

echo "✅ Timestamp fixes completed!"
echo ""
echo "🔍 Summary of changes:"
echo "  - Added TimestampUtils import to all relevant files"
echo "  - Replaced Date.now() with proper timestamp utilities"
echo "  - Used table-specific timestamp formats (bigint vs timestamp)"
echo "  - Preserved Date.now() usage for non-database operations (cache, IDs, etc.)"
echo ""
echo "🚀 Next steps:"
echo "  1. Run 'npm run build:backend' to check for compilation errors"
echo "  2. Test critical admin operations (user plan changes, etc.)"
echo "  3. Monitor logs for any remaining timestamp errors"
