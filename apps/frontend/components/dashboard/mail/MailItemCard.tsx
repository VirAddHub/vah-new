"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tag, Archive, Send, Eye, Download } from "lucide-react";

interface MailItemCardProps {
  title: string;
  date?: string;
  tag?: string | null;
  isArchived?: boolean;
  isRead?: boolean;
  onTag: () => void;
  onArchive: () => void;
  onForward: () => void;
  onOpen: () => void;
  onDownload: () => void;
  onRestore?: () => void;
  disabled?: boolean;
}

export function MailItemCard({
  title,
  date,
  tag,
  isArchived = false,
  isRead = true,
  onTag,
  onArchive,
  onForward,
  onOpen,
  onDownload,
  onRestore,
  disabled = false,
}: MailItemCardProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-3 sm:p-4 hover:shadow-md transition-all">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        {/* Left: Title and Date */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
          <h4 className="text-[15px] sm:text-[16px] font-medium text-neutral-800 truncate">
            {title}
          </h4>
            {!isRead && (
              <Badge className="bg-primary text-white text-xs px-1.5 py-0.5 shrink-0">
                New
              </Badge>
            )}
          </div>
          {date && (
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              {date}
            </p>
          )}
        </div>

        {/* Right: Tag Badge */}
        <Badge
          className={`shrink-0 ${
            tag && tag !== "Untagged"
              ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/10"
              : "bg-neutral-50 border-neutral-200 text-neutral-500 hover:bg-neutral-50"
          }`}
          variant="outline"
        >
          {tag || "Untagged"}
        </Badge>
      </div>

      {/* Actions Row */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {/* Tag Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onTag}
          disabled={disabled}
          className="h-8"
          aria-label="Tag mail item"
        >
          <Tag className="h-4 w-4 mr-1.5" />
          Tag
        </Button>

        {/* Archive/Restore Button */}
        {isArchived && onRestore ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onRestore}
            disabled={disabled}
            className="h-8"
            aria-label="Restore mail item"
          >
            <Archive className="h-4 w-4 mr-1.5" />
            Restore
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onArchive}
            disabled={disabled}
            className="h-8"
            aria-label="Archive mail item"
          >
            <Archive className="h-4 w-4 mr-1.5" />
            Archive
          </Button>
        )}

        {/* Forward Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onForward}
          disabled={disabled}
          className="h-8"
          aria-label="Forward mail item"
        >
          <Send className="h-4 w-4 mr-1.5" />
          Forward
        </Button>

        {/* Open Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpen}
          disabled={disabled}
          className="h-8"
          aria-label="Open mail item"
        >
          <Eye className="h-4 w-4 mr-1.5" />
          Open
        </Button>

        {/* Download Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          disabled={disabled}
          className="h-8"
          aria-label="Download mail item"
        >
          <Download className="h-4 w-4 mr-1.5" />
          Download
        </Button>
      </div>
    </div>
  );
}

