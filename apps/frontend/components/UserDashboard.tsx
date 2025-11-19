"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import useSWR from 'swr';
import { getToken } from '@/lib/token-manager';
import {
  Building2,
  FileCheck,
  Download,
  Truck,
  CheckSquare,
  Square,
  Mail,
  AlertCircle,
  Eye,
  Calendar,
  ArrowLeft,
  RefreshCw,
  LogOut,
  Settings,
  User,
  Bell,
  CreditCard,
  HelpCircle
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

interface UserDashboardProps {
  onLogout: () => void;
  onNavigate: (page: string, data?: any) => void;
  onGoBack?: () => void;
}

// API configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';

// Token helper is imported from @/lib/token-manager

// SWR fetcher function
const fetcher = (url: string) => {
  const token = getToken();
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(`${API_BASE}${url}`, {
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
}

export function UserDashboard({ onLogout, onNavigate, onGoBack }: UserDashboardProps) {
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMail, setSelectedMail] = useState<string[]>([]);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedMailForPDF, setSelectedMailForPDF] = useState<MailItem | null>(null);
  const [certLoading, setCertLoading] = useState(false);
  const [showForwardingConfirmation, setShowForwardingConfirmation] = useState(false);
  const [selectedMailForForwarding, setSelectedMailForForwarding] = useState<MailItem | null>(null);

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

  // SWR hook for mail items with reduced polling to prevent 429 errors
  // Include archived items by default so the frontend can filter them
  const { data: mailData, error: mailError, isLoading: mailLoading, mutate: refreshMail } = useSWR(
    '/api/mail-items?includeArchived=true',
    fetcher,
    {
      refreshInterval: 120000, // Poll every 2 minutes to prevent 429 errors
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
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

  // Load user profile on mount
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);

        // Try to get user data from localStorage first (from login) for immediate display
        const storedUser = localStorage.getItem('vah_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setUserProfile(user);
        }

        // Fetch fresh user profile from API
        const token = getToken();
        if (token) {
          const response = await fetch(`${API_BASE}/api/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.ok && data.data) {
              setUserProfile(data.data);
              // Update localStorage with fresh data
              localStorage.setItem('vah_user', JSON.stringify(data.data));
            }
          } else {
            console.warn('Failed to fetch user profile, using stored data');
          }
        }

      } catch (error) {
        console.error('Error loading user profile:', error);
        // Continue with stored data if API fails
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, []);

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
      setSelectedMailForPDF(item);
      setShowPDFModal(true);

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

  // Generate certificate handler
  const onGenerateCertificate = useCallback(async () => {
    try {
      if (certLoading) return;
      setCertLoading(true);
      const token = getToken();
      const response = await fetch(`${API_BASE}/api/profile/certificate`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'proof-of-address.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Certificate Generated",
          description: "Your proof of address certificate has been downloaded.",
          durationMs: 3000,
        });
      } else {
        throw new Error('Failed to generate certificate');
      }
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast({
        title: "Certificate Error",
        description: "Failed to generate certificate. Please try again.",
        variant: "destructive",
        durationMs: 5000,
      });
    } finally {
      setCertLoading(false);
    }
  }, [certLoading, toast]);

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
  const isGDPRExpired = useCallback((item: MailItem) => {
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
        const errorMessage = errorData.message || errorData.error || 'Failed to create forwarding request';

        toast({
          title: "Forwarding Request Failed",
          description: errorMessage,
          variant: "destructive",
          durationMs: 5000,
        });
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

  // Mock virtual address (you can replace this with real data)
  const virtualAddress = {
    line1: "54-58 Tanner Street",
    line2: "2nd Floor",
    city: "London",
    postcode: "SE1 3PH",
    country: "United Kingdom"
  };

  // Check if user can use the address (KYC approved + CH verified)
  const kycApproved = userProfile?.kyc_status === "approved";
  const chVerified = userProfile?.companies_house_verified === true;
  const chVerificationStatus = userProfile?.ch_verification_status || (chVerified ? 'approved' : 'not_submitted');
  const canUseAddress = kycApproved && chVerified;

  const handleRequestForwarding = (mailItem?: MailItem) => {
    console.log('[UI] handleRequestForwarding called', { mailItem: mailItem?.id, hasMailItem: !!mailItem });

    // If a specific mail item is provided, use it directly
    if (mailItem) {
      console.log('[UI] Processing specific mail item:', mailItem.id);
      if (!canForward(mailItem)) {
        console.log('[UI] Cannot forward mail item:', mailItem.id, 'GDPR expired:', isGDPRExpired(mailItem));
        toast({
          title: "Cannot Forward Mail",
          description: isGDPRExpired(mailItem)
            ? "This mail item is older than 30 days and cannot be forwarded due to GDPR compliance. You can still download it."
            : "This mail item cannot be forwarded at this time.",
          variant: "destructive",
          durationMs: 5000,
        });
        return;
      }
      console.log('[UI] Setting selected mail for forwarding and showing modal');
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
              <button
                onClick={() => onNavigate('home')}
                className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
              >
                VirtualAddress<span className="text-primary">Hub</span>
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => onNavigate('billing')}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <CreditCard className="h-4 w-4" />
                Billing
              </button>
              <button
                onClick={() => onNavigate('settings')}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <button
                onClick={() => onNavigate('help')}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
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
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="tt-min flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="safe-pad mx-auto max-w-screen-xl py-8">

        {/* Welcome Message */}
        <div className="mb-8">
          <h1 className="mb-2">Welcome back, {getUserName()}</h1>
          <p className="text-muted-foreground">Manage your mail and business address</p>
        </div>

        {/* Two Column Layout: Main content + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

          {/* Left Column - Main Content */}
          <div className="space-y-6">

            {/* Mail Inbox Section */}
            <Card className="border-neutral-200 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold text-neutral-800">
                      Mail Inbox
                    </h2>
                    <p className="text-sm text-neutral-500 mt-1">
                      {totalItems} {totalItems === 1 ? 'item' : 'items'}
                      {mailLoading && <RefreshCw className="h-3 w-3 ml-2 inline animate-spin" />}
                    </p>
                  </div>
                  <p className="text-sm text-neutral-500">
                    Click on any mail item to view full details and scans
                  </p>

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
              </CardContent>
            </Card>

            {/* Free Forwarding Notice */}
            <Alert className="border-primary/30 bg-primary/5">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription>
                <strong className="text-foreground">Free Forwarding:</strong> All mail from HMRC and Companies House is forwarded to you at no extra charge. Select these items and use "Request Forwarding" to process them.
              </AlertDescription>
            </Alert>

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

            {/* Help Text */}
            <div className="text-center py-6 space-y-2">
              <p className="text-sm text-muted-foreground">
                Need help? Visit our <button onClick={() => onNavigate('help')} className="text-primary hover:underline">Help Center</button> or <button onClick={() => onNavigate('dashboard-support')} className="text-primary hover:underline">Contact Support</button>
              </p>
            </div>
          </div>

          {/* Right Column - Virtual Address Sidebar */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Card className="border-neutral-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 rounded-lg">
                    <Building2 className="h-4 w-4 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-medium text-neutral-800 truncate">Your Virtual Business Address</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-3">
                {/* Address Display */}
                {canUseAddress ? (
                  <>
                    <div className="bg-muted/50 rounded-lg p-2.5 space-y-0.5">
                      <p className="text-xs font-medium">{virtualAddress.line1}</p>
                      <p className="text-xs font-medium">{virtualAddress.line2}</p>
                      <p className="text-xs font-medium">{virtualAddress.city}</p>
                      <p className="text-xs font-medium">{virtualAddress.postcode}</p>
                      <p className="text-xs font-medium">{virtualAddress.country}</p>
                    </div>

                    {/* Generate Certificate Button */}
                    <div className="space-y-1.5">
                      <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white" size="sm" onClick={onGenerateCertificate} disabled={certLoading}>
                        {certLoading ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            Generating…
                          </>
                        ) : (
                          <>
                            <FileCheck className="h-3.5 w-3.5 mr-1.5" />
                            Generate Certificate
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center leading-tight">
                        Official proof of address
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Locked State */}
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        We'll show your full VirtualAddressHub address here once your ID checks are approved and your Companies House identity verification is complete for all directors and PSCs.
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Please complete identity verification via GOV.UK / Companies House and upload proof using the Companies House verification card in your dashboard.
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {chVerificationStatus === 'submitted'
                          ? "Thanks! We've received your Companies House proof and will review it shortly."
                          : chVerificationStatus === 'rejected'
                            ? "Your last upload needs attention. Please re-upload a clearer screenshot using the verification card."
                            : "Once you've finished the GOV.UK verification, upload a quick confirmation so we can enable your address."}
                      </p>
                    </div>

                    {/* Disabled Generate Certificate Button */}
                    <div className="space-y-1.5">
                      <Button className="w-full bg-amber-600/50 hover:bg-amber-600/50 text-white cursor-not-allowed" size="sm" disabled>
                        <FileCheck className="h-3.5 w-3.5 mr-1.5" />
                        Generate Certificate
                      </Button>
                      <p className="text-xs text-muted-foreground text-center leading-tight">
                        Address will be available once verification is complete
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </aside>

        </div>
      </main>

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
