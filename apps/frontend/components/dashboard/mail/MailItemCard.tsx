"use client";

import { Badge } from "@/components/ui/badge";
import { Building2, FileText, Landmark } from "lucide-react";

interface MailItemCardProps {
  sender: string;
  timeLabel?: string;
  statusLabel?: "New" | "Scanned" | "Forwarded" | "Received";
  statusVariant?: "new" | "scanned" | "forwarded" | "neutral";
  mailType?: "gov" | "bank" | "file";
  isRead?: boolean;
  onOpen: () => void;
}

export function MailItemCard({
  sender,
  timeLabel,
  statusLabel = "Received",
  statusVariant = "neutral",
  mailType = "file",
  isRead = true,
  onOpen,
}: MailItemCardProps) {
  const isUnread = !isRead;
  const Icon = mailType === "bank" ? Landmark : mailType === "gov" ? Building2 : FileText;
  // Keep icon colour consistent across all categories (no tag-based red/black)
  const iconBg = "bg-muted";
  const iconColor = "text-foreground";

  const showStatusPill = statusVariant !== "scanned" && statusLabel !== "Scanned";
  const displayStatusLabel: MailItemCardProps["statusLabel"] =
    statusVariant === "scanned" || statusLabel === "Scanned" ? "Received" : statusLabel;

  const badgeClass =
    statusVariant === "new"
      ? "bg-blue-600 text-primary-foreground border-transparent"
      : statusVariant === "forwarded"
        ? "bg-primary text-primary-foreground border-transparent"
        : statusVariant === "scanned"
          ? "bg-muted text-foreground border-transparent"
          : "bg-muted text-foreground border-transparent";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full text-left transition-colors ${isUnread ? "bg-blue-50/50 hover:bg-blue-50" : "bg-card hover:bg-muted/50"}`}
    >
      {/* Mobile: dense row (no badges) */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`text-body-sm truncate ${isUnread ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>{sender}</div>
            {isUnread && <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" aria-label="Unread" />}
          </div>
          <div className="mt-0.5 text-caption text-muted-foreground truncate">
            {displayStatusLabel}
          </div>
        </div>
      </div>

      {/* Desktop: current row (kept as-is) */}
      <div className="hidden md:flex items-center gap-4 px-4 sm:px-6 py-5">
        {/* icon */}
        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-7 w-7 ${iconColor}`} />
        </div>

        {/* title/subtitle */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`text-h2 text-foreground truncate ${isUnread ? "font-bold" : "font-semibold"}`}>{sender}</div>
            {isUnread && <span className="h-3 w-3 rounded-full bg-blue-600 shrink-0" aria-label="Unread" />}
          </div>
        </div>

        {/* right meta */}
        <div className="shrink-0 text-right">
          {showStatusPill && (
            <Badge className={`rounded-full px-4 py-1 text-body font-medium ${badgeClass}`}>
              {displayStatusLabel}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

