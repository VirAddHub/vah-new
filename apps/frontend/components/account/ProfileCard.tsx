'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { User, Lock, Phone } from 'lucide-react';
import { useProfile } from '@/hooks/useDashboardData';

export function ProfileCard() {
  const { data: profileData, mutate: mutateProfile } = useProfile();
  const profile = profileData?.data;
  
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Update phone state when profile data changes
  useEffect(() => {
    if (profile?.phone !== undefined) {
      setPhone(profile.phone || '');
    }
  }, [profile?.phone]);

  // Check if phone has changed
  const phoneChanged = phone !== (profile?.phone || '');
  const canSave = phoneChanged && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/bff/profile/contact', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          phone: phone.trim() || null, // Send null if empty to clear phone
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error?.message || result.message || 'Failed to update phone number');
      }

      toast({
        title: 'Phone number updated',
        description: 'Your phone number has been updated successfully.',
        durationMs: 5000,
      });

      // Refresh profile data
      mutateProfile();
    } catch (error) {
      console.error('Phone update error:', error);
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update phone number. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Format display value for read-only fields
  const formatReadOnlyValue = (value: string | null | undefined): string => {
    return value && value.trim() ? value.trim() : 'Not provided';
  };

  return (
    <Card className="rounded-2xl border border-neutral-200 bg-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <User className="w-6 h-6 text-primary" strokeWidth={2} />
          <CardTitle className="text-xl font-semibold text-neutral-900">
            Profile Information
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* First Name - Read-only */}
        <div className="space-y-2">
          <Label htmlFor="first-name" className="flex items-center gap-2 text-sm text-neutral-700">
            <Lock className="w-3.5 h-3.5 text-neutral-500" strokeWidth={2} />
            First name
          </Label>
          <Input
            id="first-name"
            type="text"
            value={formatReadOnlyValue(profile?.first_name)}
            disabled
            className="bg-neutral-50 text-neutral-600 cursor-not-allowed"
            readOnly
            tabIndex={-1}
            aria-label="First name (verification-locked)"
          />
          <p className="text-xs text-neutral-500 leading-relaxed">
            This field is verification-locked. Contact support to request changes.
          </p>
        </div>

        {/* Last Name - Read-only */}
        <div className="space-y-2">
          <Label htmlFor="last-name" className="flex items-center gap-2 text-sm text-neutral-700">
            <Lock className="w-3.5 h-3.5 text-neutral-500" strokeWidth={2} />
            Last name
          </Label>
          <Input
            id="last-name"
            type="text"
            value={formatReadOnlyValue(profile?.last_name)}
            disabled
            className="bg-neutral-50 text-neutral-600 cursor-not-allowed"
            readOnly
            tabIndex={-1}
            aria-label="Last name (verification-locked)"
          />
          <p className="text-xs text-neutral-500 leading-relaxed">
            This field is verification-locked. Contact support to request changes.
          </p>
        </div>

        {/* Company Name - Read-only */}
        <div className="space-y-2">
          <Label htmlFor="company-name" className="flex items-center gap-2 text-sm text-neutral-700">
            <Lock className="w-3.5 h-3.5 text-neutral-500" strokeWidth={2} />
            Company name
          </Label>
          <Input
            id="company-name"
            type="text"
            value={formatReadOnlyValue(profile?.company_name)}
            disabled
            className="bg-neutral-50 text-neutral-600 cursor-not-allowed"
            readOnly
            tabIndex={-1}
            aria-label="Company name (verification-locked)"
          />
          <p className="text-xs text-neutral-500 leading-relaxed">
            This field is verification-locked. Contact support to request changes.
          </p>
        </div>

        {/* Phone Number - Editable */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2 text-sm text-neutral-700">
            <Phone className="w-3.5 h-3.5 text-neutral-500" strokeWidth={2} />
            Phone number
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+44 20 1234 5678"
            disabled={isSaving}
            className="bg-white"
            aria-label="Phone number"
          />
          <p className="text-xs text-neutral-500 leading-relaxed">
            Update your phone number for account verification and notifications.
          </p>
        </div>

        {/* Save Button */}
        {canSave && (
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPhone(profile?.phone || '');
              }}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
