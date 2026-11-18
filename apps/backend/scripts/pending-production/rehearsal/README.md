# Rehearsal tooling (local only)

- `render_fingerprint_2026-11-18.txt`: column fingerprint of every table on Render, from the read-only review.
- `render_shape.sql`, `seed_render_like.sql`, `build_render_copy.sh <vah_local_name>`: build a local database
  matching that fingerprint, with dummy data, from the local `vah_local` database.
- `build_sql.py`: generates the four `2026-11-18_phase1_render*.sql` files. `post_fingerprint.txt` is the
  fingerprint after the migration, taken from a rehearsal copy.
- `rehearse.sh`: success, re-run, unexpected-difference, mid-transaction-failure and verification-failure scenarios.
- `app_smoke.mjs <baseUrl> <label>`: requests used to compare a release on the database before and after.
