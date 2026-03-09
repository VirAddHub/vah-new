'use client';

import { useState } from 'react';
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

type PaymentMethod = 'card' | 'direct_debit';

export type PaymentMethodModalMode = 'setup' | 'update';

interface PaymentMethodModalProps {
  open: boolean;
  mode: PaymentMethodModalMode;
  onClose: () => void;
  /**
   * Called when user confirms in the modal.
   * Implementations can trigger Stripe/GoCardless flows and optionally close the modal.
   */
  onConfirm?: (method: PaymentMethod) => Promise<void> | void;
}

export function PaymentMethodModal({
  open,
  mode,
  onClose,
  onConfirm,
}: PaymentMethodModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [loading, setLoading] = useState(false);

  const title =
    mode === 'update' ? 'Update payment method' : 'Add payment method';

  const primaryCtaLabel =
    mode === 'update' ? 'Update payment method' : 'Continue';

  const handleConfirmClick = async () => {
    if (!onConfirm || loading) return;
    try {
      setLoading(true);
      await onConfirm(selectedMethod);
    } finally {
      setLoading(false);
    }
  };

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
                Secure UK bank transfer via our provider.
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
          <Button
            type="button"
            onClick={handleConfirmClick}
            disabled={loading}
            className="bg-[#206039] hover:bg-[#206039]/90 px-4"
          >
            {loading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
            )}
            {primaryCtaLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

