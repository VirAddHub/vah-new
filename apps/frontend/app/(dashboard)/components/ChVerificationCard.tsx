'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, Upload, AlertCircle, Loader2, Clock, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { API_BASE } from '@/lib/config';

type Feedback = { type: 'success' | 'error'; message: string } | null;

export function ChVerificationCard() {
  const { data, error, mutate } = useSWR('/api/bff/ch-verification', swrFetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds to catch admin approvals
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [wasVerified, setWasVerified] = useState(false);

  const status = data?.data;
  const isLoading = !data && !error;
  const isVerified = status?.companies_house_verified === true;
  const statusCode = status?.ch_verification_status || (isVerified ? 'approved' : 'not_submitted');
  const submittedAt = formatDate(status?.ch_verification_submitted_at);
  const reviewedAt = formatDate(status?.ch_verification_reviewed_at);
  const adminNotes = status?.ch_verification_notes || null;
  const proofUrl = status?.ch_verification_proof_url || null;
  const resolvedProofUrl = proofUrl
    ? proofUrl.startsWith('http')
      ? proofUrl
      : `${API_BASE.replace(/\/$/, '')}${proofUrl}`
    : null;
  const proxyProofUrl = resolvedProofUrl
    ? `/api/bff/ch-verification/proof?url=${encodeURIComponent(resolvedProofUrl)}`
    : proofUrl
      ? `/api/bff/ch-verification/proof?path=${encodeURIComponent(proofUrl)}`
      : null;
  const isPendingReview = statusCode === 'submitted';
  const isRejected = statusCode === 'rejected';

  // Track when verification status changes to approved and trigger profile refresh
  useEffect(() => {
    if ((isVerified || statusCode === 'approved') && !wasVerified) {
      setWasVerified(true);
      setFeedback(null);
      // Dispatch custom event to trigger user profile refresh
      window.dispatchEvent(new CustomEvent('ch-verification-approved'));
      // Also trigger a page refresh of user data
      if (typeof window !== 'undefined' && window.location) {
        // Trigger a soft refresh of user profile data
        const event = new Event('refresh-user-profile');
        window.dispatchEvent(event);
      }
    } else if (!isVerified && statusCode !== 'approved') {
      setWasVerified(false);
    }
  }, [isVerified, statusCode, wasVerified]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image (JPG, PNG, GIF, WEBP) or PDF file.',
          variant: 'destructive',
        });
        return;
      }
      // Validate file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload a file smaller than 10MB.',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/bff/ch-verification', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.message || json.error || 'Upload failed');
      }

      toast({
        title: 'Verification proof uploaded',
        description: 'Thanks! Our team will review your submission shortly.',
      });
      setFeedback({
        type: 'success',
        message: 'Proof uploaded successfully. We’ll review it shortly.',
      });

      // Refetch status
      mutate();
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('ch-verification-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      const description = err.message || 'Failed to upload verification proof. Please try again.';
      toast({
        title: 'Upload failed',
        description,
        variant: 'destructive',
      });
      setFeedback({
        type: 'error',
        message: description,
      });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            Companies House identity verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Checking your Companies House status…</p>
        </CardContent>
      </Card>
    );
  }

  if (isVerified || statusCode === 'approved') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Companies House identity verification</span>
            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Your Companies House identity verification has been confirmed.
          </p>
          <p className="text-sm text-muted-foreground">
            You can now safely use your VirtualAddressHub address for your Registered Office and Director's Service Address.
          </p>
          {proxyProofUrl && (
            <div className="pt-2">
              <a
                href={proxyProofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View submitted proof →
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>Companies House identity verification</span>
          <Badge variant="outline" className="text-xs">
            {statusLabel(statusCode)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedback && (
          <Alert variant={feedback.type === 'error' ? 'destructive' : 'default'}>
            {feedback.type === 'error' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
            <AlertTitle>{feedback.type === 'error' ? 'Upload failed' : 'Upload received'}</AlertTitle>
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        )}
        {renderStatusAlert({ statusCode, submittedAt, reviewedAt, adminNotes })}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Companies House now requires identity verification for all directors and Persons With Significant Control (PSCs) before a Registered Office address can be used.
          </p>
          <p className="text-sm text-muted-foreground">
            Please complete the identity check via GOV.UK / Companies House, then upload a quick screenshot or confirmation below. Uploading another file will replace your previous submission.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="ch-verification-file" className="block text-sm font-medium mb-2">
              Upload verification proof
            </label>
            <input
              id="ch-verification-file"
              type="file"
              name="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              disabled={uploading}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Accepted: Images (JPG, PNG, GIF, WEBP) or PDF. Max 10MB.
            </p>
          </div>

          <Button type="submit" disabled={!file || uploading} className="w-full">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload verification proof
              </>
            )}
          </Button>
        </form>

        {proxyProofUrl && (
          <div className="text-sm">
            <a
              href={proxyProofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View latest upload →
            </a>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="text-sm text-destructive">
              <p className="font-medium">Failed to load verification status</p>
              <p className="text-xs mt-1">Please refresh the page or contact support if this persists.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(value?: string | number | null) {
  if (!value) return null;
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(code: string) {
  switch (code) {
    case 'submitted':
      return 'Awaiting review';
    case 'rejected':
      return 'Action required';
    case 'approved':
      return 'Verified';
    default:
      return 'Not submitted';
  }
}

function renderStatusAlert({
  statusCode,
  submittedAt,
  reviewedAt,
  adminNotes,
}: {
  statusCode: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  adminNotes: string | null;
}) {
  if (statusCode === 'submitted') {
    return (
      <Alert className="border-amber-200 bg-amber-50 text-amber-900">
        <Clock className="h-4 w-4" />
        <AlertTitle>Proof received</AlertTitle>
        <AlertDescription>
          We received your Companies House verification proof {submittedAt ? `on ${submittedAt}` : 'and it is waiting in the review queue'}. We&apos;ll double-check
          it and email you once it&apos;s approved.
        </AlertDescription>
      </Alert>
    );
  }

  if (statusCode === 'rejected') {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Needs attention</AlertTitle>
        <AlertDescription className="space-y-1">
          <p>Your previous upload was rejected {reviewedAt ? `on ${reviewedAt}` : ''}. Please upload a clearer confirmation.</p>
          {adminNotes && <p className="text-sm font-medium">Reason: {adminNotes}</p>}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

