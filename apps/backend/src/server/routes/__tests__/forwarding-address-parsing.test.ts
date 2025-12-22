/**
 * Unit tests for forwarding address parsing logic
 * Tests various address formats to ensure robust parsing
 */

import { extractUKPostcode, hasUKPostcode, normalizeUKPostcode } from '../../utils/ukPostcode';

describe('UK Postcode Utilities', () => {
    describe('extractUKPostcode', () => {
        test('extracts postcode from simple string', () => {
            expect(extractUKPostcode('SW1A 1AA')).toBe('SW1A 1AA');
            expect(extractUKPostcode('M1 1AA')).toBe('M1 1AA');
            expect(extractUKPostcode('B33 8TH')).toBe('B33 8TH');
        });

        test('extracts postcode from text with other content', () => {
            expect(extractUKPostcode('London, SW1A 1AA')).toBe('SW1A 1AA');
            expect(extractUKPostcode('123 Street, SE1 3PH')).toBe('SE1 3PH');
        });

        test('normalizes postcode spacing', () => {
            expect(extractUKPostcode('SW1A1AA')).toBe('SW1A 1AA');
            expect(extractUKPostcode('SW1A  1AA')).toBe('SW1A 1AA');
            expect(extractUKPostcode('se13ph')).toBe('SE1 3PH');
        });

        test('returns null for invalid postcode', () => {
            expect(extractUKPostcode('12345')).toBeNull();
            expect(extractUKPostcode('Invalid')).toBeNull();
            expect(extractUKPostcode('')).toBeNull();
        });
    });

    describe('hasUKPostcode', () => {
        test('detects postcode in string', () => {
            expect(hasUKPostcode('SW1A 1AA')).toBe(true);
            expect(hasUKPostcode('London, SE1 3PH')).toBe(true);
            expect(hasUKPostcode('No postcode here')).toBe(false);
        });
    });

    describe('normalizeUKPostcode', () => {
        test('normalizes various formats', () => {
            expect(normalizeUKPostcode('SW1A 1AA')).toBe('SW1A 1AA');
            expect(normalizeUKPostcode('sw1a1aa')).toBe('SW1A 1AA');
            expect(normalizeUKPostcode('SW1A  1AA')).toBe('SW1A 1AA');
            expect(normalizeUKPostcode('SE13PH')).toBe('SE1 3PH');
        });

        test('returns null for invalid', () => {
            expect(normalizeUKPostcode('invalid')).toBeNull();
            expect(normalizeUKPostcode(null)).toBeNull();
            expect(normalizeUKPostcode(undefined)).toBeNull();
        });
    });
});

/**
 * Integration test cases for address parsing
 * These test cases should be used to verify the parsing logic in forwarding.ts
 * 
 * Format test cases:
 * 1. Format 1 (with name): Name\nAddress1\nAddress2\nCity, Postcode\nCountry
 * 2. Format 2 (no name): Address1\nAddress2\nCity\nPostcode
 * 3. Format 3 (3 lines): Address1\nCity\nPostcode
 * 4. Format 4 (5+ lines): Building\nAddress1\nAddress2\nCity\nPostcode
 * 5. City+postcode comma-separated: Address1\nLondon, SE1 3PH
 * 6. Postcode with no space: Address1\nLondon\nSE13PH
 * 7. Postcode with extra spaces: Address1\nLondon\nSE1   3PH
 * 8. Blank lines: Address1\n\nLondon\nSE1 3PH
 */
export const ADDRESS_PARSING_TEST_CASES = [
    {
        name: 'Format 1: With name and country',
        address: 'John Smith\n123 Test Street\nApt 4B\nLondon, SW1A 1AA\nUnited Kingdom',
        expected: {
            name: 'John Smith',
            address1: '123 Test Street',
            address2: 'Apt 4B',
            city: 'London',
            postal: 'SW1A 1AA',
            country: 'United Kingdom',
        },
    },
    {
        name: 'Format 2: Address only (no name, no country)',
        address: '123 Test Street\nApt 4B\nLondon\nSW1A 1AA',
        expected: {
            name: null, // Will use user's name
            address1: '123 Test Street',
            address2: 'Apt 4B',
            city: 'London',
            postal: 'SW1A 1AA',
            country: 'GB', // Default
        },
    },
    {
        name: 'Format 3: 3 lines',
        address: '123 Test Street\nLondon\nSE1 3PH',
        expected: {
            name: null,
            address1: '123 Test Street',
            address2: undefined,
            city: 'London',
            postal: 'SE1 3PH',
            country: 'GB',
        },
    },
    {
        name: 'City and postcode comma-separated',
        address: '123 Test Street\nLondon, SE1 3PH',
        expected: {
            name: null,
            address1: '123 Test Street',
            address2: undefined,
            city: 'London',
            postal: 'SE1 3PH',
            country: 'GB',
        },
    },
    {
        name: 'Postcode with no space',
        address: '123 Test Street\nLondon\nSE13PH',
        expected: {
            name: null,
            address1: '123 Test Street',
            address2: undefined,
            city: 'London',
            postal: 'SE1 3PH', // Should be normalized
            country: 'GB',
        },
    },
    {
        name: 'Postcode with extra spaces',
        address: '123 Test Street\nLondon\nSE1   3PH',
        expected: {
            name: null,
            address1: '123 Test Street',
            address2: undefined,
            city: 'London',
            postal: 'SE1 3PH', // Should be normalized
            country: 'GB',
        },
    },
    {
        name: 'Blank lines in address',
        address: '123 Test Street\n\nLondon\nSE1 3PH',
        expected: {
            name: null,
            address1: '123 Test Street',
            address2: undefined,
            city: 'London',
            postal: 'SE1 3PH',
            country: 'GB',
        },
    },
    {
        name: '5+ lines with building name',
        address: 'Building Name\n123 Test Street\nApt 4B\nLondon\nSW1A 1AA',
        expected: {
            name: null,
            address1: 'Building Name',
            address2: '123 Test Street',
            city: 'London',
            postal: 'SW1A 1AA',
            country: 'GB',
        },
    },
    {
        name: 'Postcode in second-to-last line with country',
        address: 'John Smith\n123 Test Street\nLondon\nSW1A 1AA\nGB',
        expected: {
            name: 'John Smith',
            address1: '123 Test Street',
            address2: undefined,
            city: 'London',
            postal: 'SW1A 1AA',
            country: 'GB',
        },
    },
];

