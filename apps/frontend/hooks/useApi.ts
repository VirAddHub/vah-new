import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import { mailService, profileService, billingService, supportService, forwardingService } from '../lib/services';
import { UserProfile } from '../lib/services/profile.service';
import { SubscriptionStatus } from '../lib/services/billing.service';
import { MailItem } from '../lib/services/mail.service';

// Generic hook for API calls
function useApiCall<T>(
  apiCall: () => Promise<{ success: boolean; data?: T; error?: string }>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiCall();
      if (response.success) {
        setData(response.data || null);
      } else {
        setError(response.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, dependencies);

  return { data, loading, error, refetch };
}

// Mail Items Hook
export function useMailItems() {
  return useApiCall<MailItem[]>(
    async () => {
      const response = await mailService.getMailItems();
      return {
        success: response.ok,
        data: response.data,
        error: response.ok ? undefined : 'Failed to fetch mail items'
      };
    },
    []
  );
}

// Profile Hook
export function useProfile() {
  return useApiCall<UserProfile>(
    async () => {
      const response = await profileService.getProfile();
      return {
        success: response.ok,
        data: response.data,
        error: response.ok ? undefined : 'Failed to fetch profile'
      };
    },
    []
  );
}

// Subscription Hook
export function useSubscription() {
  return useApiCall<SubscriptionStatus['data']>(
    async () => {
      const response = await billingService.getSubscriptionStatus();
      return {
        success: response.ok,
        data: response.data,
        error: response.ok ? undefined : 'Failed to fetch subscription status'
      };
    },
    []
  );
}

// Support Tickets Hook
export function useSupportTickets() {
  return useApiCall(
    async () => {
      const response = await supportService.getTickets();
      return {
        success: response.ok,
        data: response.data,
        error: response.ok ? undefined : 'Failed to fetch support tickets'
      };
    },
    []
  );
}

// Request Forwarding Hook
export function useRequestForwarding() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await forwardingService.createForwardingRequest(data);
      if (!response.ok) {
        throw new Error('Failed to create forwarding request');
      }
      return { success: true, data: response.data };
    } catch (err: any) {
      setError(err.message || 'Failed to create forwarding request');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
