"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminApi } from "../../lib/api-client";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";

type AdminUser = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status?: string;
  plan?: string;
  kyc_status?: string;
  created_at?: string;
};

export default function UsersSection() {
  // Search and pagination state
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [isFetching, setIsFetching] = useState(false);
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Debounce and abort handling
  const debouncedQ = useRef(q);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce the query (300ms)
  useEffect(() => {
    const t = setTimeout(() => {
      debouncedQ.current = q;
      setPage(1); // only reset page AFTER debounce, not on each key stroke
      void load();
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsFetching(true);
    setError(null);
    
    try {
      const params = new URLSearchParams([
        ["q", debouncedQ.current],
        ["page", String(page)],
        ["page_size", String(pageSize)],
      ]);
      const res = await adminApi.users(params, { signal: controller.signal });
      if (res.ok) {
        setItems(res.data?.items ?? []);
        setTotal(Number(res.data?.total ?? 0));
      } else {
        setItems([]);
        setTotal(0);
        setError("Failed to load users");
      }
    } catch (e) {
      if ((e as any).name !== "AbortError") {
        console.error(e);
        setError("Network error while fetching users");
      }
    } finally {
      if (abortRef.current === controller) setIsFetching(false);
    }
  }, [page, pageSize]);

  useEffect(() => { void load(); }, [page, load]);

  // Pagination helpers
  const hasNext = useMemo(() => page * pageSize < total, [page, pageSize, total]);
  const hasPrev = useMemo(() => page > 1, [page]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">Total: {total}</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-60"
          />
          <Button variant="outline" onClick={() => load()} disabled={isFetching}>
            Search
          </Button>
        </div>
      </div>

      {/* Users table */}
      <div className="relative">
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    {error ?? "No users found."}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === "active" ? "default" : "secondary"}>
                        {u.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell>{u.plan || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.kyc_status || "pending"}</Badge>
                    </TableCell>
                    <TableCell>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Loading overlay - keep rows, add subtle overlay spinner */}
        {isFetching && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-sm">Loading…</span>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {page} • {total} total
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!hasPrev || isFetching}
            onClick={() => {
              const next = Math.max(1, page - 1);
              setPage(next);
            }}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!hasNext || isFetching}
            onClick={() => {
              const next = page + 1;
              setPage(next);
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}