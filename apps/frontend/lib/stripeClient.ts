'use client';

import { loadStripe, type Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = fetch('/api/bff/payments/stripe/publishable-key', {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((json) => {
        const key = json?.data?.publishable_key as string | undefined;
        if (!key) throw new Error('Missing Stripe publishable key');
        return loadStripe(key);
      })
      .catch(() => null);
  }
  return stripePromise;
}

