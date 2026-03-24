'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import { useActiveBusiness } from '@/contexts/ActiveBusinessContext';
import { useToast } from '@/components/ui/use-toast';

function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}/month`;
}

function priceLabel(pence: number): string {
  return `Business plan — ${formatPrice(pence)}`;
}

export function BusinessesSection() {
  const { businesses } = useActiveBusiness();
  const { toast } = useToast();

  const primaryBusiness = Array.isArray(businesses) && businesses.length > 0 ? businesses[0] : null;

  return (
    <>
      <Card className="rounded-xl sm:rounded-2xl border border-border bg-card mb-4 sm:mb-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" strokeWidth={2} />
              <h2 className="text-body-lg sm:text-h3 font-semibold text-foreground truncate">
                Business details
              </h2>
            </div>
          </div>

          {!primaryBusiness ? (
            <p className="text-body-sm text-muted-foreground">
              No business is configured yet. Your business details will appear here after setup.
            </p>
          ) : (
            <div className="flex flex-col gap-1 min-w-0 rounded-lg border border-border bg-muted/50/50 p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground truncate">
                  {primaryBusiness.company_name}
                </span>
                {primaryBusiness.is_primary && (
                  <Badge className="bg-primary/10 text-primary border-0 text-caption">
                    Primary
                  </Badge>
                )}
              </div>
              <p className="text-body-sm text-muted-foreground">
                {primaryBusiness.companies_house_number
                  ? `Companies House: ${primaryBusiness.companies_house_number}`
                  : 'Companies House number not added yet'}
              </p>
              <p className="text-body-sm font-medium text-foreground">
                {priceLabel(primaryBusiness.display_price_pence ?? primaryBusiness.monthly_price_pence ?? 999)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
