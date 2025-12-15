import { Eye, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import type { MailItem, MailItemDetails } from '../../types';

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
  const title = String((item as any).user_title || item.subject || "Mail item").trim();

  return (
    <Card className={`transition-all ${isExpanded ? 'ring-2 ring-primary/20 bg-muted/30' : ''}`}>
      <CardContent className="p-4 space-y-3">

        <button
          type="button"
          className="w-full text-left cursor-pointer active:opacity-70 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
          onClick={() => onToggle(item)}
          disabled={isLoading}
          aria-expanded={isExpanded}
          aria-controls={`mail-details-${item.id}`}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-medium truncate">{title || 'Mail item'}</div>
            </div>
            <div className="text-xs px-2 py-0.5 rounded-full border">
              {item.status}
            </div>
          </div>
        </button>

        {isExpanded && details && (
          <div id={`mail-details-${item.id}`} className="pt-3 border-t space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {details.notes && <p className="text-sm text-muted-foreground">{details.notes}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => onToggle(item)}
            variant={isExpanded ? 'primary' : 'ghost'}
            className="flex-1 h-10"
            disabled={isLoading}
            aria-label={isExpanded ? 'Close mail' : 'View mail'}
          >
            {isLoading ? <Eye className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
            {isExpanded ? 'Close' : 'View'}
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
  );
}