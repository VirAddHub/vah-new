"use client";

import useSWR from 'swr';
import { Download } from 'lucide-react';
import { swrFetcher } from '@/services/http';
import { cn } from '@/lib/utils';

interface Invoice {
  id: number;
  invoice_number?: string;
  period_start: string;
  period_end: string;
  amount_pence: number;
  currency: string;
  status: string;
  pdf_url: string | null;
  created_at: string;
}

interface InvoicesResponse {
  ok: boolean;
  data: {
    items: Invoice[];
    page?: number;
    page_size?: number;
  };
}

export function InvoicesTable() {
  const { data, error, isLoading } = useSWR<InvoicesResponse>(
    "/api/bff/billing/invoices?page=1&page_size=12",
    swrFetcher
  );

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const formatMoney = (pence: number, currency: string = "GBP") => {
    return `£${(pence / 100).toFixed(2)}`;
  };

  const invoices = data?.ok ? (data.data?.items || []) : [];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left">
        <thead className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase">
          <tr>
            <th className="py-3 px-4 font-medium">Invoice No.</th>
            <th className="py-3 px-4 font-medium">Description</th>
            <th className="py-3 px-4 font-medium">Total</th>
            <th className="py-3 px-4 font-medium">Status</th>
            <th className="py-3 px-4 font-medium">Date</th>
            <th className="py-3 px-4 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && (
            <tr>
              <td colSpan={6} className="py-8 px-4 text-center text-gray-500">
                Loading invoices…
              </td>
            </tr>
          )}

          {error && !isLoading && (
            <tr>
              <td colSpan={6} className="py-8 px-4 text-center text-gray-500">
                Could not load invoices. Please try again.
              </td>
            </tr>
          )}

          {!isLoading && !error && invoices.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 px-4 text-center text-gray-500">
                No invoices yet. Your first invoice will appear after your first payment.
              </td>
            </tr>
          )}

          {!isLoading && !error && invoices.length > 0 && invoices.map((inv) => {
            const isPaid = inv.status.toLowerCase() === "paid";
            const invoiceNumber = inv.invoice_number || `#${String(inv.id).padStart(9, '0')}`;
            const displayDate = inv.period_end || inv.created_at;

            return (
              <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 text-gray-900 font-medium">
                  {invoiceNumber}
                </td>
                <td className="py-3 px-4 text-gray-700">
                  Digital Mailbox Plan
                </td>
                <td className="py-3 px-4 text-gray-900 font-medium">
                  {formatMoney(inv.amount_pence, inv.currency)}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border",
                      isPaid
                        ? "bg-green-50 text-green-800 border-green-200"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    )}
                  >
                    {isPaid ? "Paid" : inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-700">
                  {formatDate(displayDate)}
                </td>
                <td className="py-3 px-4">
                  {inv.pdf_url ? (
                    <a
                      href={inv.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 transition"
                      title="Download invoice PDF"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  ) : (
                    <button
                      disabled
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-300 opacity-40 cursor-not-allowed"
                      title="PDF not available"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

