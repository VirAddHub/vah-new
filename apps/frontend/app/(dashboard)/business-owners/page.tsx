'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Plus, Mail, CheckCircle2, XCircle, Clock, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

interface BusinessOwner {
    id: number;
    fullName: string;
    email: string;
    kycIdStatus: 'not_started' | 'pending' | 'approved' | 'rejected';
    kycUpdatedAt: string | null;
    createdAt: string;
}

export default function BusinessOwnersPage() {
    const router = useRouter();
    const [owners, setOwners] = useState<BusinessOwner[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newOwnerName, setNewOwnerName] = useState('');
    const [newOwnerEmail, setNewOwnerEmail] = useState('');
    const [resending, setResending] = useState<number | null>(null);

    useEffect(() => {
        fetchOwners();
    }, []);

    const fetchOwners = async () => {
        try {
            const response = await fetch('/api/bff/business-owners', {
                credentials: 'include',
            });
            const result = await response.json();
            if (result.ok && result.data) {
                setOwners(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch business owners:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddOwner = async () => {
        if (!newOwnerName.trim() || !newOwnerEmail.trim()) {
            toast({
                title: 'Error',
                description: 'Please fill in both name and email',
                variant: 'destructive',
            });
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newOwnerEmail.trim())) {
            toast({
                title: 'Error',
                description: 'Please enter a valid email address',
                variant: 'destructive',
            });
            return;
        }

        setIsAdding(true);
        try {
            const response = await fetch('/api/bff/business-owners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    fullName: newOwnerName.trim(),
                    email: newOwnerEmail.trim(),
                }),
            });

            const result = await response.json();
            if (result.ok) {
                toast({
                    title: 'Success',
                    description: 'Business owner added and verification email sent',
                });
                setIsAddDialogOpen(false);
                setNewOwnerName('');
                setNewOwnerEmail('');
                fetchOwners();
            } else {
                throw new Error(result.error?.message || 'Failed to add business owner');
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to add business owner',
                variant: 'destructive',
            });
        } finally {
            setIsAdding(false);
        }
    };

    const handleResend = async (ownerId: number) => {
        setResending(ownerId);
        try {
            const response = await fetch(`/api/bff/business-owners/${ownerId}/resend`, {
                method: 'POST',
                credentials: 'include',
            });

            const result = await response.json();
            if (result.ok) {
                toast({
                    title: 'Success',
                    description: 'Verification email resent',
                });
            } else {
                throw new Error(result.error?.message || 'Failed to resend email');
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to resend email',
                variant: 'destructive',
            });
        } finally {
            setResending(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                    </Badge>
                );
            case 'pending':
                return (
                    <Badge variant="default" className="bg-amber-500">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Not started
                    </Badge>
                );
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="safe-pad mx-auto max-w-4xl py-8">
                <div className="mb-6">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to dashboard
                    </Link>
                    <h1 className="text-3xl font-bold mb-2">Business Owners</h1>
                    <p className="text-muted-foreground">
                        Manage directors, owners, and controllers who need identity verification
                    </p>
                </div>

                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Owners List
                                </CardTitle>
                                <CardDescription>
                                    Additional directors/owners must complete identity verification
                                </CardDescription>
                            </div>
                            <Button onClick={() => setIsAddDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Owner
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {owners.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No business owners added yet</p>
                                <p className="text-sm mt-2">Add owners to complete verification</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {owners.map((owner) => (
                                    <div
                                        key={owner.id}
                                        className="flex items-center justify-between p-4 border rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-medium">{owner.fullName}</h3>
                                                {getStatusBadge(owner.kycIdStatus)}
                                            </div>
                                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                <Mail className="h-3 w-3" />
                                                {owner.email}
                                            </p>
                                            {owner.kycUpdatedAt && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Last updated: {new Date(owner.kycUpdatedAt).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                        {owner.kycIdStatus === 'not_started' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleResend(owner.id)}
                                                disabled={resending === owner.id}
                                            >
                                                {resending === owner.id ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Sending...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Mail className="h-4 w-4 mr-2" />
                                                        Resend invite
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Alert>
                    <AlertDescription>
                        <strong>Note:</strong> Business owners will receive an email with a verification link. They must complete identity verification (no VAH account required) before your account can be fully activated.
                    </AlertDescription>
                </Alert>
            </div>

            {/* Add Owner Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Business Owner</DialogTitle>
                        <DialogDescription>
                            Enter the details of the director/owner/controller. They will receive an email to complete identity verification.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="owner-name">Full Name</Label>
                            <Input
                                id="owner-name"
                                value={newOwnerName}
                                onChange={(e) => setNewOwnerName(e.target.value)}
                                placeholder="John Smith"
                                disabled={isAdding}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="owner-email">Email Address</Label>
                            <Input
                                id="owner-email"
                                type="email"
                                value={newOwnerEmail}
                                onChange={(e) => setNewOwnerEmail(e.target.value)}
                                placeholder="john.smith@example.com"
                                disabled={isAdding}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsAddDialogOpen(false)}
                            disabled={isAdding}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleAddOwner} disabled={isAdding}>
                            {isAdding ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Owner
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

