'use client';

import React, { createContext, useContext } from 'react';

export interface InitialPricing {
  monthlyPrice: number;
  annualPrice: number;
}

const PricingContext = createContext<InitialPricing | null>(null);

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

export function useInitialPricing(): InitialPricing | null {
  return useContext(PricingContext);
}
