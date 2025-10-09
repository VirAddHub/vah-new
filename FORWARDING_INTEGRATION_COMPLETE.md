Boom — nice work shipping that! 🚀
Before you call it “done-done,” here’s a tight **verification checklist** + a few **quick tests** to make sure the admin-driven forwarding flow is rock solid in prod.

---

# ✅ Post-Deploy Sanity Checks (5–10 min)

1. **Auth & Routing**

* [ ] `requireAdmin` actually gates `/api/admin/*` (403 for non-admins).
* [ ] Admin router mounts **after** auth middleware so `req.user` exists.
* [ ] Frontend page `/admin/forwarding` redirects/blocks non-admins.

2. **DB shape**

* [ ] `forwarding_request` has the new columns:
  `reviewed_at, reviewed_by, processing_at, dispatched_at, delivered_at, cancelled_at, courier, tracking_number, admin_notes`
* [ ] Indexes exist: `idx_fr_status`, `idx_fr_created_at` (and trigram if you added them).

3. **State machine**

* [ ] Illegal transitions are blocked (e.g., `Requested → Delivered` directly).
* [ ] API returns `{ ok, data|error }` consistently.

4. **Mirror status (optional)**

* [ ] If you mirror to `mail_item.forwarding_status` in code/trigger, verify it changes with the request.

5. **Admin UI basics**

* [ ] Filter by status works.
* [ ] Search by `to_name`, `postal`, `courier`, `tracking_number`, `email`, `subject` works.
* [ ] Action buttons change based on status.

---

# 🧪 Quick API Smoke Tests

> Replace `COOKIE` with an admin session cookie (or run via Swagger/Insomnia with your auth).

List queue:

```bash
curl -sS -b "COOKIE" \
  "https://YOUR_API/api/admin/forwarding/requests?status=Requested&limit=10" | jq
```

Illegal transition (should 400):

```bash
curl -sS -b "COOKIE" -X PATCH \
  -H "Content-Type: application/json" \
  -d '{"action":"mark_delivered"}' \
  https://YOUR_API/api/admin/forwarding/requests/123 | jq
```

Happy path:

```bash
# 1) review
curl -sS -b "COOKIE" -X PATCH -H "Content-Type: application/json" \
  -d '{"action":"mark_reviewed"}' \
  https://YOUR_API/api/admin/forwarding/requests/123 | jq

# 2) start processing
curl -sS -b "COOKIE" -X PATCH -H "Content-Type: application/json" \
  -d '{"action":"start_processing"}' \
  https://YOUR_API/api/admin/forwarding/requests/123 | jq

# 3) dispatch (with details)
curl -sS -b "COOKIE" -X PATCH -H "Content-Type: application/json" \
  -d '{"action":"mark_dispatched","courier":"Royal Mail","tracking_number":"RM123456789GB","admin_notes":"Fragile"}' \
  https://YOUR_API/api/admin/forwarding/requests/123 | jq

# 4) delivered
curl -sS -b "COOKIE" -X PATCH -H "Content-Type: application/json" \
  -d '{"action":"mark_delivered"}' \
  https://YOUR_API/api/admin/forwarding/requests/123 | jq
```

---

# 🛡️ Admin User Quick-Fix

If your admin can’t access the page, flip the flag:

```sql
UPDATE "user"
SET is_admin = TRUE
WHERE email = 'you@yourdomain.com';
```

Verify:

```sql
SELECT id, email, is_admin, is_staff
FROM "user"
WHERE email = 'you@yourdomain.com';
```

---

# 🔍 Logs to Watch

* API: look for `[AdminForwarding] list error` / `update error`.
* DB: constraint/permission errors after PATCH attempts.
* UI: failed fetch (CORS/auth) on `/api/admin/forwarding/requests`.

---

# 🧰 Common Pitfalls (fast fixes)

* **403 on admin routes**: `requireAdmin` mounted before auth; swap order so auth runs first.
* **400 invalid_action**: UI calling old route paths; ensure it uses
  `PATCH /api/admin/forwarding/requests/:id` with body `{action,...}`.
* **Search slow**: add trigram indexes (you have SQL from the patch).
* **Notes/tracking too long**: server zod caps (100/120/2000). Trim inputs in UI.

---

# 📈 Nice-to-haves (when you catch a breath)

* Replace `prompt()` with a shadcn **Dialog** for courier/tracking (validation + nicer UX).
* Badge for **Free (HMRC/CH)** vs **£2 Charge** on each card.
* Column for timestamps (Reviewed/Dispatched/Delivered) on the list view.

---

If you hit any specific error on those smoke tests, paste the exact response + a log snippet, and I’ll pinpoint the fix.

