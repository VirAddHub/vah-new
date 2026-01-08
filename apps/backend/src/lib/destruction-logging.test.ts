/**
 * Destruction Logging Guards and Tests
 * 
 * Ensures that destruction logging never writes "Unknown" attribution.
 * These tests/guards should be run before any destruction logging operation.
 */

import { validateStaffAttribution } from './destruction-logging';

describe('Destruction Logging Guards', () => {
    describe('validateStaffAttribution', () => {
        it('should accept valid staff attribution', () => {
            expect(() => validateStaffAttribution('John Doe', 'JD')).not.toThrow();
            expect(() => validateStaffAttribution('System (Automated)', 'SYS')).not.toThrow();
            expect(() => validateStaffAttribution('Jane Smith', 'JS')).not.toThrow();
        });

        it('should reject "Unknown" as staff_name', () => {
            expect(() => validateStaffAttribution('Unknown', 'UN')).toThrow('staff_name cannot be "Unknown"');
            expect(() => validateStaffAttribution('unknown', 'UN')).toThrow('staff_name cannot be "Unknown"');
            expect(() => validateStaffAttribution('UNKNOWN', 'UN')).toThrow('staff_name cannot be "Unknown"');
        });

        it('should reject "UN" as staff_initials', () => {
            expect(() => validateStaffAttribution('John Doe', 'UN')).toThrow('staff_initials cannot be "UN"');
            expect(() => validateStaffAttribution('John Doe', 'un')).toThrow('staff_initials cannot be "UN"');
        });

        it('should reject empty staff_name', () => {
            expect(() => validateStaffAttribution('', 'JD')).toThrow('staff_name cannot be empty');
            expect(() => validateStaffAttribution('   ', 'JD')).toThrow('staff_name cannot be empty');
        });

        it('should reject empty staff_initials', () => {
            expect(() => validateStaffAttribution('John Doe', '')).toThrow('staff_initials cannot be empty');
            expect(() => validateStaffAttribution('John Doe', '   ')).toThrow('staff_initials cannot be empty');
        });
    });
});

/**
 * Runtime guard: Check if destruction would result in "Unknown" attribution
 * 
 * Call this before any destruction logging operation to prevent invalid data.
 */
export function guardAgainstUnknownAttribution(staffName: string | null | undefined, staffInitials: string | null | undefined): void {
    if (!staffName || !staffInitials) {
        throw new Error('Destruction logging requires both staff_name and staff_initials. Cannot proceed without admin identity.');
    }
    
    try {
        validateStaffAttribution(staffName, staffInitials);
    } catch (error: any) {
        throw new Error(`Destruction logging guard failed: ${error.message}. This would result in invalid attribution.`);
    }
}

