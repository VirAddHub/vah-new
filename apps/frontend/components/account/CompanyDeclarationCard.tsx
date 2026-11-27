'use client';

/**
 * Company declaration, part of onboarding for customers with a company number: what the business
 * does, where it operates, who its directors and beneficial owners are, and how it is owned.
 * We compare it with the Companies House register. It can be submitted once; after that it can only
 * be changed if we return it with a reason.
 */
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { Plus, Trash2 } from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';
import { cn } from '@/lib/utils';

type Person = { full_name: string; email: string; is_account_holder: boolean; is_director: boolean; is_beneficial_owner: boolean;
  ownership_percent: string; voting_percent: string; other_control: boolean; country_of_residence: string; date_of_birth: string };
type Corp = { name: string; registration_number: string; country: string; ownership_percent: string; ultimate_owners: string };
type Form = { nature_of_business: string; trading_name: string; website: string; same_as_registered_office: boolean; address: string;
  applicant_role: string; applicant_authority: string; people: Person[]; corporate_owners: Corp[]; no_beneficial_owner_explanation: string;
  expected_monthly_mail: string; confirmation: boolean };

const getJson = (u: string) => fetch(u, { credentials: 'include', cache: 'no-store' }).then(r => r.json());
const blankPerson = (o: Partial<Person> = {}): Person => ({ full_name: '', email: '', is_account_holder: false, is_director: false, is_beneficial_owner: false,
  ownership_percent: '', voting_percent: '', other_control: false, country_of_residence: 'United Kingdom', date_of_birth: '', ...o });
const field = 'h-10 w-full rounded-md border border-border bg-background px-3 text-body-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20';
// Values can arrive as numbers (a returned declaration) or text (typed in): accept both.
const num = (v: unknown) => { const t = String(v ?? '').trim(); return t === '' ? null : Number(t); };
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

function fromData(d: any, holder: { full_name: string; email: string }): Form {
  if (!d) {
    return { nature_of_business: '', trading_name: '', website: '', same_as_registered_office: true, address: '', applicant_role: 'director_and_beneficial_owner',
      applicant_authority: '', people: [blankPerson({ full_name: holder.full_name, email: holder.email, is_account_holder: true, is_director: true, is_beneficial_owner: true })],
      corporate_owners: [], no_beneficial_owner_explanation: '', expected_monthly_mail: '0-10', confirmation: false };
  }
  return { nature_of_business: d.nature_of_business ?? '', trading_name: d.trading_name ?? '', website: d.website ?? '',
    same_as_registered_office: !!d.principal_place_of_business?.same_as_registered_office, address: d.principal_place_of_business?.address ?? '',
    applicant_role: d.applicant_role, applicant_authority: d.applicant_authority ?? '',
    people: (d.people ?? []).map((p: any) => blankPerson({ ...p, email: str(p.email), ownership_percent: str(p.ownership_percent), voting_percent: str(p.voting_percent), date_of_birth: str(p.date_of_birth), country_of_residence: str(p.country_of_residence) })),
    corporate_owners: (d.corporate_owners ?? []).map((c: any) => ({ name: str(c.name), registration_number: str(c.registration_number), country: str(c.country), ownership_percent: str(c.ownership_percent), ultimate_owners: str(c.ultimate_owners) })),
    no_beneficial_owner_explanation: d.no_beneficial_owner_explanation ?? '', expected_monthly_mail: d.expected_monthly_mail ?? '0-10', confirmation: false };
}

export function CompanyDeclarationCard() {
  const { data, mutate } = useSWR('/api/bff/company-declaration', getJson);
  const { refresh: refreshAccess } = useAccess();
  const info = data?.data;
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  useEffect(() => { if (error) errorRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }); }, [error]);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (info?.required && info.editable && !form) setForm(fromData(info.declaration?.data, info.account_holder ?? { full_name: '', email: '' }));
  }, [info, form]);

  if (!info?.required) return null;
  const set = (patch: Partial<Form>) => setForm(f => (f ? { ...f, ...patch } : f));
  const setPerson = (i: number, patch: Partial<Person>) => setForm(f => (f ? { ...f, people: f.people.map((p, j) => (j === i ? { ...p, ...patch } : p)) } : f));
  const setCorp = (i: number, patch: Partial<Corp>) => setForm(f => (f ? { ...f, corporate_owners: f.corporate_owners.map((c, j) => (j === i ? { ...c, ...patch } : c)) } : f));

  const submit = async () => {
    if (!form) return;
    setError(null);
    const missingEmail = form.people.find(p => !p.is_account_holder && (p.is_director || p.is_beneficial_owner) && !p.email.trim());
    if (missingEmail) { setError(`Add an email address for ${missingEmail.full_name || 'each person you listed'}: we ask them to verify their identity.`); return; }
    const unnamed = form.people.findIndex(p => !p.full_name.trim());
    if (unnamed >= 0) { setError(`Enter the full name of person ${unnamed + 1}, or remove them.`); return; }
    const noRole = form.people.find(p => !p.is_director && !p.is_beneficial_owner);
    if (noRole) { setError(`Tick Director or Owner or controller for ${noRole.full_name}, or remove them.`); return; }
    setBusy(true);
    try {
    const body = {
      nature_of_business: form.nature_of_business, trading_name: form.trading_name || null, website: form.website || null,
      principal_place_of_business: { same_as_registered_office: form.same_as_registered_office, address: form.same_as_registered_office ? null : form.address },
      applicant_role: form.applicant_role, applicant_authority: form.applicant_role === 'authorised_person' ? form.applicant_authority : null,
      people: form.people.map(p => ({ full_name: p.full_name, email: p.email || null, is_account_holder: p.is_account_holder, is_director: p.is_director,
        is_beneficial_owner: p.is_beneficial_owner, ownership_percent: p.is_beneficial_owner ? num(p.ownership_percent) : null,
        voting_percent: p.is_beneficial_owner ? num(p.voting_percent) : null, other_control: p.is_beneficial_owner && p.other_control,
        country_of_residence: p.country_of_residence, date_of_birth: p.date_of_birth || null })),
      corporate_owners: form.corporate_owners.map(c => ({ ...c, registration_number: c.registration_number || null, ownership_percent: num(c.ownership_percent) ?? 0 })),
      no_beneficial_owner_explanation: form.no_beneficial_owner_explanation || null, expected_monthly_mail: form.expected_monthly_mail, confirmation: form.confirmation,
    };
      const res = await fetch('/api/bff/company-declaration', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        // Name the person a problem is about (e.g. "people.1.email" -> person 2).
        const issues: { path: string; message: string }[] = json?.issues ?? [];
        const named = issues.map(i => { const m = i.path.match(/^people\.(\d+)/); const who = m ? form.people[Number(m[1])]?.full_name || `person ${Number(m[1]) + 1}` : null; return who ? `${who}: ${i.message}` : i.message; });
        setError(named.length ? named.join(' ') : json?.message || 'We could not submit your details. Please check them and try again.');
        return;
      }
      const invited: string[] = json.data?.owners_invited ?? [];
      setDone(invited.length ? `Thank you. We have emailed ${invited.join(', ')} to verify their identity.` : 'Thank you. We will check your company details.');
      setForm(null);
      await mutate(); await refreshAccess();
    } catch {
      setError('We could not submit your details. Please try again.');
    } finally { setBusy(false); }
  };

  const submitted = info.declaration && !info.declaration.returned_at;
  const anyOwner = form ? form.people.some(p => p.is_beneficial_owner) || form.corporate_owners.length > 0 : true;

  return (
    <section id="company" className="w-full min-w-0 max-w-full scroll-mt-24 rounded-xl border border-border/80 bg-card p-5 shadow-sm sm:max-w-2xl sm:rounded-2xl sm:p-8">
      <h3 className="text-h4 text-foreground sm:text-h3">Your company</h3>
      <p className="mt-1 text-body-sm text-muted-foreground">
        {info.company_name ? `${info.company_name} · ` : ''}<span className="tabular-nums">{info.company_number}</span>.
        We check these details against the Companies House register, as the law requires.
      </p>
      {done && <p role="status" className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-body-sm">{done}</p>}

      {submitted && !form && (
        <p className="mt-4 text-body-sm text-muted-foreground">
          Submitted {new Date(info.declaration.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. To change it, contact support.
        </p>
      )}

      {form && (
        <form className="mt-5 space-y-5" onSubmit={e => { e.preventDefault(); void submit(); }}>
          {info.declaration?.returned_at && (
            <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-body-sm text-amber-950">We need you to update these details: {info.declaration.returned_reason}</p>
          )}
          <label className="block">
            <span className="text-body-sm font-medium text-foreground">What does your business do?</span>
            <textarea className={cn(field, 'mt-1 h-20 py-2')} value={form.nature_of_business} onChange={e => set({ nature_of_business: e.target.value })} required minLength={10} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="text-body-sm font-medium">Trading name <span className="font-normal text-muted-foreground">(if different)</span></span>
              <input className={cn(field, 'mt-1')} value={form.trading_name} onChange={e => set({ trading_name: e.target.value })} /></label>
            <label className="block"><span className="text-body-sm font-medium">Website <span className="font-normal text-muted-foreground">(optional)</span></span>
              <input className={cn(field, 'mt-1')} value={form.website} onChange={e => set({ website: e.target.value })} /></label>
          </div>
          <fieldset>
            <legend className="text-body-sm font-medium">Where does the business mainly operate from?</legend>
            <div className="mt-1 flex flex-wrap gap-4 text-body-sm">
              <label className="flex items-center gap-2"><input type="radio" checked={form.same_as_registered_office} onChange={() => set({ same_as_registered_office: true })} /> Its registered office</label>
              <label className="flex items-center gap-2"><input type="radio" checked={!form.same_as_registered_office} onChange={() => set({ same_as_registered_office: false })} /> Somewhere else</label>
            </div>
            {!form.same_as_registered_office && <input className={cn(field, 'mt-2')} placeholder="Full address" value={form.address} onChange={e => set({ address: e.target.value })} aria-label="Principal place of business" />}
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="text-body-sm font-medium">Your role</span>
              <select className={cn(field, 'mt-1')} value={form.applicant_role} onChange={e => set({ applicant_role: e.target.value })}>
                <option value="director_and_beneficial_owner">Director and owner</option>
                <option value="director">Director</option>
                <option value="beneficial_owner">Owner (not a director)</option>
                <option value="authorised_person">Authorised to act for the company</option>
              </select></label>
            <label className="block"><span className="text-body-sm font-medium">Post you expect each month</span>
              <select className={cn(field, 'mt-1')} value={form.expected_monthly_mail} onChange={e => set({ expected_monthly_mail: e.target.value })}>
                {['0-10', '11-50', '51-200', '200+'].map(v => <option key={v} value={v}>{v} items</option>)}
              </select></label>
          </div>
          {form.applicant_role === 'authorised_person' && (
            <input className={field} placeholder="Your authority to act (for example: company secretary, written authority from a director)" value={form.applicant_authority} onChange={e => set({ applicant_authority: e.target.value })} aria-label="Your authority" />
          )}

          <fieldset className="space-y-3">
            <legend className="text-body-sm font-medium">Directors and beneficial owners</legend>
            <p className="text-caption text-muted-foreground">Include every director, and everyone who owns or controls more than 25% of the shares or votes, or otherwise controls the company. We will ask each person other than you to verify their identity.</p>
            {form.people.map((p, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className={field} placeholder="Full name" value={p.full_name} onChange={e => setPerson(i, { full_name: e.target.value })} aria-label={`Person ${i + 1} name`} readOnly={p.is_account_holder} />
                  {p.is_account_holder ? <p className="self-center text-caption text-muted-foreground">This is you</p>
                    : <input className={field} type="email" placeholder="Email (for identity verification)" value={p.email} onChange={e => setPerson(i, { email: e.target.value })} aria-label={`Person ${i + 1} email`} />}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-body-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={p.is_director} onChange={e => setPerson(i, { is_director: e.target.checked })} /> Director</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={p.is_beneficial_owner} onChange={e => setPerson(i, { is_beneficial_owner: e.target.checked })} /> Owner or controller</label>
                  {!p.is_account_holder && <button type="button" className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground" onClick={() => set({ people: form.people.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" aria-hidden /> Remove</button>}
                </div>
                {p.is_beneficial_owner && (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input className={field} inputMode="decimal" placeholder="% of shares" value={p.ownership_percent} onChange={e => setPerson(i, { ownership_percent: e.target.value })} aria-label={`Person ${i + 1} share percentage`} />
                    <input className={field} inputMode="decimal" placeholder="% of votes" value={p.voting_percent} onChange={e => setPerson(i, { voting_percent: e.target.value })} aria-label={`Person ${i + 1} voting percentage`} />
                    <label className="flex items-center gap-2 text-body-sm"><input type="checkbox" checked={p.other_control} onChange={e => setPerson(i, { other_control: e.target.checked })} /> Controls it another way</label>
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block"><span className="text-caption text-muted-foreground">Country they live in</span>
                    <input className={cn(field, 'mt-0.5')} value={p.country_of_residence} onChange={e => setPerson(i, { country_of_residence: e.target.value })} aria-label={`Person ${i + 1} country of residence`} /></label>
                  <label className="block"><span className="text-caption text-muted-foreground">Month and year of birth</span>
                    <input className={cn(field, 'mt-0.5')} type="month" value={p.date_of_birth} onChange={e => setPerson(i, { date_of_birth: e.target.value })} aria-label={`Person ${i + 1} month and year of birth`} /></label>
                </div>
              </div>
            ))}
            <button type="button" className="inline-flex items-center gap-1 text-body-sm font-medium text-foreground underline" onClick={() => set({ people: [...form.people, blankPerson()] })}><Plus className="h-4 w-4" aria-hidden /> Add a person</button>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-body-sm font-medium">Companies or other entities that own more than 25%</legend>
            {form.corporate_owners.map((c, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <input className={field} placeholder="Name" value={c.name} onChange={e => setCorp(i, { name: e.target.value })} aria-label={`Owner company ${i + 1} name`} />
                  <input className={field} placeholder="Registration number" value={c.registration_number} onChange={e => setCorp(i, { registration_number: e.target.value })} aria-label={`Owner company ${i + 1} number`} />
                  <input className={field} placeholder="Country" value={c.country} onChange={e => setCorp(i, { country: e.target.value })} aria-label={`Owner company ${i + 1} country`} />
                </div>
                <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
                  <input className={field} inputMode="decimal" placeholder="% owned" value={c.ownership_percent} onChange={e => setCorp(i, { ownership_percent: e.target.value })} aria-label={`Owner company ${i + 1} percentage`} />
                  <input className={field} placeholder="Who ultimately owns or controls it (names)" value={c.ultimate_owners} onChange={e => setCorp(i, { ultimate_owners: e.target.value })} aria-label={`Owner company ${i + 1} ultimate owners`} />
                </div>
                <button type="button" className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-foreground" onClick={() => set({ corporate_owners: form.corporate_owners.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" aria-hidden /> Remove</button>
              </div>
            ))}
            <button type="button" className="inline-flex items-center gap-1 text-body-sm font-medium text-foreground underline" onClick={() => set({ corporate_owners: [...form.corporate_owners, { name: '', registration_number: '', country: 'United Kingdom', ownership_percent: '', ultimate_owners: '' }] })}><Plus className="h-4 w-4" aria-hidden /> Add an owning company</button>
          </fieldset>

          {!anyOwner && (
            <label className="block"><span className="text-body-sm font-medium">No one owns or controls more than 25%? Explain how the company is owned and controlled.</span>
              <textarea className={cn(field, 'mt-1 h-16 py-2')} value={form.no_beneficial_owner_explanation} onChange={e => set({ no_beneficial_owner_explanation: e.target.value })} /></label>
          )}
          <label className="flex items-start gap-2 text-body-sm"><input type="checkbox" className="mt-1" checked={form.confirmation} onChange={e => set({ confirmation: e.target.checked })} />
            I confirm this information is complete and correct, and I will tell VirtualAddressHub if it changes.</label>
          {error && <p ref={errorRef} role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-body-sm text-destructive">{error}</p>}
          <button type="submit" disabled={busy} className="inline-flex h-11 items-center rounded-full bg-foreground px-6 text-body-sm font-medium text-background hover:opacity-90 disabled:opacity-50">{busy ? 'Submitting…' : 'Submit company details'}</button>
        </form>
      )}
    </section>
  );
}
