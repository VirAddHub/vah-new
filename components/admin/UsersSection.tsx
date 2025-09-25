"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { adminApi } from "../../lib/api-client";
import { safe } from "../../lib/api-client";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { RefreshCw } from "lucide-react";

export default function UsersSection() {
  const { toast } = useToast();

  // fetching state
  const [isFetching, setIsFetching] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  // server data
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  // filters/pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined); // "active" | "suspended" | undefined
  const [plan, setPlan] = useState<string | undefined>(undefined);
  const [kyc, setKyc] = useState<string | undefined>(undefined);       // "pending" | "approved" | "rejected" | undefined
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const loadUsers = useCallback(
    async (opts?: { page?: number; q?: string }) => {
      const p = opts?.page ?? page;
      const q = opts?.q ?? searchTerm;

      setIsFetching(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(p));
        params.set("page_size", String(pageSize));
        if (q && q.trim() !== "") params.set("q", q.trim());
        if (status) params.set("status", status);
        if (plan) params.set("plan", plan);
        if (kyc) params.set("kyc", kyc);

        const res = await adminApi.users(params);
        if (res.ok) {
          const data = res.data ?? {};
          setUsers(Array.isArray(data?.items) ? data.items : []);
          setTotal(Number(data?.total ?? 0));
        } else {
          toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
        }
      } finally {
        setIsFetching(false);
      }
    },
    [page, searchTerm, status, plan, kyc, pageSize, toast]
  );

  // Debounce the search typing
  useEffect(() => {
    const id = setTimeout(() => {
      // reset to first page on query change
      setPage(1);
      loadUsers({ page: 1, q: searchTerm });
    }, 300);
    return () => clearTimeout(id);
  }, [searchTerm, loadUsers]);

  // Initial load
  useEffect(() => {
    loadUsers({ page: 1, q: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => { setPage(1); await loadUsers({ page: 1, q: searchTerm }); };

    return (
        <div className="space-y-4">
            {/* Header: NO ADD USER BUTTON */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Users</h2>
                    <p className="text-sm text-muted-foreground">Total: {total}</p>
                </div>
        <div className="flex gap-2">
          <Input
            type="text"
            className="w-60 p-2 border rounded"
            placeholder="Search name or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isFetching}
          />
          <Button variant="outline" onClick={onRefresh} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
            </div>

            {/* Users table */}
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
            {isFetching ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground">No users found.</TableCell></TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{[u.first_name, u.last_name].filter(Boolean).join(" ") || "-"}</TableCell>
                  <TableCell><Badge variant={u.status === "active" ? "default" : "secondary"}>{u.status || "active"}</Badge></TableCell>
                  <TableCell>{u.plan || "-"}</TableCell>
                  <TableCell><Badge variant="outline">{u.kyc_status || "pending"}</Badge></TableCell>
                  <TableCell>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
                </Table>
            </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isFetching || page === 1}
          onClick={() => {
            const next = Math.max(1, page - 1);
            setPage(next);
            loadUsers({ page: next, q: searchTerm });
          }}
        >
          Previous
        </Button>
        <span className="text-sm">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={isFetching || users.length < pageSize}
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
    );
}
