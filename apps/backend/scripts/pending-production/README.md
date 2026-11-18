# Pending production changes: NOT applied, NOT run by any script

Nothing in this folder is picked up by the migration runner. Each file needs your approval, a backup and
a recovery plan before it is used on Render.

| File | Status |
|---|---|
| `2026-11-18_phase1_render.sql` + `.md` | **Current.** Written from a read-only review of the Render schema and rehearsed on a Render-shaped copy. Run before deploying Phase 1. |
| `2026-11-15_gocardless_removal.sql` | Superseded by the file above (its renames are included). Kept for the record. |
