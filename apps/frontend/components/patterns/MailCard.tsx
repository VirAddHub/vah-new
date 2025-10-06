import { Eye, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { PDFViewerModal } from '../PDFViewerModal';
import { useState } from 'react';
import type { MailItem, MailItemDetails } from '../../types/mail';

interface Props {
  item: MailItem;
  isExpanded: boolean;
  isLoading: boolean;
  isDownloading: boolean;
  details?: MailItemDetails | null;
  onToggle: (item: MailItem) => void;
  onDownload: (id: string) => void;
  error?: string | null;
}

export default function MailCard({
  item, isExpanded, isLoading, isDownloading, details, onToggle, onDownload, error
}: Props) {
  const [showPDFModal, setShowPDFModal] = useState(false);

  const handleViewPDF = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPDFModal(true);
  };

  return (
    <>
    <Card className="transition-all">
      <CardContent className="p-4 space-y-3">

        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="font-medium truncate">{item.subject || 'No subject'}</div>
            <div className="text-sm text-muted-foreground truncate">
              {item.sender_name || 'Unknown sender'}
            </div>
          </div>
          <div className="text-xs px-2 py-0.5 rounded-full border">
            {item.status}
          </div>
        </div>

        {details && (
          <div className="space-y-2">
            {details.notes && <p className="text-sm text-muted-foreground">{details.notes}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleViewPDF}
            variant="outline"
            className="flex-1 h-10"
            disabled={isLoading || !details?.scan_url}
            aria-label="View PDF"
          >
            {isLoading ? <Eye className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
            View Mail
          </Button>

          <Button
            onClick={() => onDownload(item.id)}
            variant="outline"
            className="flex-1 h-10"
            disabled={isDownloading || !details?.scan_url}
            aria-label="Download PDF scan"
          >
            {isDownloading ? <Download className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Download
          </Button>
        </div>
      </CardContent>
    </Card>

    <PDFViewerModal
      isOpen={showPDFModal}
      onClose={() => setShowPDFModal(false)}
      mailItemId={parseInt(item.id)}
      mailItemSubject={item.subject || 'Mail Scan Preview'}
      useBlobFallback={false} // Try iframe first, fallback to blob if needed
    />
    </>
  );
}