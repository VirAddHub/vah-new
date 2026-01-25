"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { X } from "lucide-react";
import { useToast } from "./ui/use-toast";

// Helper functions to format display text professionally
const formatSubjectForDisplay = (subject: string): string => {
  if (!subject) return "No subject";

  // Remove technical prefixes and clean up the display
  let cleanSubject = subject
    .replace(/^user\d+_\d+_/, '') // Remove user4_222222222_ prefix
    .replace(/\.pdf$/i, '') // Remove .pdf extension
    .replace(/_/g, ' ') // Replace underscores with spaces
    .trim();

  // If it's still empty or just numbers, show a generic message
  if (!cleanSubject || /^\d+$/.test(cleanSubject)) {
    return "Mail Document";
  }

  return cleanSubject;
};

const formatSenderForDisplay = (sender: string): string => {
  if (!sender) return "Unknown sender";

  // Clean up technical sender names
  if (sender.toLowerCase().includes('onedrive')) {
    return "Digital Mailbox";
  }
  if (sender.toLowerCase().includes('scan')) {
    return "Mail Processing";
  }

  return sender;
};

interface ForwardingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  mailItem: any;
  forwardingAddress?: string;
  onSubmit: (data: ForwardingRequestData) => Promise<void>;
}

interface ForwardingRequestData {
  to_name: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  postal: string;
  country: string;
}

export function ForwardingRequestModal({ isOpen, onClose, mailItem, forwardingAddress, onSubmit }: ForwardingRequestModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ForwardingRequestData>({
    to_name: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postal: "",
    country: "GB"
  });

  // 🔍 STEP 4: Log forwarding check in modal
  React.useEffect(() => {
    if (isOpen) {
      console.log("🔴 FORWARDING CHECK (Modal):", {
        forwardingAddress: forwardingAddress,
        forwardingAddressType: typeof forwardingAddress,
        forwardingAddressLength: forwardingAddress?.length,
        hasAddress: !!forwardingAddress,
        mailItem: mailItem?.id,
      });
    }
  }, [isOpen, forwardingAddress, mailItem]);

  // Parse forwarding address when it changes
  React.useEffect(() => {
    if (!forwardingAddress) return;

    const lines = forwardingAddress.split("\n").map(l => l.trim());

    const postcodeMatch = forwardingAddress.match(
      /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i
    );

    setFormData(prev => ({
      ...prev,
      to_name: lines[0] || prev.to_name,
      address1: lines[1] || prev.address1,
      address2: lines[2] || "",
      city: "London",
      postal: postcodeMatch?.[0] || "",
      country: "GB", // Using "GB" to match Select component values
    }));
  }, [forwardingAddress]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.to_name || !formData.address1 || !formData.city || !formData.postal) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
        durationMs: 4000,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Error submitting forwarding request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof ForwardingRequestData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Request Mail Forwarding</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm text-gray-700 mb-1">Mail Item Details</h4>
            <p className="text-sm text-gray-600">
              <strong>Document:</strong> {formatSubjectForDisplay(mailItem?.subject || mailItem?.description || "No subject")}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Source:</strong> {formatSenderForDisplay(mailItem?.sender_name || "Unknown sender")}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Received:</strong> {mailItem?.created_at ? new Date(Number(mailItem.created_at)).toLocaleDateString() : "Unknown date"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-sm text-blue-700 mb-2">Forwarding Address (from Profile)</h4>
              <div className="text-sm text-blue-600 whitespace-pre-line">
                {forwardingAddress || "No forwarding address configured. Please add one in Profile settings."}
              </div>
              <p className="text-xs text-blue-500 mt-1">
                This address will be used automatically. To change it, update your Profile settings.
              </p>
            </div>

            <div>
              <Label htmlFor="to_name">Recipient Name *</Label>
              <Input
                id="to_name"
                value={formData.to_name}
                onChange={(e) => handleChange("to_name", e.target.value)}
                placeholder="Full name"
                required
                disabled
                className="bg-gray-50"
              />
            </div>

            <div>
              <Label htmlFor="address1">Address Line 1 *</Label>
              <Input
                id="address1"
                value={formData.address1}
                onChange={(e) => handleChange("address1", e.target.value)}
                placeholder="Street address, house number"
                required
                disabled
                className="bg-gray-50"
              />
            </div>

            <div>
              <Label htmlFor="address2">Address Line 2</Label>
              <Input
                id="address2"
                value={formData.address2}
                onChange={(e) => handleChange("address2", e.target.value)}
                placeholder="Apartment, suite, unit, etc. (optional)"
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="City"
                  required
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                  placeholder="State or province"
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="postal">Postal Code *</Label>
                <Input
                  id="postal"
                  value={formData.postal}
                  onChange={(e) => handleChange("postal", e.target.value)}
                  placeholder="Postal code"
                  required
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">Country *</Label>
                <Select value={formData.country} onValueChange={(value) => handleChange("country", value)} disabled>
                  <SelectTrigger className="bg-gray-50">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="ES">Spain</SelectItem>
                    <SelectItem value="IT">Italy</SelectItem>
                    <SelectItem value="NL">Netherlands</SelectItem>
                    <SelectItem value="BE">Belgium</SelectItem>
                    <SelectItem value="IE">Ireland</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <div>
                <h4 className="font-semibold text-sm text-blue-900 mb-2">Forwarding Pricing</h4>
                <p className="text-sm text-blue-800 mb-1">
                  <strong>HMRC & Companies House mail:</strong> Free forwarding
                </p>
                <p className="text-sm text-blue-800">
                  <strong>All other mail:</strong> £2.00 per item
                </p>
              </div>
              <div className="border-t border-blue-200 pt-3">
                <h5 className="font-medium text-xs text-blue-900 mb-2 uppercase tracking-wide">How billing works</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• If the item is tagged <strong>HMRC</strong> or <strong>Companies House</strong>, it is forwarded free of charge</li>
                  <li>• Any other forwarded mail is automatically added to your monthly invoice at £2.00 per item</li>
                  <li>• Charges are processed automatically — no manual approval required</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating Request..." : "Create Forwarding Request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
