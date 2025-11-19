"use client";

import { useState } from "react";
import { useAuthedSWR } from "@/lib/useAuthedSWR";
import { apiClient } from "@/lib/apiClient";
import { API_BASE } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Loader2, ShieldCheck, ShieldAlert, RefreshCcw, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Submission = {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  companies_house_verified: boolean;
  ch_verification_status: string;
  ch_verification_proof_url: string | null;
  ch_verification_submitted_at: string | null;
  ch_verification_reviewed_at: string | null;
  ch_verification_notes: string | null;
  reviewer_id: number | null;
  reviewer_email: string | null;
  reviewer_first_name: string | null;
  reviewer_last_name: string | null;
};

const STATUS_OPTIONS = [
  { value: "submitted", label: "Pending review" },
  { value: "rejected", label: "Rejected" },
  { value: "approved", label: "Approved" },
  { value: "all", label: "All statuses" },
] as const;

const STATUS_BADGE: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-900 border border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  rejected: "bg-red-100 text-red-800 border border-red-200",
  default: "bg-slate-100 text-slate-700 border border-slate-200",
};

export default function ChVerificationQueue() {
  const [statusFilter, setStatusFilter] = useState<string>("submitted");
  const [actionUserId, setActionUserId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data, isLoading, error, mutate } = useAuthedSWR<{ items: Submission[]; count: number }>(
    ['/api/admin/ch-verification/submissions', { status: statusFilter }],
    { refreshInterval: 60000 }
  );

  const submissions = data?.items ?? [];

  const handleApprove = async (submission: Submission) => {
    const userId = submission.id;
    const note = window.prompt("Add reviewer note (optional)", "") || undefined;
    try {
      setActionUserId(userId);
      const response = await apiClient.post(`/api/admin/ch-verification/${userId}/approve`, note ? { notes: note } : {});
      if (!response?.ok) {
        throw new Error(response?.error || 'Failed to approve submission');
      }
      toast({
        title: "Verification approved",
        description: `${submission.email} is now Companies House verified.`,
      });
      await mutate();
    } catch (err: any) {
      console.error('Approve submission failed', err);
      toast({
        title: "Approval failed",
        description: err?.message ?? 'Unable to approve submission.',
        variant: "destructive",
      });
    } finally {
      setActionUserId(null);
    }
  };

  const handleReject = async (submission: Submission) => {
    const userId = submission.id;
    const reason = window.prompt("Reason for rejection", "");
    if (!reason) return;
    try {
      setActionUserId(userId);
      const response = await apiClient.post(`/api/admin/ch-verification/${userId}/reject`, { reason });
      if (!response?.ok) {
        throw new Error(response?.error || 'Failed to reject submission');
      }
      toast({
        title: "Submission rejected",
        description: `${submission.email} was rejected.`,
        variant: "destructive",
      });
      await mutate();
    } catch (err: any) {
      console.error('Reject submission failed', err);
      toast({
        title: "Rejection failed",
        description: err?.message ?? 'Unable to reject submission.',
        variant: "destructive",
      });
    } finally {
      setActionUserId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Companies House verification queue
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Review uploaded proof before enabling Companies House usage.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            Failed to load submissions: {String(error)}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading submissions…
          </div>
        ) : submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <ShieldAlert className="h-10 w-10 text-muted-foreground/70" />
            <p className="text-sm">
              {statusFilter === "submitted"
                ? "No pending submissions. You’re all caught up!"
                : "No submissions match this filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Reviewer notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => {
                  const statusTag = submission.ch_verification_status ?? 'not_submitted';
                  const badgeClass = STATUS_BADGE[statusTag] ?? STATUS_BADGE.default;
                  const proofHref = submission.ch_verification_proof_url
                    ? submission.ch_verification_proof_url.startsWith('http')
                      ? submission.ch_verification_proof_url
                      : `${API_BASE.replace(/\/$/, "")}${submission.ch_verification_proof_url}`
                    : null;
                  const busy = actionUserId === submission.id;
                  return (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{formatName(submission)}</span>
                          <span className="text-xs text-muted-foreground">{submission.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={badgeClass}>
                          {statusLabel(statusTag)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(submission.ch_verification_submitted_at) || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-xs">
                          {submission.ch_verification_notes || (statusTag === 'submitted' ? 'Awaiting review' : '—')}
                        </div>
                      </TableCell>
                      <TableCell className="flex flex-wrap justify-end gap-2">
                        {proofHref && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(proofHref, '_blank', 'noopener')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View proof
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={busy}
                          onClick={() => handleApprove(submission)}
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={busy}
                          onClick={() => handleReject(submission)}
                        >
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatName(submission: Submission) {
  const parts = [submission.first_name, submission.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return submission.email;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(code: string) {
  switch (code) {
    case 'submitted':
      return 'Pending review';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Not submitted';
  }
}

