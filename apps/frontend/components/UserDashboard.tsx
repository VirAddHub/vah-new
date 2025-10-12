"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import useSWR from 'swr';
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
import { VAHLogo } from "./VAHLogo";
import { useToast } from "./ui/use-toast";

interface UserDashboardProps {
  onLogout: () => void;
  onNavigate: (page: string, data?: any) => void;
  onGoBack?: () => void;
}

// API configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';

// Token helper
const getToken = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('vah_jwt') || '';
};

// SWR fetcher function
const fetcher = (url: string) => {
  const token = getToken();
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(`${API_BASE}${url}`, {
    headers,
    credentials: 'include'
  }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
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
  file_url?: string;
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

  // SWR hook for mail items with 15s polling
  const { data: mailData, error: mailError, isLoading: mailLoading, mutate: refreshMail } = useSWR(
    '/api/mail-items',
    fetcher,
    {
      refreshInterval: 15000, // Poll every 15 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000
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
    return !isGDPRExpired(item) && item.status === 'received';
  }, []);

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
      const response = await fetch('/api/forwarding/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          mail_item_id: selectedMailForForwarding.id,
          payment_method: paymentMethod,
          // Use the forwarding address from user profile
          forwarding_address: userProfile?.forwarding_address
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
        throw new Error('Failed to create forwarding request');
      }
    } catch (error) {
      console.error('Error creating forwarding request:', error);
      toast({
        title: "Forwarding Request Error",
        description: "Error creating forwarding request. Please try again.",
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
    line1: "71-75 Shelton Street",
    line2: "Covent Garden",
    city: "London",
    postcode: "WC2H 9JQ",
    country: "United Kingdom"
  };

  const handleRequestForwarding = (mailItem?: MailItem) => {
    // If a specific mail item is provided, use it directly
    if (mailItem) {
      if (!canForward(mailItem)) {
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
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">

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
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <CardTitle>Mail Inbox</CardTitle>
                      <Badge variant="secondary">{totalItems} items</Badge>
                      {mailLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                    </div>
                    <p className="text-sm text-muted-foreground hidden sm:block">
                      Click on any mail item to view full details and scans
                    </p>
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
                      <Button size="sm" variant="default" onClick={() => handleRequestForwarding()}>
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
                  <>
                    {/* Mail Items List - Desktop */}
                    <div className="hidden sm:block">
                      <div className="divide-y">
                        {mailItems.map((item: MailItem) => {
                          const isSelected = selectedMail.includes(String(item.id));
                          const isGovernment = item.tag === "HMRC" || item.tag === "COMPANIES HOUSE";

                          return (
                            <div
                              key={item.id}
                              className={`px-6 py-4 transition-all hover:bg-muted/50 ${isSelected ? "bg-primary/5 hover:bg-primary/10" : ""
                                }`}
                            >
                              <div className="flex items-start gap-4">
                                {/* Checkbox */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectMail(String(item.id));
                                  }}
                                  className="mt-1 flex-shrink-0"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="h-5 w-5 text-primary" />
                                  ) : (
                                    <Square className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                                  )}
                                </button>

                                {/* Mail Info - Clickable */}
                                <div
                                  className="flex-1 min-w-0 space-y-2 cursor-pointer group"
                                  onClick={() => onOpen(item)}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-medium truncate group-hover:text-primary transition-colors">
                                          {item.tag || 'Inbox Item'}
                                        </h4>
                                        {!item.is_read && (
                                          <Badge variant="default" className="text-xs">New</Badge>
                                        )}
                                        {isGovernment && (
                                          <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                                            Free Forwarding
                                          </Badge>
                                        )}
                                        <div className="hidden group-hover:flex items-center gap-1 text-xs text-primary ml-2">
                                          <FileCheck className="h-3 w-3" />
                                          <span className="font-medium">Open</span>
                                        </div>
                                      </div>
                                      <p className="text-sm text-muted-foreground truncate group-hover:text-foreground transition-colors">
                                        From: {item.tag || 'Unknown Sender'}
                                      </p>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                      <p className="text-sm text-muted-foreground">
                                        {item.received_date ? new Date(item.received_date).toLocaleDateString('en-GB', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric'
                                        }) : 'Unknown Date'}
                                      </p>
                                      {item.tag && (
                                        <Badge variant="secondary" className="mt-1 text-xs">
                                          {item.tag}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    <Button size="sm" variant="outline" onClick={() => onOpen(item)}>
                                      <FileCheck className="h-3 w-3 mr-1" />
                                      Open
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => onDownload(item)}>
                                      <Download className="h-3 w-3 mr-1" />
                                      Download
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 h-9"
                                      onClick={() => handleRequestForwarding(item)}
                                      disabled={!canForward(item)}
                                      title={isGDPRExpired(item) ? "Cannot forward: GDPR expired (30+ days old)" : !canForward(item) ? "Cannot forward at this time" : ""}
                                    >
                                      <Truck className="h-3 w-3 mr-1" />
                                      {isGDPRExpired(item) ? "GDPR Expired" : "Forward"}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mail Items List - Mobile */}
                    <div className="sm:hidden divide-y">
                      {mailItems.map((item: MailItem) => {
                        const isSelected = selectedMail.includes(String(item.id));
                        const isGovernment = item.tag === "HMRC" || item.tag === "COMPANIES HOUSE";

                        return (
                          <div
                            key={item.id}
                            className={`p-4 ${isSelected ? "bg-primary/5" : ""}`}
                          >
                            <div className="space-y-3">
                              {/* Header with checkbox */}
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectMail(String(item.id));
                                  }}
                                  className="mt-1 flex-shrink-0"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="h-5 w-5 text-primary" />
                                  ) : (
                                    <Square className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </button>

                                <div
                                  className="flex-1 min-w-0 cursor-pointer active:opacity-70 transition-opacity"
                                  onClick={() => onOpen(item)}
                                >
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium break-words mb-1">
                                        {item.tag || 'Inbox Item'}
                                      </h4>
                                      <p className="text-sm text-muted-foreground break-words">
                                        Received: {item.received_date ? new Date(item.received_date).toLocaleDateString('en-GB', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric'
                                        }) : 'Unknown Date'}
                                      </p>
                                    </div>
                                    {!item.is_read && (
                                      <Badge variant="default" className="text-xs flex-shrink-0">
                                        New
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Badges */}
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {item.tag && (
                                      <Badge variant="secondary" className="text-xs">
                                        {item.tag}
                                      </Badge>
                                    )}
                                    {isGovernment && (
                                      <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                                        Free Forwarding
                                      </Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                      {item.received_date ? new Date(item.received_date).toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                      }) : 'Unknown Date'}
                                    </span>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => onOpen(item)}>
                                      <Eye className="h-3 w-3 mr-1" />
                                      Open
                                    </Button>
                                    <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => onDownload(item)}>
                                      <Download className="h-3 w-3 mr-1" />
                                      Download
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 h-9"
                                      onClick={() => handleRequestForwarding(item)}
                                      disabled={!canForward(item)}
                                      title={isGDPRExpired(item) ? "Cannot forward: GDPR expired (30+ days old)" : !canForward(item) ? "Cannot forward at this time" : ""}
                                    >
                                      <Truck className="h-3 w-3 mr-1" />
                                      {isGDPRExpired(item) ? "GDPR Expired" : "Forward"}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
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
                    <Button size="default" variant="outline" className="w-full h-10">
                      <Download className="h-4 w-4 mr-2" />
                      Download Selected ({selectedMail.length})
                    </Button>
                    <Button size="default" variant="default" className="w-full h-10" onClick={() => handleRequestForwarding()}>
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
            <Card className="border-0">
              <CardHeader className="pb-3 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm truncate">Your Virtual Business Address</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-3">
                {/* Address Display */}
                <div className="bg-muted/50 rounded-lg p-2.5 space-y-0.5">
                  <p className="text-xs font-medium">{virtualAddress.line1}</p>
                  <p className="text-xs font-medium">{virtualAddress.line2}</p>
                  <p className="text-xs font-medium">{virtualAddress.city}</p>
                  <p className="text-xs font-medium">{virtualAddress.postcode}</p>
                  <p className="text-xs font-medium">{virtualAddress.country}</p>
                </div>

                {/* Generate Certificate Button */}
                <div className="space-y-1.5">
                  <Button className="w-full" size="sm" onClick={onGenerateCertificate} disabled={certLoading}>
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
              </CardContent>
            </Card>
          </aside>

        </div>
      </main>

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={showPDFModal}
        onClose={() => setShowPDFModal(false)}
        mailItemId={selectedMailForPDF ? parseInt(String(selectedMailForPDF.id)) : null}
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