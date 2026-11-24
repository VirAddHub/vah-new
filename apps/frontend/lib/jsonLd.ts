/**
 * Serialise structured data for a <script type="application/ld+json"> element.
 *
 * JSON.stringify alone can contain "</script>" or "<!--" if any field (a blog title, an excerpt)
 * includes them, which would end the script element early. Escaping "<", ">" and "&" as \u sequences
 * keeps the JSON identical once parsed (security review F36).
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
