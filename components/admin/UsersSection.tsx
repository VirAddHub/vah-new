"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { adminApi } from "../../lib/api-client";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";

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
  // ✅ Local, stable state – won't be reset by fetches
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [isFetchingList, setIsFetchingList] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ❌ Don't remount the section – keep it stable, no key bound to searchTerm

  // Abort/cancel stale requests
  const abortRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);

  const loadUsers = useCallback(async (opts?: { page?: number; q?: string }) => {
    const p = opts?.page ?? page;
    const q = (opts?.q ?? deferredSearch).trim();

    // cancel previous in-flight
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const myReqId = ++reqIdRef.current;
    setIsFetchingList(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("page_size", String(pageSize));
      if (q) params.set("q", q);

      const res = await adminApi.users(params);
      if (reqIdRef.current !== myReqId) return; // stale

      if (res.ok) {
        const data = res.data;
        setUsers(Array.isArray(data?.items) ? data.items : []);
        setTotal(Number(data?.total ?? 0));
      } else {
        setUsers([]);
        setTotal(0);
        setError("Failed to load users.");
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return; // expected
      setUsers([]);
      setTotal(0);
      setError("Network error while fetching users.");
    } finally {
      if (reqIdRef.current === myReqId) setIsFetchingList(false);
    }
  }, [page, deferredSearch, pageSize]);

  // Initial load
  useEffect(() => {
    loadUsers({ page: 1, q: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search (using deferred value)
  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      loadUsers({ page: 1, q: deferredSearch });
    }, 300);
    return () => clearTimeout(id);
  }, [deferredSearch, loadUsers]);

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
      </div>

      {/* ✅ Search bar stays mounted; no loading gate here */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search name or email…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} // no trim/slice here
        />
        <Button
          variant="outline"
          onClick={() => loadUsers({ page: 1, q: searchTerm })}
          disabled={isFetchingList}
        >
          Search
        </Button>
      </div>

      <div className="rounded-md border">
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

          {/* ✅ Keep table mounted; show skeleton rows while fetching */}
          <TableBody>
            {isFetchingList ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  {error ?? "No users found."}
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.status === "active" ? "default" : "secondary"}>
                      {u.status ?? "active"}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.plan ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.kyc_status ?? "pending"}</Badge>
                  </TableCell>
                  <TableCell>
                    {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {page} • {total} total
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!hasPrev || isFetchingList}
            onClick={() => {
              const next = Math.max(1, page - 1);
              setPage(next);
              loadUsers({ page: next, q: searchTerm });
            }}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!hasNext || isFetchingList}
            onClick={() => {
              const next = page + 1;
              setPage(next);
              loadUsers({ page: next, q: searchTerm });
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
