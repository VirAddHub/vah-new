"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface ForwardingRequest {
    id: number;
    to_name: string;
    address1: string;
    address2?: string;
    city: string;
    state?: string;
    postal: string;
    country: string;
    status: string;
    subject: string;
    tag?: string;
    email: string;
    courier?: string;
    tracking_number?: string;
    admin_notes?: string;
    created_at: number;
    reviewed_at?: number;
    processing_at?: number;
    dispatched_at?: number;
    delivered_at?: number;
    cancelled_at?: number;
}

export default function AdminForwardingPage() {
    const { toast } = useToast();
    const [status, setStatus] = useState("Requested");
    const [q, setQ] = useState("");
    const [rows, setRows] = useState<ForwardingRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ForwardingRequest | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState({ courier: "", tracking_number: "", admin_notes: "" });

    async function load() {
        setLoading(true);
        const url = `/api/admin/forwarding/requests?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}&limit=50`;
        try {
            const r = await fetch(url, { credentials: "include" });
            const j = await r.json();
            setRows((j && j.ok && Array.isArray(j.data)) ? j.data : []);
        } catch (error) {
            console.error("Failed to load forwarding requests:", error);
        }
        setLoading(false);
    }

    useEffect(() => {
        load();
    }, [status]);

    async function action(id: number, action: string, extra: any = {}) {
        try {
            const r = await fetch(`/api/admin/forwarding/requests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ action, ...extra })
            });
            if (r.ok) {
                const result = await r.json();
                if (result.ok) {
                    load();
                    setShowModal(false);
                    setSelectedRequest(null);
                } else {
                    toast({
                        title: "Request Update Failed",
                        description: result.error || 'Unknown error',
                        variant: "destructive",
                        durationMs: 5000,
                    });
                }
            } else {
                toast({
                    title: "Request Update Failed",
                    description: "Failed to update request. Please try again.",
                    variant: "destructive",
                    durationMs: 5000,
                });
            }
        } catch (error) {
            console.error("Failed to update forwarding request:", error);
            toast({
                title: "Request Update Error",
                description: "Error updating request. Please try again.",
                variant: "destructive",
                durationMs: 5000,
            });
        }
    }

    function openModal(request: ForwardingRequest, action: string) {
        setSelectedRequest(request);
        setModalData({
            courier: request.courier || "",
            tracking_number: request.tracking_number || "",
            admin_notes: request.admin_notes || ""
        });
        setShowModal(true);
    }

    function getStatusColor(status: string) {
        switch (status) {
            case 'Requested': return 'bg-yellow-100 text-yellow-800';
            case 'Reviewed': return 'bg-blue-100 text-blue-800';
            case 'Processing': return 'bg-purple-100 text-purple-800';
            case 'Dispatched': return 'bg-orange-100 text-orange-800';
            case 'Delivered': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    function formatDate(timestamp?: number) {
        if (!timestamp) return '—';
        return new Date(timestamp).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    return (
        <div className="p-6 space-y-4">
            <h1 className="text-2xl font-semibold">Forwarding Requests</h1>

            <div className="flex gap-2 items-center">
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Requested">Requested</SelectItem>
                        <SelectItem value="Reviewed">Reviewed</SelectItem>
                        <SelectItem value="Processing">Processing</SelectItem>
                        <SelectItem value="Dispatched">Dispatched</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>

                <Input
                    placeholder="Search name / postal / courier / tracking"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="flex-1"
                />

                <Button onClick={load} disabled={loading}>
                    {loading ? "Loading..." : "Search"}
                </Button>
            </div>

            <div className="grid gap-3">
                {rows.map((r) => (
                    <div key={r.id} className="border rounded-lg p-4 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <div className="font-medium">
                                {r.to_name} • {r.address1}, {r.city} {r.postal} ({r.country})
                            </div>
                            <Badge className={getStatusColor(r.status)}>
                                {r.status}
                            </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground">
                            Mail #{r.id} • {r.subject} • Tag: {r.tag || '—'} • User: {r.email}
                        </div>

                        <div className="flex flex-wrap gap-2 items-center">
                            {r.courier && (
                                <Badge variant="secondary">Courier: {r.courier}</Badge>
                            )}
                            {r.tracking_number && (
                                <Badge variant="secondary">Tracking: {r.tracking_number}</Badge>
                            )}
                        </div>

                        {r.admin_notes && (
                            <div className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                                <strong>Admin Notes:</strong> {r.admin_notes}
                            </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                            Created: {formatDate(r.created_at)}
                            {r.reviewed_at && ` • Confirmed: ${formatDate(r.reviewed_at)}`}
                            {r.processing_at && ` • Processing: ${formatDate(r.processing_at)}`}
                            {r.dispatched_at && ` • Dispatched: ${formatDate(r.dispatched_at)}`}
                            {r.delivered_at && ` • Delivered: ${formatDate(r.delivered_at)}`}
                            {r.cancelled_at && ` • Cancelled: ${formatDate(r.cancelled_at)}`}
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            {r.status === 'Requested' && (
                                <>
                                    <Button
                                        variant="secondary"
                                        onClick={() => action(r.id, 'mark_reviewed')}
                                    >
                                        Confirm Processing
                                    </Button>
                                    <Button
                                        onClick={() => action(r.id, 'start_processing')}
                                    >
                                        Start Processing
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => action(r.id, 'cancel')}
                                    >
                                        Cancel
                                    </Button>
                                </>
                            )}

                            {r.status === 'Reviewed' && (
                                <>
                                    <Button
                                        onClick={() => action(r.id, 'start_processing')}
                                    >
                                        Start Processing
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => action(r.id, 'cancel')}
                                    >
                                        Cancel
                                    </Button>
                                </>
                            )}

                            {r.status === 'Processing' && (
                                <>
                                    <Button
                                        onClick={() => openModal(r, 'mark_dispatched')}
                                    >
                                        Mark Dispatched
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => action(r.id, 'cancel')}
                                    >
                                        Cancel
                                    </Button>
                                </>
                            )}

                            {r.status === 'Dispatched' && (
                                <Button
                                    onClick={() => action(r.id, 'mark_delivered')}
                                >
                                    Mark Delivered
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {rows.length === 0 && !loading && (
                <div className="text-center text-muted-foreground py-8">
                    No forwarding requests found for status "{status}"
                </div>
            )}

            {/* Modal for dispatch details */}
            {showModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Mark as Dispatched</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Courier</label>
                                <Input
                                    value={modalData.courier}
                                    onChange={(e) => setModalData({ ...modalData, courier: e.target.value })}
                                    placeholder="e.g. Royal Mail, DHL, UPS"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Tracking Number</label>
                                <Input
                                    value={modalData.tracking_number}
                                    onChange={(e) => setModalData({ ...modalData, tracking_number: e.target.value })}
                                    placeholder="e.g. RM123456789GB"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Admin Notes</label>
                                <Textarea
                                    value={modalData.admin_notes}
                                    onChange={(e) => setModalData({ ...modalData, admin_notes: e.target.value })}
                                    placeholder="Additional notes..."
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <Button
                                onClick={() => action(selectedRequest.id, 'mark_dispatched', modalData)}
                                className="flex-1"
                            >
                                Mark Dispatched
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowModal(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
