'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getTagColor, TagDot } from './TagDot';

interface CreatableTagSelectProps {
  value: string | null;
  availableTags: string[];
  onValueChange: (value: string | null) => void;
  getTagLabel: (tag: string | null) => string;
  className?: string;
  /** Small corner-style trigger for narrow layouts (e.g. mobile mail rows). */
  compact?: boolean;
}

/**
 * Normalize tag to lowercase slug format
 * Returns null for empty/invalid tags (treated as "untagged")
 */
function normalizeTag(tag: string): string | null {
  const normalized = tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized.length > 0 ? normalized : null;
}

export function CreatableTagSelect({
  value,
  availableTags,
  onValueChange,
  getTagLabel,
  className,
  compact = false,
}: CreatableTagSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter tags based on input
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredTags(availableTags);
    } else {
      const normalized = normalizeTag(inputValue);
      if (normalized) {
        const filtered = availableTags.filter(tag =>
          tag.toLowerCase().includes(normalized) || normalized.includes(tag.toLowerCase())
        );
        setFilteredTags(filtered);
      } else {
        setFilteredTags([]);
      }
    }
  }, [inputValue, availableTags]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setInputValue('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectTag = (tag: string | null) => {
    onValueChange(tag);
    setIsOpen(false);
    setInputValue('');
  };

  const handleCreateTag = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      handleSelectTag(null);
      return;
    }

    const normalized = normalizeTag(trimmed);
    if (normalized === null) {
      handleSelectTag(null);
      return;
    }

    handleSelectTag(normalized);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTag();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputValue('');
    }
  };

  const currentTag = value || null;
  const displayLabel = getTagLabel(currentTag);
  const normalizedInput = normalizeTag(inputValue);
  const isCreatingNew = inputValue.trim() && normalizedInput !== null && !availableTags.includes(normalizedInput);

  const triggerLabel = compact && !currentTag ? 'Tag' : displayLabel;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label={
          currentTag
            ? `Tag: ${getTagLabel(currentTag)}. Change tag.`
            : 'Add or change tag'
        }
        className={cn(
          'border-border justify-start transition-colors duration-150 shadow-none',
          'focus-visible:ring-1 focus-visible:ring-primary',
          compact
            ? 'h-8 w-auto shrink-0 px-2 gap-1 rounded-md bg-muted/30 hover:bg-muted/50 text-caption font-medium text-muted-foreground hover:text-foreground border-border/80'
            : 'h-9 w-full min-w-0 sm:w-[140px] max-w-full text-body-sm bg-card hover:bg-muted/50'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-1 min-w-0',
            compact ? 'max-w-[4.75rem]' : 'gap-1.5 flex-1'
          )}
        >
          <div className={cn('h-2 w-2 rounded-full flex-shrink-0', getTagColor(currentTag))} />
          <span className={cn('truncate', compact ? 'text-[11px] leading-tight' : '')}>
            {triggerLabel}
          </span>
        </div>
        <ChevronDown
          className={cn('flex-shrink-0 opacity-60', compact ? 'h-3 w-3 ml-0' : 'h-3 w-3 ml-1')}
        />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-[min(240px,calc(100vw-2rem))] rounded-md border border-border bg-card shadow-lg',
            compact && 'right-0 left-auto'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Input Field */}
          <div className="p-2 border-b border-border">
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type to search or create..."
              className="h-8 text-body-sm"
              autoFocus
            />
            {isCreatingNew && normalizedInput && (
              <div className="mt-1 text-caption text-muted-foreground flex items-center gap-1">
                <Plus className="h-3 w-3" strokeWidth={2} />
                <span>Press Enter to create "{normalizedInput}"</span>
              </div>
            )}
          </div>

          {/* Suggestions List */}
          <div className="max-h-[200px] overflow-y-auto">
            {/* Untagged Option */}
            <button
              type="button"
              onClick={() => handleSelectTag(null)}
              className={cn(
                'w-full px-3 py-2 text-left text-body-sm hover:bg-muted/50 transition-colors duration-150',
                'flex items-center gap-1.5',
                !currentTag && 'bg-muted/50'
              )}
            >
              <div className="h-2 w-2 rounded-full bg-muted" />
              <span>Untagged</span>
            </button>

            {/* Existing Tags */}
            {filteredTags.length > 0 && (
              <>
                {filteredTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSelectTag(tag)}
                    className={cn(
                      'w-full px-3 py-2 text-left text-body-sm hover:bg-muted/50 transition-colors duration-150',
                      'flex items-center gap-1.5',
                      currentTag === tag && 'bg-muted/50'
                    )}
                  >
                    <div className={cn('h-2 w-2 rounded-full', getTagColor(tag))} />
                    <span>{getTagLabel(tag)}</span>
                  </button>
                ))}
              </>
            )}

            {/* No matches message */}
            {inputValue.trim() && filteredTags.length === 0 && !isCreatingNew && (
              <div className="px-3 py-2 text-caption text-muted-foreground text-center">
                No matching tags
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
