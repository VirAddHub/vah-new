# Public website redesign validation

26 November 2026

Implemented service-led homepage, original SVG illustrations, six service pages,
location/onboarding/guides/cookie pages, public navigation/footer, pricing styling
and metadata/sitemap improvements. Preserved previously requested white headers
and footers. Billing and eligibility backend logic are unchanged.

Completed before this commit:
- Nine existing pricing tests passed.
- Seventeen public routes returned their intended content with one H1.
- Login sent noindex; customer mail still redirected guests to login.
- git diff --check passed.
- Clean lockfile installation completed with dependency lifecycle scripts disabled.
- Added runtime type/date guards to the admin chart tooltip formatter.

Outstanding:
- Re-run typechecking after the clean installation and tooltip fix.
- Resolve existing ESLint configuration/tooling incompatibility and run lint.
- Browser checks at mobile and desktop sizes, screenshots and accessibility audit.
  Browser control was unavailable; a subsequent native Chrome tool attempt was
  interrupted. These checks have not passed and must not be reported as complete.
- Production build and staging billing/onboarding verification.
- Confirm company/regulatory details, provider pricing alignment, cookie inventory
  and operational claims before launch.

No production deployment is part of this commit.
