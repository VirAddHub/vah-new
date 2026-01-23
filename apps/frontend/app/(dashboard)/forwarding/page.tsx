"use client";

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
        <div className="w-full mx-auto max-w-[1200px] px-6" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            {/* Header */}
            <div className="mb-6 pt-2">
                <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-1">Forwarding Requests</h1>
                <p className="text-sm text-[#666666]">Track the status of your physical mail forwarding requests</p>
            </div>

            {/* Forwarding Requests - Single Column */}
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
                <div className="space-y-3">
                    {forwardingRequests.map((request) => (
                        <Card 
                            key={request.id} 
                            className="border border-[#E5E7EB] hover:border-[#40C46C]/30 transition-colors"
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
                                            {request.tracking_number && (
                                                <p>
                                                    <span className="font-medium">Tracking:</span> {request.tracking_number}
                                                </p>
                                            )}
                                            {request.courier && (
                                                <p>
                                                    <span className="font-medium">Courier:</span> {request.courier}
                                                </p>
                                            )}
                                            <p className="text-xs text-[#666666] mt-2">
                                                Requested: {formatDate(request.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

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

                                            {selectedRequest.address1}
                                            <br />
                                            {selectedRequest.city}, {selectedRequest.postal}
                                            <br />
                                            {selectedRequest.country}
                                        </p>
                                    </div>

                                    {selectedRequest.tracking_number && (
                                        <div>
                                            <h4 className="text-sm font-medium text-[#666666] mb-1">Tracking Number</h4>
                                            <p className="text-base text-[#1A1A1A] font-mono">{selectedRequest.tracking_number}</p>
                                        </div>
                                    )}

                                    {selectedRequest.courier && (
                                        <div>
                                            <h4 className="text-sm font-medium text-[#666666] mb-1">Courier</h4>
                                            <p className="text-base text-[#1A1A1A]">{selectedRequest.courier}</p>
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="text-sm font-medium text-[#666666] mb-1">Request Date</h4>
                                        <p className="text-base text-[#1A1A1A]">{formatDate(selectedRequest.created_at)}</p>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium text-[#666666] mb-1">Mail Item ID</h4>
                                        <p className="text-base text-[#1A1A1A]">#{selectedRequest.mail_item_id}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border border-[#E5E7EB]">
                                <CardContent className="py-12">
                                    <div className="text-center">
                                        <Mail className="h-12 w-12 text-[#666666] mx-auto mb-4 opacity-50" />
                                        <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">Select a request</h3>
                                        <p className="text-sm text-[#666666]">
                                            Click on a forwarding request from the list to view its details.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}

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

                />
            )}
        </div>
    );
}
