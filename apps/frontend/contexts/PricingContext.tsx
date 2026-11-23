'use client';

import React, { createContext, useContext } from 'react';

export interface InitialPricing {
  monthlyPrice: number | null;
  annualPrice: number | null;
}

const PricingContext = createContext<InitialPricing | null | undefined>(undefined);

export function PricingProvider({
  initialPricing,
  children,
}: {
  initialPricing: InitialPricing | null;
  children: React.ReactNode;
}) {
  return (
    <PricingContext.Provider value={initialPricing}>
      {children}
    </PricingContext.Provider>
  );
}

export function useInitialPricing(): InitialPricing | null | undefined {
  return useContext(PricingContext);
}
