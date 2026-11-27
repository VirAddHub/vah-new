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
    analysis: { flags: any[]; comparison: any[] };
    entries: any[];
    evidence: any[];
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
        customer: { user_id: i.customer.user_id, email: i.customer.email, name: [i.customer.first_name, i.customer.last_name].filter(Boolean).join(' '),
            company_name_supplied: i.customer.company_name, company_number_supplied: i.customer.company_number, business_type: i.customer.business_type,
            declared_owners: i.customer.owners },
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
        entries: i.entries.map(e => ({ id: Number(e.id), kind: e.kind, field: e.field, register_value: e.ch_value, customer_value: e.customer_value,
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

        h('Customer');
        kv('Customer', `#${c.customer.user_id} ${c.customer.name} <${c.customer.email}>`);
        kv('Company name supplied', c.customer.company_name_supplied); kv('Company number supplied', c.customer.company_number_supplied);
        kv('Business type supplied', c.customer.business_type);
        kv('Declared owners/directors', (c.customer.declared_owners ?? []).map((o: any) => `${o.full_name} (${o.role ?? 'owner'}, identity check: ${o.status ?? '—'})`).join('; ') || 'None declared (sole controller)');

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

        h('Flags raised');
        if (!c.flags.length) line('None.');
        for (const f of c.flags) line(`• [${f.level}] ${f.area}: ${f.text}`);

        h('Checklist');
        for (const i of c.checklist) line(`${i.done ? '[x]' : '[ ]'} ${i.label}${i.done ? ` — admin #${fmt(i.by)}, ${dt(i.at)}` : ''}${i.note ? ` — ${i.note}` : ''}`);

        h('Discrepancies and notes');
        if (!c.entries.length) line('None recorded.');
        for (const e of c.entries) {
            line(`• ${dt(e.at)} admin #${e.by} — ${e.kind === 'discrepancy' ? `DISCREPANCY${e.material ? ' (material)' : ''} in ${fmt(e.field)}: register "${fmt(e.register_value)}" / customer "${fmt(e.customer_value)}". ` : 'Note: '}${e.body}`);
            if (e.resolved_at) line(`    Resolved ${dt(e.resolved_at)}: ${fmt(e.resolution)}${e.reported_to_companies_house ? ` · Reported to Companies House, ref ${fmt(e.report_reference)}` : ''}`);
        }
        h('Supporting evidence');
        if (!c.evidence.length) line('None uploaded.');
        for (const e of c.evidence) line(`• ${dt(e.at)} ${e.kind.replace(/_/g, ' ')}: ${e.description} (${e.filename}, SHA-256 ${e.sha256.slice(0, 16)}…)`);

        doc.moveDown(0.8).fontSize(8).fillColor('#555').text(c.scope_note);
        doc.moveDown(0.3).text(`Monitoring for changes: ${c.monitoring ? 'on' : 'off'}. Content SHA-256: ${sha256}`);
        doc.end();
    });
}
