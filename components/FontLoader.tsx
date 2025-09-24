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
          
          // Specifically check for Montserrat
          const montserratFaces = Array.from(document.fonts).filter(
            (font: FontFace) => font.family.includes('Montserrat')
          );
          
          if (montserratFaces.length > 0) {
            setFontsLoaded(true);
          } else {
            // Force load Montserrat
            const font = new FontFace('Montserrat', 'url(https://fonts.gstatic.com/s/montserrat/v25/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aXpsog.woff2)', {
              weight: '400',
              style: 'normal'
            });
            
            await font.load();
            document.fonts.add(font);
            setFontsLoaded(true);
          }
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
      // Force apply Montserrat to body
      document.body.style.fontFamily = "'Montserrat', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
      
      // Add a class to indicate fonts are loaded
      document.documentElement.classList.add('fonts-loaded');
    }
  }, [fontsLoaded]);

  return null; // This component doesn't render anything
}
