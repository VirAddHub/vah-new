// Dev-only helpers to (re)create and rebuild the mail_item FTS index.
const { db } = require("./db");

function createFtsAndTriggers() {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS mail_item_fts USING fts5(
      subject, sender_name, tag, notes,
      content='mail_item', content_rowid='id',
      tokenize='unicode61'
    );

    CREATE TRIGGER IF NOT EXISTS mail_item_ai AFTER INSERT ON mail_item BEGIN
      INSERT INTO mail_item_fts(rowid, subject, sender_name, tag, notes)
      VALUES (new.id, new.subject, new.sender_name, new.tag, new.notes);
    END;

    CREATE TRIGGER IF NOT EXISTS mail_item_au AFTER UPDATE ON mail_item BEGIN
      UPDATE mail_item_fts SET
        subject = new.subject,
        sender_name = new.sender_name,
        tag = new.tag,
        notes = new.notes
      WHERE rowid = new.id;
    END;

    CREATE TRIGGER IF NOT EXISTS mail_item_ad AFTER DELETE ON mail_item BEGIN
      INSERT INTO mail_item_fts(mail_item_fts, rowid, subject, sender_name, tag, notes)
      VALUES ('delete', old.id, old.subject, old.sender_name, old.tag, old.notes);
    END;
  `);
}

function rebuildFts() {
  try {
    // Fast path: FTS external-content REBUILD
    db.prepare(`INSERT INTO mail_item_fts(mail_item_fts) VALUES('rebuild')`).run();
    return { ok: true, mode: "rebuild" };
  } catch {
    // Hard path: drop & full repopulate
    db.exec(`DROP TABLE IF EXISTS mail_item_fts`);
    createFtsAndTriggers();
    db.exec(`
      INSERT INTO mail_item_fts(rowid, subject, sender_name, tag, notes)
      SELECT id, COALESCE(subject,''), COALESCE(sender_name,''), COALESCE(tag,''), COALESCE(notes,'')
      FROM mail_item
    `);
    return { ok: true, mode: "recreate" };
  }
}

function selfHealFts() {
  try {
    // probe FTS; any exception triggers a rebuild
    db.prepare(`SELECT 1 FROM mail_item_fts LIMIT 1`).get();
    return { ok: true, mode: "noop" };
  } catch {
    createFtsAndTriggers();
    return rebuildFts();
  }
}

module.exports = { createFtsAndTriggers, rebuildFts, selfHealFts };
