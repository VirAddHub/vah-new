/**
 * The customer's declaration about their company, collected during onboarding: business activity,
 * principal place of business, directors, beneficial owners (with ownership and control), corporate
 * owners and the individuals behind them, and expected mail volume.
 *
 * It is what Companies House is compared against. Each submission is a new row (history kept);
 * the latest counts. After submitting, the customer cannot change it unless an administrator
 * returns it with a reason.
 */
import { z } from 'zod';
import { normaliseCompanyNumber } from './chClient';
import type { Queryable } from './store';

const pct = z.number().min(0).max(100).nullable().optional();
const text = (max: number) => z.string().trim().max(max);

export const PersonSchema = z.object({
    full_name: text(120).min(2, 'Enter each person\'s full name'),
    email: z.string().trim().toLowerCase().email().max(200).nullable().optional().or(z.literal('').transform(() => null)),
    is_account_holder: z.boolean().default(false),
    is_director: z.boolean(),
    is_beneficial_owner: z.boolean(),
    ownership_percent: pct,
    voting_percent: pct,
    other_control: z.boolean().default(false),
    country_of_residence: text(60).min(2, 'Enter the country each person lives in'),
    date_of_birth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Date of birth as YYYY-MM').nullable().optional().or(z.literal('').transform(() => null)),
});

export const CorporateOwnerSchema = z.object({
    name: text(160).min(2),
    registration_number: text(40).nullable().optional(),
    country: text(60).min(2),
    ownership_percent: z.number().min(0).max(100),
    ultimate_owners: text(600).min(3, 'Name the individuals who ultimately own or control each corporate owner'),
});

/**
 * forCustomer: the customer's own submission (they confirm it, and give an email for each other
 * director or owner so we can verify them). Staff entering details on the customer's behalf
 * record the source instead, and may not have every email.
 */
const makeDeclarationSchema = (forCustomer: boolean) => z.object({
    nature_of_business: text(1000).min(10, 'Describe what the business does (at least 10 characters)'),
    trading_name: text(120).nullable().optional(),
    website: text(200).nullable().optional(),
    principal_place_of_business: z.object({
        same_as_registered_office: z.boolean(),
        address: text(300).nullable().optional(),
    }),
    applicant_role: z.enum(['director', 'beneficial_owner', 'director_and_beneficial_owner', 'authorised_person']),
    applicant_authority: text(300).nullable().optional(),
    people: z.array(PersonSchema).min(1).max(20),
    corporate_owners: z.array(CorporateOwnerSchema).max(10).default([]),
    no_beneficial_owner_explanation: text(600).nullable().optional(),
    expected_monthly_mail: z.enum(['0-10', '11-50', '51-200', '200+']),
    confirmation: forCustomer ? z.literal(true, { message: 'Confirm the information is complete and correct' }) : z.boolean().optional(),
}).superRefine((d, ctx) => {
    if (!d.principal_place_of_business.same_as_registered_office && !(d.principal_place_of_business.address || '').trim()) {
        ctx.addIssue({ code: 'custom', path: ['principal_place_of_business', 'address'], message: 'Enter the principal place of business' });
    }
    if (d.applicant_role === 'authorised_person' && !(d.applicant_authority || '').trim()) {
        ctx.addIssue({ code: 'custom', path: ['applicant_authority'], message: 'Explain your authority to act for the company' });
    }
    if (!d.people.some(p => p.is_director)) ctx.addIssue({ code: 'custom', path: ['people'], message: 'List at least one director' });
    const hasOwner = d.people.some(p => p.is_beneficial_owner) || d.corporate_owners.length > 0;
    if (!hasOwner && !(d.no_beneficial_owner_explanation || '').trim()) {
        ctx.addIssue({ code: 'custom', path: ['people'], message: 'List the beneficial owners, or explain why no one owns or controls more than 25%' });
    }
    d.people.forEach((p, i) => {
        if (p.is_beneficial_owner && p.ownership_percent == null && p.voting_percent == null && !p.other_control) {
            ctx.addIssue({ code: 'custom', path: ['people', i, 'ownership_percent'], message: 'Give the ownership or voting share, or say how they otherwise control the company' });
        }
        if (forCustomer && !p.is_account_holder && (p.is_director || p.is_beneficial_owner) && !p.email) {
            ctx.addIssue({ code: 'custom', path: ['people', i, 'email'], message: 'We need an email address to verify this person\'s identity' });
        }
    });
    if (d.people.filter(p => p.is_account_holder).length !== 1) ctx.addIssue({ code: 'custom', path: ['people'], message: forCustomer ? 'Include yourself once' : 'Mark the account holder once' });
});
export const DeclarationSchema = makeDeclarationSchema(true);
/** Company details entered by staff on the customer's behalf. */
export const StaffDeclarationSchema = makeDeclarationSchema(false);
export type Declaration = z.infer<typeof DeclarationSchema>;

/** A beneficial owner under the 25% test, or by other control. */
export const isBeneficialOwner = (p: Declaration['people'][number]) =>
    p.is_beneficial_owner && ((p.ownership_percent ?? 0) > 25 || (p.voting_percent ?? 0) > 25 || p.other_control);

export async function latestDeclaration(db: Queryable, userId: number, companyNumber: string) {
    const r = await db.query(
        // SELECT * so the staff-entry columns come through once their migration is applied.
        `SELECT * FROM company_declaration
          WHERE user_id = $1 AND company_number = $2 ORDER BY submitted_at DESC, id DESC LIMIT 1`, [userId, companyNumber]);
    return r.rows[0] ?? null;
}

/** The company number this customer must declare for: account first, then the primary business. */
export async function declarationTarget(db: Queryable, userId: number): Promise<{ company_number: string; company_name: string | null } | null> {
    const u = (await db.query(`SELECT company_name, company_number, companies_house_number FROM "user" WHERE id = $1`, [userId])).rows[0];
    const n = normaliseCompanyNumber(u?.companies_house_number) || normaliseCompanyNumber(u?.company_number);
    if (n) return { company_number: n, company_name: u.company_name ?? null };
    const b = (await db.query(`SELECT company_name, companies_house_number FROM business WHERE user_id = $1 AND companies_house_number IS NOT NULL ORDER BY is_primary DESC, id LIMIT 1`, [userId])).rows[0];
    const bn = normaliseCompanyNumber(b?.companies_house_number);
    return bn ? { company_number: bn, company_name: b.company_name ?? null } : null;
}
