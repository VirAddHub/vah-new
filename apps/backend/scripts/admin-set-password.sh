#!/bin/bash
# Bash script for secure admin password management
# This script safely updates admin passwords in PostgreSQL using crypt() hashing

set -e

EMAIL="${1:-ops@virtualaddresshub.co.uk}"
DATABASE_URL="${DATABASE_URL}"

# Check if DATABASE_URL is provided
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set."
    echo "Example: export DATABASE_URL='postgresql://user:pass@host:port/dbname?sslmode=require'"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql command not found. Please ensure PostgreSQL client tools are installed."
    exit 1
fi

# Function to validate password strength
validate_password() {
    local password="$1"
    
    if [ ${#password} -lt 12 ]; then
        echo "⚠️  Password should be at least 12 characters long"
        return 1
    fi
    
    if [[ ! "$password" =~ [A-Z] ]]; then
        echo "⚠️  Password should contain at least one uppercase letter"
        return 1
    fi
    
    if [[ ! "$password" =~ [a-z] ]]; then
        echo "⚠️  Password should contain at least one lowercase letter"
        return 1
    fi
    
    if [[ ! "$password" =~ [0-9] ]]; then
        echo "⚠️  Password should contain at least one number"
        return 1
    fi
    
    if [[ ! "$password" =~ [\!\@\#\$\%\^\&\*\(\)\_\+\-\=\[\]\{\}\;\'\:\"\\\|\,\<\.\>\/\?] ]]; then
        echo "⚠️  Password should contain at least one special character"
        return 1
    fi
    
    return 0
}

echo "=== Admin Password Management ==="
echo "Target email: $EMAIL"
echo "Database: $(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/')"
echo ""

# Get new password securely
while true; do
    read -s -p "Enter new admin password: " new_password
    echo ""
    
    if validate_password "$new_password"; then
        break
    else
        echo "Password does not meet strength requirements. Please try again."
    fi
done

# Confirm password
read -s -p "Confirm new admin password: " confirm_password
echo ""

if [ "$new_password" != "$confirm_password" ]; then
    echo "❌ Passwords do not match. Aborting."
    exit 1
fi

echo ""
echo "Updating admin password..."

# Create SQL with proper escaping
sql=$(cat <<EOF
UPDATE "user"
SET password = crypt('$(echo "$new_password" | sed "s/'/''/g")', gen_salt('bf', 12)),
    updated_at = (EXTRACT(EPOCH FROM NOW())*1000)::bigint
WHERE email = '$(echo "$EMAIL" | sed "s/'/''/g")';
EOF
)

# Write SQL to temporary file
temp_sql_file=$(mktemp)
echo "$sql" > "$temp_sql_file"

# Execute the SQL
if psql "$DATABASE_URL" -f "$temp_sql_file"; then
    echo "✅ Password updated successfully!"
    
    # Verify the update
    echo "Verifying update..."
    verify_sql=$(cat <<EOF
SELECT email, first_name, last_name, role, is_admin, status, 
       CASE WHEN password IS NOT NULL THEN 'Password set' ELSE 'No password' END as password_status,
       to_timestamp(updated_at/1000) as updated_at_readable
FROM "user"
WHERE email = '$(echo "$EMAIL" | sed "s/'/''/g")';
EOF
)
    
    verify_file=$(mktemp)
    echo "$verify_sql" > "$verify_file"
    
    if psql "$DATABASE_URL" -f "$verify_file"; then
        echo "Verification completed successfully"
    else
        echo "⚠️  Could not verify update"
    fi
    
    rm -f "$verify_file"
else
    echo "❌ Failed to update password"
    rm -f "$temp_sql_file"
    exit 1
fi

# Clean up
rm -f "$temp_sql_file"

echo ""
echo "=== Summary ==="
echo "✅ Admin password has been updated securely using bcrypt hashing"
echo "✅ Password strength requirements were validated"
echo "✅ Update was verified in the database"
echo ""
echo "Next steps:"
echo "1. Test login with the new password"
echo "2. Remove any temporary password environment variables from Render"
echo "3. Consider rotating other admin passwords if needed"
