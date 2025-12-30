"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Truck, FileText, Settings, Package, Trash2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

function parseDateMaybe(v: unknown): Date | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    const ms = v < 1e12 ? v * 1000 : v;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      const ms = n < 1e12 ? n * 1000 : n;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export default function AdminMailDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [markingDestroyed, setMarkingDestroyed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mailItem, setMailItem] = useState<any>(null);
  const { toast } = useToast();

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat("en-GB", { 
      dateStyle: "long", 
      timeStyle: "short" 
    }),
    []
  );

  useEffect(() => {
    const t = localStorage.getItem("vah_jwt");
    const storedUser = localStorage.getItem("vah_user");

    if (!t) {
      router.push("/login");
      return;
    }

    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (!u.is_admin && u.role !== "admin") {
          router.push("/dashboard");
          return;
        }
        setUser(u);
      } catch {
        router.push("/login");
        return;
      }
    }

    setToken(t);
    setLoadingAuth(false);
  }, [router]);

  async function load() {
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/bff/admin/mail-items/${encodeURIComponent(id)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "include",
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) throw new Error(data?.error || data?.message || `Request failed (${r.status})`);
      setMailItem(data.data ?? null);
    } catch (e: any) {
      setError(e?.message || "Failed to load mail item");
    } finally {
      setLoading(false);
    }
  }

  async function markAsDestroyed() {
    if (!token || !id) return;
    if (!confirm("Are you sure you want to mark this mail item as physically destroyed? This action will be logged in the audit trail.")) {
      return;
    }

    setMarkingDestroyed(true);
    setError(null);
    try {
      const r = await fetch(`/api/bff/admin/mail-items/${encodeURIComponent(id)}/mark-destroyed`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        credentials: "include",
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) throw new Error(data?.error || data?.message || `Request failed (${r.status})`);
      
      toast({
        title: "Mail item marked as destroyed",
        description: "Physical destruction has been logged in the audit trail.",
      });
      
      // Reload to show updated destruction date
      await load();
    } catch (e: any) {
      const errorMsg = e?.message || "Failed to mark mail item as destroyed";
      setError(errorMsg);
      toast({
        title: "Failed to mark as destroyed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setMarkingDestroyed(false);
    }
  }

  useEffect(() => {
    if (!loadingAuth && token && id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingAuth, token, id]);

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin…</p>
        </div>
      </div>
    );
  }

  const receivedDate = mailItem?.received_at_ms 
    ? parseDateMaybe(mailItem.received_at_ms)
    : mailItem?.received_date 
    ? parseDateMaybe(mailItem.received_date)
    : null;

  const destructionDate = mailItem?.physical_destruction_date
    ? parseDateMaybe(mailItem.physical_destruction_date)
    : null;

  const isDestroyed = !!destructionDate;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Mail Item Details</h1>
          <p className="text-muted-foreground mt-1">Mail ID: {id}</p>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading mail item…</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : !mailItem ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Mail item not found</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Main Details Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Mail Information</CardTitle>
                  {!isDestroyed && (
                    <Button
                      variant="destructive"
                      onClick={markAsDestroyed}
                      disabled={markingDestroyed}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {markingDestroyed ? "Marking..." : "Mark as Destroyed"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Mail ID</p>
                    <p className="font-medium">#{mailItem.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="outline" className="capitalize">
                      {mailItem.status || "received"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">User</p>
                    <p className="font-medium">
                      {mailItem.first_name || mailItem.last_name
                        ? `${mailItem.first_name || ""} ${mailItem.last_name || ""}`.trim()
                        : "Unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground">{mailItem.user_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">User ID</p>
                    <p className="font-medium">#{mailItem.user_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sender</p>
                    <p className="font-medium">{mailItem.sender_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Subject</p>
                    <p className="font-medium">{mailItem.subject || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tag</p>
                    <Badge variant="outline">{mailItem.tag || "—"}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Received</p>
                    <p className="font-medium">
                      {receivedDate ? dateFmt.format(receivedDate) : "—"}
                    </p>
                  </div>
                  {isDestroyed && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Physical Destruction Date</p>
                      <div className="flex items-center gap-2 mt-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <p className="font-medium text-green-600">
                          {dateFmt.format(destructionDate!)}
                        </p>
                      </div>
                      {mailItem.destroyed_by_email && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Marked as destroyed by:{" "}
                          <span className="font-medium">
                            {mailItem.destroyed_by_first_name || mailItem.destroyed_by_last_name
                              ? `${mailItem.destroyed_by_first_name || ''} ${mailItem.destroyed_by_last_name || ''}`.trim()
                              : mailItem.destroyed_by_email}
                          </span>
                          {mailItem.destroyed_by_at && (
                            <span className="ml-2">
                              ({new Date(mailItem.destroyed_by_at).toLocaleString('en-GB')})
                            </span>
                          )}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        This mail item has been marked as physically destroyed and logged in the audit trail.
                      </p>
                    </div>
                  )}
                </div>

                {mailItem.notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{mailItem.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* File Information */}
            {mailItem.file_name && (
              <Card>
                <CardHeader>
                  <CardTitle>File Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">File Name</p>
                      <p className="font-medium">{mailItem.file_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">File Size</p>
                      <p className="font-medium">
                        {mailItem.file_size
                          ? `${(mailItem.file_size / 1024).toFixed(2)} KB`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">MIME Type</p>
                      <p className="font-medium">{mailItem.file_mime || "—"}</p>
                    </div>
                    {mailItem.file_url && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">File URL</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(mailItem.file_url, "_blank")}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View File
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

