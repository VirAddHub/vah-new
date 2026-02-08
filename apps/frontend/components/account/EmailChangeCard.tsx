'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { useProfile } from '@/hooks/useDashboardData';

interface EmailChangeCardProps {
  onEmailChangeRequested?: () => void;
}

export function EmailChangeCard({ onEmailChangeRequested }: EmailChangeCardProps) {
  const { data: profileData, mutate: mutateProfile } = useProfile();
  const profile = profileData?.data;
  const currentEmail = profile?.email || '';
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const { toast } = useToast();

  // Check for pending email change requests
  useEffect(() => {
    // If profile has a pending_email field, show it
    if (profile?.pending_email) {
      setPendingEmail(profile.pending_email);
    }
  }, [profile]);

  const emailsMatch = newEmail === confirmEmail;
  const isEmailFormValid = 
    newEmail && 
    confirmEmail && 
    emailsMatch && 
    newEmail !== currentEmail &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail);

  const handleEmailChange = async () => {
    if (!isEmailFormValid || isChangingEmail) return;

    setIsChangingEmail(true);
    try {
      const response = await fetch('/api/bff/profile/contact', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: newEmail,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || result.message || 'Couldn\'t start email change. Please try again.');
      }

      // Check if email change was started
      if (result.data?.email_change_started === true || result.ok) {
        setPendingEmail(newEmail);
        setIsDialogOpen(false);
        setNewEmail('');
        setConfirmEmail('');
        
        toast({
          title: 'Confirmation email sent',
          description: `Confirmation link sent to ${newEmail}. Your email won't update until you confirm.`,
          durationMs: 5000,
        });

        onEmailChangeRequested?.();
        mutateProfile(); // Refresh profile data
      } else {
        throw new Error('Email change request was not started. Please try again.');
      }
    } catch (error) {
      console.error('Email change error:', error);
      toast({
        title: 'Email change failed',
        description: error instanceof Error ? error.message : 'Couldn\'t start email change. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!pendingEmail) return;

    setIsChangingEmail(true);
    try {
      const response = await fetch('/api/bff/profile/email-change/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok && result.ok) {
        toast({
          title: 'Confirmation email resent',
          description: `Confirmation link sent to ${pendingEmail}.`,
          durationMs: 5000,
        });
      } else {
        throw new Error(result.error?.message || 'Failed to resend confirmation email.');
      }
    } catch (error) {
      console.error('Resend confirmation error:', error);
      toast({
        title: 'Failed to resend',
        description: error instanceof Error ? error.message : 'Couldn\'t resend confirmation email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingEmail(false);
    }
  };

  return (
    <>
      <Card className="rounded-2xl border border-neutral-200 bg-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-primary" strokeWidth={2} />
            <CardTitle className="text-xl font-semibold text-neutral-900">
              Email Address
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Email */}
          <div className="space-y-2">
            <Label className="text-sm text-neutral-500">Current email address</Label>
            <div className="flex items-center gap-2">
              <p className="text-base font-medium text-neutral-900">{currentEmail || 'Not set'}</p>
              {!pendingEmail && (
                <CheckCircle2 className="w-4 h-4 text-green-600" strokeWidth={2} />
              )}
            </div>
          </div>

          {/* Pending Email Change */}
          {pendingEmail && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900">
                    Email change pending
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    A confirmation link has been sent to <strong>{pendingEmail}</strong>. 
                    Your email won't change until you confirm.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendConfirmation}
                  disabled={isChangingEmail}
                  className="text-sm"
                >
                  {isChangingEmail ? 'Sending...' : 'Resend confirmation email'}
                </Button>
              </div>
            </div>
          )}

          {/* Change Email Button */}
          <Button
            onClick={() => setIsDialogOpen(true)}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={!!pendingEmail}
          >
            {pendingEmail ? 'Email change pending' : 'Change email address'}
          </Button>

          <p className="text-xs text-neutral-500">
            We'll send a confirmation link to your new email address. Your email won't update until you confirm.
          </p>
        </CardContent>
      </Card>

      {/* Email Change Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email Address</DialogTitle>
            <DialogDescription>
              For security, we'll send a confirmation link to your new email address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">New email address</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new.email@example.com"
                disabled={isChangingEmail}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-email">Confirm new email address</Label>
              <Input
                id="confirm-email"
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="new.email@example.com"
                disabled={isChangingEmail}
              />
              {newEmail && confirmEmail && !emailsMatch && (
                <p className="text-xs text-destructive">Email addresses must match</p>
              )}
              {newEmail && newEmail === currentEmail && (
                <p className="text-xs text-destructive">This is your current email address</p>
              )}
            </div>
            <div className="bg-muted/50 border border-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                We'll send a confirmation link to your new email address. Your email won't update until you confirm.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setNewEmail('');
                setConfirmEmail('');
              }}
              disabled={isChangingEmail}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEmailChange}
              disabled={!isEmailFormValid || isChangingEmail}
            >
              {isChangingEmail ? 'Sending...' : 'Send confirmation link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
