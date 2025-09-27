// lib/db-fts.js
function tableExists(db, name) {
    return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
}
function triggerExists(db, name) {
    return !!db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name=?").get(name);
}

function ensureMailFts(db) {
    if (!tableExists(db, "mail_item_fts")) {
        db.exec(`
      CREATE VIRTUAL TABLE mail_item_fts USING fts5(
        subject, sender_name, notes, tag,
        content='mail_item', content_rowid='id',
        tokenize='unicode61 remove_diacritics 2'
      );
      INSERT INTO mail_item_fts(rowid, subject, sender_name, notes, tag)
      SELECT id, COALESCE(subject,''), COALESCE(sender_name,''), COALESCE(notes,''), COALESCE(tag,'')
      FROM mail_item
      WHERE deleted IS NULL OR deleted = 0;
    `);
    }
    if (!triggerExists(db, "mail_item_ai_fts")) {
        db.exec(`
      CREATE TRIGGER mail_item_ai_fts AFTER INSERT ON mail_item BEGIN
        INSERT INTO mail_item_fts(rowid, subject, sender_name, notes, tag)
        VALUES (new.id, COALESCE(new.subject,''), COALESCE(new.sender_name,''), COALESCE(new.notes,''), COALESCE(new.tag,''));
      END;
    `);
    }
    if (!triggerExists(db, "mail_item_au_fts")) {
        db.exec(`
      CREATE TRIGGER mail_item_au_fts AFTER UPDATE ON mail_item BEGIN
        UPDATE mail_item_fts
        SET subject=COALESCE(new.subject,''), sender_name=COALESCE(new.sender_name,''), notes=COALESCE(new.notes,''), tag=COALESCE(new.tag,'')
        WHERE rowid=new.id;
        DELETE FROM mail_item_fts WHERE rowid=new.id AND (new.deleted = 1);
        INSERT INTO mail_item_fts(rowid, subject, sender_name, notes, tag)
          SELECT new.id, COALESCE(new.subject,''), COALESCE(new.sender_name,''), COALESCE(new.notes,''), COALESCE(new.tag,'')
          WHERE (new.deleted IS NULL OR new.deleted = 0)
          AND NOT EXISTS(SELECT 1 FROM mail_item_fts WHERE rowid=new.id);
      END;
    `);
    }
    if (!triggerExists(db, "mail_item_ad_fts")) {
        db.exec(`
      CREATE TRIGGER mail_item_ad_fts AFTER DELETE ON mail_item BEGIN
        DELETE FROM mail_item_fts WHERE rowid=old.id;
      END;
    `);
    }
}
module.exports = { ensureMailFts };
