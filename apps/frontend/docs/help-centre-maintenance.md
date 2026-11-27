# Maintaining the Help Centre

The public content source is `lib/help-content.ts`. Do not put private addresses, customer records, credentials or internal operating procedures in it: it is included in public HTML and JavaScript.

## Editing

Each article has a stable `slug`, category ID, question title, concise `summary`, detailed `paragraphs`, optional ordered `steps`, and useful `links`. Only describe verified functionality and policies. Keep subscription amounts on the existing Pricing page rather than copying numbers into answers. Verify forwarding fees against service terms and implementation before editing.

The homepage uses the ten article slugs in `homepageHelp`; it displays the same summaries, followed by links to the longer articles. Edit those summaries once to update both views. Keep purchasing answers concise and put operating instructions in article steps.

Add a category to `helpCategories` and assign articles to its ID. Category links use `/help#category-id`. Article pages, metadata and sitemap entries are generated from the content. Do not rename an established slug without a permanent redirect. New articles are included in global search, which searches questions, summaries, full paragraphs, steps, category names and useful link labels. Do not add another manually maintained FAQ schema copy.

Native details/summary controls provide keyboard-accessible expandable answers. Full instructional pages remain accessible through standard links and are statically generated. No CMS or external search service is required.

## Verification and policy review

Run the Help Centre tests with the frontend Vitest audit configuration, then type checking, lint and production build. Check category links, search/empty state, article URLs, mobile layout, focus and keyboard operation. Review the published copy against current account labels before changing instructions.

Current evidence sources: TermsPage.tsx for service restrictions, forwarding and notice requirements; account/AccountBillingCard.tsx for Manage billing and end-of-paid-period language; dashboard/user/MailDetail.tsx and (dashboard)/mail/page-content.tsx for Open scan, Download and forwarding; (dashboard)/account/settings/page.tsx for profile/email/password; (dashboard)/account/verification/page.tsx for verification statuses; backend webhooks-onedrive.ts for mail notifications (delivery failure does not block mail import).

Unresolved owner decisions: terms require 30 days’ cancellation notice, but billing UI says paid-period end. Confirm which policy should govern and align those sources in a separate change. Terms promise scan retention after termination, while restricted accounts may lack access; confirm retrieval and retention policy without promising continued dashboard access. Existing TCSP/compliance certification claims require documentary verification before republication. No policy or backend changes are made by this content update.
