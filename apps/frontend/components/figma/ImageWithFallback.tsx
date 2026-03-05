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
    sizes?: string;
    quality?: number;
};

/** Use unoptimized <img> for API or relative paths to avoid INVALID_IMAGE_OPTIMIZE_REQUEST (Vercel) when optimizer can't fetch the URL */
function useUnoptimized(src: string): boolean {
    if (!src || typeof src !== 'string') return true;
    const s = src.trim();
    return s.startsWith('/api/') || s.startsWith('data:');
}

export function ImageWithFallback({
    src,
    alt,
    className,
    width = 800,
    height = 600,
    priority = false,
    fallbackSrc,
    sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
    quality = 75,
}: ImageWithFallbackProps) {
    const [currentSrc, setCurrentSrc] = useState(src);
    const [optimizerFailed, setOptimizerFailed] = useState(false);
    const unoptimized = useUnoptimized(currentSrc) || optimizerFailed;

    if (unoptimized) {
        return (
            <img
                src={currentSrc}
                alt={alt}
                className={className}
                width={width}
                height={height}
                decoding="async"
                onError={() => {
                    if (fallbackSrc && currentSrc !== fallbackSrc) {
                        setCurrentSrc(fallbackSrc);
                    }
                }}
            />
        );
    }

    return (
        <Image
            src={currentSrc}
            alt={alt}
            className={className}
            width={width}
            height={height}
            priority={priority}
            sizes={sizes}
            quality={quality}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
            onError={() => {
                if (fallbackSrc && currentSrc !== fallbackSrc) {
                    setCurrentSrc(fallbackSrc);
                } else {
                    setOptimizerFailed(true);
                }
            }}
        />
    );
}
