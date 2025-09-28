'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Shield,
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCcw,
  Building,
  FileText,
  User
} from 'lucide-react';

interface KYCDashboardProps {
  onNavigate?: (page: string) => void;
}

interface BusinessInfo {
  business_name: string;
  trading_name?: string;
  companies_house_number?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postcode: string;
  phone: string;
  email: string;
}

export function KYCDashboard({ onNavigate }: KYCDashboardProps) {
  const [kycStatus, setKycStatus] = useState<any>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    business_name: '',
    trading_name: '',
    companies_house_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postcode: '',
    phone: '',
    email: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load KYC data
  useEffect(() => {
    const loadKycData = async () => {
      try {
        setLoading(true);
        setError(null);

        const kycResponse = await apiClient.getKycStatus();

        if (kycResponse.ok) {
          setKycStatus(kycResponse.data);
        }

      } catch (err) {
        console.error('Failed to load KYC data:', err);
        setError('Failed to load KYC information');
      } finally {
        setLoading(false);
      }
    };

    loadKycData();
  }, []);

  const handleBusinessInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const response = await apiClient.submitBusinessInfo(businessInfo as unknown as Record<string, unknown>);

      if (response.ok) {
        setSuccess('Business information submitted successfully!');
      } else {
        setError(response.message || 'Failed to submit business information');
      }
    } catch (err) {
      console.error('Failed to submit business info:', err);
      setError('Failed to submit business information');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKycStart = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await apiClient.startKyc();

      if (response.ok) {
        // Redirect to KYC provider or show instructions
        setSuccess('KYC process started. Please follow the instructions to complete verification.');
      } else {
        setError('Failed to start KYC process');
      }
    } catch (err) {
      console.error('Failed to start KYC:', err);
      setError('Failed to start KYC process');
    } finally {
      setSubmitting(false);
    }
  };

  const getKycStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Verified
        </Badge>;
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Rejected
        </Badge>;
      default:
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Not Started
        </Badge>;
    }
  };

  if (loading && !kycStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCcw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading KYC information...</p>
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
              <h1 className="text-2xl font-bold">KYC & Onboarding</h1>
              <p className="text-muted-foreground">
                Complete your verification to access all services
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* KYC Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Identity Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">KYC Status</h3>
                <p className="text-sm text-muted-foreground">
                  Complete identity verification to access all features
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getKycStatusBadge(kycStatus?.status || 'not_started')}
              </div>
            </div>

            {kycStatus?.status !== 'verified' && (
              <Button
                onClick={handleKycStart}
                disabled={submitting}
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                {kycStatus?.status === 'pending' ? 'Continue Verification' : 'Start Verification'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBusinessInfoSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_name">Business Name *</Label>
                  <Input
                    id="business_name"
                    value={businessInfo.business_name}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, business_name: e.target.value }))}
                    placeholder="Your Company Ltd"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="trading_name">Trading Name</Label>
                  <Input
                    id="trading_name"
                    value={businessInfo.trading_name}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, trading_name: e.target.value }))}
                    placeholder="Trading Name (if different)"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="companies_house_number">Companies House Number</Label>
                <Input
                  id="companies_house_number"
                  value={businessInfo.companies_house_number}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, companies_house_number: e.target.value }))}
                  placeholder="12345678"
                />
              </div>

              <div>
                <Label htmlFor="address_line1">Address Line 1 *</Label>
                <Input
                  id="address_line1"
                  value={businessInfo.address_line1}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, address_line1: e.target.value }))}
                  placeholder="123 Business Street"
                  required
                />
              </div>

              <div>
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  value={businessInfo.address_line2}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, address_line2: e.target.value }))}
                  placeholder="Suite 100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={businessInfo.city}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="London"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="postcode">Postcode *</Label>
                  <Input
                    id="postcode"
                    value={businessInfo.postcode}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, postcode: e.target.value }))}
                    placeholder="SW1A 1AA"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={businessInfo.phone}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+44 20 1234 5678"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={businessInfo.email}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@company.com"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {submitting ? 'Submitting...' : 'Submit Business Information'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Verification Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Identity Document</h4>
                  <p className="text-sm text-muted-foreground">
                    Valid passport, driving licence, or national ID card
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Proof of Address</h4>
                  <p className="text-sm text-muted-foreground">
                    Utility bill, bank statement, or council tax bill (less than 3 months old)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Business Registration</h4>
                  <p className="text-sm text-muted-foreground">
                    Companies House certificate or business registration document
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Source of Funds</h4>
                  <p className="text-sm text-muted-foreground">
                    Bank statements or financial documents showing legitimate business income
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
