import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import { mailService, profileService, billingService, supportService, forwardingService } from '../lib/services';
import { UserProfile } from '../lib/services/profile.service';

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
  return useApiCall(
    () => mailService.getMailItems(1, 50),
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
  return useApiCall(
    () => billingService.getSubscriptionStatus(),
    []
  );
}

// Support Tickets Hook
export function useSupportTickets() {
  return useApiCall(
    () => supportService.getTickets(),
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
      const response = await forwardingService.createRequest(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create forwarding request');
      }
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to create forwarding request');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
