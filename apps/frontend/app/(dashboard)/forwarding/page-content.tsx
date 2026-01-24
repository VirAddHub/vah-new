'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Truck, Clock, CheckCircle, Mail, X } from 'lucide-react';
import { ForwardingRequestModal } from '@/components/ForwardingRequestModal';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MailItem {
    id: string;
    subject: string;
    sender_name: string;
    created_at: string;
    tag: string;
    forwarding_status?: string;
    gdpr_expired?: boolean;
}

interface ForwardingRequest {
    id: number;
    mail_item_id: number;
    status: string;
    to_name: string;
    address1: string;
    city: string;
    postal: string;
    country: string;
    created_at: number;
    tracking_number?: string;
    courier?: string;
}

export default function ForwardingPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [mailItems, setMailItems] = useState<MailItem[]>([]);
    const [forwardingRequests, setForwardingRequests] = useState<ForwardingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForwardingModal, setShowForwardingModal] = useState(false);
    const [selectedMailForForwarding, setSelectedMailForForwarding] = useState<MailItem | null>(null);
    const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<ForwardingRequest | null>(null);

    useEffect(() => {
        // Check authentication
        const token = localStorage.getItem('vah_jwt');
        if (!token) {
            router.push('/login');
            return;
        }

        loadData();
    }, [router]);

    const loadData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('vah_jwt');

            // Load mail items (keep logic but don't display)
            const mailResponse = await fetch('/api/mail', {
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                credentials: 'include',
            });
            if (mailResponse.ok) {
                const mailData = await mailResponse.json();
                setMailItems(mailData.items || []);
            }

            // Load forwarding requests - use BFF endpoint
            const forwardingResponse = await fetch('/api/bff/forwarding/requests', {
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });
            if (forwardingResponse.ok) {
                const forwardingData = await forwardingResponse.json();
                setForwardingRequests(forwardingData.data || []);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestForwarding = (mailItem: MailItem) => {
        // Check if GDPR expired
        if (mailItem.gdpr_expired) {
            toast({
                title: "Cannot Forward",
                description: "This mail item is older than 30 days and cannot be forwarded due to GDPR compliance. You can still download it.",
                variant: "destructive",
                durationMs: 5000,
            });
            return;
        }

        setSelectedMailForForwarding(mailItem);
        setShowForwardingModal(true);
    };

    const handleForwardingSubmit = async (data: any) => {
        if (!selectedMailForForwarding) return;

        try {
            // Use BFF endpoint which handles CSRF tokens automatically
            const response = await fetch('/api/bff/forwarding/requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    mail_item_id: selectedMailForForwarding.id,
                    ...data
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.ok) {
                    toast({
                        title: "Forwarding Request Created",
                        description: "Your request will be reviewed by our team.",
                        durationMs: 5000,
                    });
                    setShowForwardingModal(false);
                    setSelectedMailForForwarding(null);
                    loadData(); // Refresh data
                } else {
                    toast({
                        title: "Forwarding Request Failed",
                        description: result.error || 'Unknown error',
                        variant: "destructive",
                        durationMs: 5000,
                    });
                }
            } else {
                const errorData = await response.json().catch(() => ({}));

                // Handle incomplete forwarding address error
                if (errorData.error === 'forwarding_address_incomplete' && errorData.fields) {
                    const missingFields = errorData.fields || [];
                    const fieldLabels: Record<string, string> = {
                        'name': 'Full Name',
                        'address_line_1': 'Address Line 1',
                        'city': 'City',
                        'postal_code': 'Postcode',
                    };
                    const missingLabels = missingFields.map((f: string) => fieldLabels[f] || f).join(', ');

                    toast({
                        title: "Incomplete Forwarding Address",
                        description: `Please add your ${missingLabels} before requesting forwarding. You can update your forwarding address in Account settings.`,
                        variant: "destructive",
                        durationMs: 6000,
                    });
                } else {
                    toast({
                        title: "Request Failed",
                        description: errorData.message || errorData.error || "Failed to create forwarding request. Please try again.",
                        variant: "destructive",
                        durationMs: 5000,
                    });
                }
            }
        } catch (error) {
            console.error('Error creating forwarding request:', error);
            toast({
                title: "Request Error",
                description: "Error creating forwarding request. Please try again.",
                variant: "destructive",
                durationMs: 5000,
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Requested': return 'bg-warning/10 text-warning-foreground';
            case 'Reviewed': return 'bg-primary/10 text-primary-foreground';
            case 'Processing': return 'bg-primary/10 text-primary-foreground';
            case 'Dispatched': return 'bg-warning/10 text-warning-foreground';
            case 'Delivered': return 'bg-success/10 text-success-foreground';
            case 'Cancelled': return 'bg-destructive/10 text-destructive-foreground';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Requested': return <Clock className="h-4 w-4" />;
            case 'Reviewed': return <CheckCircle className="h-4 w-4" />;
            case 'Processing': return <Truck className="h-4 w-4" />;
            case 'Dispatched': return <Truck className="h-4 w-4" />;
            case 'Delivered': return <CheckCircle className="h-4 w-4" />;
            case 'Cancelled': return <Mail className="h-4 w-4" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
    };

    const formatDestination = (request: ForwardingRequest) => {
        const parts = [request.city, request.postal, request.country].filter(Boolean);
        return parts.join(', ');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading forwarding requests...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-[calc(100vh-8rem)] flex flex-col" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
            {/* Header */}
            <div className="mb-6 pt-2 px-6">
                <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-1">Forwarding Requests</h1>
                <p className="text-sm text-[#666666]">Track the status of your physical mail forwarding requests</p>
            </div>

            {/* Two Column Layout: List on Left, Details on Right */}
            <div className="flex-1 flex gap-6 px-6 overflow-hidden">
                {/* Left Column - Request List */}
                <div className={cn(
                    "flex-1 overflow-y-auto",
                    selectedRequest ? "w-1/2" : "w-full"
                )}>
                    <div className="space-y-3">
                    {forwardingRequests.length === 0 ? (
                        <Card className="border border-[#E5E7EB]">
                            <CardContent className="py-12">
                                <div className="text-center">
                                    <Truck className="h-12 w-12 text-[#666666] mx-auto mb-4 opacity-50" />
                                    <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">No forwarding requests yet</h3>
                                    <p className="text-sm text-[#666666] mb-4 max-w-md mx-auto">
                                        To request forwarding for a mail item, go to your <strong>Mail Inbox</strong> and select the mail you want forwarded.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => router.push('/mail')}
                                        className="mt-2"
                                    >
                                        Go to Mail Inbox
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {forwardingRequests.map((request) => (
                                <Card 
                                    key={request.id} 
                                    onClick={() => setSelectedRequest(request)}
                                    className={cn(
                                        "border border-[#E5E7EB] hover:border-[#206039]/30 transition-colors cursor-pointer",
                                        selectedRequest?.id === request.id && "border-[#206039] bg-[#F0FDF4]"
                                    )}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-base font-medium text-[#1A1A1A]">
                                                        Request #{request.id}
                                                    </h3>
                                                    <Badge className={getStatusColor(request.status)}>
                                                        <span className="flex items-center gap-1.5">
                                                            {getStatusIcon(request.status)}
                                                            {request.status}
                                                        </span>
                                                    </Badge>
                                                </div>
                                                
                                                <div className="space-y-1 text-sm text-[#666666]">
                                                    <p>
                                                        <span className="font-medium">To:</span> {request.to_name}
                                                    </p>
                                                    <p>
                                                        <span className="font-medium">Destination:</span> {formatDestination(request)}
                                                    </p>
                                                    <p className="text-xs text-[#666666] mt-2">
                                                        Requested: {formatDate(request.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </>
                    )}
                    </div>
                </div>

                {/* Right Column - Request Details */}
                {selectedRequest && (
                    <div className="w-1/2 border-l border-[#E5E7EB] pl-6 overflow-y-auto">
                        <div className="sticky top-0 bg-white pb-4 mb-4 border-b border-[#E5E7EB]">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-[#1A1A1A]">Request Details</h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedRequest(null)}
                                    className="h-8 w-8"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Status */}
                            <div>
                                <h3 className="text-sm font-medium text-[#666666] mb-2 uppercase tracking-wide">Status</h3>
                                <Badge className={getStatusColor(selectedRequest.status)}>
                                    <span className="flex items-center gap-1.5">
                                        {getStatusIcon(selectedRequest.status)}
                                        {selectedRequest.status}
                                    </span>
                                </Badge>
                            </div>

                            {/* Recipient Information */}
                            <div>
                                <h3 className="text-sm font-medium text-[#666666] mb-3 uppercase tracking-wide">Recipient</h3>
                                <div className="space-y-2 text-sm">
                                    <p>
                                        <span className="font-medium text-[#1A1A1A]">Name:</span>{' '}
                                        <span className="text-[#666666]">{selectedRequest.to_name}</span>
                                    </p>
                                    <p>
                                        <span className="font-medium text-[#1A1A1A]">Address:</span>{' '}
                                        <span className="text-[#666666]">{selectedRequest.address1}</span>
                                    </p>
                                    <p>
                                        <span className="font-medium text-[#1A1A1A]">City:</span>{' '}
                                        <span className="text-[#666666]">{selectedRequest.city}</span>
                                    </p>
                                    <p>
                                        <span className="font-medium text-[#1A1A1A]">Postcode:</span>{' '}
                                        <span className="text-[#666666]">{selectedRequest.postal}</span>
                                    </p>
                                    <p>
                                        <span className="font-medium text-[#1A1A1A]">Country:</span>{' '}
                                        <span className="text-[#666666]">{selectedRequest.country}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Tracking Information */}
                            {selectedRequest.tracking_number && (
                                <div>
                                    <h3 className="text-sm font-medium text-[#666666] mb-3 uppercase tracking-wide">Tracking</h3>
                                    <div className="space-y-2 text-sm">
                                        <p>
                                            <span className="font-medium text-[#1A1A1A]">Tracking Number:</span>{' '}
                                            <span className="text-[#666666] font-mono">{selectedRequest.tracking_number}</span>
                                        </p>
                                        {selectedRequest.courier && (
                                            <p>
                                                <span className="font-medium text-[#1A1A1A]">Courier:</span>{' '}
                                                <span className="text-[#666666]">{selectedRequest.courier}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Request Date */}
                            <div>
                                <h3 className="text-sm font-medium text-[#666666] mb-3 uppercase tracking-wide">Request Information</h3>
                                <div className="space-y-2 text-sm">
                                    <p>
                                        <span className="font-medium text-[#1A1A1A]">Request ID:</span>{' '}
                                        <span className="text-[#666666]">#{selectedRequest.id}</span>
                                    </p>
                                    <p>
                                        <span className="font-medium text-[#1A1A1A]">Mail Item ID:</span>{' '}
                                        <span className="text-[#666666]">#{selectedRequest.mail_item_id}</span>
                                    </p>
                                    <p>
                                        <span className="font-medium text-[#1A1A1A]">Requested:</span>{' '}
                                        <span className="text-[#666666]">{formatDate(selectedRequest.created_at)}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Forwarding Request Modal */}
            {showForwardingModal && selectedMailForForwarding && (
                <ForwardingRequestModal
                    isOpen={showForwardingModal}
                    onClose={() => {
                        setShowForwardingModal(false);
                        setSelectedMailForForwarding(null);
                    }}
                    mailItem={selectedMailForForwarding}
                    onSubmit={handleForwardingSubmit}
                />
            )}
        </div>
    );
}
