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
import { cn } from '@/lib/utils';
import { CreditCard, Banknote, ShieldCheck, Loader2 } from 'lucide-react';
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
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [loading, setLoading] = useState(false);
  const [initialising, setInitialising] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupIntentId, setSetupIntentId] = useState<string | null>(null);
  const stripePromise = getStripePromise();

  const title =
    mode === 'update' ? 'Update payment method' : 'Add payment method';

  const primaryCtaLabel =
    mode === 'update' ? 'Update payment method' : 'Continue';

  // When the modal opens for card payments, initialise a Stripe SetupIntent.
  useEffect(() => {
    if (!open) {
      // Reset state when modal fully closes
      setClientSecret(null);
      setSetupIntentId(null);
      setStripeError(null);
      setSelectedMethod('card');
      setInitialising(false);
      setLoading(false);
      return;
    }

    if (selectedMethod !== 'card' || clientSecret) return;

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
  }, [open, selectedMethod, clientSecret]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        className="w-full max-w-[480px] sm:max-w-[520px] rounded-t-2xl sm:rounded-2xl px-6 py-6 sm:px-8 sm:py-7 gap-4 sm:gap-5 bg-white"
        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
      >
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-[20px] sm:text-[22px] font-semibold text-[#111827]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[13px] sm:text-[14px] text-[#6B7280]">
            Choose how you’d like to pay for your VirtualAddressHub
            subscription. You’ll stay inside your dashboard while we securely
            update your payment details.
          </DialogDescription>
        </DialogHeader>

        {/* Payment method choices */}
        <div className="mt-2 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedMethod('card')}
              className={cn(
                'flex flex-col items-start gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#206039]/70',
                selectedMethod === 'card'
                  ? 'border-[#206039] bg-[#F0FDF4]'
                  : 'border-[#E5E7EB] hover:border-[#D1D5DB] bg-white'
              )}
            >
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-[#206039]" />
                <span className="text-[13px] font-medium text-[#111827]">
                  Card
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280]">
                Visa, Mastercard, Amex and more.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMethod('direct_debit')}
              className={cn(
                'flex flex-col items-start gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#206039]/70',
                selectedMethod === 'direct_debit'
                  ? 'border-[#206039] bg-[#F0FDF4]'
                  : 'border-[#E5E7EB] hover:border-[#D1D5DB] bg-white'
              )}
            >
              <div className="flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-[#206039]" />
                <span className="text-[13px] font-medium text-[#111827]">
                  Direct Debit
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280]">
                Secure UK bank transfer via our provider.{' '}
                <span className="font-medium text-[#111827]">
                  Card updates are available now; Direct Debit coming soon.
                </span>
              </p>
            </button>
          </div>

          {/* Trust / security copy */}
          <div className="flex items-start gap-2 rounded-xl bg-[#F9FAFB] px-3.5 py-3">
            <div className="mt-[2px]">
              <ShieldCheck className="h-4 w-4 text-[#206039]" />
            </div>
            <div className="space-y-1">
              <p className="text-[12px] font-medium text-[#111827]">
                Bank‑grade security
              </p>
              <p className="text-[11px] text-[#6B7280]">
                Payments are processed securely by our PCI‑compliant partners.
                VirtualAddressHub never sees or stores your full card or bank
                details.
              </p>
            </div>
          </div>
          {stripeError && (
            <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {stripeError}
            </div>
          )}

          {selectedMethod === 'card' && clientSecret && (
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

        <DialogFooter className="mt-2 flex flex-row justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="px-4"
          >
            Cancel
          </Button>
          {selectedMethod !== 'card' && (
            <Button
              type="button"
              disabled
              className="bg-[#206039] hover:bg-[#206039]/90 px-4 opacity-60 cursor-not-allowed"
            >
              {primaryCtaLabel}
            </Button>
          )}
        </DialogFooter>
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
    mode === 'update' ? 'Save new payment method' : 'Add payment method';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-3">
      <div className="rounded-lg border border-[#E5E7EB] p-3.5">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>
      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#206039] hover:bg-[#206039]/90"
      >
        {submitting && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
        )}
        {buttonLabel}
      </Button>
    </form>
  );
}


