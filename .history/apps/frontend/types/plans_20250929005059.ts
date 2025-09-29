// apps/frontend/types/plans.ts
export type Plan = {
  id: string;
  name: string;
  price: number;
  priceFormatted?: string;
  features: string[];
};
