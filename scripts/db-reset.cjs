const fs = require("fs");
const path = require("path");
const p = process.env.DATABASE_URL || path.join(process.cwd(), "data", "app.db");
["", "-wal", "-shm"].forEach(suffix => {
    const f = p + suffix;
    if (fs.existsSync(f)) fs.unlinkSync(f);
});
console.log("🧹 Deleted DB files:", p, p + "-wal", p + "-shm");
