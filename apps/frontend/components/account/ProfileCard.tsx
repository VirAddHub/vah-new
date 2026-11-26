'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Lock } from 'lucide-react';
import { useProfile } from '@/hooks/useDashboardData';

/**
 * The customer's details as entered at sign-up. Customers cannot change them here (the API refuses
 * it too); support makes changes. Email and password are changed in their own cards.
 */
export function ProfileCard() {
  const { data: profileData } = useProfile();
  const profile = profileData?.data;

  const show = (value: string | null | undefined): string => (value && value.trim() ? value.trim() : 'Not provided');

  const fields = [
    { id: 'first-name', label: 'First name', value: profile?.first_name },
    { id: 'last-name', label: 'Last name', value: profile?.last_name },
    { id: 'company-name', label: 'Company name', value: profile?.company_name },
    { id: 'company-number', label: 'Company number', value: profile?.company_number },
    { id: 'phone', label: 'Phone number', value: profile?.phone },
  ];

  return (
    <Card className="rounded-xl sm:rounded-2xl border border-border bg-card min-w-0">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center gap-3 min-w-0">
          <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" strokeWidth={2} />
          <CardTitle className="text-body-lg sm:text-h3 font-semibold text-foreground truncate">
            Profile Information
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 sm:space-y-6 p-4 sm:p-6 pt-0">
        {fields.map((f) => (
          <div key={f.id} className="space-y-2">
            <Label htmlFor={f.id} className="flex items-center gap-2 text-body-sm text-foreground">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} aria-hidden />
              {f.label}
            </Label>
            <Input
              id={f.id}
              type="text"
              value={show(f.value)}
              disabled
              readOnly
              tabIndex={-1}
              className="bg-muted/50 text-muted-foreground cursor-not-allowed"
            />
          </div>
        ))}
        <p className="text-caption text-muted-foreground leading-relaxed">
          These details come from your sign-up. To change any of them, contact support. You can change your email address and password below.
        </p>
      </CardContent>
    </Card>
  );
}
