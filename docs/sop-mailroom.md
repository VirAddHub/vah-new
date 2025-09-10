# Mailroom SOP – VirtualAddressHub
Last updated: 10 September 2025

## Daily Start
- Scanner: PDF, 300 DPI, Duplex, OCR ON, Deskew, Blank-page removal
- Create dated folder: `inbox/YYYYMMDD/`  •  Auto-name from `temp_0001.pdf`
- Trays empty; stickers ready `YYMMDD-####`

## Workflow
1. Open mail → sticker on back (e.g., `250910-0001`) → To Scan tray
2. Scan in order → `inbox/YYYYMMDD/temp_0001.pdf` …
3. Move letters → Scanned tray
4. Admin: **Add New Mail Item**  
   API: `POST /api/admin/mail-items` (header `Idempotency-Key: 250910-0001`)
5. Rename scan → `mail_{mail_item.id}.pdf`
6. Move to OneDrive: `/Clients/{user_id} - {client_name}/{YYYY}/{MM}/mail_{id}.pdf`
7. **Attach Scan** → `POST /attach-scan` (store OneDrive file id/path)
8. **Mark as Scanned** → `PATCH /api/admin/mail-items/:id` (only after attach)
9. Notification auto (Make.com → Postmark)
10. File physical → add **shred date = received + 30 days**

## Client
- Mail list: `GET /api/mail-items/:id/history`
- View scan: `GET /api/mail-items/:id/scan-url` → expiring single-use URL (≤15 min)

## Weekly
- Shred items past shred date → record shredded_at + initials
- Audit last 7 days; check OneDrive retention

## Exceptions
- Do-not-open/legal → Manager, create item (no scan), status `restricted`
- Misaddressed → create correct item, link old→new, archive old
- Mis-scan → rescan; keep v1 & v2
- Oversized/parcel → create item with photo; notify client
- System down → park files in `/Quarantine/YYYYMMDD/` and resume later

## Security
- 2FA on Admin + OneDrive
- No PII in filenames; expiring links only; full audit log
