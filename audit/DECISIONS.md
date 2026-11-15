# Decision log

One line per decision. Newest last. "Open" items are waiting for the owner.

| # | Date | Decision | Status |
|---|---|---|---|
| 1 | 2026-11-15 | There are no paying customers | Fixed |
| 2 | 2026-11-15 | Stripe is the only billing provider | Fixed |
| 3 | 2026-11-15 | GoCardless is fully removed from the application | Approved, not yet implemented |
| 4 | 2026-11-15 | Full service depends on the required payment and verification checks | Fixed; definition of "required checks" open (access model Q1-Q3) |
| 5 | 2026-11-15 | Customers can always log in and complete outstanding onboarding | Fixed |
| 6 | 2026-11-15 | Renewal grace period | Open (Q4). Default until decided: none |
| 7 | 2026-11-15 | Fresh local/test databases: new baseline + forward-only migrations; historical files preserved | Approved, implemented |
| 8 | 2026-11-15 | Changes to the Render database need its real schema, a backup and a recovery plan, and separate approval | Standing rule |
| 9 | 2026-11-14 | Postmark rotation and incident items parked; no deployment, production change or destructive data operation without separate approval | Standing rule |
| 10 | 2026-11-15 | Earlier decisions to keep GoCardless code and honour a 7-day grace period | Withdrawn (superseded by 3 and 6) |
| 11 | 2026-11-15 | Proposed access model (three statuses, three access levels) | Open: awaiting approval. https://claude.ai/artifact/FgpCP1y78e9yr1LhkwxSw5 |

## Implementation notes that are decisions in effect

- New migration files are named `YYYYMMDD_NN_description.sql` so they sort after every historical file.
- The subscription check is applied per route. Routes mounted at a specific prefix that serve mail content
  (`/api/bff` scan proxy, `/api/files`, `/api/mail/forward`, `/api/mail-search`) keep the check at mount.
  Onboarding routes (payments, billing, verification, support, contact, company and address lookup) do not have it.
