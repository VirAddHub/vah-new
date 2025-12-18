'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { BusinessOwner } from '@/lib/account/types';
import { toast } from '@/hooks/use-toast';

interface OwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owner: BusinessOwner | null;
  onSave: (owner: Omit<BusinessOwner, 'id' | 'status' | 'requires_verification' | 'proof_of_address_status' | 'id_status'> & { id?: string | number }) => Promise<void>;
}

export function OwnerDialog({ open, onOpenChange, owner, onSave }: OwnerDialogProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    middle_names: '',
    last_name: '',
    dob: '',
    email: '',
    shares_percent: 0,
    votes_percent: 0,
    can_appoint_majority: false
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (owner) {
      setFormData({
        first_name: owner.first_name || '',
        middle_names: owner.middle_names || '',
        last_name: owner.last_name || '',
        dob: owner.dob || '',
        email: owner.email || '',
        shares_percent: owner.shares_percent || 0,
        votes_percent: owner.votes_percent || 0,
        can_appoint_majority: owner.can_appoint_majority || false
      });
    } else {
      setFormData({
        first_name: '',
        middle_names: '',
        last_name: '',
        dob: '',
        email: '',
        shares_percent: 0,
        votes_percent: 0,
        can_appoint_majority: false
      });
    }
  }, [owner, open]);

  const computeRequiresVerification = () => {
    return formData.shares_percent >= 25 ||
      formData.votes_percent >= 25 ||
      formData.can_appoint_majority === true;
  };

  const handleSave = async () => {
    // Validation
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast({
        title: "Validation error",
        description: "First name and last name are required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.dob) {
      toast({
        title: "Validation error",
        description: "Date of birth is required.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const ownerData = {
        ...(owner?.id && { id: owner.id }),
        ...formData,
        requires_verification: computeRequiresVerification()
      };

      await onSave(ownerData);
      onOpenChange(false);
      toast({
        title: "Saved",
        description: owner ? "Owner updated successfully." : "Owner added successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save owner. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const requiresVerification = computeRequiresVerification();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{owner ? 'Edit Business Owner' : 'Add Business Owner'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner-first_name">
                Full legal first name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="owner-first_name"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                placeholder="John"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-middle_names">Middle names</Label>
              <Input
                id="owner-middle_names"
                value={formData.middle_names}
                onChange={(e) => setFormData(prev => ({ ...prev, middle_names: e.target.value }))}
                placeholder="James"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-last_name">
                Full legal last name(s) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="owner-last_name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                placeholder="Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-dob">
                Date of birth <span className="text-destructive">*</span>
              </Label>
              <Input
                id="owner-dob"
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="owner-email">Email address</Label>
              <Input
                id="owner-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john.smith@example.com"
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium">PSC Threshold Information</h4>
            <p className="text-sm text-muted-foreground">
              Verification is required if any of these conditions are met:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner-shares">Shares %</Label>
                <Input
                  id="owner-shares"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.shares_percent}
                  onChange={(e) => setFormData(prev => ({ ...prev, shares_percent: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner-votes">Voting rights %</Label>
                <Input
                  id="owner-votes"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.votes_percent}
                  onChange={(e) => setFormData(prev => ({ ...prev, votes_percent: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="owner-can-appoint"
                checked={formData.can_appoint_majority}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_appoint_majority: checked === true }))}
              />
              <Label htmlFor="owner-can-appoint" className="cursor-pointer">
                Can appoint/remove majority of directors
              </Label>
            </div>

            {requiresVerification && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Verification required:</strong> This owner meets the PSC threshold and will need to complete verification.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : owner ? 'Update owner' : 'Add owner'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
