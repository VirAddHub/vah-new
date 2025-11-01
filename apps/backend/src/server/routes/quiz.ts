import { Router } from "express";
import type { Request, Response } from "express";
import { getPool } from "../db";
import { ENV } from "../../env";
import { sendTemplateEmail } from "../../lib/mailer";
import { Templates } from "../../lib/postmark-templates";

export const quizRouter = Router();

quizRouter.post("/submit", async (req: Request, res: Response) => {
    try {
        // Accept both JSON and form posts (Fillout/ScoreApp may send either)
        const contentType = (req.headers["content-type"] || "").toLowerCase();
        let payload: any = req.body;

        // Extract data - handle various formats from different quiz providers
        const name = payload.name || payload.full_name || payload.first_name || "";
        const email = ((payload.email || "").toLowerCase()).trim();
        const score = Number(payload.score ?? payload.total_score ?? 0);
        const answers = payload.answers || payload.responses || payload; // store full blob
        const source = payload.source || "compliance-check";
        const quizId = payload.quiz_id || payload.form_id || null;

        if (!email) {
            return res.status(400).json({ ok: false, error: "email_required" });
        }

        // Basic segmentation based on score
        let segment: "high" | "mid" | "low" = "low";
        if (score >= 80) {
            segment = "high";
        } else if (score >= 50) {
            segment = "mid";
        }

        const pool = getPool();

        // Persist to database
        await pool.query(
            `INSERT INTO quiz_leads (created_at, name, email, score, answers, segment, source, quiz_id)
             VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7)`,
            [name, email, score, JSON.stringify(answers), segment, source, quizId]
        );

        console.log(`[quiz] Lead captured: ${email}, score: ${score}, segment: ${segment}`);

        // Determine CTA based on segment
        const ctaUrl = `${ENV.APP_BASE_URL || 'https://virtualaddresshub.co.uk'}/pricing`;
        const bookingUrl = process.env.CALCOM_BOOKING_URL || `https://cal.com/virtualaddresshub/15min`;

        // Send Day-0 email via standardized Postmark template system
        // NOTE: Template "quiz-day0" must be created in Postmark Dashboard
        // If template doesn't exist, sendTemplateEmail will fall back to a simple email
        try {
            await sendTemplateEmail({
                to: email,
                templateAlias: Templates.QuizDay0, // Template alias: "quiz-day0"
                model: {
                    name: name || undefined,
                    firstName: name?.split(' ')[0] || undefined,
                    score: score,
                    segment: segment,
                    ctaUrl: ctaUrl,
                    bookingUrl: bookingUrl,
                },
            });
            console.log(`[quiz] Email sent to ${email} using template ${Templates.QuizDay0}`);
        } catch (emailError: any) {
            console.error('[quiz] Failed to send email:', emailError);
            // Don't fail the request if email fails - lead is already saved
            // The sendTemplateEmail function has built-in fallback to simple email
        }

        return res.json({ ok: true, message: "Quiz submission recorded" });
    } catch (err: any) {
        console.error("[quiz] Submit error:", err);
        return res.status(500).json({
            ok: false,
            error: "server_error",
            message: err.message || "Failed to process quiz submission",
        });
    }
});

// Optional: Get quiz stats (admin endpoint)
quizRouter.get("/stats", async (req: Request, res: Response) => {
    try {
        const pool = getPool();
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN segment = 'high' THEN 1 END) as high_segment,
                COUNT(CASE WHEN segment = 'mid' THEN 1 END) as mid_segment,
                COUNT(CASE WHEN segment = 'low' THEN 1 END) as low_segment,
                AVG(score) as avg_score
            FROM quiz_leads
        `);

        return res.json({
            ok: true,
            data: {
                total: parseInt(result.rows[0].total) || 0,
                high_segment: parseInt(result.rows[0].high_segment) || 0,
                mid_segment: parseInt(result.rows[0].mid_segment) || 0,
                low_segment: parseInt(result.rows[0].low_segment) || 0,
                avg_score: parseFloat(result.rows[0].avg_score) || 0,
            },
        });
    } catch (err: any) {
        console.error("[quiz] Stats error:", err);
        return res.status(500).json({ ok: false, error: "server_error" });
    }
});

