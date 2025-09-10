export interface Plan {
    id: number;
    name: string;
    slug: string;
    description?: string;
    price_pence: number; // pence (divide by 100 for GBP)
    interval: "month" | "year" | string;
    currency: "GBP" | string;
    features: string[];
    active?: boolean | 0 | 1;
    sort?: number;
}
