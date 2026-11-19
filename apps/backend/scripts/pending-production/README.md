# Pending production changes: NOT applied, NOT run by any script

Nothing in this folder is picked up by the migration runner or a deploy. Each change needs your approval,
a backup and the recovery plan in its runbook before it is used on Render.

| Files | Status |
|---|---|
| `2026-11-18_phase1_render*.sql`, `2026-11-18_phase1_render.md`, `rehearsal/` | **Current.** Read-only pre-check, single-transaction migration, verification and rollback check, generated from one set of checks and rehearsed on Render-shaped local copies. Start with the `.md`. |
| `2026-11-15_gocardless_removal.sql` | Superseded: renaming the GoCardless columns would break the previous release, so the new pack adds provider columns instead. Kept for the record. |
