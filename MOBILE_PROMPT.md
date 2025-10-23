# Mobile-Only Changes Prompt

**Make ONLY these changes for small screens ≤ 640px:**

* Increase touch targets to ≥ 44px
* Increase body text to 16px min  
* Add `md:`/`sm:` responsive classes for grids to stack
* Add `px-4` container padding on mobile
* Ensure no horizontal scroll at 360px width

**Do NOT** alter any copy/claims/pricing/testimonials/images.
If text needs truncation, use CSS (line-clamp), not rewriting.
**Return only changed files and a summary of CSS/utility changes.**

---

# Example Usage

When asking Cursor to make mobile-friendly changes, use this prompt:

> **Task:** Make the UI mobile-friendly.
> **Allowed changes:** layout, spacing, responsive classes, aria roles, semantic tags, component props.
> **Do NOT change:** marketing copy, numbers, claims, company names, logos, testimonials, pricing, CTAs, legal text.
> **Never invent facts.** No "trusted by", "# users", awards, or security badges unless the exact text already exists in the repo.
> **If text must change for accessibility**, keep the meaning identical and mark the diff with a `// ACCESSIBILITY-ONLY` comment.
> **Source-of-truth copy is in** `apps/frontend/src/content/content.ts`. Only reference it; do not edit it.
> **Acceptance criteria:**
>
> * All interactive targets ≥ 44px on mobile.
> * No horizontal scroll ≤ 360px width.
> * Text legible (≥ 16px body, 1.5 line-height).
> * Lighthouse Mobile ≥ 90 for Accessibility (no text invention).
>   **If a requirement conflicts with "Do NOT change," stop and ask.**
