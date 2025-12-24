# Mailroom — Quick Checklist

## Start
- Scanner: 300 DPI, Duplex, **OCR ON**
- Folder: `inbox/YYYYMMDD/` • Start at `temp_0001.pdf`
- Stickers: `YYMMDD-####`
- Trays empty

## Each Letter
1) Open → sticker → To Scan
2) Scan → Scanned tray
3) Create item (Idempotency-Key = sticker)
4) Rename: `mail_{id}.pdf` → move to OneDrive
5) **Attach Scan** → then **Mark as Scanned**
6) Email auto → File physical + shred date

## End
- Inbox folder empty
- 0 in "Scan Pending"
- Cabinets locked
