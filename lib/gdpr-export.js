const path = require("path");
const fs = require("fs");
const fse = require("fs-extra");
const crypto = require("crypto");
const archiver = require("archiver");
const { db } = require("../server/db.js");
const { notify } = require("./notify");

const EXPORT_DIR = path.resolve(process.cwd(), "var/local/exports");

function now() { return Date.now(); }
function newToken(bytes = 32) { return crypto.randomBytes(bytes).toString("hex"); }

async function runGdprExport(jobId) {
    const job = db.prepare("SELECT * FROM export_job WHERE id = ?").get(jobId);
    if (!job) return;
    if (job.status !== "pending") return;

    const startedAt = now();
    db.prepare("UPDATE export_job SET status='running', started_at=? WHERE id=?").run(startedAt, jobId);

    try {
        await fse.ensureDir(EXPORT_DIR);
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const base = path.join(EXPORT_DIR, `gdpr-u${job.user_id}-${stamp}`);
        const zipPath = `${base}.zip`;

        // ---- gather data (keep it simple & safe)
        const user = db.prepare(`
      SELECT id, email, first_name, last_name, created_at, sumsub_applicant_id, sumsub_review_status,
             gocardless_customer_id, gocardless_mandate_id,
             email_pref_marketing, email_pref_product, email_pref_security,
             email_unsubscribed_at, email_bounced_at
      FROM user WHERE id=?
    `).get(job.user_id);

        const mailItems = db.prepare(`
      SELECT id, created_at, subject, sender_name, notes, tag, status, scanned, deleted
      FROM mail_item WHERE user_id=? ORDER BY created_at DESC
    `).all(job.user_id);

        const postmarkEvents = db.prepare(`
      SELECT id, created_at, type, email FROM postmark_event WHERE user_id=? ORDER BY created_at DESC
    `).all(job.user_id);

        // ---- write temp JSON files
        const tempDir = await fse.mkdtemp(path.join(EXPORT_DIR, `tmp-${job.user_id}-`));
        const files = [
            { name: "user.json", data: user || {} },
            { name: "mail_items.json", data: mailItems || [] },
            { name: "postmark_events.json", data: postmarkEvents || [] },
            { name: "metadata.json", data: { job_id: jobId, generated_at: new Date().toISOString(), version: "gdpr_v1" } },
        ];
        for (const f of files) {
            await fse.writeFile(path.join(tempDir, f.name), JSON.stringify(f.data, null, 2), "utf8");
        }

        // ---- stream to ZIP
        await new Promise((resolve, reject) => {
            const output = fs.createWriteStream(zipPath);
            const archive = archiver("zip", { zlib: { level: 9 } });

            output.on("close", resolve);
            archive.on("error", reject);

            archive.pipe(output);
            for (const f of files) {
                archive.file(path.join(tempDir, f.name), { name: f.name });
            }
            archive.finalize();
        });

        // cleanup temp
        await fse.remove(tempDir);

        // finalize job
        const size = (await fse.stat(zipPath)).size;
        const token = newToken(32);
        const expiresAt = now() + 24 * 60 * 60 * 1000; // 24h
        db.prepare(`
      UPDATE export_job
      SET status='done', completed_at=?, file_path=?, file_size=?, token=?, expires_at=?
      WHERE id=?
    `).run(now(), zipPath, size, token, expiresAt, jobId);

        // Send notification to user
        const appOrigin = process.env.APP_ORIGIN || "http://localhost:3000";
        const url = `${appOrigin}/api/bff/downloads/export/${token}`;
        notify({
            userId: job.user_id,
            type: "export",
            title: "Your data export is ready",
            body: "Click to download. Link expires in 24 hours.",
            meta: { token, url, size }
        });
    } catch (err) {
        db.prepare(`UPDATE export_job SET status='error', error=?, completed_at=? WHERE id=?`)
            .run(String(err && err.message || err), now(), jobId);
    }
}

// best-effort cleanup (expired files)
function scheduleCleanup() {
    setInterval(() => {
        try {
            const cutoff = now();
            const rows = db.prepare(`SELECT id, file_path FROM export_job WHERE expires_at IS NOT NULL AND expires_at < ?`).all(cutoff);
            for (const r of rows) {
                if (r.file_path && fs.existsSync(r.file_path)) {
                    try { fs.unlinkSync(r.file_path); } catch { }
                }
            }
            // optional: DELETE old rows; we'll keep them for audit
        } catch { }
    }, 60 * 60 * 1000); // hourly
}

module.exports = { runGdprExport, scheduleCleanup };
