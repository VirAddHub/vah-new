export function centsToGBP(cents: number) {
    try {
        return new Intl.NumberFormat("en-GB", {
            style: "currency",
            currency: "GBP",
            minimumFractionDigits: 2,
        }).format((cents || 0) / 100);
    } catch {
        return `£${((cents || 0) / 100).toFixed(2)}`;
    }
}
