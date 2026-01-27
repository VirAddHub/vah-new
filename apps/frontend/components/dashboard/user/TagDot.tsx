'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// Deterministic tag color system - same tag always gets same color
const TAG_COLORS: Record<string, string> = {
  bank: 'bg-blue-500',
  hmrc: 'bg-purple-500',
  companies_house: 'bg-green-500',
  companieshouse: 'bg-green-500',
  insurance: 'bg-amber-500',
  utilities: 'bg-cyan-500',
  other: 'bg-gray-500',
  default: 'bg-gray-400',
};

/**
 * Get deterministic color for a tag
 * Normalizes tag name (lowercase + trim) before lookup
 */
export function getTagColor(tag: string | null | undefined): string {
  if (!tag) return TAG_COLORS.default;
  const normalized = tag.toLowerCase().trim();
  return TAG_COLORS[normalized] || TAG_COLORS.default;
}

interface TagDotProps {
  tag: string | null | undefined;
  label?: string;
  className?: string;
  showDot?: boolean;
}

/**
 * TagDot component - displays a tag with a small colored dot
 * Calm, Outlook/Linear/Notion-style design
 * Shows "Untagged" with muted color for null tags
 */
export function TagDot({ tag, label, className, showDot = true }: TagDotProps) {
  // Show "Untagged" for null/undefined tags
  const isUntagged = !tag;
  const displayLabel = label || (isUntagged ? 'Untagged' : tag);
  // Use muted gray color for untagged items
  const colorClass = isUntagged ? 'bg-gray-300' : getTagColor(tag);

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {showDot && (
        <div className={cn('h-2 w-2 rounded-full flex-shrink-0', colorClass)} />
      )}
      <span className={cn(
        "text-sm font-normal",
        isUntagged ? "text-[#999999]" : "text-[#666666]"
      )}>
        {displayLabel}
      </span>
    </div>
  );
}
