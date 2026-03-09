'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Loader2 } from 'lucide-react';
import { useActiveBusiness } from '@/contexts/ActiveBusinessContext';
import { useBusinesses } from '@/hooks/useDashboardData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

// Companies House number: 8 digits OR 2 letters + 6 digits (match verification page)
const CH_NUMBER_RE = /^([0-9]{8}|[A-Za-z]{2}[0-9]{6})$/;

interface CompanySearchResult {
  title: string;
  regNumber: string;
  identifier: string;
}

function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}/month`;
}

function priceLabel(isPrimary: boolean, pence: number): string {
  return isPrimary
    ? `Primary business — ${formatPrice(pence)}`
    : `Additional business — ${formatPrice(pence)}`;
}

export function BusinessesSection() {
  const { businesses, mutate } = useActiveBusiness();
  const { data: businessesData, mutate: mutateList } = useBusinesses();
  const [showAddModal, setShowAddModal] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [companiesHouseNumber, setCompaniesHouseNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const list = Array.isArray(businessesData?.data) ? businessesData.data : businesses;

  const handleAddBusiness = async () => {
    const name = companyName.trim();
    if (!name) {
      toast({ title: 'Company name is required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/bff/account/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          company_name: name,
          trading_name: tradingName.trim() || undefined,
          companies_house_number: companiesHouseNumber.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json?.ok) {
        toast({ title: 'Business added' });
        setShowAddModal(false);
        setCompanyName('');
        setTradingName('');
        setCompaniesHouseNumber('');
        mutate();
        mutateList();
      } else {
        toast({ title: json?.error || 'Failed to add business', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Something went wrong', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPrimary = async (businessId: number) => {
    try {
      const res = await fetch(`/api/bff/account/businesses/${businessId}/set-primary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const json = await res.json();
      if (json?.ok) {
        toast({ title: 'Primary business updated' });
        mutate();
        mutateList();
      } else {
        toast({ title: json?.error || 'Failed to update', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Something went wrong', variant: 'destructive' });
    }
  };

  return (
    <>
      <Card className="rounded-2xl border border-neutral-200 bg-white mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-primary" strokeWidth={2} />
              <h2 className="text-xl font-semibold text-neutral-900">
                Businesses
              </h2>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              size="sm"
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" strokeWidth={2} />
              Add another business
            </Button>
          </div>

          {list.length === 0 ? (
            <p className="text-sm text-neutral-600">
              No businesses yet. Add your first business to get started.
            </p>
          ) : (
            <ul className="space-y-3">
              {list.map((b: { id: number; company_name: string; companies_house_number?: string | null; status?: string; is_primary?: boolean; monthly_price_pence?: number; display_price_pence?: number }) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-neutral-50/50 p-4"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-neutral-900 truncate">
                        {b.company_name}
                      </span>
                      {b.is_primary && (
                        <Badge className="bg-primary/10 text-primary border-0 text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500">
                      {b.companies_house_number
                        ? `Companies House: ${b.companies_house_number}`
                        : 'Not added yet'}
                    </p>
                    <p className="text-sm font-medium text-neutral-700">
                      {priceLabel(!!b.is_primary, b.display_price_pence ?? b.monthly_price_pence ?? 999)}
                    </p>
                  </div>
                  {!b.is_primary && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPrimary(b.id)}
                    >
                      Set as primary
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add another business</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="company_name">Company name</Label>
              <Input
                id="company_name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Ltd"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="trading_name">Trading name (optional)</Label>
              <Input
                id="trading_name"
                value={tradingName}
                onChange={(e) => setTradingName(e.target.value)}
                placeholder="e.g. Acme Trading"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="companies_house_number">Companies House number (optional)</Label>
              <Input
                id="companies_house_number"
                value={companiesHouseNumber}
                onChange={(e) => setCompaniesHouseNumber(e.target.value)}
                placeholder="e.g. 12345678"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleAddBusiness} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding…
                </>
              ) : (
                'Add business'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
