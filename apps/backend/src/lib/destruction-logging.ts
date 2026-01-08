/**
 * Destruction Logging Utilities
 * 
 * Provides helper functions for logging mail destruction with proper attribution.
 * Ensures every destruction record is attributable to a specific admin or system actor.
 */

import { Pool } from 'pg';

export interface DestructionLogInput {
    mailItemId: number;
    userId: number;
    userDisplayName: string;
    receiptDate: Date;
    eligibilityDate: Date;
    notes: string;
    destructionMethod?: string;
}

export interface AdminDestructionContext {
    adminId: number;
    adminFirstName: string | null;
    adminLastName: string | null;
    adminEmail: string;
}

/**
 * Log destruction performed by an authenticated admin user
 * 
 * @throws Error if admin identity cannot be determined
 */
export async function logAdminDestruction(
    pool: Pool,
    input: DestructionLogInput,
    context: AdminDestructionContext,
    actionSource: 'admin_ui' | 'api' = 'admin_ui'
): Promise<void> {
    // Validate admin identity - NO FALLBACKS
    if (!context.adminId) {
        throw new Error('Admin ID is required for admin destruction logging');
    }

    // Build staff name - explicit validation, no fallbacks
    let staffName: string;
    if (context.adminFirstName && context.adminLastName) {
        staffName = `${context.adminFirstName} ${context.adminLastName}`;
    } else if (context.adminFirstName) {
        staffName = context.adminFirstName;
    } else if (context.adminLastName) {
        staffName = context.adminLastName;
    } else if (context.adminEmail) {
        const emailName = context.adminEmail.split('@')[0];
        staffName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
    } else {
        throw new Error('Admin identity incomplete: must have first_name, last_name, or email');
    }

    // Build staff initials - explicit validation, no fallbacks
    let staffInitials: string;
    if (context.adminFirstName && context.adminLastName) {
        staffInitials = `${context.adminFirstName[0]}${context.adminLastName[0]}`.toUpperCase();
    } else if (context.adminFirstName) {
        staffInitials = context.adminFirstName.substring(0, 2).toUpperCase().padEnd(2, context.adminFirstName[0]);
    } else if (context.adminLastName) {
        staffInitials = context.adminLastName.substring(0, 2).toUpperCase().padEnd(2, context.adminLastName[0]);
    } else if (context.adminEmail) {
        const emailPrefix = context.adminEmail.split('@')[0];
        staffInitials = emailPrefix.substring(0, 2).toUpperCase().padEnd(2, emailPrefix[0]);
    } else {
        throw new Error('Admin identity incomplete: cannot derive initials');
    }

    // GUARD: Ensure we never write "Unknown" or "UN"
    if (staffName.toLowerCase().includes('unknown') || staffInitials === 'UN') {
        throw new Error(`Invalid staff attribution: staffName="${staffName}", staffInitials="${staffInitials}". "Unknown" is not allowed.`);
    }

    // Insert destruction log record
    await pool.query(
        `
        INSERT INTO destruction_log (
            mail_item_id,
            user_id,
            user_display_name,
            receipt_date,
            eligibility_date,
            recorded_at,
            destruction_status,
            actor_type,
            action_source,
            staff_user_id,
            staff_name,
            staff_initials,
            notes,
            destruction_method
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, $11, $12, $13)
        `,
        [
            input.mailItemId,
            input.userId,
            input.userDisplayName,
            input.receiptDate.toISOString().split('T')[0],
            input.eligibilityDate.toISOString().split('T')[0],
            'completed',
            'admin',
            actionSource,
            context.adminId,
            staffName,
            staffInitials,
            input.notes,
            input.destructionMethod || 'Cross-cut shredder'
        ]
    );
}

/**
 * Log destruction performed by automated system job
 * 
 * Uses explicit system attribution: "System (Automated)" / "SYS"
 */
export async function logSystemDestruction(
    pool: Pool,
    input: DestructionLogInput,
    actionSource: 'scheduled_job' | 'api' = 'scheduled_job'
): Promise<void> {
    // Insert destruction log record with system attribution
    await pool.query(
        `
        INSERT INTO destruction_log (
            mail_item_id,
            user_id,
            user_display_name,
            receipt_date,
            eligibility_date,
            recorded_at,
            destruction_status,
            actor_type,
            action_source,
            staff_user_id,
            staff_name,
            staff_initials,
            notes,
            destruction_method
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, NULL, $9, $10, $11, $12)
        `,
        [
            input.mailItemId,
            input.userId,
            input.userDisplayName,
            input.receiptDate.toISOString().split('T')[0],
            input.eligibilityDate.toISOString().split('T')[0],
            'completed',
            'system',
            actionSource,
            'System (Automated)', // Explicit system attribution
            'SYS', // Explicit system initials
            input.notes,
            input.destructionMethod || 'Cross-cut shredder'
        ]
    );
}

/**
 * Guard function: Validates that destruction logging would not result in "Unknown" attribution
 * 
 * @throws Error if validation fails
 */
export function validateStaffAttribution(staffName: string, staffInitials: string): void {
    if (!staffName || staffName.trim() === '') {
        throw new Error('staff_name cannot be empty');
    }
    if (staffName.toLowerCase().includes('unknown')) {
        throw new Error(`staff_name cannot be "Unknown" (got: "${staffName}")`);
    }
    if (!staffInitials || staffInitials.trim() === '') {
        throw new Error('staff_initials cannot be empty');
    }
    if (staffInitials === 'UN') {
        throw new Error(`staff_initials cannot be "UN" (got: "${staffInitials}")`);
    }
}

