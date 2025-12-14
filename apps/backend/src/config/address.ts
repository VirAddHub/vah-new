// src/config/address.ts
// Registered office address configuration

export const REGISTERED_OFFICE_ADDRESS = {
    name: "VirtualAddressHub",
    line1: "Second Floor, Tanner Place",
    line2: "54–58 Tanner Street",
    city: "London",
    postcode: "SE1 3PH",
    country: "United Kingdom",
};

export const VAH_FLOOR_LINE = "Second Floor";

export const VAH_ADDRESS_LINES = [
    "Second Floor, Tanner Place",
    "54–58 Tanner Street",
    "London SE1 3PH",
    "United Kingdom",
] as const;

export const VAH_ADDRESS_INLINE = VAH_ADDRESS_LINES.join(", ");

