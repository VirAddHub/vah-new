'use client';

import { useState, useEffect } from 'react';
import { apiClient, type MailItem, type ForwardingRequest, type User } from '@/lib/api-client';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { 
  Mail, 
  Truck, 
  Plus, 
  Search, 
  Eye, 
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCcw,
  CreditCard,
  Shield
} from 'lucide-react';

interface UserDashboardProps {
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export function UserDashboard({ onNavigate, onLogout }: UserDashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [mailItems, setMailItems] = useState<MailItem[]>([]);
  const [forwardingRequests, setForwardingRequests] = useState<ForwardingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [userResponse, mailResponse, forwardingResponse] = await Promise.all([
          apiClient.whoami(),
          apiClient.getMailItems(),
          apiClient.getForwardingRequests()
        ]);
        
        if (userResponse.ok) {
          setUser(userResponse.data?.user || null);
        }
        
        if (mailResponse.ok) {
          setMailItems(mailResponse.data || []);
        }
        
        if (forwardingResponse.ok) {
          setForwardingRequests(forwardingResponse.data || []);
        }
        
      } catch (err) {
        console.error('Failed to load user data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const [mailResponse, forwardingResponse] = await Promise.all([
        apiClient.getMailItems(),
        apiClient.getForwardingRequests()
      ]);
      
      if (mailResponse.ok) {
        setMailItems(mailResponse.data || []);
      }
      
      if (forwardingResponse.ok) {
        setForwardingRequests(forwardingResponse.data || []);
      }
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForwardingRequest = () => {
    onNavigate?.('forwarding-request');
  };

  const handleViewMailItem = async (itemId: string) => {
    try {
      const response = await apiClient.getMailScanUrl(itemId);
      if (response.ok) {
        window.open(response.data.url, '_blank');
      }
    } catch (err) {
      console.error('Failed to get scan URL:', err);
    }
  };

  const filteredMailItems = mailItems.filter(item =>
    (item.sender_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return <Badge variant="secondary">Received</Badge>;
      case 'scanned':
        return <Badge variant="default">Scanned</Badge>;
      case 'forwarded':
        return <Badge variant="outline">Forwarded</Badge>;
      case 'deleted':
        return <Badge variant="destructive">Deleted</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getForwardingStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>;
      case 'approved':
        return <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Approved
        </Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Rejected
        </Badge>;
      case 'fulfilled':
        return <Badge variant="outline" className="flex items-center gap-1">
          <Truck className="h-3 w-3" />
          Fulfilled
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCcw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.name || user?.email}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => onNavigate?.('billing')}
                className="flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Billing
              </Button>
              <Button
                variant="outline"
                onClick={() => onNavigate?.('kyc')}
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                KYC
              </Button>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Mail</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mailItems.length}</div>
              <p className="text-xs text-muted-foreground">
                {mailItems.filter(item => item.status === 'received').length} new
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Forwarding Requests</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{forwardingRequests.length}</div>
              <p className="text-xs text-muted-foreground">
                {forwardingRequests.filter(req => req.status === 'pending').length} pending
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Status</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <p className="text-xs text-muted-foreground">
                {user?.kyc_status || 'KYC pending'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Mail Items */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Recent Mail
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search mail..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredMailItems.length > 0 ? (
              <div className="space-y-4">
                {filteredMailItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{item.sender_name}</p>
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Received: {new Date(item.received_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewMailItem(item.id)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredMailItems.length > 5 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Showing 5 of {filteredMailItems.length} items
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No mail items found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Forwarding Requests */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Forwarding Requests
              </CardTitle>
              <Button onClick={handleCreateForwardingRequest} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Request
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {forwardingRequests.length > 0 ? (
              <div className="space-y-4">
                {forwardingRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{request.to_name}</p>
                        {getForwardingStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {request.address1}, {request.city}, {request.postal}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {request.tracking && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {request.courier}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {forwardingRequests.length > 5 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Showing 5 of {forwardingRequests.length} requests
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No forwarding requests yet</p>
                <Button 
                  onClick={handleCreateForwardingRequest} 
                  className="mt-4"
                  variant="outline"
                >
                  Create your first request
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
