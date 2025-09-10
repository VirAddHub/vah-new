const path = require("path");
const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), "data", "app.db");

(async () => {
    let db, better = false;
    try {
        const Better = require("better-sqlite3");
        db = new Better(DB_PATH);
        better = true;
        const row = db.prepare("SELECT id FROM user WHERE id=1").get();
        if (!row) {
            const now = Date.now();
            db.prepare("INSERT INTO user (id, email, name, first_name, last_name, is_admin, role, kyc_status, plan_status, plan_start_date, onboarding_step, email_verified, status, login_attempts, created_at, updated_at) VALUES (1, 'admin@local', 'Dev Admin', 'Dev', 'Admin', 1, 'admin', 'verified', 'active', ?, 'completed', 1, 'active', 0, ?, ?)").run(now, now, now);
            console.log("✅ Seeded admin user id=1");
        } else {
            console.log("ℹ️ Admin user id=1 already exists");
        }
    } catch {
        const sqlite3 = require("sqlite3").verbose();
        db = new sqlite3.Database(DB_PATH);
        db.get("SELECT id FROM user WHERE id=1", (err, row) => {
            if (err) throw err;
            if (!row) {
                const now = Date.now();
                db.run("INSERT INTO user (id, email, name, first_name, last_name, is_admin, role, kyc_status, plan_status, plan_start_date, onboarding_step, email_verified, status, login_attempts, created_at, updated_at) VALUES (1, 'admin@local', 'Dev Admin', 'Dev', 'Admin', 1, 'admin', 'verified', 'active', ?, 'completed', 1, 'active', 0, ?, ?)", [now, now, now], (e) => {
                    if (e) throw e;
                    console.log("✅ Seeded admin user id=1");
                    db.close();
                });
            } else {
                console.log("ℹ️ Admin user id=1 already exists");
                db.close();
            }
        });
    }
})();
