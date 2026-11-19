import re,json,glob,collections
A='/home/claude/bundle/audit/2026-11-14/'
routes=[]
for l in open('/home/claude/be_routes.txt'):
    m=re.match(r'(\w+) (\S+)\s+\[(.*)\]',l.strip())
    if m: routes.append(m.groups())
seen=collections.defaultdict(set)
acc=[]
for l in open('/home/claude/be.log'):
    if '"http_access"' not in l: continue
    try: j=json.loads(l)
    except: continue
    acc.append((j['method'],j['path'].split('?')[0],j['statusCode']))
def rx(p): return re.compile('^'+re.sub(r':[A-Za-z_]+',r'[^/]+',p).rstrip('/')+'/?$')
# static routes first so /users/stats does not match /users/:id
order=sorted(range(len(routes)),key=lambda i:(routes[i][1].count(':'),-len(routes[i][1])))
comp={i:rx(routes[i][1]) for i in order}
unmatched=collections.Counter()
for m,p,s in acc:
    for i in order:
        if routes[i][0]==m and comp[i].match(p): seen[i].add(s); break
    else: unmatched[(m,p,s)]+=1
AREAS=[('/api/admin','Administration'),('/api/auth','Accounts'),('/api/profile','Accounts / dashboard'),('/api/kyc','Verification'),('/api/business-owners','Verification'),('/api/account','Dashboard'),('/api/mail','Mail'),('/api/tags','Mail'),('/api/forwarding','Mail / forwarding'),('/api/requests','Mail / forwarding'),('/api/internal','Background jobs'),('/api/webhooks','Webhooks'),('/api/payments','Billing'),('/api/billing','Billing'),('/api/plans','Billing'),('/api/support','Support'),('/api/blog','Public site'),('/api/contact','Public site'),('/api/quiz','Public site'),('/api/companies-house','Onboarding'),('/api/address','Onboarding'),('/api/debug','Ops / debug'),('/api/dev','Ops / debug'),('/api/health','Ops'),('/api/metrics','Ops'),('/api/ops','Ops / debug'),('/api/migrate','Ops / debug'),('/api/gdpr','Dashboard'),('/api/downloads','Dashboard'),('/api/email-prefs','Dashboard'),('/api/notifications','Dashboard')]
def area(p):
    for k,v in AREAS:
        if p.startswith(k): return v
    return 'Other'
FIND=[(r'^POST /api/payments/stripe/checkout','Blocked by subscription check for new users','3'),(r'/api/webhooks/stripe','Never activates user / creates subscription','4'),(r'^POST /api/auth/login','Rejects pending_payment users','5'),(r'^POST /api/auth/signup','No business row created','6'),(r'^POST /api/forwarding/requests$','Name stored in address1','9'),(r'^PATCH /api/profile$','Response leaks password hash (S1)','11'),(r'^PATCH /api/profile/contact','Email change without password (S2)','11'),(r'/forwarding/requests/:id/lock$','Admin identity from body (S3)','13'),(r'session-status','Not scoped to owner (S6)','13'),(r'/api/webhooks/onedrive','No own secret (S7)','13'),(r'^POST /api/admin/users$','Date type mismatch on create','8'),(r'^PATCH /api/admin/plans/:id','Date type mismatch','8'),(r'gdpr-export/export/request','Date type mismatch','8'),(r'log-physical-dispatch','Missing notification table','16'),(r'/api/notifications','Missing notification table','16'),(r'^POST /api/admin/blog/posts$','Fails on reconstructed schema','7'),(r'/api/debug|/api/dev|admin/repair|/api/migrate|ops/selftest|debug-','Debug/repair route: remove or prove disabled (S9)','12'),(r'^GET /api/metrics|status-guard|quiz/stats','Public diagnostics (S5)','12'),(r'^POST /api/contact','Reports success with no email provider (S12)','21'),(r'^GET /api/support/info','Placeholder contact details','20'),(r'^POST /api/billing/update-bank','GoCardless-only; no Stripe portal','15'),(r'^GET /api/health$','Always 401','21'),(r'/api/internal/','No scheduler calls these','17'),(r'companies-house|/api/address','Blocked pre-payment by subscription check; needs test key','3')]
def finding(m,p):
    out=[(f,n) for r,f,n in FIND if re.search(r,m+' '+p)]
    return ('; '.join(f for f,_ in out), ', '.join(sorted({n for _,n in out},key=int)))
by=collections.defaultdict(list)
for i,(m,p,g) in enumerate(routes):
    by[area(p)].append((p,m,g,sorted(seen.get(i,[]))))
o=[]
o.append('# Feature checklist: every route, proxy route and page\n')
o.append('Generated from the audit inventory by `scripts/tools/mkchecklist.py`. Tick the **Done** box when a route has a passing automated test on a migration-built database with rate limits enabled and no manual data fixes. Until then the "Audit" column records only what the 2026-11-14 audit saw in the patched sandbox (see README for the caveats).\n')
o.append('Fix numbers refer to the ranked fixes in `AUDIT-REPORT.md`. "not called" means no audit script hit that route; it is neither passed nor failed.\n')
tot=len(routes); ex=sum(1 for i in range(tot) if seen.get(i))
o.append(f'**Backend routes:** {tot} total, {ex} exercised in the audit, {tot-ex} not called.\n')
o.append('## Backend routes\n')
for a in sorted(by):
    o.append(f'### {a} ({len(by[a])})\n'); o.append('| Done | Method | Route | Guards | Audit: HTTP codes seen | Known finding | Fix # |'); o.append('|---|---|---|---|---|---|---|')
    for p,m,g,s in sorted(by[a]):
        f,n=finding(m,p); o.append(f"| [ ] | {m} | `{p}` | {g.replace('requireCsrfToken*,','').replace('requireCsrfToken*','') or 'none'} | {', '.join(map(str,s)) if s else 'not called'} | {f} | {n} |")
    o.append('')
# frontend API routes
fe=[l.strip().split(' | ') for l in open('/home/claude/fe_routes.txt') if l.strip()]
fseen=collections.defaultdict(set)
for l in open('/home/claude/fe.log',errors='ignore'):
    m=re.match(r'\s*(GET|POST|PATCH|PUT|DELETE) (\S+) (\d{3})',l)
    if m: fseen[m.group(2).split('?')[0]].add(int(m.group(3)))
def fmatch(route):
    r=re.compile('^'+re.sub(r'\[[^\]]+\]',r'[^/]+',route)+'/?$'); s=set()
    for p,c in fseen.items():
        if r.match(p): s|=c
    return sorted(s)
FEF={'/api/admin':'Anonymous legacy stub (S4): delete','/api/admin/password-reset':'Anonymous fake reset (S4): delete','/api/bff/forwarding/requests/bulk':'Backend path missing (404)','/api/admin/forwarding/queue':'Backend path missing (404)','/api/admin/billing/metrics':'Backend path missing (404)','/api/admin/mail-items':'POST has no backend route','/api/bff/account':'200 with placeholder data when anonymous (S13)'}
o.append(f'## Frontend API (proxy) routes ({len(fe)})\n'); o.append('| Done | Route | Methods | Backend target | Audit: HTTP codes seen | Known finding |'); o.append('|---|---|---|---|---|---|')
fex=0
for r in sorted(fe):
    r=(r+['']*5)[:5]; s=fmatch(r[0]); fex+=bool(s)
    o.append(f"| [ ] | `{r[0]}` | {r[1]} | {('`'+r[2]+'`') if r[2] else 'none (handled in frontend)'} | {', '.join(map(str,s)) if s else 'not called'} | {FEF.get(r[0],'')} |")
o.append(f'\n{fex} of {len(fe)} proxy routes were called during the audit.\n')
# pages
pg=collections.defaultdict(dict)
for f in glob.glob('/home/claude/shots/*.json'):
    name=f.split('/')[-1][:-5]
    for r in json.load(open(f)):
        if 'url' not in r: continue
        ax=r['axe'] if isinstance(r['axe'],list) else []
        pg[r['url'].split('?section=')[0] if 'section' not in r['url'] else r['url']][name]=(r['status'],r['finalUrl'],sum(a['n'] for a in ax if a['impact'] in('critical','serious')))
o.append(f'## Pages opened in the browser ({len(pg)})\n'); o.append('Views: pub = anonymous, dash = active test customer, adm = admin; _d = 1440px, _m = 390px. Screenshots are in `screenshots/`.\n'); o.append('| Done | Page | Views captured | Status / landed on | Critical+serious axe issues (max) |'); o.append('|---|---|---|---|---|')
for u in sorted(pg):
    v=pg[u]; st=sorted({f"{s} → {fu}" if fu.split('?')[0]!=u.split('?')[0] else str(s) for s,fu,_ in v.values()})
    o.append(f"| [ ] | `{u}` | {', '.join(sorted(v))} | {'; '.join(st)} | {max(x[2] for x in v.values())} |")
open(A+'CHECKLIST.md','w').write('\n'.join(o)+'\n')
print('routes',tot,'exercised',ex,'| fe',len(fe),'called',fex,'| pages',len(pg),'| unmatched access paths',len(unmatched))
for k,c in unmatched.most_common(12): print('  ',k,c)
