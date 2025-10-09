// apps/backend/src/lib/timestamp-utils.ts
// Comprehensive timestamp utilities to prevent Date.now() misuse

/**
 * Database timestamp field types
 */
export type TimestampFieldType = 'bigint' | 'timestamp' | 'timestamp_with_timezone';

/**
 * Get the correct timestamp value for different database field types
 */
export function getTimestampForField(fieldType: TimestampFieldType): string | number {
    switch (fieldType) {
        case 'bigint':
            // For bigint fields (milliseconds since epoch)
            return Date.now();
        case 'timestamp':
        case 'timestamp_with_timezone':
            // For timestamp fields (ISO string)
            return new Date().toISOString();
        default:
            throw new Error(`Unknown timestamp field type: ${fieldType}`);
    }
}

/**
 * Get timestamp for bigint fields (milliseconds)
 */
export function getBigintTimestamp(): number {
    return Date.now();
}

/**
 * Get timestamp for timestamp fields (ISO string)
 */
export function getTimestampString(): string {
    return new Date().toISOString();
}

/**
 * Get timestamp for timestamp with timezone fields (ISO string)
 */
export function getTimestampWithTimezone(): string {
    return new Date().toISOString();
}

/**
 * Database field mappings for common tables
 * This helps ensure we use the correct timestamp format
 */
export const TIMESTAMP_FIELD_MAPPINGS = {
    // Tables that use bigint for timestamps
    'user': {
        'created_at': 'bigint',
        'updated_at': 'bigint',
        'last_login_at': 'bigint',
        'last_active_at': 'bigint',
        'email_verified_at': 'bigint',
        'kyc_verified_at': 'bigint',
        'payment_failed_at': 'bigint',
        'payment_grace_until': 'bigint',
        'account_suspended_at': 'bigint',
        'plan_start_date': 'bigint',
        'locked_until': 'bigint',
        'kyc_verified_at_ms': 'bigint',
        'deleted_at': 'timestamp_with_timezone',
        'email_bounced_at': 'timestamp_with_timezone',
        'email_unsubscribed_at': 'timestamp_with_timezone',
        'reset_token_expires_at': 'timestamp_with_timezone',
        'reset_token_used_at': 'timestamp_with_timezone'
    },
    'subscription': {
        'created_at': 'bigint',
        'updated_at': 'bigint',
        'next_charge_at': 'bigint'
    },
    'mail_item': {
        'created_at': 'bigint',
        'updated_at': 'bigint',
        'scanned_at': 'bigint',
        'expires_at': 'bigint',
        'received_at_ms': 'bigint',
        'forwarded_at_ms': 'bigint',
        'physical_receipt_timestamp': 'bigint',
        'physical_dispatch_timestamp': 'bigint',
        'requested_at': 'bigint',
        'received_at_ts': 'timestamp_with_timezone',
        'forwarded_at_ts': 'timestamp_with_timezone'
    },
    'forwarding_request': {
        'created_at': 'bigint',
        'updated_at': 'bigint',
        'reviewed_at': 'bigint',
        'processing_at': 'bigint',
        'dispatched_at': 'bigint',
        'delivered_at': 'bigint',
        'cancelled_at': 'bigint'
    },
    'file': {
        'created_at': 'bigint',
        'updated_at': 'bigint',
        'modified_at': 'bigint'
    },
    'download': {
        'created_at': 'bigint',
        'expires_at': 'bigint'
    },
    'support_ticket': {
        'created_at': 'bigint',
        'updated_at': 'bigint'
    },
    'usage_charges': {
        'created_at': 'bigint'
    },
    'password_reset': {
        'created_at': 'bigint',
        'used_at': 'bigint'
    },
    'invoices': {
        'created_at': 'bigint'
    },
    'mail_event': {
        'created_at': 'bigint'
    },
    'forwarding_charge': {
        'created_at': 'bigint',
        'updated_at': 'bigint'
    },
    'forwarding_outbox': {
        'created_at': 'bigint',
        'updated_at': 'bigint',
        'next_attempt_at': 'bigint'
    },
    'webhook_log': {
        'created_at': 'bigint',
        'received_at_ms': 'bigint',
        'received_at': 'timestamp_with_timezone'
    },
    'activity_log': {
        'created_at': 'bigint'
    },
    'admin_log': {
        'created_at': 'bigint'
    },
    'invoice_token': {
        'created_at_ms': 'bigint',
        'expires_at_ms': 'bigint',
        'used_at_ms': 'bigint',
        'created_at_ts': 'timestamp_with_timezone',
        'expires_at_ts': 'timestamp_with_timezone',
        'used_at_ts': 'timestamp_with_timezone'
    },
    'scan_tokens': {
        'created_at_ms': 'bigint',
        'expires_at_ms': 'bigint',
        'created_at_ts': 'timestamp_with_timezone',
        'expires_at_ts': 'timestamp_with_timezone'
    },
    'plans': {
        'created_at_ms': 'bigint',
        'updated_at_ms': 'bigint',
        'effective_at_ms': 'bigint',
        'retired_at_ms': 'bigint',
        'created_at_ts': 'timestamp_with_timezone',
        'updated_at_ts': 'timestamp_with_timezone',
        'effective_at_ts': 'timestamp_with_timezone',
        'retired_at_ts': 'timestamp_with_timezone'
    },
    'export_job': {
        'created_at_ms': 'bigint',
        'completed_at_ms': 'bigint',
        'finished_at_ms': 'bigint',
        'started_at_ms': 'bigint',
        'expires_at': 'bigint',
        'storage_expires_at': 'bigint',
        'created_at': 'timestamp_with_timezone',
        'started_at': 'timestamp_with_timezone',
        'finished_at': 'timestamp_with_timezone',
        'completed_at': 'timestamp_with_timezone'
    },
    'invoices_seq': {
        'created_at': 'bigint',
        'updated_at': 'bigint'
    },

    // Tables that use timestamp with timezone
    'admin_audit': {
        'created_at': 'timestamp_with_timezone'
    },
    'audit_log': {
        'created_at': 'timestamp_with_timezone'
    },
    'email_preferences': {
        'created_at': 'timestamp_with_timezone',
        'updated_at': 'timestamp_with_timezone',
        'email_unsubscribed_at': 'timestamp_with_timezone'
    },
    'user_profile': {
        'created_at': 'timestamp_with_timezone',
        'updated_at': 'timestamp_with_timezone'
    },
    'kyc_status': {
        'created_at': 'timestamp_with_timezone',
        'updated_at': 'timestamp_with_timezone'
    },
    'location': {
        'created_at': 'timestamp_with_timezone'
    },
    'address_slot': {
        'created_at': 'timestamp_with_timezone',
        'assigned_at': 'timestamp_with_timezone',
        'reserved_until': 'timestamp_with_timezone'
    },
    'notification': {
        'created_at': 'timestamp_with_timezone'
    }
} as const;

/**
 * Get the correct timestamp value for a specific table and field
 */
export function getTimestampForTableField(tableName: string, fieldName: string): string | number {
    const tableMapping = TIMESTAMP_FIELD_MAPPINGS[tableName as keyof typeof TIMESTAMP_FIELD_MAPPINGS];
    if (!tableMapping) {
        console.warn(`No timestamp mapping found for table: ${tableName}`);
        return Date.now(); // Default to bigint for safety
    }

    const fieldType = tableMapping[fieldName as keyof typeof tableMapping];
    if (!fieldType) {
        console.warn(`No timestamp mapping found for table ${tableName}, field ${fieldName}`);
        return Date.now(); // Default to bigint for safety
    }

    return getTimestampForField(fieldType as TimestampFieldType);
}

/**
 * Helper function to get timestamp for common operations
 */
export const TimestampUtils = {
    // For bigint fields (most common)
    bigint: getBigintTimestamp,
    
    // For timestamp fields
    timestamp: getTimestampString,
    timestampWithTimezone: getTimestampWithTimezone,
    
    // For specific table/field combinations
    forTableField: getTimestampForTableField,
    
    // Legacy compatibility (deprecated - use specific methods instead)
    now: getBigintTimestamp
};

export default TimestampUtils;