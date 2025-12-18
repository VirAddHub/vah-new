'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BusinessOwner } from '@/lib/account/types';

interface OwnersCardProps {
  owners: BusinessOwner[];
}

export function OwnersCard({ owners }: OwnersCardProps) {
  const getStatusBadge = (owner: BusinessOwner) => {
    if (owner.status === 'verified') {
      return <Badge className="bg-green-600">Verified</Badge>;
    } else if (owner.requires_verification) {
      return <Badge variant="destructive">Verification required</Badge>;
    } else {
      return <Badge variant="secondary">Not required</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Owners (PSC)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            A Person with Significant Control (PSC) is someone who owns or controls the company.
            Verification is only required when someone meets the legal PSC thresholds.
          </p>
          <p className="text-sm text-muted-foreground">
            PSC details are not currently collected in the dashboard. This section will be updated
            when owner management features become available.
          </p>
        </div>

        {owners.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">No business owners added in dashboard yet.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Status</TableHead>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
