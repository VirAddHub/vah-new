// Frontend config for registered office address
// This should match the backend config in apps/backend/src/config/address.ts

export const REGISTERED_OFFICE_ADDRESS = {
    name: "VirtualAddressHub",
    line1: "Second Floor, Tanner Place",
    line2: "54–58 Tanner Street",
    city: "London",
    postcode: "SE1 3PH",
    country: "United Kingdom",
};

export const VAH_ADDRESS_LINES = [
    REGISTERED_OFFICE_ADDRESS.line1,
    REGISTERED_OFFICE_ADDRESS.line2,
    `${REGISTERED_OFFICE_ADDRESS.city} ${REGISTERED_OFFICE_ADDRESS.postcode}`,
    REGISTERED_OFFICE_ADDRESS.country,
] as const;

export const VAH_ADDRESS_INLINE = VAH_ADDRESS_LINES.join(", ");

