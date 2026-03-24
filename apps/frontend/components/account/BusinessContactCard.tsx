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

  const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'No name';
  const initials = `${contact.first_name?.[0] || ''}${contact.last_name?.[0] || ''}`.toUpperCase() || '?';

  return (
    <Card className="rounded-2xl shadow-sm bg-card w-full max-w-md flex-shrink-0">
      <CardContent className="p-7 h-full flex flex-col">
        <div className="flex flex-col gap-8 flex-1">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-h4 text-foreground">
              Business Contact
            </h3>
            <div className="w-3 h-3 border border-border rounded-md"></div>
          </div>

          {/* Avatar and Name/Email */}
          <div className="flex flex-col items-center gap-3.5">
            <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden">
              {contact.email ? (
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&color=fff&size=54`}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-h3 font-semibold text-muted-foreground">{initials}</span>
              )}
            </div>
            <div className="flex flex-col gap-1 items-center">
              <p className="text-body font-semibold text-foreground">
                {fullName}
              </p>
              <p className="text-caption text-muted-foreground">
                {contact.email || 'No email'}
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-2.5">
            {/* Name Field */}
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="name" className="text-caption font-medium text-foreground">
                Name
              </Label>
              <Input
                id="name"
                value={fullName}
                disabled
                className="h-auto px-5 py-1.5 rounded-full bg-muted border border-border text-caption text-muted-foreground"
              />
            </div>

            {/* Email Field */}
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="email" className="text-caption font-medium text-foreground">
                Email
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  value={contact.email || ''}
                  disabled
                  className="flex-1 h-auto px-5 py-1.5 rounded-full bg-muted border border-border text-caption text-muted-foreground"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenEmailDialog}
                  className="text-caption text-primary hover:text-primary/80"
                >
                  Edit
                </Button>
              </div>
              {pendingEmail && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <p className="text-caption text-blue-800">
                    Pending: <strong>{pendingEmail}</strong> (confirmation required)
                  </p>
                </div>
              )}
            </div>

            {/* Number Field */}
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="phone" className="text-caption font-medium text-foreground">
                Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={contact.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+088 5642 2356"
                className="h-auto px-5 py-1.5 rounded-full bg-muted border border-border text-caption text-muted-foreground"
              />
            </div>

            {/* Save Button */}
            {hasChanges && (
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            )}
          </div>
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
                <p className="text-caption text-destructive">Email addresses must match</p>
              )}
              {newEmail && newEmail === contact.email && (
                <p className="text-caption text-destructive">This is your current email address</p>
              )}
            </div>
            <div className="bg-muted/50 border border-muted rounded-lg p-3">
              <p className="text-caption text-muted-foreground">
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
