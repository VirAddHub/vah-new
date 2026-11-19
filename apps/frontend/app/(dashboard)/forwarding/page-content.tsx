'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusSteps } from '@/components/ui/status-steps';

const FORWARDING_STEPS = ['Requested', 'In progress', 'Dispatched', 'Delivered'];
function forwardingStepIndex(status: string): number {
    switch (status) {
        case 'Requested': return 0;
        case 'Reviewed': case 'Processing': return 1;
        case 'Dispatched': return 2;
        case 'Delivered': return 3;
        default: return 0;
    }
}
import { ArrowLeft, Truck, Clock, CheckCircle, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    const router = useRouter();
    const [forwardingRequests, setForwardingRequests] = useState<ForwardingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<ForwardingRequest | null>(null);

    useEffect(() => {
        loadData();
    }, [router]);

    const loadData = async () => {
        try {
            setLoading(true);

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

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Requested': return <Clock className="h-3.5 w-3.5" aria-hidden />;
            case 'Reviewed': return <CheckCircle className="h-3.5 w-3.5" aria-hidden />;
            case 'Processing': return <Truck className="h-3.5 w-3.5" aria-hidden />;
            case 'Dispatched': return <Truck className="h-3.5 w-3.5" aria-hidden />;
            case 'Delivered': return <CheckCircle className="h-3.5 w-3.5" aria-hidden />;
            case 'Cancelled': return <Mail className="h-3.5 w-3.5" aria-hidden />;
            default: return <Clock className="h-3.5 w-3.5" aria-hidden />;
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
            <div className="min-h-[100dvh] flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading forwarding requests...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="mb-6 pt-2 px-6">
                <h1 className="page-title">Forwarding Requests</h1>
                <p className="page-lede">Track the status of your physical mail forwarding requests</p>
            </div>

            {/* Two Column Layout: List on Left, Details on Right */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 px-4 sm:px-6 overflow-x-hidden">
                {/* Left Column - Request List */}
                <div className={cn(
                    "flex-1 min-w-0 w-full",
                    selectedRequest ? "lg:w-1/2" : "w-full"
                )}>
                    <div className="space-y-3">
                    {forwardingRequests.length === 0 ? (
                        <Card className="border border-border">
                            <CardContent className="py-12">
                                <div className="text-center">
                                    <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                    <h3 className="text-h4 text-foreground mb-2">No forwarding requests yet</h3>
                                    <p className="text-body-sm text-muted-foreground mb-4 max-w-md mx-auto">
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
                                        "border border-border hover:border-primary/30 transition-colors cursor-pointer",
                                        selectedRequest?.id === request.id && "border-primary bg-primary/5"
                                    )}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-body font-medium text-foreground">
                                                        Request #{request.id}
                                                    </h3>
                                                    <Badge variant={request.status === 'Cancelled' ? 'destructive' : request.status === 'Delivered' ? 'success' : 'default'}>
                                                        {getStatusIcon(request.status)}
                                                        {request.status}
                                                    </Badge>
                                                </div>
                                                
                                                <div className="space-y-1 text-body-sm text-muted-foreground">
                                                    <p>
                                                        <span className="font-medium">To:</span> {request.to_name}
                                                    </p>
                                                    <p>
                                                        <span className="font-medium">Destination:</span> {formatDestination(request)}
                                                    </p>
                                                    <p className="text-caption text-muted-foreground mt-2">
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
                    <div className="w-full lg:w-1/2 min-w-0 border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-6">
                        <div className="sticky top-0 bg-background pb-4 mb-4 border-b border-border">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <h2 className="text-h3 text-foreground">Request Details</h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedRequest(null)}
                                    className="h-8 w-8 self-start sm:self-auto"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Status */}
                            <div>
                                <h3 className="text-label text-muted-foreground mb-2 uppercase tracking-wide">Status</h3>
                                {selectedRequest.status === 'Cancelled' ? (
                                    <Badge variant="destructive">{getStatusIcon('Cancelled')} Cancelled</Badge>
                                ) : (
                                    <StatusSteps
                                        label="Forwarding progress"
                                        steps={FORWARDING_STEPS}
                                        current={forwardingStepIndex(selectedRequest.status)}
                                        orientation="vertical"
                                    />
                                )}
                            </div>

                            {/* Recipient Information */}
                            <div>
                                <h3 className="text-label text-muted-foreground mb-3 uppercase tracking-wide">Recipient</h3>
                                <div className="space-y-2 text-body-sm">
                                    <p>
                                        <span className="font-medium text-foreground">Name:</span>{' '}
                                        <span className="text-muted-foreground">{selectedRequest.to_name}</span>
                                    </p>
                                    <p>
                                        <span className="font-medium text-foreground">Address:</span>{' '}
                                        <span className="text-muted-foreground">{selectedRequest.address1}</span>
                                    </p>
                                    <p>
                                        <span className="font-medium text-foreground">City:</span>{' '}
                                        <span className="text-muted-foreground">{selectedRequest.city}</span>
                                    </p>
                                    <p>
                                        <span className="font-medium text-foreground">Postcode:</span>{' '}
                                        <span className="text-muted-foreground">{selectedRequest.postal}</span>
                                    </p>
                                    <p>
                                        <span className="font-medium text-foreground">Country:</span>{' '}
                                        <span className="text-muted-foreground">{selectedRequest.country}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Tracking Information */}
                            {selectedRequest.tracking_number && (
                                <div>
                                    <h3 className="text-label text-muted-foreground mb-3 uppercase tracking-wide">Tracking</h3>
                                    <div className="space-y-2 text-body-sm">
                                        <p>
                                            <span className="font-medium text-foreground">Tracking Number:</span>{' '}
                                            <span className="text-muted-foreground font-mono">{selectedRequest.tracking_number}</span>
                                        </p>
                                        {selectedRequest.courier && (
                                            <p>
                                                <span className="font-medium text-foreground">Courier:</span>{' '}
                                                <span className="text-muted-foreground">{selectedRequest.courier}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Request Date */}
                            <div>
                                <h3 className="text-label text-muted-foreground mb-3 uppercase tracking-wide">Request Information</h3>
                                <div className="space-y-2 text-body-sm">
                                    <p>
                                        <span className="font-medium text-foreground">Request ID:</span>{' '}
                                        <span className="text-muted-foreground">#{selectedRequest.id}</span>
                                    </p>
                                    <p>
                                        <span className="font-medium text-foreground">Mail Item ID:</span>{' '}
                                        <span className="text-muted-foreground">#{selectedRequest.mail_item_id}</span>
                                    </p>
                                    <p>
                                        <span className="font-medium text-foreground">Requested:</span>{' '}
                                        <span className="text-muted-foreground">{formatDate(selectedRequest.created_at)}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
