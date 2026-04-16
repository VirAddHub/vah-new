'use client';

import { useEffect, useState } from 'react';

export function FontLoader() {
    const [fontsLoaded, setFontsLoaded] = useState(false);

    useEffect(() => {
        // Check if fonts are loaded
        const checkFonts = async () => {
            try {
                // Check if FontFace API is available
                if ('fonts' in document) {
                    await document.fonts.ready;

                    // Poppins / Playfair via next/font — mark ready once FontFace set is settled
                    setFontsLoaded(true);
                } else {
                    // Fallback for older browsers
                    setTimeout(() => setFontsLoaded(true), 1000);
                }
            } catch (error) {
                console.warn('Font loading failed:', error);
                setFontsLoaded(true); // Continue anyway
            }
        };

        checkFonts();
    }, []);

    // Apply font immediately via CSS
    useEffect(() => {
        if (fontsLoaded) {
            // Font is already applied via next/font CSS variables - don't override
            // Add a class to indicate fonts are loaded
            document.documentElement.classList.add('fonts-loaded');
        }
    }, [fontsLoaded]);

    return null; // This component doesn't render anything
}
