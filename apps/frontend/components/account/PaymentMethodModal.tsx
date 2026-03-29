'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { getStripePromise } from '@/lib/stripeClient';

type PaymentMethod = 'card' | 'direct_debit';

export type PaymentMethodModalMode = 'setup' | 'update';

interface PaymentMethodModalProps {
  open: boolean;
  mode: PaymentMethodModalMode;
  onClose: () => void;
  /**
   * Called after a successful in-app payment method update.
   * Parents can refresh billing data here.
   */
  onSuccess?: () => Promise<void> | void;
}

export function PaymentMethodModal({
  open,
  mode,
  onClose,
  onSuccess,
}: PaymentMethodModalProps) {
  const [loading, setLoading] = useState(false);
  const [initialising, setInitialising] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupIntentId, setSetupIntentId] = useState<string | null>(null);
  const stripePromise = getStripePromise();

  const title =
    mode === 'update' ? 'Update payment method' : 'Add payment method';

  // When the modal opens, initialise a Stripe SetupIntent.
  useEffect(() => {
    if (!open) {
      // Reset state when modal fully closes
      setClientSecret(null);
      setSetupIntentId(null);
      setStripeError(null);
      setInitialising(false);
      setLoading(false);
      return;
    }

    if (clientSecret) return;

    let cancelled = false;

    const createSetupIntent = async () => {
      try {
        setInitialising(true);
        setStripeError(null);
        const res = await fetch(
          '/api/bff/billing/payment-methods/setup-intent',
          {
            method: 'POST',
            credentials: 'include',
          }
        );
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(
            json?.message ||
              json?.error ||
              'Failed to start secure payment update.'
          );
        }
        if (!cancelled) {
          setClientSecret(json.data?.client_secret ?? null);
          setSetupIntentId(json.data?.setup_intent_id ?? null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setStripeError(
            e?.message ||
              'Unable to start secure payment update. Please try again.'
          );
        }
      } finally {
        if (!cancelled) {
          setInitialising(false);
        }
      }
    };

    createSetupIntent();

    return () => {
      cancelled = true;
    };
  }, [open, clientSecret]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        className="w-full max-w-[480px] sm:max-w-[520px] rounded-t-2xl sm:rounded-2xl px-6 py-6 sm:px-8 sm:py-7 gap-4 sm:gap-5 bg-card"
      >
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-h3 text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-body-sm text-muted-foreground">
            {mode === 'update'
              ? 'Update the payment method used for your subscription.'
              : 'Add a payment method for your subscription.'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1 space-y-3">
          <p className="text-[11px] leading-snug text-muted-foreground">
            Card details are handled by Stripe; we never store your full card
            number.
          </p>

          {initialising && (
            <div className="flex items-center gap-2 py-6 text-caption text-muted-foreground">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              Preparing secure form…
            </div>
          )}

          {stripeError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-caption text-red-700">
              {stripeError}
            </div>
          )}

          {clientSecret && (
            <Elements
              stripe={stripePromise as unknown as Stripe | Promise<Stripe | null>}
              options={{
                clientSecret,
                appearance: { theme: 'stripe' },
              }}
            >
              <CardPaymentElement
                mode={mode}
                setupIntentId={setupIntentId}
                setLoading={setLoading}
                setStripeError={setStripeError}
                onClose={onClose}
                onSuccess={onSuccess}
              />
            </Elements>
          )}
        </div>

        {!clientSecret && (
          <DialogFooter className="mt-2 flex flex-row justify-end sm:mt-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="px-4"
            >
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface CardPaymentElementProps {
  mode: PaymentMethodModalMode;
  setupIntentId: string | null;
  setLoading: (value: boolean) => void;
  setStripeError: (msg: string | null) => void;
  onClose: () => void;
  onSuccess?: () => Promise<void> | void;
}

function CardPaymentElement({
  mode,
  setupIntentId,
  setLoading,
  setStripeError,
  onClose,
  onSuccess,
}: CardPaymentElementProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || submitting) return;

    setSubmitting(true);
    setLoading(true);
    setStripeError(null);

    try {
      const result = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.origin,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        setStripeError(
          result.error.message || 'Payment method update failed.'
        );
        return;
      }

      const intent = result.setupIntent;
      if (!intent || intent.status !== 'succeeded') {
        setStripeError(
          'Payment method was not successfully saved. Please try again.'
        );
        return;
      }

      const idToSend = intent.id ?? setupIntentId;
      if (!idToSend) {
        setStripeError(
          'Missing setup intent information. Please try again.'
        );
        return;
      }

      const completeRes = await fetch(
        '/api/bff/billing/payment-methods/complete',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ setup_intent_id: idToSend }),
        }
      );
      const completeJson = await completeRes.json();

      if (!completeRes.ok || !completeJson.ok) {
        setStripeError(
          completeJson?.message ||
            completeJson?.error ||
            'Failed to finalise payment method update.'
        );
        return;
      }

      if (onSuccess) {
        await onSuccess();
      }
      onClose();
    } catch (e: any) {
      setStripeError(
        e?.message || 'Unexpected error while updating payment method.'
      );
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  const buttonLabel =
    mode === 'update' ? 'Save payment method' : 'Add payment method';

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-4">
      <div className="rounded-lg border border-border p-3.5">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={submitting}
          className="sm:min-w-[100px]"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting} className="sm:min-w-[160px]">
          {submitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary-foreground" />
          )}
          {buttonLabel}
        </Button>
      </div>
    </form>
  );
}


