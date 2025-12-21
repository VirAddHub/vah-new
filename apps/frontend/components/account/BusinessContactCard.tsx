'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Lock, Mail } from 'lucide-react';
import { BusinessContactInfo } from '@/lib/account/types';
import { toast } from '@/hooks/use-toast';

interface BusinessContactCardProps {
  contact: BusinessContactInfo;
  onSave: (contact: BusinessContactInfo) => Promise<void>;
}

export function BusinessContactCard({ contact: initialContact, onSave }: BusinessContactCardProps) {
  const [contact, setContact] = useState<BusinessContactInfo>(initialContact);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Email change dialog state
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const newEmailInputRef = useRef<HTMLInputElement>(null);

  // Sync contact prop when it changes from parent (after save or data refresh)
  useEffect(() => {
    if (initialContact) {
      setContact(initialContact);
      // Clear pending email if contact email matches (email change confirmed)
      if (pendingEmail && initialContact.email === pendingEmail) {
        setPendingEmail(null);
      }
    }
  }, [initialContact, pendingEmail]);

  // Sync contact prop when it changes from parent (after data loads or save)
  useEffect(() => {
    setContact(initialContact);
    setHasChanges(false); // Reset changes flag when prop updates
    
    // Clear pending email if the email has been confirmed (email changed in backend)
    if (pendingEmail && initialContact.email && initialContact.email === pendingEmail) {
      setPendingEmail(null);
    }
  }, [initialContact, pendingEmail]);

  const handleChange = (field: keyof BusinessContactInfo, value: string) => {
    // Allow changes to phone only (email requires confirmation dialog)
    if (field === 'phone') {
      setContact(prev => ({ ...prev, [field]: value }));
      setHasChanges(true);
    }
  };

  // Email validation
  const isValidEmail = (email: string): boolean => {
    if (!email || email.trim().length === 0) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const emailsMatch = newEmail === confirmEmail;
  const isEmailFormValid = isValidEmail(newEmail) && emailsMatch && newEmail !== contact.email;

  // Open email change dialog
  const handleOpenEmailDialog = () => {
    setNewEmail('');
    setConfirmEmail('');
    setIsEmailDialogOpen(true);
    // Focus first input when dialog opens
    setTimeout(() => {
      newEmailInputRef.current?.focus();
    }, 100);
  };

  // Handle email change submission
  const handleEmailChange = async () => {
    if (!isEmailFormValid) return;

    setIsChangingEmail(true);
    try {
      const response = await fetch('/api/bff/profile/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: newEmail }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error?.message || result.message || 'Couldn\'t start email change. Please try again.');
      }

      // Check if email change was started
      if (result.data?.email_change_started === true) {
        // Close dialog
        setIsEmailDialogOpen(false);
        setNewEmail('');
        setConfirmEmail('');
        
        // Store pending email for UI display
        setPendingEmail(newEmail);

        // Show success message
        toast({
          title: 'Confirmation link sent',
          description: `Confirmation link sent to ${newEmail}. Your email won't update until you confirm.`,
        });
      } else {
        // Fallback message
        toast({
          title: 'Email change started',
          description: `We've sent a confirmation link to ${newEmail}. Please check your inbox.`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Couldn\'t start email change. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingEmail(false);
    }
  };

  // Handle Enter key in email dialog
  const handleEmailDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isEmailFormValid && !isChangingEmail) {
      e.preventDefault();
      handleEmailChange();
    }
  };

  const handleSave = async () => {
    // Save phone only (email is handled separately via dialog)
    setIsSaving(true);
    try {
      // Create payload with phone only (email change requires separate confirmation flow)
      const payload: BusinessContactInfo = {
        first_name: initialContact.first_name, // Keep original values
        last_name: initialContact.last_name,
        middle_names: initialContact.middle_names,
        email: initialContact.email, // Keep original email (not changed here)
        phone: contact.phone, // Phone can change
      };
      await onSave(payload);
      setHasChanges(false);
      
      const phoneChanged = contact.phone !== initialContact.phone;
      
      if (phoneChanged) {
        toast({
          title: "Saved",
          description: "Your phone number has been updated.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Contact</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Locked section - Name fields */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Locked for verification</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="flex items-center gap-2">
                Full legal first name <span className="text-destructive">*</span>
                <Badge variant="outline" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </Badge>
              </Label>
              <Input
                id="first_name"
                value={contact.first_name}
                disabled
                placeholder="John"
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="middle_names" className="flex items-center gap-2">
                Middle names
                <Badge variant="outline" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </Badge>
              </Label>
              <Input
                id="middle_names"
                value={contact.middle_names || ''}
                disabled
                placeholder="James"
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name" className="flex items-center gap-2">
                Full legal last name(s) <span className="text-destructive">*</span>
                <Badge variant="outline" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </Badge>
              </Label>
              <Input
                id="last_name"
                value={contact.last_name}
                disabled
                placeholder="Smith"
                className="bg-muted"
              />
            </div>
          </div>
          <div className="bg-muted/50 border border-muted rounded-lg p-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              These details are locked after verification. If you need to change them, contact support.
            </p>
            <a
              href="mailto:support@virtualaddresshub.co.uk?subject=Request to change verified name"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <Mail className="h-3 w-3" />
              Contact support
            </a>
          </div>
        </div>

        {/* Editable section - Phone and Email */}
        <div className="space-y-4 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Contact telephone number</Label>
              <Input
                id="phone"
                type="tel"
                value={contact.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+44 20 1234 5678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-muted rounded-md border border-input text-sm">
                  {contact.email || 'No email set'}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenEmailDialog}
                >
                  Change email
                </Button>
              </div>
              {pendingEmail && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    Pending: <strong>{pendingEmail}</strong> (confirmation required)
                  </p>
                  <a
                    href="/account/confirm-email"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                  >
                    Resend confirmation email
                  </a>
                </div>
              )}
              {!pendingEmail && (
                <p className="text-xs text-muted-foreground">
                  Changing your email requires verification. We'll send a confirmation link to your new email address.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </CardContent>

      {/* Email Change Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent onKeyDown={handleEmailDialogKeyDown}>
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
                ref={newEmailInputRef}
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
              {newEmail && newEmail === contact.email && (
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
              onClick={() => setIsEmailDialogOpen(false)}
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
    </Card>
  );
}
