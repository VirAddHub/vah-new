import { Mail, ScanLine, Clock, Shield } from "lucide-react";
import { Badge } from "./ui/badge";

interface MailboxPreviewCardProps {
  showPriceBadge?: boolean;
  price?: string;
}

export function MailboxPreviewCard({ 
  showPriceBadge = true, 
  price = "£9.99/mo" 
}: MailboxPreviewCardProps) {
  return (
    <div className="relative">
      <div className="relative rounded-3xl bg-card border border-border p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">VirtualAddressHub</p>
              <p className="text-xs text-muted-foreground">
                Your Mail Dashboard
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="rounded-full">
            3 New
          </Badge>
        </div>

        {/* Mail Items Preview */}
        <div className="space-y-3">
          {[
            {
              sender: "HMRC",
              subject: "VAT Return Notice",
              tag: "Free Forward",
              urgent: true,
            },
            {
              sender: "Companies House",
              subject: "Annual Confirmation",
              tag: "Free Forward",
              urgent: false,
            },
            {
              sender: "Barclays Bank",
              subject: "Account Statement",
              tag: "Scanned",
              urgent: false,
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl bg-muted/50 p-4 hover:bg-muted transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ScanLine className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {item.sender}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.subject}
                </p>
              </div>
              <Badge
                variant={item.urgent ? "default" : "secondary"}
                className="text-xs"
              >
                {item.tag}
              </Badge>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Scanned today
          </span>
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Secure & Private
          </span>
        </div>
      </div>

      {/* Floating badge */}
      {showPriceBadge && (
        <div className="absolute -bottom-4 -right-4 bg-primary text-primary-foreground px-6 py-3 rounded-2xl shadow-lg">
          <p className="text-xs uppercase tracking-wide opacity-90">
            Live in Minutes
          </p>
          <p className="text-2xl font-bold">{price}</p>
        </div>
      )}
    </div>
  );
}
