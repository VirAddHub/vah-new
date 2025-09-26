"use client";

import React, { useState } from 'react';
import Image from 'next/image';

type ImageWithFallbackProps = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  fallbackSrc?: string;
};

export function ImageWithFallback({
  src,
  alt,
  className,
  width = 800,
  height = 600,
  priority,
  fallbackSrc,
}: ImageWithFallbackProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  return (
    <Image
      src={currentSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      priority={priority}
      onError={() => {
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}
