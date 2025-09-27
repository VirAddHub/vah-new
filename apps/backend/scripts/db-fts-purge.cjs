const { db } = require("../server/db");

const ftsTables = db.prepare(`
  SELECT name FROM sqlite_master
   WHERE name LIKE '%fts%' OR sql LIKE '%VIRTUAL TABLE%';
`).all();

let dropped = 0;
for (const t of ftsTables) {
    try {
        db.prepare(`DROP TABLE IF EXISTS "${t.name}"`).run();
        dropped++;
    } catch (_) { }
}

console.log("FTS purge complete. Dropped:", dropped);
