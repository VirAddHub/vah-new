/**
 * Dated company verification report: a frozen copy of the check (register extract, comparison,
 * checklist, discrepancies, notes, evidence list and decision) plus a PDF rendering of it.
 * The JSON content and its SHA-256 are stored with the PDF; neither can be changed afterwards.
 */
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { addressLine } from './chClient';
import { CHECKLIST } from './analysis';

export interface ReportInput {
    check: any;
    customer: any;
    analysis: { flags: any[]; comparison: any[]; automated?: any[]; missing?: any[] };
    entries: any[];
    evidence: any[];
    identity?: any[];
    generatedBy: { id: number; email: string | null };
    reason: string;
    now?: Date;
}

export const SCOPE_NOTE = 'Scope: company due diligence using the Companies House register. The register is not, on its own, proof of '
    + 'beneficial ownership (MLR 2017 reg 28(9)); beneficial ownership is recorded as separately verified below. Individual identity '
    + 'verification, address verification, PEP, sanctions and adverse-media screening are carried out and recorded separately and are '
    + 'not part of this report.';

export function buildReportContent(i: ReportInput) {
    const s = i.check.snapshot || {};
    return {
        title: 'Company verification report',
        generated_at: (i.now ?? new Date()).toISOString(),
        generated_by: i.generatedBy,
        reason: i.reason,
        check_id: Number(i.check.id),
        status: i.check.status,
        decision: { by: i.check.decided_by ?? null, at: i.check.decided_at ?? null, reason: i.check.decision_reason ?? null },
        risk: { rating: i.check.risk_rating ?? null, reason: i.check.risk_reason ?? null },
        customer: { user_id: i.customer.user_id, email: i.customer.email, name: [i.customer.first_name, i.customer.last_name].filter(Boolean).join(' '),
            company_name_supplied: i.customer.company_name, company_number_supplied: i.customer.company_number, business_type: i.customer.business_type,
            declared_owners: i.customer.owners },
        declaration: i.customer.declaration ? { submitted_at: i.customer.declaration.submitted_at, returned_at: i.customer.declaration.returned_at ?? null, data: i.customer.declaration.data } : null,
        automated_results: i.analysis.automated ?? [],
        missing_information: i.analysis.missing ?? [],
        identity_records: (i.identity ?? []).map((r: any) => ({ subject: r.subject, owner_id: r.owner_id, outcome: r.outcome, method: r.method, reference: r.reference, by: r.admin_id, at: r.created_at })),
        register_extract_retrieved_at: s.retrieved_at ?? null,
        company: s.profile ?? null,
        officers: s.officers ?? [],
        pscs: s.pscs ?? [],
        psc_statements: s.psc_statements ?? [],
        filing_history: (s.filing_history ?? []).slice(0, 15),
        insolvency: s.insolvency ?? null,
        partial_errors: s.partial_errors ?? [],
        flags: i.analysis.flags,
        comparison: i.analysis.comparison,
        checklist: CHECKLIST.map(c => ({ id: c.id, label: c.label, ...(i.check.checklist?.[c.id] ?? { done: false }) })),
        entries: i.entries.map(e => ({ id: Number(e.id), kind: e.kind, category: e.category ?? null, source: e.source ?? 'admin', materiality: e.materiality ?? null, field: e.field, register_value: e.ch_value, customer_value: e.customer_value,
            material: e.material, body: e.body, by: e.admin_id, at: e.created_at, resolution: e.resolution, reported_to_companies_house: e.reported_to_ch,
            report_reference: e.report_reference, resolved_at: e.resolved_at })),
        evidence: i.evidence.map(e => ({ id: Number(e.id), kind: e.kind, description: e.description, filename: e.filename, sha256: e.sha256, by: e.admin_id, at: e.created_at })),
        monitoring: !!i.check.monitoring,
        scope_note: SCOPE_NOTE,
    };
}

export function contentHash(content: unknown): string {
    return crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');
}

const fmt = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));
const dt = (v: unknown) => { if (!v) return '—'; const d = new Date(String(v)); return isNaN(+d) ? String(v) : d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'; };

export function renderReportPdf(c: ReturnType<typeof buildReportContent>, sha256: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `Company verification report ${c.company?.company_number ?? ''}`, Author: 'VirtualAddressHub' } });
        const chunks: Buffer[] = [];
        doc.on('data', (b: Buffer) => chunks.push(b));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const h = (t: string) => { doc.moveDown(0.6).font('Helvetica-Bold').fontSize(11).fillColor('#123b2c').text(t).moveDown(0.2).font('Helvetica').fontSize(9).fillColor('#111'); };
        const kv = (k: string, v: unknown) => { doc.font('Helvetica-Bold').text(`${k}: `, { continued: true }).font('Helvetica').text(fmt(v)); };
        const line = (t: string) => doc.text(t, { paragraphGap: 1 });

        doc.font('Helvetica-Bold').fontSize(16).fillColor('#123b2c').text('Company verification report');
        doc.font('Helvetica').fontSize(9).fillColor('#444')
            .text(`VirtualAddressHub · Report generated ${dt(c.generated_at)} by admin #${c.generated_by.id}${c.generated_by.email ? ` (${c.generated_by.email})` : ''}`)
            .text(`Reason: ${c.reason} · Check #${c.check_id} · Outcome at time of report: ${c.status.replace(/_/g, ' ')}`)
            .text(`Companies House extract retrieved ${dt(c.register_extract_retrieved_at)}`);
        doc.fillColor('#111');

        h('Decision');
        kv('Outcome', c.status.replace(/_/g, ' ')); kv('Decided by', c.decision.by ? `admin #${c.decision.by}` : null); kv('Decided at', dt(c.decision.at)); kv('Reason', c.decision.reason);

        kv('Risk rating', c.risk.rating ? `${c.risk.rating}${c.risk.reason ? ` – ${c.risk.reason}` : ''}` : null);

        h('Customer');
        kv('Customer', `#${c.customer.user_id} ${c.customer.name} <${c.customer.email}>`);
        kv('Company name supplied', c.customer.company_name_supplied); kv('Company number supplied', c.customer.company_number_supplied);
        kv('Business type supplied', c.customer.business_type);
        kv('Declared owners/directors', (c.customer.declared_owners ?? []).map((o: any) => `${o.full_name} (${o.role ?? 'owner'}, identity check: ${o.status ?? '—'})`).join('; ') || 'None declared (sole controller)');

        if (c.declaration) {
            const d: any = c.declaration.data;
            h(`Customer declaration (submitted ${dt(c.declaration.submitted_at)})`);
            kv('Nature of business', d.nature_of_business); kv('Trading name', d.trading_name); kv('Website', d.website);
            kv('Principal place of business', d.principal_place_of_business?.same_as_registered_office ? 'Same as registered office' : d.principal_place_of_business?.address);
            kv('Account holder\'s role', `${String(d.applicant_role).replace(/_/g, ' ')}${d.applicant_authority ? ` – ${d.applicant_authority}` : ''}`);
            kv('Expected mail per month', d.expected_monthly_mail);
            for (const x of d.people ?? []) line(`• ${x.full_name}${x.is_account_holder ? ' (account holder)' : ''}: ${[x.is_director ? 'director' : '', x.is_beneficial_owner ? 'beneficial owner' : ''].filter(Boolean).join(', ')}${x.ownership_percent != null ? `; ${x.ownership_percent}% shares` : ''}${x.voting_percent != null ? `; ${x.voting_percent}% votes` : ''}${x.other_control ? '; other control' : ''}; lives in ${x.country_of_residence}`);
            for (const x of d.corporate_owners ?? []) line(`• Corporate owner ${x.name} (${x.country}${x.registration_number ? `, ${x.registration_number}` : ''}): ${x.ownership_percent}%; ultimately ${x.ultimate_owners}`);
            if (d.no_beneficial_owner_explanation) kv('No beneficial owner over 25%', d.no_beneficial_owner_explanation);
        } else {
            h('Customer declaration'); line('Not submitted.');
        }

        const p = c.company || {};
        h('Company (Companies House)');
        kv('Name', p.company_name); kv('Number', p.company_number); kv('Status', [p.company_status, p.company_status_detail].filter(Boolean).join(' – '));
        kv('Type', p.type); kv('Incorporated', p.date_of_creation); kv('Dissolved', p.date_of_cessation);
        kv('Registered office', addressLine(p.registered_office_address)); kv('SIC codes', (p.sic_codes ?? []).join(', '));
        kv('Accounts', `last made up to ${fmt(p.accounts?.last_accounts?.made_up_to)}, next due ${fmt(p.accounts?.next_due)}${p.accounts?.overdue ? ' (OVERDUE)' : ''}`);
        kv('Confirmation statement', `last made up to ${fmt(p.confirmation_statement?.last_made_up_to)}, next due ${fmt(p.confirmation_statement?.next_due)}${p.confirmation_statement?.overdue ? ' (OVERDUE)' : ''}`);
        kv('Insolvency history', p.has_insolvency_history || p.has_been_liquidated ? 'Yes' : 'No');
        for (const ca of c.insolvency?.cases ?? []) line(`  • ${ca.type}: ${(ca.dates ?? []).map((d: any) => `${d.type} ${d.date}`).join(', ')}`);

        h('Officers');
        for (const o of c.officers) {
            const dq = o.disqualification;
            line(`• ${o.name} — ${fmt(o.officer_role)}, appointed ${fmt(o.appointed_on)}${o.resigned_on ? `, resigned ${o.resigned_on}` : ''}; resides ${fmt(o.country_of_residence)}; `
                + `${o.appointment_count != null ? `${o.appointment_count} appointments; ` : ''}`
                + `${dq?.searched ? (dq.matches.length ? `POSSIBLE DISQUALIFICATION MATCH (${dq.matches.map((m: any) => m.title).join(', ')})` : 'no disqualification match') : (o.resigned_on ? '' : 'not screened')}`);
        }
        h('Persons with significant control');
        if (!c.pscs.length) line('None on the register.');
        for (const ps of c.pscs) line(`• ${ps.name} — ${fmt(ps.kind)}; ${(ps.natures_of_control ?? []).join(', ')}; notified ${fmt(ps.notified_on)}${ps.ceased_on ? `, ceased ${ps.ceased_on}` : ''}; resides ${fmt(ps.country_of_residence)}`);
        for (const st of c.psc_statements) line(`• Statement: ${st.statement}${st.ceased_on ? ` (ceased ${st.ceased_on})` : ''}`);

        h('Recent filing history');
        for (const f of c.filing_history) line(`• ${fmt(f.date)} ${fmt(f.type)} — ${fmt(f.description).replace(/-/g, ' ')}`);

        h('Comparison with customer information');
        for (const r of c.comparison) line(`• ${r.field}: register "${fmt(r.register)}" / customer "${fmt(r.customer)}" — ${r.result.replace(/_/g, ' ')}`);

        h('Automated results');
        for (const a of c.automated_results) line(`• ${String(a.status).replace(/_/g, ' ').toUpperCase()} — ${a.label}: ${a.detail}`);
        if (c.missing_information.length) { h('Missing information'); for (const m of c.missing_information) line(`• (${m.from}) ${m.text}`); }
        if (c.flags.length) { h('Other observations'); for (const f of c.flags) line(`• ${f.area}: ${f.text}`); }

        h('Identity results recorded (individual checks, separate from this company check)');
        if (!c.identity_records.length) line('None recorded.');
        for (const r of c.identity_records) line(`• ${dt(r.at)} ${r.subject.replace(/_/g, ' ')}${r.owner_id ? ` #${r.owner_id}` : ''}: ${r.outcome} by ${r.method.replace(/_/g, ' ')}${r.reference ? `, ref ${r.reference}` : ''}`);

        h('Administrator judgement');
        for (const i of c.checklist) line(`${i.done ? '[x]' : '[ ]'} ${i.label}${i.done ? ` — admin #${fmt(i.by)}, ${dt(i.at)}` : ''}${i.note ? ` — ${i.note}` : ''}`);

        h('Discrepancies and notes');
        if (!c.entries.length) line('None recorded.');
        for (const e of c.entries) {
            line(`• ${dt(e.at)} ${e.by ? `admin #${e.by}` : 'system'} — ${e.kind === 'discrepancy' ? `DISCREPANCY (${e.category === 'beneficial_ownership' ? 'beneficial ownership' : 'other'}) in ${fmt(e.field)}: register "${fmt(e.register_value)}" / customer "${fmt(e.customer_value)}". ` : 'Note: '}${e.body}`);
            if (e.resolved_at) line(`    Resolved ${dt(e.resolved_at)}: ${fmt(e.resolution)}${e.materiality ? ` · ${String(e.materiality).replace(/_/g, ' ')}` : ''}${e.reported_to_companies_house ? ` · Reported to Companies House, ref ${fmt(e.report_reference)}` : ''}`);
        }
        h('Supporting evidence');
        if (!c.evidence.length) line('None uploaded.');
        for (const e of c.evidence) line(`• ${dt(e.at)} ${e.kind.replace(/_/g, ' ')}: ${e.description} (${e.filename}, SHA-256 ${e.sha256.slice(0, 16)}…)`);

        doc.moveDown(0.8).fontSize(8).fillColor('#555').text(c.scope_note);
        doc.moveDown(0.3).text(`Monitoring for changes: ${c.monitoring ? 'on' : 'off'}. Content SHA-256: ${sha256}`);
        doc.end();
    });
}
