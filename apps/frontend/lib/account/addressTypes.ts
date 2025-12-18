// Shared address types to avoid circular dependencies
export interface AddressSuggestion {
    id: string;
    formatted_address: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    postcode: string;
    country: string;
    latitude?: number;
    longitude?: number;
    building_name?: string;
    premise?: string;
    thoroughfare?: string;
    dependent_locality?: string;
    administrative_area?: string;
}
