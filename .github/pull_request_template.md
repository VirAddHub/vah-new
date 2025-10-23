### Mobile-Friendly Changes

**Task:** Make the UI mobile-friendly.
**Allowed changes:** layout, spacing, responsive classes, aria roles, semantic tags, component props.
**Do NOT change:** marketing copy, numbers, claims, company names, logos, testimonials, pricing, CTAs, legal text.
**Never invent facts.** No "trusted by", "# users", awards, or security badges unless the exact text already exists in the repo.
**If text must change for accessibility**, keep the meaning identical and mark the diff with a `// ACCESSIBILITY-ONLY` comment.
**Source-of-truth copy is in** `apps/frontend/src/content/content.ts`. Only reference it; do not edit it.
**Acceptance criteria:**

* All interactive targets ≥ 44px on mobile.
* No horizontal scroll ≤ 360px width.
* Text legible (≥ 16px body, 1.5 line-height).
* Lighthouse Mobile ≥ 90 for Accessibility (no text invention).

**If a requirement conflicts with "Do NOT change," stop and ask.**

---

### What changed
- Mobile layout only (spacing, breakpoints, touch targets)

### Confirmations (tick all)
- [ ] I did not change marketing copy, numbers, logos, testimonials, or legal text
- [ ] I did not add any new claims like "trusted by…"
- [ ] All interactive targets are ≥ 44px on mobile
- [ ] No horizontal scroll at 360px width
- [ ] Used only content from `src/content/content.ts`
- [ ] No hardcoded marketing claims in UI components
