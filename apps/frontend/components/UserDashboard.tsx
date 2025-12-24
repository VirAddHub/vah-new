"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import useSWR from 'swr';
import { getToken } from '@/lib/token-manager';
import Link from "next/link";
import {
  Building2,
  FileText,
  Landmark,
  Download,
  Truck,
  CheckSquare,
  Square,
  Mail,
  AlertCircle,
  Eye,
  Calendar,
  ArrowLeft,
  X,
  SlidersHorizontal,
  RefreshCw,
  LogOut,
  User,
  Bell,
  HelpCircle,
  Users,
  ArrowRight
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { openInline, downloadFile } from "@/lib/fileActions";
import PDFViewerModal from "@/components/PDFViewerModal";
import { ForwardingConfirmationModal } from "./ForwardingConfirmationModal";
import { useToast } from "./ui/use-toast";
import { MailManagement } from "./MailManagement";
import { usePDFPreloader } from "@/hooks/usePDFPreloader";
import { IdentityComplianceCard, Compliance } from "@/components/dashboard/IdentityComplianceCard";
import { VAHLogo } from "./VAHLogo";
import { VAH_ADDRESS_LINES } from "@/lib/address";

interface UserDashboardProps {
  onLogout: () => void;
  onNavigate: (page: string, data?: any) => void;
  onGoBack?: () => void;
}

// API configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';

function formatUkDate(d: Date | string | number) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Token helper is imported from @/lib/token-manager

// SWR fetcher function
const fetcher = (url: string) => {
  const token = getToken();
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  // BFF routes should be relative (handled by Next.js), not absolute backend URLs
  // If url already starts with /api/bff, use it as-is (relative - handled by Next.js)
  // If url starts with http, use it as-is (absolute URL)
  // Otherwise, it's a backend route - prepend API_BASE
  const finalUrl = url.startsWith('/api/bff') || url.startsWith('http')
    ? url
    : `${API_BASE}${url}`;

  return fetch(finalUrl, {
    headers,
    credentials: 'include'
  }).then(r => {
    if (!r.ok) {
      // Create error with status for better handling
      const error = new Error(`HTTP ${r.status}`);
      (error as any).status = r.status;
      throw error;
    }
    return r.json();
  });
};

// Mail item interface
interface MailItem {
  id: string | number;
  subject?: string;
  sender_name?: string;
  received_date?: string;
  status?: string;
  tag?: string;
  is_read?: boolean;
  created_at?: string;
  scanned_at?: string;
  file_url?: string;
  deleted?: boolean; // Backend uses 'deleted' field for archived status
  gdpr_expired?: boolean; // GDPR 30-day expiration flag (from backend API)
}

export function UserDashboard({ onLogout, onNavigate, onGoBack }: UserDashboardProps) {
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMail, setSelectedMail] = useState<string[]>([]);
  const [selectedMailDetail, setSelectedMailDetail] = useState<MailItem | null>(null);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedMailForPDF, setSelectedMailForPDF] = useState<MailItem | null>(null);
  const [miniViewerUrl, setMiniViewerUrl] = useState<string | null>(null);
  const [miniViewerLoading, setMiniViewerLoading] = useState(false);
  const [miniViewerError, setMiniViewerError] = useState<string | null>(null);
  const [forwardInlineNotice, setForwardInlineNotice] = useState<string | null>(null);
  const [isCertBusy, setIsCertBusy] = useState(false);
  const [showForwardingConfirmation, setShowForwardingConfirmation] = useState(false);
  const [selectedMailForForwarding, setSelectedMailForForwarding] = useState<MailItem | null>(null);
  // When identity is complete, we only show the success banner for the first 3 dashboard sessions.
  // Default to hidden to avoid a flash before local/session storage gating runs.
  const [showIdentitySuccessBanner, setShowIdentitySuccessBanner] = useState(false);

  // PDF preloader for hover optimization
  const { preloadPDF } = usePDFPreloader();

  // Helper function to format scanned date
  const formatScannedDate = (item: MailItem) => {
    // Prefer scanned_at if available, otherwise use created_at
    const dateToUse = item.scanned_at || item.created_at;
    if (!dateToUse) return null;

    // Handle both timestamp (number) and date string formats
    const date = typeof dateToUse === 'number' ? new Date(dateToUse) : new Date(dateToUse);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // SWR hook for mail items - no automatic polling to prevent 429 errors
  // Include archived items by default so the frontend can filter them
  const { data: mailData, error: mailError, isLoading: mailLoading, mutate: refreshMail } = useSWR(
    '/api/bff/mail-items?includeArchived=true',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
      errorRetryCount: 2, // Reduced retry count
      errorRetryInterval: 10000, // Increased retry interval
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Don't retry on 429 errors - let them fail silently
        if (error.status === 429) {
          console.warn('Rate limited - skipping retry');
          return;
        }
        // Only retry up to 2 times for other errors
        if (retryCount >= 2) return;
        setTimeout(() => revalidate({ retryCount }), 10000);
      }
    }
  );

  // Extract mail items and metadata
  const mailItems = useMemo(() => {
    if (!mailData?.ok) return [];
    return Array.isArray(mailData.items) ? mailData.items : [];
  }, [mailData]);

  const totalItems = mailData?.total || 0;

  // Dashboard summary counters (inbox-first)
  const summary = useMemo(() => {
    const active = mailItems.filter((m: MailItem) => !m.deleted);
    const newCount = active.filter((m: MailItem) => !m.is_read).length;

    const norm = (s: string) => s.toLowerCase().trim().replace(/[\s-]+/g, "_");
    const needsForwardingCount = active.filter((m: MailItem) => {
      const fwd = (m as any)?.forwarding_status;
      if (typeof fwd === "string" && fwd.trim()) {
        const key = norm(fwd);
        // Canonical statuses: requested | in_progress | dispatched | cancelled
        return key === "requested" || key === "in_progress";
      }

      // Fallback for older payloads that only include free-form status
      const raw = (m.status || "").toLowerCase();
      return raw.includes("forward") && (raw.includes("pending") || raw.includes("requested"));
    }).length;

    return { newCount, needsForwardingCount };
  }, [mailItems]);

  // SWR hook for user profile - we avoid refreshInterval/polling here.
  // Profile is revalidated via explicit mutate() after important actions
  // (e.g. CH upload) to keep the dashboard stable.
  // IMPORTANT: No refreshInterval, no router.refresh() loops, no setInterval polling.
  const { data: profileData, error: profileError, isLoading: profileLoading, mutate: refreshProfile } = useSWR(
    '/api/profile',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
      // No refreshInterval - prevents constant API calls
      onSuccess: (data) => {
        // Update localStorage with fresh data when profile loads
        if (data?.ok && data?.data) {
          localStorage.setItem('vah_user', JSON.stringify(data.data));
          setUserProfile(data.data);
        }
      }
    }
  );

  // Initialize user profile from SWR data or localStorage
  useEffect(() => {
    if (profileData?.ok && profileData?.data) {
      setUserProfile(profileData.data);
    } else {
      // Fallback to localStorage for immediate display
      const storedUser = localStorage.getItem('vah_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          setUserProfile(user);
        } catch (e) {
          console.error('Failed to parse stored user:', e);
        }
      }
    }
    setLoading(profileLoading);
  }, [profileData, profileLoading]);

  // Select/Deselect functions
  const toggleSelectMail = (id: string) => {
    setSelectedMail(prev =>
      prev.includes(id)
        ? prev.filter(mailId => mailId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMail.length === mailItems.length) {
      setSelectedMail([]);
    } else {
      setSelectedMail(mailItems.map((item: MailItem) => String(item.id)));
    }
  };

  const isAllSelected = selectedMail.length === mailItems.length && mailItems.length > 0;
  const isSomeSelected = selectedMail.length > 0;

  // Check if selected items include HMRC or Companies House
  const selectedHasGovernment = selectedMail.some(id => {
    const item = mailItems.find((m: MailItem) => String(m.id) === id);
    return item?.tag === "HMRC" || item?.tag === "COMPANIES HOUSE";
  });

  // Mark mail item as read
  const markAsRead = useCallback(async (item: MailItem) => {
    try {
      const token = getToken();
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/mail-items/${item.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_read: true })
      });

      if (res.ok) {
        // Update the SWR cache to reflect the change
        await refreshMail();
      }
    } catch (e) {
      console.error('Error marking item as read:', e);
      // Don't show error to user - this is a background operation
    }
  }, [refreshMail]);

  // Open handler - opens PDF modal and marks as read
  const onOpen = useCallback(async (item: MailItem) => {
    try {
      // Route into the detail view (PDF opens from the "View" action)
      setSelectedMailDetail(item);
      setSelectedMailForPDF(item);
      setShowPDFModal(false);

      // Auto-mark as read when opened (if not already read)
      if (!item.is_read) {
        await markAsRead(item);
      }
    } catch (err) {
      console.error('Error opening file:', err);
    }
  }, [markAsRead]);

  // Download handler - uses secure blob streaming
  const onDownload = useCallback(async (item: MailItem) => {
    try {
      await downloadFile(`${API_BASE}/api/mail-items/${item.id}/download`, `mail-item-${item.id}.pdf`);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Unable to download file. Please try again.');
    }
  }, []);

  const formatTime = (d?: string | number) => {
    if (!d) return "—";
    const date = typeof d === "number" ? new Date(d) : new Date(d);
    if (Number.isNaN(date.getTime())) return "—";
    return date
      .toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })
      .toUpperCase();
  };

  const mailStatusMeta = (item: MailItem) => {
    const raw = (item.status || "").toLowerCase();
    const isForwarded = raw.includes("forward");
    const isScanned = Boolean(item.scanned_at || item.file_url) || raw.includes("scan");
    const isNew = !item.is_read && !isForwarded;

    if (isForwarded) {
      return { label: "Forwarded", badgeClass: "bg-emerald-600 text-white border-transparent" };
    }
    if (isScanned) {
      return { label: "Scanned", badgeClass: "bg-neutral-200 text-neutral-700 border-transparent" };
    }
    if (isNew) {
      return { label: "New", badgeClass: "bg-blue-600 text-white border-transparent" };
    }
    return { label: "Received", badgeClass: "bg-neutral-200 text-neutral-700 border-transparent" };
  };

  const mailTypeIcon = (item: MailItem) => {
    const tag = (item.tag || "").toLowerCase();
    const sender = (item.sender_name || "").toLowerCase();
    const subj = (item.subject || "").toLowerCase();
    const s = `${tag} ${sender} ${subj}`;

    if (s.includes("bank") || s.includes("barclays") || s.includes("hsbc") || s.includes("lloyds")) return Landmark;
    if (s.includes("hmrc") || s.includes("companies house") || s.includes("gov")) return Building2;
    return FileText;
  };

  // Mini PDF viewer: render a real preview in the detail view (before user clicks View)
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    const revoke = (url: string | null) => {
      try {
        if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
      } catch { }
    };

    async function loadMini() {
      setMiniViewerError(null);
      setMiniViewerLoading(false);

      // cleanup if leaving detail view
      if (!selectedMailDetail?.id) {
        revoke(miniViewerUrl);
        setMiniViewerUrl(null);
        return;
      }

      setMiniViewerLoading(true);
      revoke(miniViewerUrl);
      setMiniViewerUrl(null);

      try {
        const mailItemId = selectedMailDetail.id;

        // Use BFF route (relative path - handled by Next.js)
        const url = `/api/bff/mail/scan-url?mailItemId=${encodeURIComponent(String(mailItemId))}&disposition=inline`;

        const token = (typeof window !== 'undefined') ? localStorage.getItem('vah_jwt') : null;
        const res = await fetch(url, {
          credentials: 'include',
          cache: 'no-store',
          signal: ctrl.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(txt || `Failed to load preview (${res.status})`);
        }

        const ab = await res.arrayBuffer();
        const blob = new Blob([ab], { type: 'application/pdf' });
        const bUrl = URL.createObjectURL(blob);
        if (!cancelled) setMiniViewerUrl(bUrl);
      } catch (e: any) {
        if (!cancelled) setMiniViewerError(e?.message || 'Preview unavailable');
      } finally {
        if (!cancelled) setMiniViewerLoading(false);
      }
    }

    loadMini();
    return () => {
      cancelled = true;
      ctrl.abort();
      revoke(miniViewerUrl);
    };
    // We intentionally refetch when the selected mail changes
  }, [selectedMailDetail?.id]);

  // Forwarding notice: keep it near the Forward button, and auto-hide
  useEffect(() => {
    if (!forwardInlineNotice) return;
    const t = window.setTimeout(() => setForwardInlineNotice(null), 8000);
    return () => window.clearTimeout(t);
  }, [forwardInlineNotice]);

  // Clear any inline notice when switching items
  useEffect(() => {
    setForwardInlineNotice(null);
  }, [selectedMailDetail?.id]);

  async function handleDownloadCertification() {
    if (isCertBusy) return;
    setIsCertBusy(true);

    try {
      // Use BFF route which handles authentication via cookies
      const response = await fetch('/api/bff/profile/certificate', {
        method: 'GET',
        credentials: "include",
      });

      if (!response.ok) {
        // Try to get error message if it's JSON
        let errorMessage = "Failed to prepare certificate";
        try {
          const errorData = await response.json();
          errorMessage = errorData?.error || errorData?.message || errorMessage;
        } catch {
          // Not JSON, use default message
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "letter-of-certification.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Cleanup blob URL shortly after triggering download
      window.setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch { }
      }, 5000);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Sorry — we couldn't generate your letter. Please try again.";
      alert(errorMessage);
    } finally {
      setIsCertBusy(false);
    }
  }

  // Forwarding handler
  const onForward = useCallback((item: MailItem) => {
    setSelectedMailForForwarding(item);
    setShowForwardingConfirmation(true);
  }, []);

  // Check if mail item can be forwarded
  const canForward = useCallback((item: MailItem) => {
    // Check basic forwarding eligibility
    if (isGDPRExpired(item) || item.status !== 'received') {
      return false;
    }

    // TEMPORARILY DISABLED: Allow forwarding even with incomplete address
    // TODO: Fix user's forwarding address in database
    return true;

    // Check if user has a complete forwarding address
    if (!userProfile?.forwarding_address) {
      return false;
    }

    // Parse the forwarding address using the same logic as the backend
    const addressLines = userProfile.forwarding_address.split('\n').filter((line: string) => line.trim() !== '');

    // Need at least 4 lines: name, address1, city/postal, country
    if (addressLines.length < 4) {
      return false;
    }

    const name = addressLines[0] || '';
    const address1 = addressLines[1] || '';
    const cityPostal = addressLines[addressLines.length - 2] || '';
    const country = addressLines[addressLines.length - 1] || '';

    const [city, postal] = cityPostal.split(',').map((s: string) => s.trim());

    // Check if all required fields are present (same as backend validation)
    if (!name || !address1 || !city || !postal) {
      return false;
    }

    return true;
  }, [userProfile?.forwarding_address]);

  // Check if mail item is GDPR expired (30+ days old)
  // Uses gdpr_expired flag from backend API (single source of truth)
  // Falls back to date calculation only if flag is not available (for backwards compatibility)
  const isGDPRExpired = useCallback((item: MailItem) => {
    // Prefer backend-calculated flag (single source of truth)
    if (typeof item.gdpr_expired === 'boolean') {
      return item.gdpr_expired;
    }

    // Fallback: calculate locally if flag not available (shouldn't happen in production)
    if (!item.received_date) return false;
    const receivedDate = new Date(item.received_date);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff > 30;
  }, []);

  // Forwarding confirmation handler
  const handleForwardingConfirm = async (paymentMethod: 'monthly' | 'gocardless') => {
    if (!selectedMailForForwarding) return;

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/api/forwarding/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          mail_item_id: selectedMailForForwarding.id,
          method: 'standard',
          reason: `Forwarding request via ${paymentMethod} payment method`
        })
      });

      if (response.ok) {
        toast({
          title: "Forwarding Request Created",
          description: "Your mail forwarding request has been submitted successfully.",
          durationMs: 3000,
        });

        // Refresh mail items to update status
        refreshMail();

        // Close modal
        setShowForwardingConfirmation(false);
        setSelectedMailForForwarding(null);
      } else {
        const errorData = await response.json().catch(() => ({}));

        // Handle incomplete forwarding address error
        if (errorData.error === 'forwarding_address_incomplete' && errorData.fields) {
          const missingFields = errorData.fields || [];
          const fieldLabels: Record<string, string> = {
            'name': 'Full Name',
            'address_line_1': 'Address Line 1',
            'city': 'City',
            'postal_code': 'Postcode',
          };
          const missingLabels = missingFields.map((f: string) => fieldLabels[f] || f).join(', ');

          toast({
            title: "Incomplete Forwarding Address",
            description: `Please add your ${missingLabels} before requesting forwarding. You can update your forwarding address in Account settings.`,
            variant: "destructive",
            durationMs: 6000,
          });
        } else {
          const errorMessage = errorData.message || errorData.error || 'Failed to create forwarding request';
          toast({
            title: "Forwarding Request Failed",
            description: errorMessage,
            variant: "destructive",
            durationMs: 5000,
          });
        }
      }
    } catch (error: any) {
      console.error('Forwarding error:', error);
      toast({
        title: "Forwarding Request Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
        durationMs: 5000,
      });
    }
  };

  // Get user name helper
  const getUserName = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }
    if (userProfile?.first_name) {
      return userProfile.first_name;
    }
    if (userProfile?.email) {
      return userProfile.email.split('@')[0];
    }
    return "User"; // Final fallback
  };

  const businessAddressLine1 = VAH_ADDRESS_LINES[0];
  const businessAddressLine2 = VAH_ADDRESS_LINES[1];
  const businessAddressLine3 = VAH_ADDRESS_LINES[2];
  const businessAddressLine4 = VAH_ADDRESS_LINES[3];

  // Get compliance status from profile (computed by backend)
  const compliance: Compliance = userProfile?.compliance || {
    isKycApproved: false,
    isChVerified: false,
    canUseRegisteredOfficeAddress: false,
  };

  // Address is gated by compliance.canUseRegisteredOfficeAddress (KYC-only)
  const canUseAddress = compliance.canUseRegisteredOfficeAddress;

  // Show the "Identity Checks Complete" success banner only for first 3 dashboard sessions
  // after verification. Tracked per-user in localStorage and counted once per tab session.
  useEffect(() => {
    try {
      const userId = (userProfile as any)?.id;
      if (!userId) return;

      const isComplete = Boolean(compliance.canUseRegisteredOfficeAddress);
      const stateKey = `vah_identity_complete_state_${userId}`;
      const countKey = `vah_identity_complete_banner_seen_${userId}`;
      const sessionKey = `vah_identity_complete_banner_counted_${userId}`;

      const prevState = localStorage.getItem(stateKey);

      // If user is NOT complete, always show banner (don't track state)
      if (!isComplete) {
        setShowIdentitySuccessBanner(false); // Don't show success banner if not complete
        return;
      }

      // User IS complete - only show banner for first 3 sessions after verification
      if (isComplete && prevState !== "1") {
        // First time seeing complete state - reset counters
        localStorage.setItem(stateKey, "1");
        localStorage.setItem(countKey, "0");
        sessionStorage.removeItem(sessionKey);
      }

      // Check if we've shown banner 3+ times already
      const current = Number(localStorage.getItem(countKey) || "0") || 0;
      if (current >= 3) {
        setShowIdentitySuccessBanner(false);
        return;
      }

      // Check if we've counted this session already
      if (!sessionStorage.getItem(sessionKey)) {
        const next = current + 1;
        localStorage.setItem(countKey, String(next));
        sessionStorage.setItem(sessionKey, "1");
        setShowIdentitySuccessBanner(next <= 3);
      } else {
        // already counted this session
        setShowIdentitySuccessBanner(current <= 3);
      }
    } catch {
      // If storage is unavailable, default to showing it (safe UX)
      setShowIdentitySuccessBanner(true);
    }
  }, [(userProfile as any)?.id, compliance.canUseRegisteredOfficeAddress]);

  const handleRequestForwarding = (mailItem?: MailItem) => {
    console.log('[UI] handleRequestForwarding called', { mailItem: mailItem?.id, hasMailItem: !!mailItem });

    // If a specific mail item is provided, use it directly
    if (mailItem) {
      console.log('[UI] Processing specific mail item:', mailItem.id);
      if (!canForward(mailItem)) {
        console.log('[UI] Cannot forward mail item:', mailItem.id, 'GDPR expired:', isGDPRExpired(mailItem));
        const msg = isGDPRExpired(mailItem)
          ? "This mail item is older than 30 days and cannot be forwarded due to GDPR compliance. You can still download it."
          : "This mail item cannot be forwarded at this time.";

        // If the user is in the mail detail view, show it anchored near the Forward button
        if (selectedMailDetail && String(selectedMailDetail.id) === String(mailItem.id)) {
          setForwardInlineNotice(msg);
        } else {
          toast({
            title: "Cannot Forward Mail",
            description: msg,
            variant: "destructive",
            durationMs: 5000,
          });
        }
        return;
      }
      console.log('[UI] Setting selected mail for forwarding and showing modal');
      setForwardInlineNotice(null);
      setSelectedMailForForwarding(mailItem);
      setShowForwardingConfirmation(true);
      return;
    }

    // Handle bulk forwarding
    if (selectedMail.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select mail items to forward.",
        variant: "destructive",
        durationMs: 3000,
      });
      return;
    }

    const item = mailItems.find((item: MailItem) => selectedMail.includes(item.id.toString()));
    if (!item) return;

    if (!canForward(item)) {
      toast({
        title: "Cannot Forward Mail",
        description: isGDPRExpired(item)
          ? "This mail item is older than 30 days and cannot be forwarded due to GDPR compliance. You can still download it."
          : "This mail item cannot be forwarded at this time.",
        variant: "destructive",
        durationMs: 5000,
      });
      return;
    }

    setSelectedMailForForwarding(item);
    setShowForwardingConfirmation(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="safe-pad mx-auto max-w-screen-xl">
          <div className="flex h-16 items-center justify-between">
            {/* Brand Name */}
            <div className="flex items-center gap-4">
              <VAHLogo onNavigate={onNavigate} size="md" />
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/account"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <User className="h-4 w-4" />
                Account
              </Link>
              <button
                onClick={() => window.open('/help', '_blank', 'noopener,noreferrer')}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                title="Open help in a new tab"
              >
                <HelpCircle className="h-4 w-4" />
                Help
              </button>
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-sm">
                <p className="font-medium">{getUserName()}</p>
                <p className="text-xs text-muted-foreground">{userProfile?.email}</p>
              </div>
              <Link
                href="/account"
                className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <User className="h-4 w-4" />
                Account
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="tt-min flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="safe-pad mx-auto max-w-screen-xl py-8">

        {/* Two Column Layout: Main content + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

          {/* Left Column - Main Content */}
          <div className="flex flex-col gap-6">

            {/* Business Owners Pending Banner */}
            {userProfile?.owners_pending_info === true && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
                <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>Business owners required:</strong> You told us there are other directors/owners. Please add them to complete verification.
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onNavigate('business-owners')}
                      className="ml-4 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Add business owners
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Identity Compliance Card (desktop) */}
            {(!compliance.canUseRegisteredOfficeAddress || showIdentitySuccessBanner) && (
              <div className="hidden md:block order-2 md:order-1">
                <IdentityComplianceCard
                  compliance={compliance}
                  kycStatus={userProfile?.kyc_status || null}
                />
              </div>
            )}

            {/* Mobile: compact identity status strip */}
            {(!compliance.canUseRegisteredOfficeAddress || showIdentitySuccessBanner) && (
              <div className="md:hidden order-2 rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground">
                    {compliance?.isKycApproved && compliance?.isChVerified ? "✔ Identity Verified" : "⏳ Identity check required"}
                  </div>
                </div>
              </div>
            )}

            {/* Mail Inbox Section */}
            <Card className="border-neutral-200 shadow-sm order-1 md:order-2">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg md:text-2xl font-semibold text-neutral-800 truncate">
                        Inbox
                      </h2>
                      <p className="text-xs md:text-sm text-neutral-500 mt-1">
                        {totalItems} {totalItems === 1 ? 'item' : 'items'}
                        {mailLoading && <RefreshCw className="h-3 w-3 ml-2 inline animate-spin" />}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Mobile: Filter opens modal in MailManagement */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="md:hidden"
                        onClick={() => {
                          document.getElementById('mail-filters-open')?.click();
                        }}
                      >
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        Filter
                      </Button>

                      {/* Manual refresh button - NO automatic polling */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refreshMail()}
                        disabled={mailLoading}
                        className="shrink-0"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${mailLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                  <p className="hidden md:block text-sm text-neutral-500">
                    Click on any mail item to view full details and scans
                  </p>

                  {/* Summary row (inbox-first) */}
                  <div className="rounded-xl border border-border bg-background px-3 py-2 inline-block">
                    <div className="text-[11px] font-semibold text-neutral-500">New</div>
                    <div className="mt-1 text-base font-semibold text-neutral-900">{summary.newCount}</div>
                  </div>

                  {/* Bulk Actions - Show when items selected */}
                  {isSomeSelected && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default" className="text-sm">
                        {selectedMail.length} selected
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download Selected
                      </Button>
                      <Button size="sm" variant="primary" onClick={() => handleRequestForwarding()}>
                        <Truck className="h-4 w-4 mr-2" />
                        Request Forwarding
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mail detail view (match screenshot - light) */}
                {selectedMailDetail ? (
                  <div className="bg-white">
                    <div className="px-4 sm:px-6 pt-4 pb-6">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMailDetail(null);
                          setForwardInlineNotice(null);
                          onGoBack?.();
                        }}
                        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to inbox
                      </button>

                      {(() => {
                        const Icon = mailTypeIcon(selectedMailDetail);
                        const title = selectedMailDetail.sender_name || selectedMailDetail.tag || "Mail";
                        const subtitle = selectedMailDetail.subject || "Mail item";
                        const status = mailStatusMeta(selectedMailDetail);
                        const time = formatTime(selectedMailDetail.received_date || selectedMailDetail.created_at);

                        return (
                          <div className="mt-5 flex items-start gap-4">
                            <div className="pt-1">
                              <Icon className="h-7 w-7 text-neutral-900" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-3 min-w-0">
                                <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900 truncate">
                                  {title}
                                </h2>
                                {!selectedMailDetail.is_read && (
                                  <span className="h-3 w-3 rounded-full bg-blue-600 shrink-0" aria-label="Unread" />
                                )}
                              </div>
                              <p className="mt-2 text-lg text-neutral-500 truncate">{subtitle}</p>
                              <div className="mt-3 flex items-center gap-4">
                                <Badge className={`rounded-full px-4 py-1 text-base font-medium ${status.badgeClass}`}>
                                  {status.label}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="border-t border-neutral-200" />

                    {/* Actions + preview + details (match screenshot layout) */}
                    <div className="px-4 sm:px-6 py-10">
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
                        {/* Left column: actions then preview */}
                        <div>
                          <div className="flex items-center justify-between sm:justify-start sm:gap-24 max-w-2xl">
                            <button
                              type="button"
                              onClick={() => {
                                console.log("[MailDetail] View", selectedMailDetail.id);
                                setSelectedMailForPDF(selectedMailDetail);
                                setShowPDFModal(true);
                              }}
                              className="flex flex-col items-center gap-2 text-neutral-700 hover:text-neutral-900 transition-colors"
                            >
                              <Eye className="h-6 w-6" />
                              <span className="text-sm font-medium">View</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                console.log("[MailDetail] Download", selectedMailDetail.id);
                                onDownload(selectedMailDetail);
                              }}
                              className="flex flex-col items-center gap-2 text-neutral-700 hover:text-neutral-900 transition-colors"
                            >
                              <Download className="h-6 w-6" />
                              <span className="text-sm font-medium">Download</span>
                            </button>

                            <div className="relative flex flex-col items-center">
                              <button
                                type="button"
                                onClick={() => {
                                  console.log("[MailDetail] Forward", selectedMailDetail.id);
                                  handleRequestForwarding(selectedMailDetail);
                                }}
                                className="flex flex-col items-center gap-2 text-neutral-700 hover:text-neutral-900 transition-colors"
                              >
                                <Truck className="h-6 w-6" />
                                <span className="text-sm font-medium">Forward</span>
                              </button>

                              {forwardInlineNotice && (
                                <div
                                  role="alert"
                                  className="absolute top-full mt-3 z-20 w-[min(420px,90vw)] rounded-xl border border-neutral-200 bg-white shadow-lg p-4"
                                  style={{ left: "50%", transform: "translateX(-50%)" }}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-sm font-semibold text-neutral-900">Cannot Forward Mail</div>
                                    <button
                                      type="button"
                                      onClick={() => setForwardInlineNotice(null)}
                                      className="shrink-0 rounded-md p-1 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
                                      aria-label="Dismiss"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                  <div className="mt-2 text-sm text-neutral-600 leading-relaxed">
                                    {forwardInlineNotice}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              console.log("[MailDetail] Preview click -> View", selectedMailDetail.id);
                              setSelectedMailForPDF(selectedMailDetail);
                              setShowPDFModal(true);
                            }}
                            className="mt-12 rounded-2xl bg-neutral-100 hover:bg-neutral-200/70 transition-colors min-h-[420px] flex items-center justify-center w-full overflow-hidden relative"
                          >
                            {/* Mini viewer (real PDF preview) */}
                            {miniViewerLoading ? (
                              <div className="text-center px-6">
                                <div className="mx-auto h-10 w-10 rounded-full border-2 border-neutral-300 border-t-neutral-700 animate-spin" />
                                <div className="mt-4 text-base font-medium text-neutral-800">Loading preview…</div>
                                <div className="mt-2 text-sm text-neutral-500">Fetching your scanned document</div>
                              </div>
                            ) : miniViewerUrl ? (
                              <>
                                <object
                                  data={miniViewerUrl}
                                  type="application/pdf"
                                  className="absolute inset-0 w-full h-full pointer-events-none"
                                >
                                  <iframe
                                    title="Mini PDF preview"
                                    src={miniViewerUrl}
                                    className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                                  />
                                </object>
                                {/* soft overlay so it still looks like a preview tile */}
                                <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-white/25 pointer-events-none" />
                                <div className="absolute bottom-6 left-0 right-0 text-center px-6 pointer-events-none">
                                  <div className="text-base font-medium text-neutral-800">Document preview</div>
                                  <div className="mt-1 text-sm text-neutral-500">Tap “View” to open full document</div>
                                </div>
                              </>
                            ) : (
                              <div className="text-center px-6">
                                <FileText className="h-10 w-10 mx-auto text-neutral-500" />
                                <div className="mt-4 text-base font-medium text-neutral-800">Document preview</div>
                                <div className="mt-2 text-sm text-neutral-500">
                                  {miniViewerError ? "Preview unavailable — tap “View” to open full document" : "Tap “View” to open full document"}
                                </div>
                              </div>
                            )}
                          </button>
                        </div>

                        {/* Right column: details */}
                        <div>
                          <div className="text-base font-medium text-neutral-900">Details</div>
                          <div className="mt-4 space-y-4">
                            {(() => {
                              const status = mailStatusMeta(selectedMailDetail);
                              const received = formatTime(selectedMailDetail.received_date || selectedMailDetail.created_at);
                              const rows: Array<{ label: string; value: React.ReactNode }> = [
                                { label: "From", value: selectedMailDetail.sender_name || "—" },
                                { label: "Subject", value: selectedMailDetail.subject || "—" },
                                {
                                  label: "Status",
                                  value: (
                                    <Badge className={`rounded-full px-4 py-1 text-sm font-medium ${status.badgeClass}`}>
                                      {status.label}
                                    </Badge>
                                  ),
                                },
                              ];

                              return rows.map((r) => (
                                <div key={r.label} className="flex items-start justify-between gap-6">
                                  <div className="text-base text-neutral-500">{r.label}:</div>
                                  <div className="text-base font-medium text-neutral-900 text-right break-words max-w-[70%]">
                                    {r.value}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>

                    {/* Select All - Desktop */}
                    <div className="hidden sm:block px-6 py-3 border-b bg-muted/30">
                      <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                        disabled={mailItems.length === 0}
                      >
                        {isAllSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                        {isAllSelected ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    {/* Select All - Mobile */}
                    <div className="sm:hidden px-4 py-3 border-b bg-muted/30">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectAll}
                        className="w-full"
                        disabled={mailItems.length === 0}
                      >
                        {isAllSelected ? (
                          <>
                            <CheckSquare className="h-4 w-4 mr-2 text-primary" />
                            Deselect All ({mailItems.length})
                          </>
                        ) : (
                          <>
                            <Square className="h-4 w-4 mr-2" />
                            Select All ({mailItems.length})
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Error State */}
                    {mailError ? (
                      <div className="px-6 py-12 text-center">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
                        <h3 className="font-medium mb-2">Failed to load mail</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {mailError.message}
                        </p>
                        <Button onClick={() => refreshMail()}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Try Again
                        </Button>
                      </div>
                    ) : mailItems.length === 0 ? (
                      /* Empty State */
                      <div className="px-6 py-12 text-center">
                        <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="font-medium mb-2">No mail yet</h3>
                        <p className="text-sm text-muted-foreground">
                          Your mail will appear here when it arrives at your virtual address
                        </p>
                      </div>
                    ) : (
                      <MailManagement
                        mailItems={mailItems}
                        onRefresh={refreshMail}
                        onOpen={onOpen}
                        onDownload={onDownload}
                        onForward={handleRequestForwarding}
                        formatScannedDate={formatScannedDate}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Mobile: Certificate CTA (replaces sidebar content) */}
            <Card className="md:hidden order-3 border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-neutral-900">Your Business Address</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {/* Company + address */}
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-neutral-900">
                    {(userProfile as any)?.company_name || "Your Company"}
                  </div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {businessAddressLine1}
                  </div>
                  <div className="text-xs text-neutral-500">{businessAddressLine2}</div>
                  <div className="text-xs text-neutral-500">
                    {businessAddressLine3}
                  </div>
                  <div className="text-xs text-neutral-500">{businessAddressLine4}</div>
                </div>

                {/* Primary action */}
                <div className="space-y-2">
                  {/* Letter of Certification: single action (generate if needed, then download) */}
                  <Button
                    type="button"
                    className="w-full"
                    onClick={handleDownloadCertification}
                    disabled={!canUseAddress || isCertBusy}
                  >
                    {isCertBusy ? "Preparing your letter…" : "Download Letter of Certification (PDF)"}
                  </Button>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Use this letter for banks, payment providers, and professional contacts.
                  </p>
                </div>

                {/* Locked state message */}
                {!canUseAddress && (
                  <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
                    Available once identity verification (KYC) is complete.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bulk Actions Notice - Mobile */}
            {isSomeSelected && (
              <Card className="sm:hidden border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      <span className="font-medium">{selectedMail.length} items selected</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedMail([])}>
                      Clear
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Button size="md" variant="ghost" className="w-full h-10">
                      <Download className="h-4 w-4 mr-2" />
                      Download Selected ({selectedMail.length})
                    </Button>
                    <Button size="md" variant="primary" className="w-full h-10" onClick={() => handleRequestForwarding()}>
                      <Truck className="h-4 w-4 mr-2" />
                      Request Forwarding
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Right Column - Virtual Address Sidebar (desktop only) */}
          <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
            <Card className="border-neutral-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="text-[11px] font-semibold text-neutral-500 tracking-wider">
                  ADDRESSES
                </div>
                <CardTitle className="text-xl font-semibold text-neutral-900">
                  Your Business Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Company + address */}
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-neutral-900">
                    {(userProfile as any)?.company_name || "Your Company"}
                  </div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {businessAddressLine1}
                  </div>
                  <div className="text-xs text-neutral-500">{businessAddressLine2}</div>
                  <div className="text-xs text-neutral-500">
                    {businessAddressLine3}
                  </div>
                  <div className="text-xs text-neutral-500">{businessAddressLine4}</div>
                </div>

                {/* Primary action */}
                <div className="space-y-2">
                  {/* Letter of Certification: single action (generate if needed, then download) */}
                  <Button
                    type="button"
                    className="w-full"
                    onClick={handleDownloadCertification}
                    disabled={!canUseAddress || isCertBusy}
                  >
                    {isCertBusy ? "Preparing your letter…" : "Download Letter of Certification (PDF)"}
                  </Button>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Use this letter for banks, payment providers, and professional contacts.
                  </p>
                </div>

                {/* Locked state message */}
                {!canUseAddress && (
                  <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
                    Available once identity verification (KYC) is complete.
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>

        </div>
      </main>

      {/* Help Text (bottom of dashboard) */}
      <div className="safe-pad mx-auto max-w-screen-xl pb-10">
        <div className="text-center py-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            Need help? Visit our{" "}
            <button onClick={() => window.open('/help', '_blank', 'noopener,noreferrer')} className="text-primary hover:underline">Help Center</button>
            {" "}or{" "}
            <button onClick={() => onNavigate('dashboard-support')} className="text-primary hover:underline">Contact Support</button>.
          </p>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={showPDFModal}
        onClose={() => setShowPDFModal(false)}
        mailItemId={selectedMailForPDF?.id ? Number(selectedMailForPDF.id) : null}
        mailItemSubject={selectedMailForPDF?.subject || 'Mail Preview'}
        useBlobFallback
      />

      {/* Forwarding Confirmation Modal */}
      {showForwardingConfirmation && selectedMailForForwarding && (
        <ForwardingConfirmationModal
          isOpen={showForwardingConfirmation}
          onClose={() => {
            setShowForwardingConfirmation(false);
            setSelectedMailForForwarding(null);
          }}
          mailItem={selectedMailForForwarding}
          userProfile={userProfile}
          onConfirm={handleForwardingConfirm}
        />
      )}

    </div>
  );
}
