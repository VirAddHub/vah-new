"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Truck, Mail, Clock, CheckCircle } from 'lucide-react';
import { ForwardingRequestModal } from '@/components/ForwardingRequestModal';

interface MailItem {
    id: string;
    subject: string;
    sender_name: string;
    created_at: string;
    tag: string;
    forwarding_status?: string;
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
    const router = useRouter();
    const [mailItems, setMailItems] = useState<MailItem[]>([]);
    const [forwardingRequests, setForwardingRequests] = useState<ForwardingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForwardingModal, setShowForwardingModal] = useState(false);
    const [selectedMailForForwarding, setSelectedMailForForwarding] = useState<MailItem | null>(null);

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

            // Load mail items
            const mailResponse = await fetch('/api/mail', {
                credentials: 'include',
            });
            if (mailResponse.ok) {
                const mailData = await mailResponse.json();
                setMailItems(mailData.items || []);
            }

            // Load forwarding requests
            const forwardingResponse = await fetch('/api/forwarding/requests', {
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
        setSelectedMailForForwarding(mailItem);
        setShowForwardingModal(true);
    };

    const handleForwardingSubmit = async (data: any) => {
        if (!selectedMailForForwarding) return;

        try {
            const response = await fetch('/api/forwarding/requests', {
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
                    alert('Forwarding request created successfully! Your request will be reviewed by our team.');
                    setShowForwardingModal(false);
                    setSelectedMailForForwarding(null);
                    loadData(); // Refresh data
                } else {
                    alert('Failed to create forwarding request: ' + (result.error || 'Unknown error'));
                }
            } else {
                alert('Failed to create forwarding request. Please try again.');
            }
        } catch (error) {
            console.error('Error creating forwarding request:', error);
            alert('Error creating forwarding request. Please try again.');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Requested': return 'bg-yellow-100 text-yellow-800';
            case 'Reviewed': return 'bg-blue-100 text-blue-800';
            case 'Processing': return 'bg-purple-100 text-purple-800';
            case 'Dispatched': return 'bg-orange-100 text-orange-800';
            case 'Delivered': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading forwarding page...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="outline" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Mail Forwarding</h1>
                        <p className="text-muted-foreground">Request forwarding for your mail items</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Available Mail Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5" />
                                Available Mail Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {mailItems.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">No mail items available for forwarding</p>
                            ) : (
                                <div className="space-y-4">
                                    {mailItems.map((item) => (
                                        <div key={item.id} className="border rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-medium">{item.subject || 'No Subject'}</h3>
                                                {item.forwarding_status && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {item.forwarding_status}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                From: {item.sender_name || 'Unknown'}
                                            </p>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                Received: {new Date(Number(item.created_at)).toLocaleDateString()}
                                            </p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleRequestForwarding(item)}
                                                disabled={item.forwarding_status === 'Processing' || item.forwarding_status === 'Dispatched'}
                                            >
                                                <Truck className="h-4 w-4 mr-2" />
                                                Request Forwarding
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Forwarding Requests */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="h-5 w-5" />
                                Your Forwarding Requests
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {forwardingRequests.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">No forwarding requests yet</p>
                            ) : (
                                <div className="space-y-4">
                                    {forwardingRequests.map((request) => (
                                        <div key={request.id} className="border rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-medium">Request #{request.id}</h3>
                                                <Badge className={getStatusColor(request.status)}>
                                                    <span className="flex items-center gap-1">
                                                        {getStatusIcon(request.status)}
                                                        {request.status}
                                                    </span>
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-1">
                                                To: {request.to_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground mb-1">
                                                {request.address1}, {request.city}, {request.postal}, {request.country}
                                            </p>
                                            {request.tracking_number && (
                                                <p className="text-sm text-muted-foreground mb-1">
                                                    Tracking: {request.tracking_number}
                                                </p>
                                            )}
                                            {request.courier && (
                                                <p className="text-sm text-muted-foreground mb-1">
                                                    Courier: {request.courier}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                Created: {new Date(request.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
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
        </div>
    );
}
