'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { InvoiceRow } from '@/lib/account/types';

interface InvoicesCardProps {
  invoices: InvoiceRow[];
}

export function InvoicesCard({ invoices }: InvoicesCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-600">Paid</Badge>;
      case 'not_paid':
        return <Badge variant="destructive">Not paid</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'void':
        return <Badge variant="secondary">Void</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed rounded-lg">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No invoices yet</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.invoice_no}>
                    <TableCell className="font-medium">{invoice.invoice_no}</TableCell>
                    <TableCell>{invoice.description}</TableCell>
                    <TableCell>{invoice.total_label}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>{invoice.date_label}</TableCell>
                    <TableCell className="text-right">
                      {invoice.download_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // BFF route already normalizes to /api/bff/billing/invoices/{id}/download
                            const url = invoice.download_url;
                            // Open in new tab for download
                            const link = document.createElement('a');
                            link.href = url;
                            link.target = '_blank';
                            link.download = `invoice-${invoice.invoice_no}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          Download PDF
                        </Button>
                      )}
                    </TableCell>
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
