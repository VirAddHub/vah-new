-- Check admin user 6 to see if they have complete identity information
SELECT 
    id,
    email,
    first_name,
    last_name,
    is_admin,
    -- Check if identity is complete
    CASE 
        WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN 'complete'
        WHEN first_name IS NOT NULL OR last_name IS NOT NULL THEN 'partial'
        WHEN email IS NOT NULL THEN 'email_only'
        ELSE 'incomplete'
    END AS identity_status
FROM "user"
WHERE id = 6 AND is_admin = TRUE;

