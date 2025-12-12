"use client";

import { Badge } from "@/components/ui/badge";
import { Building2, FileText, Landmark } from "lucide-react";

interface MailItemCardProps {
  sender: string;
  subject?: string;
  timeLabel?: string;
  statusLabel?: "New" | "Scanned" | "Forwarded" | "Received";
  statusVariant?: "new" | "scanned" | "forwarded" | "neutral";
  mailType?: "gov" | "bank" | "file";
  isRead?: boolean;
  onOpen: () => void;
}

export function MailItemCard({
  sender,
  subject,
  timeLabel,
  statusLabel = "Received",
  statusVariant = "neutral",
  mailType = "file",
  isRead = true,
  onOpen,
}: MailItemCardProps) {
  const Icon = mailType === "bank" ? Landmark : mailType === "gov" ? Building2 : FileText;
  const iconBg =
    mailType === "gov"
      ? "bg-red-50"
      : mailType === "bank"
        ? "bg-neutral-100"
        : "bg-neutral-100";
  const iconColor =
    mailType === "gov"
      ? "text-red-600"
      : mailType === "bank"
        ? "text-neutral-900"
        : "text-neutral-900";

  const badgeClass =
    statusVariant === "new"
      ? "bg-blue-600 text-white border-transparent"
      : statusVariant === "forwarded"
        ? "bg-emerald-600 text-white border-transparent"
        : statusVariant === "scanned"
          ? "bg-neutral-200 text-neutral-700 border-transparent"
          : "bg-neutral-200 text-neutral-700 border-transparent";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left bg-white hover:bg-neutral-50 transition-colors"
    >
      <div className="flex items-center gap-4 px-4 sm:px-6 py-5">
        {/* icon */}
        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-7 w-7 ${iconColor}`} />
        </div>

        {/* title/subtitle */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-2xl font-semibold text-neutral-900 truncate">{sender}</div>
            {!isRead && <span className="h-3 w-3 rounded-full bg-blue-600 shrink-0" aria-label="Unread" />}
          </div>
          {subject && (
            <div className="mt-1 text-xl text-neutral-500 truncate">{subject}</div>
          )}
        </div>

        {/* right meta */}
        <div className="shrink-0 text-right">
          {timeLabel && <div className="text-lg text-neutral-500">{timeLabel}</div>}
          <div className="mt-2">
            <Badge className={`rounded-full px-4 py-1 text-base font-medium ${badgeClass}`}>
              {statusLabel}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

