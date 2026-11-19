'use client';

import { useCallback, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';
import { usePlans } from '@/hooks/usePlans';

let stripePromise: ReturnType<typeof loadStripe> | null = null;
function getStripePromise() {
  if (!stripePromise) {
    stripePromise = fetch('/api/bff/payments/stripe/publishable-key', { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        const key = json?.data?.publishable_key;
        if (!key) throw new Error('missing_key');
        return loadStripe(key);
      })
      .catch(() => null);
  }
  return stripePromise;
}

type Period = 'monthly' | 'annual';

/**
 * Lets a signed-in customer who has not paid (or whose subscription has ended) choose a plan and
 * pay by card in Stripe's embedded checkout. Nothing is marked as paid here: the account becomes
 * paid only when Stripe's payment event reaches the server.
 */
export function CompletePaymentCard({ heading = 'Complete your payment' }: { heading?: string }) {
  const { plans } = usePlans();
  const [period, setPeriod] = useState<Period>('monthly');
  const [busy, setBusy] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const price = (p: Period) => {
    const plan = plans?.find(x => x.interval === (p === 'annual' ? 'year' : 'month'));
    return plan ? `£${(plan.price_pence / 100).toFixed(2)}` : null;
  };

  const start = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/bff/payments/stripe/checkout-session-embedded', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ billing_period: period }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok || !json.data?.client_secret) {
        throw new Error(res.status === 503 ? 'Card payments are not available right now. Please try again later or contact support.' : 'We could not start the payment. Please try again.');
      }
      if (!(await getStripePromise())) throw new Error('Card payments are not available right now. Please try again later or contact support.');
      setClientSecret(json.data.client_secret);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We could not start the payment. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [period]);

  return (
    <section aria-labelledby="complete-payment-title" className="rounded-2xl border border-border bg-background p-5 sm:p-6">
      <h2 id="complete-payment-title" className="text-h3 font-semibold text-foreground">{heading}</h2>

      {clientSecret ? (
        <div className="mt-4">
          <EmbeddedCheckoutProvider stripe={getStripePromise()} options={{ clientSecret }}>
            <EmbeddedCheckout className="min-h-[400px]" />
          </EmbeddedCheckoutProvider>
        </div>
      ) : (
        <>
          <fieldset className="mt-4">
            <legend className="text-body-sm text-muted-foreground">Choose how you would like to pay.</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(['monthly', 'annual'] as Period[]).map(p => (
                <label key={p} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 ${period === p ? 'border-foreground' : 'border-border'}`}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="billing-period" value={p} checked={period === p} onChange={() => setPeriod(p)} className="h-4 w-4 accent-black" />
                    <span className="text-body font-medium text-foreground">{p === 'monthly' ? 'Monthly' : 'Annual'}</span>
                  </span>
                  <span className="text-body-sm text-muted-foreground">
                    {price(p) ? `${price(p)} / ${p === 'monthly' ? 'month' : 'year'}` : 'Price shown at checkout'}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p role="alert" className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-body-sm text-foreground">{error}</p>}

          <button type="button" onClick={() => void start()} disabled={busy}
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-foreground px-6 text-body-sm font-medium text-background hover:opacity-90 disabled:opacity-60 sm:w-auto">
            {busy ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />Starting secure payment…</>) : 'Continue to secure payment'}
          </button>
          <p className="mt-2 text-caption text-muted-foreground">Payments are taken securely by Stripe. You can cancel at any time.</p>
        </>
      )}
    </section>
  );
}
