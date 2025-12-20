'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MapPin, Edit, Plus } from 'lucide-react';
import { Address } from '@/lib/account/types';
import { toast } from '@/hooks/use-toast';
import { AddressCompleter } from '@/components/ui/AddressCompleter';
import type { AddressSuggestion } from '@/lib/account/addressTypes';

interface ForwardingAddressCardProps {
  address: Address | null;
  onSave: (address: Address) => Promise<void>;
}

export function ForwardingAddressCard({ address: initialAddress, onSave }: ForwardingAddressCardProps) {
  const [address, setAddress] = useState<Address | null>(initialAddress);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Sync address prop when it changes from parent (after save)
  useEffect(() => {
    setAddress(initialAddress);
  }, [initialAddress]);
  const [isSaving, setIsSaving] = useState(false);
  const [manualAddress, setManualAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    postcode: ''
  });
  const [useManualEntry, setUseManualEntry] = useState(false);

  // Parse existing address when dialog opens
  // Format is typically:
  // Name/Line1
  // Street address/Line2
  // City, Postcode
  // Country (optional, usually last line)
  const parseExistingAddress = (addr: Address | null) => {
    if (!addr?.formatted) {
      return { line1: '', line2: '', city: '', postcode: '' };
    }
    
    const lines = addr.formatted.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      return { line1: '', line2: '', city: '', postcode: '' };
    }
    
    // Find the line with city and postcode (usually has a comma)
    let cityPostcodeLine = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes(',')) {
        cityPostcodeLine = i;
        break;
      }
    }
    
    if (cityPostcodeLine >= 0) {
      const cityPostcodeMatch = lines[cityPostcodeLine].match(/^(.+?),\s*(.+)$/);
      if (cityPostcodeMatch) {
        return {
          line1: lines[0] || '',
          line2: cityPostcodeLine > 1 ? lines[1] : '',
          city: cityPostcodeMatch[1].trim(),
          postcode: cityPostcodeMatch[2].trim()
        };
      }
    }
    
    // Fallback: if no comma found, try to extract from last lines
    if (lines.length >= 2) {
      // Assume last line might be postcode, second to last might be city
      const lastLine = lines[lines.length - 1];
      const secondLastLine = lines.length > 1 ? lines[lines.length - 2] : '';
      
      // Check if last line looks like a postcode (UK format: letters and numbers)
      if (/^[A-Z0-9\s]+$/i.test(lastLine.trim()) && lastLine.trim().length <= 10) {
        return {
          line1: lines[0] || '',
          line2: lines.length > 2 ? lines[1] : '',
          city: secondLastLine || '',
          postcode: lastLine.trim()
        };
      }
    }
    
    // Final fallback: just use first line
    return {
      line1: lines[0] || '',
      line2: lines.length > 1 ? lines[1] : '',
      city: lines.length > 2 ? lines[lines.length - 2] : '',
      postcode: lines.length > 1 ? lines[lines.length - 1] : ''
    };
  };

  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    const addressLines = [
      suggestion.address_line_1,
      suggestion.address_line_2,
      suggestion.city,
      suggestion.postcode
    ].filter(line => line && line.trim() !== '');

    const formatted = addressLines.join('\n');
    setAddress({ formatted });
    setManualAddress({
      line1: suggestion.address_line_1,
      line2: suggestion.address_line_2 || '',
      city: suggestion.city,
      postcode: suggestion.postcode
    });
  };

  const handleManualChange = (field: string, value: string) => {
    setManualAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    let finalAddress: Address;

    if (useManualEntry) {
      const addressLines = [
        manualAddress.line1,
        manualAddress.line2,
        manualAddress.city,
        manualAddress.postcode
      ].filter(line => line && line.trim() !== '');

      if (addressLines.length === 0) {
        toast({
          title: "Validation error",
          description: "Please enter at least one address line.",
          variant: "destructive",
        });
        return;
      }

      finalAddress = { formatted: addressLines.join('\n') };
    } else if (address) {
      finalAddress = address;
    } else {
      toast({
        title: "Validation error",
        description: "Please select or enter an address.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(finalAddress);
      // Close dialog immediately after successful save (before state updates)
      setIsDialogOpen(false);
      // Update local state with saved address
      setAddress(finalAddress);
      // Reset manual entry state for next time
      setUseManualEntry(false);
      // Reset manual address fields
      setManualAddress({
        line1: '',
        line2: '',
        city: '',
        postcode: ''
      });
      // Note: Toast notification is handled by parent component
    } catch (error) {
      // Error toast is handled by parent component
      // Don't close dialog on error so user can retry
      console.error('[ForwardingAddressCard] Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to initial state
    setAddress(initialAddress);
    setUseManualEntry(false);
    setManualAddress(parseExistingAddress(initialAddress));
    setIsDialogOpen(false);
  };

  // When dialog opens, pre-populate manual address fields if address exists
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (open && address) {
      // Pre-populate manual address fields with existing address
      const parsed = parseExistingAddress(address);
      setManualAddress(parsed);
      // Start with manual entry if address exists (easier to edit)
      setUseManualEntry(true);
    } else if (!open) {
      // Reset when closing
      setUseManualEntry(false);
      setManualAddress({ line1: '', line2: '', city: '', postcode: '' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Forwarding Address
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Used only for forwarding physical post. You can update your forwarding address at any time.
        </p>
        {address ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <pre className="whitespace-pre-wrap text-sm font-mono">{address.formatted}</pre>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Edit forwarding address
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Forwarding Address</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {!useManualEntry && (
                    <div className="space-y-2">
                      <Label>Search for your address</Label>
                      <AddressCompleter
                        onAddressSelect={handleAddressSelect}
                        placeholder="Start typing your postcode to search..."
                      />
                      {address && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Current address will be replaced when you select a new one.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Can't find your address?</span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setUseManualEntry(!useManualEntry)}
                    >
                      {useManualEntry ? 'Use address search' : 'Enter address manually'}
                    </Button>
                  </div>

                  {useManualEntry && (
                    <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <Label htmlFor="manual-line1">
                            Address Line 1 <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="manual-line1"
                            value={manualAddress.line1}
                            onChange={(e) => handleManualChange('line1', e.target.value)}
                            placeholder="House number and street name"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="manual-line2">Address Line 2</Label>
                          <Input
                            id="manual-line2"
                            value={manualAddress.line2}
                            onChange={(e) => handleManualChange('line2', e.target.value)}
                            placeholder="Apartment, suite, etc. (optional)"
                            className="mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="manual-city">
                              City <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="manual-city"
                              value={manualAddress.city}
                              onChange={(e) => handleManualChange('city', e.target.value)}
                              placeholder="City"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="manual-postcode">
                              Postcode <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="manual-postcode"
                              value={manualAddress.postcode}
                              onChange={(e) => handleManualChange('postcode', e.target.value)}
                              placeholder="Postcode"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save address'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-8 text-center border-2 border-dashed rounded-lg">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No forwarding address configured</p>
              <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add forwarding address
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Forwarding Address</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {!useManualEntry && (
                      <div className="space-y-2">
                        <Label>Search for your address</Label>
                        <AddressCompleter
                          onAddressSelect={handleAddressSelect}
                          placeholder="Start typing your postcode to search..."
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Can't find your address?</span>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setUseManualEntry(!useManualEntry)}
                      >
                        {useManualEntry ? 'Use address search' : 'Enter address manually'}
                      </Button>
                    </div>

                    {useManualEntry && (
                      <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <Label htmlFor="add-manual-line1">
                              Address Line 1 <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="add-manual-line1"
                              value={manualAddress.line1}
                              onChange={(e) => handleManualChange('line1', e.target.value)}
                              placeholder="House number and street name"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="add-manual-line2">Address Line 2</Label>
                            <Input
                              id="add-manual-line2"
                              value={manualAddress.line2}
                              onChange={(e) => handleManualChange('line2', e.target.value)}
                              placeholder="Apartment, suite, etc. (optional)"
                              className="mt-1"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="add-manual-city">
                                City <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="add-manual-city"
                                value={manualAddress.city}
                                onChange={(e) => handleManualChange('city', e.target.value)}
                                placeholder="City"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="add-manual-postcode">
                                Postcode <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="add-manual-postcode"
                                value={manualAddress.postcode}
                                onChange={(e) => handleManualChange('postcode', e.target.value)}
                                placeholder="Postcode"
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save address'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
