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
    <Card className="rounded-[20px] shadow-[0px_2px_10px_rgba(0,0,0,0.06)] border-0 bg-white w-[408px] h-[490px] flex-shrink-0" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
      <CardContent className="p-[28px] h-full flex flex-col">
        <div className="flex flex-col gap-[31px] flex-1">
          {/* Header */}
          <div className="flex items-center gap-[57px]">
            <h3 className="text-[18px] font-semibold leading-[1.4] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
              Business Contact
            </h3>
            <div className="w-[12px] h-[12px] border border-[#E5E7EB] rounded-[8px]"></div>
          </div>

          {/* Avatar and Name/Email */}
          <div className="flex flex-col items-center gap-[14px]">
            <div className="w-[54px] h-[54px] rounded-full bg-[#F9F9F9] border border-[#E5E7EB] flex items-center justify-center overflow-hidden">
              {contact.email ? (
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&color=fff&size=54`}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[20px] font-semibold text-[#666666]">{initials}</span>
              )}
            </div>
            <div className="flex flex-col gap-[4px] items-center">
              <p className="text-[16px] font-semibold leading-[1.4] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                {fullName}
              </p>
              <p className="text-[12px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                {contact.email || 'No email'}
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-[10px]">
            {/* Name Field */}
            <div className="flex flex-col gap-[10px]">
              <Label htmlFor="name" className="text-[12px] font-medium leading-[1.4] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                Name
              </Label>
              <Input
                id="name"
                value={fullName}
                disabled
                className="h-auto px-[20px] py-[6px] rounded-[41px] bg-[#F9F9F9] border border-[#E5E7EB] text-[12px] font-normal leading-[1.4] text-[#666666]"
                style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
              />
            </div>

            {/* Email Field */}
            <div className="flex flex-col gap-[10px]">
              <Label htmlFor="email" className="text-[12px] font-medium leading-[1.4] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                Email
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  value={contact.email || ''}
                  disabled
                  className="flex-1 h-auto px-[20px] py-[6px] rounded-[41px] bg-[#F9F9F9] border border-[#E5E7EB] text-[12px] font-normal leading-[1.4] text-[#666666]"
                  style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenEmailDialog}
                  className="text-[12px] text-[#40C46C] hover:text-[#40C46C]/80"
                >
                  Edit
                </Button>
              </div>
              {pendingEmail && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <p className="text-xs text-blue-800">
                    Pending: <strong>{pendingEmail}</strong> (confirmation required)
                  </p>
                </div>
              )}
            </div>

            {/* Number Field */}
            <div className="flex flex-col gap-[10px]">
              <Label htmlFor="phone" className="text-[12px] font-medium leading-[1.4] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={contact.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+088 5642 2356"
                className="h-auto px-[20px] py-[6px] rounded-[41px] bg-[#F9F9F9] border border-[#E5E7EB] text-[12px] font-normal leading-[1.4] text-[#666666]"
                style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
              />
            </div>

            {/* Save Button */}
            {hasChanges && (
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-[#40C46C] text-white hover:bg-[#40C46C]/90"
                  style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
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
