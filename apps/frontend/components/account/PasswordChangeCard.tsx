'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KeyRound } from 'lucide-react';
import { useProfile } from '@/hooks/useDashboardData';

/**
 * Password change by email link: the customer receives the same secure reset link as "Forgot
 * password", so a password is only ever changed by someone who controls the account's email.
 */
export function PasswordChangeCard() {
  const { data: profileData } = useProfile();
  const email: string = profileData?.data?.email || '';
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const send = async () => {
    if (!email) return;
    setState('sending');
    try {
      const res = await fetch('/api/profile/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      setState(res.ok || res.status === 204 ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  };

  return (
    <Card className="rounded-xl sm:rounded-2xl border border-border bg-card min-w-0">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center gap-3 min-w-0">
          <KeyRound className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" strokeWidth={2} aria-hidden />
          <CardTitle className="text-body-lg sm:text-h3 font-semibold text-foreground truncate">Password</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
        <p className="text-body-sm text-muted-foreground">
          We will email a secure link to {email ? <strong className="text-foreground">{email}</strong> : 'your email address'} so you can choose a new password. The link expires after a short time. Changing your password signs you out on your other devices.
        </p>
        {state === 'sent' ? (
          <p className="text-body-sm text-foreground" role="status">Check your inbox for the link.</p>
        ) : (
          <Button onClick={() => void send()} disabled={!email || state === 'sending'} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
            {state === 'sending' ? 'Sending…' : 'Email me a password link'}
          </Button>
        )}
        {state === 'error' && (
          <p className="text-body-sm text-destructive" role="alert">We could not send the link. Please try again in a minute.</p>
        )}
      </CardContent>
    </Card>
  );
}
