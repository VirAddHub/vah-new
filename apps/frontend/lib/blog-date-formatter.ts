/**
 * Format date for blog post display
 * Formats like "May 17, 2023"
 */
export function formatBlogDate(dateString?: string | null): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

