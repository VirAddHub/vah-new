'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  const handleChange = (field: keyof BusinessContactInfo, value: string) => {
    setContact(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Validation
    if (!contact.first_name.trim() || !contact.last_name.trim()) {
      toast({
        title: "Validation error",
        description: "First name and last name are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(contact);
      setHasChanges(false);
      toast({
        title: "Saved",
        description: "Your contact information has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save contact information. Please try again.",
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
        <p className="text-sm text-muted-foreground">
          These details must match your verification records.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">
              Full legal first name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="first_name"
              value={contact.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              placeholder="John"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="middle_names">Middle names</Label>
            <Input
              id="middle_names"
              value={contact.middle_names || ''}
              onChange={(e) => handleChange('middle_names', e.target.value)}
              placeholder="James"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">
              Full legal last name(s) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="last_name"
              value={contact.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              placeholder="Smith"
            />
          </div>

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

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={contact.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="john.smith@example.com"
            />
            <p className="text-xs text-muted-foreground">
              This is your account email address.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
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
