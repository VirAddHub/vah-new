"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { useAdminHeartbeat } from "@/contexts/AdminHeartbeatContext";

type Api<T> = { ok: boolean; data?: T; error?: string };
type ForwardingRequest = {
  id: number;
  user_id: number;
  mail_item_id: number;
  status: string;
  to_name: string;
  address1: string;
  city: string;
  postal: string;
  country: string;
  created_at: number;
  updated_at: number;
};

export default function StableForwardingTable() {
  const [rows, setRows] = useState<ForwardingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { registerPolling, unregisterPolling } = useAdminHeartbeat();

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const abortRef = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      setLoading(true);
      setError(null);
      const r = await fetch("/api/admin/forwarding/requests?limit=50&offset=0", {
        credentials: "include",
        signal: abortRef.current.signal,
      });
      if (!r.ok) throw new Error(`${r.status} ${await r.text().catch(() => r.statusText)}`);
      const j = (await r.json()) as Api<ForwardingRequest[]>;
      if (mountedRef.current) setRows(j.data ?? []);
    } catch (e: any) {
      if (e?.name !== "AbortError" && mountedRef.current) setError(e.message ?? "Failed");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Use shared heartbeat instead of individual polling
  useEffect(() => {
    load(); // initial load
    registerPolling('forwarding-requests', load);
    
    // Abort on page unload/navigation
    const handleBeforeUnload = () => {
      abortRef.current?.abort();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      unregisterPolling('forwarding-requests');
      abortRef.current?.abort();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [load, registerPolling, unregisterPolling]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'Requested': { variant: 'secondary', label: 'Requested' },
      'Reviewed': { variant: 'outline', label: 'Reviewed' },
      'Processing': { variant: 'default', label: 'Processing' },
      'Dispatched': { variant: 'default', label: 'Dispatched' },
      'Delivered': { variant: 'default', label: 'Delivered' },
      'Cancelled': { variant: 'destructive', label: 'Cancelled' },
    };

    const config = statusMap[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Forwarding Requests
          <Button onClick={load} disabled={loading} className="border rounded px-3 py-2">
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>To Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.user_id}</TableCell>
                <TableCell>{getStatusBadge(row.status)}</TableCell>
                <TableCell>{row.to_name || '-'}</TableCell>
                <TableCell>
                  {row.address1 && (
                    <div>
                      <div>{row.address1}</div>
                      {row.city && <div>{row.city}, {row.postal} {row.country}</div>}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(row.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length === 0 && !loading && (
          <p className="text-center text-gray-500 py-4">No forwarding requests found</p>
        )}
      </CardContent>
    </Card>
  );
}
