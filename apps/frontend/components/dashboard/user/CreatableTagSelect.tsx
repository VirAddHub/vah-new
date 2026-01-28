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
}

/**
 * Normalize tag to lowercase slug format
 */
function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '') || 'untagged';
}

export function CreatableTagSelect({
  value,
  availableTags,
  onValueChange,
  getTagLabel,
  className,
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
      const filtered = availableTags.filter(tag =>
        tag.toLowerCase().includes(normalized) || normalized.includes(tag.toLowerCase())
      );
      setFilteredTags(filtered);
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
    if (normalized === 'untagged') {
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
  const isCreatingNew = inputValue.trim() && !availableTags.includes(normalizeTag(inputValue));

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
        className={cn(
          'h-9 w-[140px] text-sm border-neutral-200 bg-white hover:bg-neutral-50 justify-start transition-colors duration-150',
          'focus:ring-1 focus:ring-primary'
        )}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className={cn('h-2 w-2 rounded-full flex-shrink-0', getTagColor(currentTag))} />
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0 opacity-50" />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-[240px] rounded-md border border-neutral-200 bg-white shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Input Field */}
          <div className="p-2 border-b border-neutral-200">
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type to search or create..."
              className="h-8 text-sm"
              autoFocus
            />
            {isCreatingNew && (
              <div className="mt-1 text-xs text-neutral-600 flex items-center gap-1">
                <Plus className="h-3 w-3" strokeWidth={2} />
                <span>Press Enter to create "{normalizeTag(inputValue)}"</span>
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
                'w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 transition-colors duration-150',
                'flex items-center gap-1.5',
                !currentTag && 'bg-neutral-50'
              )}
            >
              <div className="h-2 w-2 rounded-full bg-gray-300" />
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
                      'w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 transition-colors duration-150',
                      'flex items-center gap-1.5',
                      currentTag === tag && 'bg-neutral-50'
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
              <div className="px-3 py-2 text-xs text-neutral-500 text-center">
                No matching tags
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
