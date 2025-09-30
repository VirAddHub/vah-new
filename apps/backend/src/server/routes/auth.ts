import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Pool } from "pg";

// Use your existing DATABASE_URL from Render/local .env
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

const router = Router();

/** Validation mirrors your frontend exactly */
const SignupSchema = z.object({
  // Contact
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100)
    .regex(/[a-z]/, "password must contain a lowercase letter")
    .regex(/[A-Z]/, "password must contain an uppercase letter")
    .regex(/\d/, "password must contain a number"),
  phone: z.string().optional(),

  // Company
  business_type: z.enum(["limited_company","llp","lp","sole_trader","partnership","charity","other"]),
  country_of_incorporation: z.enum(["GB","IE","US","CA","AU"]),
  company_number: z.string().optional(),
  company_name: z.string().min(1).max(100),

  // Forwarding address
  forward_to_first_name: z.string().min(1).max(50),
  forward_to_last_name: z.string().min(1).max(50),
  address_line1: z.string().min(1).max(200),
  address_line2: z.string().optional(),
  city: z.string().min(1).max(100),
  postcode: z.string().min(1).max(20),
  forward_country: z.enum(["GB","IE","US","CA","AU"]),

  // Step 1/3 fields that backend can ignore or store if you already do
  billing: z.enum(["monthly","annual"]).optional(),
  price: z.string().optional(), // frontend-calculated
});

router.post("/signup", async (req, res) => {
  const parsed = SignupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: "validation_error", details: parsed.error.flatten() });
  }
  const i = parsed.data;

  // Normalize
  const email = i.email.toLowerCase();

  try {
    // Enforce unique email at app layer (still rely on DB unique index if you have it)
    const exists = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::int AS count FROM "user" WHERE email = $1`,
      [email]
    );
    if (Number(exists.rows[0]?.count ?? 0) > 0) {
      return res.status(409).json({ ok: false, error: "email_exists" });
    }

    const hash = await bcrypt.hash(i.password, 12);

    // Try to insert using a `password_hash` column first.
    // If your table uses `password` instead, we fall back automatically.
    const baseArgs = [
      i.first_name, i.last_name, email, i.phone ?? null,
      i.business_type, i.country_of_incorporation, i.company_number ?? null, i.company_name,
      i.forward_to_first_name, i.forward_to_last_name, i.address_line1, i.address_line2 ?? null,
      i.city, i.postcode, i.forward_country,
    ];

    const insertWithPasswordHash = `
      INSERT INTO "user" (
        first_name, last_name, email, phone,
        business_type, country_of_incorporation, company_number, company_name,
        forward_to_first_name, forward_to_last_name, address_line1, address_line2,
        city, postcode, forward_country,
        password_hash
      ) VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,$8,
        $9,$10,$11,$12,
        $13,$14,$15,
        $16
      )
      RETURNING id, email, first_name, last_name
    `;

    const insertWithPassword = `
      INSERT INTO "user" (
        first_name, last_name, email, phone,
        business_type, country_of_incorporation, company_number, company_name,
        forward_to_first_name, forward_to_last_name, address_line1, address_line2,
        city, postcode, forward_country,
        password
      ) VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,$8,
        $9,$10,$11,$12,
        $13,$14,$15,
        $16
      )
      RETURNING id, email, first_name, last_name
    `;

    let row;
    try {
      const rs = await pool.query(insertWithPasswordHash, [...baseArgs, hash]);
      row = rs.rows[0];
    } catch (e: any) {
      const msg = String(e?.message || "").toLowerCase();
      if (msg.includes('column "password_hash" does not exist')) {
        const rs2 = await pool.query(insertWithPassword, [...baseArgs, hash]);
        row = rs2.rows[0];
      } else {
        throw e;
      }
    }

    return res.status(201).json({
      ok: true,
      data: {
        user_id: row.id,
        email: row.email,
        name: `${row.first_name} ${row.last_name}`,
      },
    });
  } catch (err: any) {
    const m = String(err?.message || "");
    if (m.includes("duplicate key value") && m.toLowerCase().includes("email")) {
      return res.status(409).json({ ok: false, error: "email_exists" });
    }
    console.error("[auth/signup] error:", err);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

export default router;