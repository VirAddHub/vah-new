const { z } = require('zod');

const Base = z.object({
    NODE_ENV: z.enum(['production', 'development', 'test']).default('development'),
    APP_ENV: z.enum(['production', 'development', 'test']).default('development'),
    APP_ORIGIN: z.string().url().optional(),               // e.g. https://www.virtualaddresshub.co.uk
    BACKEND_API_ORIGIN: z.string().url().optional(),       // e.g. https://api.virtualaddresshub.co.uk/api
    DATA_DIR: z.string().min(1),
    INVOICES_DIR: z.string().min(1),
    BACKUPS_DIR: z.string().min(1),
    COOKIE_SECRET: z.string().min(16),
    POSTMARK_API_TOKEN: z.string().min(10),
    POSTMARK_FROM: z.string().email(),
    GO_CARDLESS_SECRET: z.string().min(10),
    SUMSUB_SECRET: z.string().min(10),
    COMPANIES_HOUSE_API_KEY: z.string().min(10),
    ADDRESS_API_KEY: z.string().min(10),
    INVOICE_LINK_TTL_USER_MIN: z.coerce.number().int().positive().default(30),
    INVOICE_LINK_TTL_ADMIN_MIN: z.coerce.number().int().positive().default(60),
});

const DevRelaxed = Base.partial({
    COOKIE_SECRET: true,
    POSTMARK_API_TOKEN: true,
    POSTMARK_FROM: true,
    GO_CARDLESS_SECRET: true,
    SUMSUB_SECRET: true,
    COMPANIES_HOUSE_API_KEY: true,
    ADDRESS_API_KEY: true,
}).extend({
    DATA_DIR: z.string().default('./dist/data'),
    INVOICES_DIR: z.string().default('./dist/data/invoices'),
    BACKUPS_DIR: z.string().default('./dist/data/backups'),
    COOKIE_SECRET: z.string().default('dev-cookie-secret-please-change'),
});

const schema = (process.env.NODE_ENV === 'production') ? Base : DevRelaxed;
const parsed = schema.safeParse(process.env);

if (!parsed.success) {
    const missing = parsed.error.issues.map(i => i.path.join('.')).join(', ');
    console.error('❌ Missing/invalid env:', missing);
    if (process.env.NODE_ENV === 'production') process.exit(1);
}

const env = parsed.success ? parsed.data : parsed.data;

module.exports = { env };