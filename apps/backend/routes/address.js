const express = require('express');
const router = express.Router();
const { withPgClient } = require('../server/db');

// Middleware: require auth (adjust to your auth; we'll accept x-user-id for now)
function requireUser(req, res, next) {
  // If your auth already sets req.user, prefer that.
  if (!req.user) {
    const hdr = req.get('x-user-id');
    if (hdr) req.user = { id: parseInt(hdr, 10), full_name: req.get('x-user-name') || 'Customer' };
  }
  if (!req.user?.id) return res.status(401).json({ ok: false, message: 'Unauthenticated' });
  next();
}

// Helper: format for UK label
function formatUkAddress(user, slot) {
  const name = user?.full_name || user?.name || 'Customer';
  const suite = slot.mailbox_no;
  const lines = [
    name,
    suite,
    slot.line1,
    slot.line2 && slot.line2.trim(),
    `${slot.city} ${slot.postcode}`.trim(),
    slot.country || 'United Kingdom',
  ].filter(Boolean);
  return {
    lines,
    label: lines.join('\n'),
    components: {
      addressee: name,
      suite,
      line1: slot.line1,
      line2: slot.line2,
      city: slot.city,
      postcode: slot.postcode,
      country: slot.country || 'United Kingdom',
    },
  };
}

// GET current address (idempotent read)
router.get('/api/me/address', requireUser, async (req, res) => {
  const userId = req.user.id;
  try {
    const row = await withPgClient((db) =>
      db.one(
        `
      SELECT s.*, l.name, l.line1, l.line2, l.city, l.postcode, l.country
        FROM public.address_slot s
        JOIN public.location l ON l.id = s.location_id
       WHERE s.assigned_to = $1 AND s.status = 'assigned'
      `,
        [userId]
      )
    );
    if (!row) return res.status(404).json({ ok: false, message: 'No address yet' });
    return res.json({ ok: true, address: formatUkAddress(req.user, row) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || 'Error' });
  }
});

// POST assign address (after signup/payment)
// Body: { locationId }
router.post('/api/me/address/assign', requireUser, async (req, res) => {
  const userId = req.user.id;
  const locationId = parseInt(req.body?.locationId, 10);
  if (!Number.isFinite(locationId)) {
    return res.status(400).json({ ok: false, message: 'locationId is required' });
  }

  try {
    // Idempotent check
    const existing = await withPgClient((db) =>
      db.one(
        `
      SELECT s.*, l.name, l.line1, l.line2, l.city, l.postcode, l.country
        FROM public.address_slot s
        JOIN public.location l ON l.id = s.location_id
       WHERE s.assigned_to = $1 AND s.status = 'assigned'
      `,
        [userId]
      )
    );
    if (existing) {
      return res.json({ ok: true, address: formatUkAddress(req.user, existing), already: true });
    }

    // Atomic claim: pick one available row without races
    const claimed = await withPgClient((db) =>
      db.one(
        `
      WITH c AS (
        SELECT id
          FROM public.address_slot
         WHERE status = 'available' AND location_id = $1
         ORDER BY id
         FOR UPDATE SKIP LOCKED
         LIMIT 1
      )
      UPDATE public.address_slot s
         SET status = 'assigned', assigned_to = $2, assigned_at = NOW()
       WHERE s.id IN (SELECT id FROM c)
       RETURNING s.*
      `,
        [locationId, userId]
      )
    );

    if (!claimed) {
      return res.status(409).json({ ok: false, message: 'No addresses available at this location' });
    }

    const row = await withPgClient((db) =>
      db.one(
        `
      SELECT s.*, l.name, l.line1, l.line2, l.city, l.postcode, l.country
        FROM public.address_slot s
        JOIN public.location l ON l.id = s.location_id
       WHERE s.id = $1
      `,
        [claimed.id]
      )
    );

    // TODO: send notification email if desired
    return res.json({ ok: true, address: formatUkAddress(req.user, row) });
  } catch (e) {
    if (e?.code === '23505') {
      // Unique violation: another request assigned at same time → fetch current
      const row = await withPgClient((db) =>
        db.one(
          `
        SELECT s.*, l.name, l.line1, l.line2, l.city, l.postcode, l.country
          FROM public.address_slot s
          JOIN public.location l ON l.id = s.location_id
         WHERE s.assigned_to = $1 AND s.status = 'assigned'
        `,
          [userId]
        )
      );
      return res.json({ ok: true, address: formatUkAddress(req.user, row), already: true });
    }
    return res.status(500).json({ ok: false, message: e?.message || 'Error' });
  }
});

module.exports = router;
