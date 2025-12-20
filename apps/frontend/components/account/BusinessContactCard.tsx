'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

  // Sync contact prop when it changes from parent (after data loads or save)
  useEffect(() => {
    setContact(initialContact);
    setHasChanges(false); // Reset changes flag when prop updates
  }, [initialContact]);

  const handleChange = (field: keyof BusinessContactInfo, value: string) => {
    // Allow changes to phone and email (name fields are locked)
    if (field === 'phone' || field === 'email') {
      setContact(prev => ({ ...prev, [field]: value }));
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    // Save phone and email (name fields are locked and excluded from payload)
    setIsSaving(true);
    try {
      // Create payload with phone and email (exclude locked name fields)
      const payload: BusinessContactInfo = {
        first_name: initialContact.first_name, // Keep original values
        last_name: initialContact.last_name,
        middle_names: initialContact.middle_names,
        email: contact.email, // Email can now change
        phone: contact.phone, // Phone can change
      };
      await onSave(payload);
      setHasChanges(false);
      
      const changedFields = [];
      const emailChanged = contact.email !== initialContact.email;
      const phoneChanged = contact.phone !== initialContact.phone;
      
      if (phoneChanged) changedFields.push('phone number');
      if (emailChanged) {
        // Email change requires verification - show special message
        toast({
          title: "Verification email sent",
          description: "We've sent a confirmation link to your new email address. Please check your inbox and click the link to complete the change.",
        });
      } else if (phoneChanged) {
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
              <Input
                id="email"
                type="email"
                value={contact.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="your.email@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Changing your email requires verification. We'll send a confirmation link to your new email address.
              </p>
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
    </Card>
  );
}
