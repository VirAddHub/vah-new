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
  HelpCircle,
  Plus,
  Filter,
  Search
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
  received_at?: string;
  status?: string;
  tag?: string;
  is_read?: boolean;
  created_at?: string;
  file_url?: string;
  gdpr_expired?: boolean;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // SWR hook for mail items with optimized polling
  const { data: mailData, error: mailError, isLoading: mailLoading, mutate: refreshMail } = useSWR(
    '/api/mail-items',
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
      errorRetryInterval: 10000,
    }
  );

  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const token = getToken();
        if (!token) {
          onLogout();
          return;
        }

        const response = await fetch(`${API_BASE}/api/auth/whoami`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          credentials: 'include'
        });

        if (response.ok) {
          const profile = await response.json();
          setUserProfile(profile.data);
        } else {
          onLogout();
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        onLogout();
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [onLogout]);

  // Filter and search mail items
  const filteredMailItems = useMemo(() => {
    if (!mailData?.data) return [];
    
    let filtered = mailData.data;
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter((item: MailItem) => {
        if (filterStatus === 'unread') return !item.is_read;
        if (filterStatus === 'read') return item.is_read;
        if (filterStatus === 'forwarded') return item.status === 'forwarded';
        return true;
      });
    }
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((item: MailItem) => 
        item.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sender_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [mailData?.data, filterStatus, searchTerm]);

  // Handle mail selection
  const handleMailSelect = useCallback((mailId: string | number) => {
    setSelectedMail(prev => 
      prev.includes(mailId.toString()) 
        ? prev.filter(id => id !== mailId.toString())
        : [...prev, mailId.toString()]
    );
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedMail.length === filteredMailItems.length) {
      setSelectedMail([]);
    } else {
      setSelectedMail(filteredMailItems.map((item: MailItem) => item.id.toString()));
    }
  }, [selectedMail.length, filteredMailItems]);

  // Handle PDF viewing
  const handleViewPDF = useCallback((mailItem: MailItem) => {
    setSelectedMailForPDF(mailItem);
    setShowPDFModal(true);
  }, []);

  // Handle forwarding
  const handleForwardMail = useCallback((mailItem: MailItem) => {
    setSelectedMailForForwarding(mailItem);
    setShowForwardingConfirmation(true);
  }, []);

  // Handle download certificate
  const handleDownloadCertificate = useCallback(async () => {
    setCertLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/api/certificate`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vah-certificate.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({
          title: "Certificate Downloaded",
          description: "Your business address certificate has been downloaded successfully.",
        });
      } else {
        throw new Error('Failed to download certificate');
      }
    } catch (error) {
      console.error('Certificate download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download certificate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCertLoading(false);
    }
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container-modern py-12">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container-modern py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onGoBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onGoBack}
                  className="btn-outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <VAHLogo href="/" size="sm" showText={true} />
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('help')}
                className="btn-outline"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="btn-outline"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container-modern py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, <span className="text-gradient">{userProfile?.first_name || 'User'}</span>
          </h1>
          <p className="text-muted-foreground">
            Manage your London business address and mail forwarding services.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card className="card-modern">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-hover rounded-xl flex items-center justify-center">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredMailItems.length}</p>
                  <p className="text-sm text-muted-foreground">Total Mail Items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-secondary to-secondary/90 rounded-xl flex items-center justify-center">
                  <Eye className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {filteredMailItems.filter((item: MailItem) => !item.is_read).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Unread Items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {filteredMailItems.filter((item: MailItem) => item.status === 'forwarded').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Forwarded Items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-secondary to-primary rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">Active</p>
                  <p className="text-sm text-muted-foreground">Service Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={handleDownloadCertificate}
              disabled={certLoading}
              className="btn-primary"
            >
              {certLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Download Certificate
                </>
              )}
            </Button>
            
            <Button
              onClick={() => refreshMail()}
              disabled={mailLoading}
              variant="outline"
              className="btn-outline"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${mailLoading ? 'animate-spin' : ''}`} />
              Refresh Mail
            </Button>
          </div>
        </div>

        {/* Mail Management */}
        <Card className="card-modern">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Mail Management</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="btn-outline"
                >
                  {selectedMail.length === filteredMailItems.length ? (
                    <CheckSquare className="h-4 w-4 mr-2" />
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  Select All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search mail items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
              >
                <option value="all">All Items</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="forwarded">Forwarded</option>
              </select>
            </div>

            {/* Mail Items List */}
            <div className="space-y-4">
              {mailLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-muted-foreground">Loading mail items...</p>
                </div>
              ) : mailError ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load mail items. Please try again.
                  </AlertDescription>
                </Alert>
              ) : filteredMailItems.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No mail items found.</p>
                </div>
              ) : (
                filteredMailItems.map((item: MailItem) => (
                  <div
                    key={item.id}
                    className={`p-4 border border-border rounded-xl transition-all duration-200 hover:shadow-md ${
                      selectedMail.includes(item.id.toString()) ? 'bg-primary/5 border-primary/50' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleMailSelect(item.id)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        {selectedMail.includes(item.id.toString()) ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-medium truncate ${!item.is_read ? 'font-semibold' : ''}`}>
                            {item.subject || 'No Subject'}
                          </h3>
                          {!item.is_read && (
                            <Badge variant="secondary" className="bg-primary/20 text-primary">
                              New
                            </Badge>
                          )}
                          {item.status === 'forwarded' && (
                            <Badge variant="secondary" className="bg-secondary/20 text-secondary">
                              Forwarded
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          From: {item.sender_name || 'Unknown Sender'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.received_date || item.received_at || item.created_at}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPDF(item)}
                          className="btn-outline"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleForwardMail(item)}
                          className="btn-outline"
                        >
                          <Truck className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {showPDFModal && selectedMailForPDF && (
        <PDFViewerModal
          mailItemId={selectedMailForPDF.id.toString()}
          onClose={() => {
            setShowPDFModal(false);
            setSelectedMailForPDF(null);
          }}
        />
      )}

      {showForwardingConfirmation && selectedMailForForwarding && (
        <ForwardingConfirmationModal
          mailItem={selectedMailForForwarding}
          onClose={() => {
            setShowForwardingConfirmation(false);
            setSelectedMailForForwarding(null);
          }}
          onConfirm={async () => {
            setShowForwardingConfirmation(false);
            setSelectedMailForForwarding(null);
            refreshMail();
          }}
        />
      )}
    </div>
  );
}