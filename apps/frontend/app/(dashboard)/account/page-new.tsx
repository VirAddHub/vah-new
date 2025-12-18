'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { AccountBillingCard } from '@/components/account/AccountBillingCard';
import { BusinessContactCard } from '@/components/account/BusinessContactCard';
import { ForwardingAddressCard } from '@/components/account/ForwardingAddressCard';
import { OwnersCard } from '@/components/account/OwnersCard';
import { InvoicesCard } from '@/components/account/InvoicesCard';
import { AccountPageData, BusinessContactInfo, Address, BusinessOwner, InvoiceRow, SubscriptionSummary } from '@/lib/account/types';
import { mockAccountData } from '@/lib/account/mockAccountData';
import { toast } from '@/hooks/use-toast';
import { User } from 'lucide-react';

export default function AccountPage() {
  // Fetch account data
  const { data: accountData, error, mutate } = useSWR<{ ok: boolean; data: AccountPageData }>('/api/bff/account', swrFetcher);

  // Fallback to mock data if API doesn't exist yet
  const data: AccountPageData = accountData?.ok ? accountData.data : mockAccountData;

  // Fetch user profile for contact info
  const { data: userData } = useSWR('/api/auth/whoami', swrFetcher);
  const user = userData?.data?.user;

  // Initialize contact info from user data
  useEffect(() => {
    if (user && !accountData?.ok) {
      // If we're using mock data, populate from user
      // SAFETY: Never overwrite existing addresses
      if (!data.contact.first_name && user.first_name) {
        data.contact.first_name = user.first_name;
      }
      if (!data.contact.last_name && user.last_name) {
        data.contact.last_name = user.last_name;
      }
      if (!data.contact.email && user.email) {
        data.contact.email = user.email;
      }
      if (!data.contact.phone && user.phone) {
        data.contact.phone = user.phone;
      }
      // SAFETY: Only set forwarding_address if it doesn't exist and user has one
      if (!data.forwarding_address && user.forwarding_address) {
        data.forwarding_address = { formatted: user.forwarding_address };
      }
      // SAFETY: Preserve business_address if it exists (display only, never delete)
      if (user.address_line1 || user.address_line2 || user.city) {
        const businessAddrLines = [
          user.address_line1,
          user.address_line2,
          user.city,
          user.postal_code,
          user.country
        ].filter(line => line && line.trim() !== '');
        if (businessAddrLines.length > 0 && !data.business_address) {
          data.business_address = { formatted: businessAddrLines.join('\n') };
        }
      }
    }
  }, [user, accountData]);

  // Handlers
  const handleSaveContact = async (contact: BusinessContactInfo) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          first_name: contact.first_name,
          middle_names: contact.middle_names,
          last_name: contact.last_name,
          phone: contact.phone,
          email: contact.email
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save contact information');
      }

      await mutate();
    } catch (error) {
      throw error;
    }
  };

  const handleSaveAddress = async (address: Address) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          forwarding_address: address.formatted
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save forwarding address');
      }

      await mutate();
    } catch (error) {
      throw error;
    }
  };

  const handleAddOwner = async (ownerData: any) => {
    // TODO: Implement API call to add owner
    toast({
      title: "Coming soon",
      description: "Owner management API will be available soon.",
    });
    // await mutate();
  };

  const handleEditOwner = async (owner: BusinessOwner) => {
    // TODO: Implement API call to update owner
    // Preserve verified status
    toast({
      title: "Coming soon",
      description: "Owner management API will be available soon.",
    });
    // await mutate();
  };

  const handleRemoveOwner = async (ownerId: string | number) => {
    // TODO: Implement API call to remove owner
    toast({
      title: "Coming soon",
      description: "Owner management API will be available soon.",
    });
    // await mutate();
  };

  const handleVerifyOwner = async (ownerId: string | number) => {
    // TODO: Implement Sumsub verification
    toast({
      title: "Coming soon",
      description: "Verification will be requested for this owner.",
    });
  };

  // Transform invoices data
  const invoices: InvoiceRow[] = data.invoices || [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation onNavigate={() => { }} />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto p-6 space-y-8">
          <div className="flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Account</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section A - Account & Billing */}
            <AccountBillingCard subscription={data.subscription} />

            {/* Section B - Business Contact Information */}
            <BusinessContactCard
              contact={data.contact}
              onSave={handleSaveContact}
            />
          </div>

          {/* Section C - Forwarding Address */}
          <ForwardingAddressCard
            address={data.forwarding_address || null}
            onSave={handleSaveAddress}
          />

          {/* Business Address (Display Only - Never Delete) */}
          {data.business_address && (
            <div className="bg-muted/50 p-4 rounded-lg border">
              <h3 className="font-medium mb-2">Business Address (Registered Office)</h3>
              <pre className="whitespace-pre-wrap text-sm font-mono text-muted-foreground">
                {data.business_address.formatted}
              </pre>
              <p className="text-xs text-muted-foreground mt-2">
                This is your registered office address and cannot be edited here.
              </p>
            </div>
          )}

          {/* Section D - Business Owners (PSC) */}
          <OwnersCard
            owners={data.owners || []}
            onAdd={handleAddOwner}
            onEdit={handleEditOwner}
            onRemove={handleRemoveOwner}
            onVerify={handleVerifyOwner}
          />

          {/* Section E - Invoices */}
          <InvoicesCard invoices={invoices} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
