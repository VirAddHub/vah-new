import { Router } from "express";
import type { Request, Response } from "express";
import { getPool } from "../db";
import { ENV } from "../../env";
import { sendTemplateEmail, Templates } from "../../services/mailer";

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

        // Build segment label for template
        const segmentLabel = segment === "high" ? "High" : segment === "mid" ? "Mid" : "Low";
        const introText = segment === "high"
            ? "Great job! You're already compliant in most areas."
            : segment === "mid"
                ? "You're on the right track, but there's room for improvement."
                : "There are several areas where compliance can be strengthened.";

        // Send Day-0 email via new mailer with alias-first, TemplateId fallback, and plain-text fallback
        // NOTE: Template alias "quiz-day0" should exist in Postmark Dashboard
        // Fallback TemplateId: 42035123 (if alias is missing)
        // Final fallback: plain-text email if both fail
        try {
            const result = await sendTemplateEmail({
                to: email,
                alias: Templates.QuizDay0,
                templateIdFallback: 42035123,
                model: {
                    name: name || "there",
                    score: score,
                    segment_label: segmentLabel,
                    intro_text: introText,
                    cta_label: "View Pricing",
                    cta_url: ctaUrl,
                    has_booking: true,
                    booking_url: bookingUrl,
                },
            });
            console.log(`[quiz] Email sent to ${email} (mode: ${result})`);
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

