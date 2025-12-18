'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { BusinessOwner } from '@/lib/account/types';
import { OwnerDialog } from './OwnerDialog';
import { toast } from '@/hooks/use-toast';

interface OwnersCardProps {
  owners: BusinessOwner[];
  onAdd: (owner: Omit<BusinessOwner, 'id' | 'status' | 'requires_verification' | 'proof_of_address_status' | 'id_status'> & { id?: string | number }) => Promise<void>;
  onEdit: (owner: BusinessOwner) => Promise<void>;
  onRemove: (ownerId: string | number) => Promise<void>;
  onVerify: (ownerId: string | number) => Promise<void>;
}

export function OwnersCard({ owners, onAdd, onEdit, onRemove, onVerify }: OwnersCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<BusinessOwner | null>(null);
  const [removingOwnerId, setRemovingOwnerId] = useState<string | number | null>(null);

  const handleEdit = (owner: BusinessOwner) => {
    setEditingOwner(owner);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingOwner(null);
    setDialogOpen(true);
  };

  const handleSave = async (ownerData: any) => {
    if (editingOwner) {
      // Preserve verified status - never downgrade
      const updatedOwner: BusinessOwner = {
        ...editingOwner,
        ...ownerData,
        status: editingOwner.status === 'verified' ? 'verified' : editingOwner.status,
        requires_verification: ownerData.requires_verification
      };
      await onEdit(updatedOwner);
    } else {
      await onAdd(ownerData);
    }
    setDialogOpen(false);
    setEditingOwner(null);
  };

  const handleRemove = async () => {
    if (removingOwnerId) {
      await onRemove(removingOwnerId);
      setRemovingOwnerId(null);
    }
  };

  const handleVerify = async (ownerId: string | number) => {
    // TODO: Implement Sumsub verification flow
    toast({
      title: "Coming soon",
      description: "Verification will be requested for this owner.",
    });
    // await onVerify(ownerId);
  };

  const getStatusBadge = (owner: BusinessOwner) => {
    if (owner.status === 'verified') {
      return <Badge className="bg-green-600">Verified</Badge>;
    } else if (owner.requires_verification) {
      return <Badge variant="destructive">Verification required</Badge>;
    } else {
      return <Badge variant="secondary">Not required</Badge>;
    }
  };

  const getProofBadge = (status?: string) => {
    if (status === 'verified') {
      return <Badge variant="outline" className="text-green-600">Verified</Badge>;
    } else if (status === 'pending') {
      return <Badge variant="outline" className="text-amber-600">Pending</Badge>;
    } else {
      return <Badge variant="outline" className="text-gray-500">Missing</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Manage your Business Owners</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              A Person with Significant Control (PSC) is someone who owns or controls the company.
            </p>
            <p className="text-sm text-muted-foreground">
              Verification is only required when someone meets the legal PSC thresholds.
            </p>
          </div>

          {owners.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">No business owners added yet</p>
              <Button onClick={handleAdd} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add business owner
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <Button onClick={handleAdd} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add business owner
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Proof of Address</TableHead>
                      <TableHead>Identification</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {owners.map((owner) => (
                      <TableRow key={owner.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {owner.first_name} {owner.middle_names} {owner.last_name}
                            </div>
                            {owner.email && (
                              <div className="text-sm text-muted-foreground">{owner.email}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(owner)}</TableCell>
                        <TableCell>{getProofBadge(owner.proof_of_address_status)}</TableCell>
                        <TableCell>{getProofBadge(owner.id_status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {owner.requires_verification && owner.status !== 'verified' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleVerify(owner.id)}
                                className="flex items-center gap-1"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Verify now
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(owner)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRemovingOwnerId(owner.id)}
                              className="flex items-center gap-1 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <OwnerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        owner={editingOwner}
        onSave={handleSave}
      />

      <AlertDialog open={removingOwnerId !== null} onOpenChange={(open) => !open && setRemovingOwnerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove business owner?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The owner will be removed from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
