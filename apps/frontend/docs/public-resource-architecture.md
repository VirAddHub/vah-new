# Public resources and visual roles

The homepage is the brand reference. Its content, styles, FAQs and artwork were not edited in this change. Shared header/footer Resources links expose the Blog and Help Centre.

## Destinations

- `/blog`: The blog. Published articles from the existing blog API, in the editorial resource style, with search over titles, excerpts and categories. No guides listing. Do not add fake posts or placeholder covers to fill an empty feed.
- `/blog/[slug]`: Existing published URLs, retained with an editorial reading layout. Continue rendering content through ReactMarkdown without raw HTML execution.
- `/registered-office-address`: Detailed company-address guide, with example stationery and jurisdiction/filing questions.
- `/directors-service-address`: Detailed director-address guide, with a service/residential role diagram and privacy questions.
- `/help`: Existing operational support centre, unchanged.
- `/#faq`: Existing concise homepage FAQ section, unchanged; no separate menu entry or duplicate FAQ page is needed.
- `/guides`: Removed. Permanent 308 redirect to `/blog`.
- `/london-address`: Permanent 308 redirect to `/services#london-presence`. The old page repeated the homepage’s showcase; its service explanation is already covered by Services. Homepage showcase remains intact.

Only canonical destinations remain in the sitemap. Update redirects whenever retiring a public URL; never silently turn an established address into a 404.

## Visual roles

Home retains the skyline/building artwork. How it works uses a four-stage setup journey. Services uses business stationery plus its existing digital-mail visual. Pricing remains a price comparison. Help Centre remains a search-led support layout. The library uses editorial rows, while articles prioritise reading. About uses a concise statement and principles. Contact keeps its existing form layout/behaviour with the shared palette, serif heading and green actions. Legal pages remain separate documents; no disclosures or business policies were changed.

`ResourceEditorial.module.css` styles these secondary layouts without changing shared homepage styles or artwork. Prefer subject-specific visuals and purposeful typography over reusing the homepage illustration. Generic address illustrations must never contain the restricted service address.

## Review limitation

No traffic/search-console evidence was available. Consolidation decisions are based on overlapping content and navigation purpose, not a claim about keyword rankings. Browser tooling was unavailable during implementation; perform responsive visual and keyboard review before release. Preview HTML exports are static review aids, not screenshots.
