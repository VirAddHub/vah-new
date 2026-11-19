from lib import *
import subprocess
em=subprocess.run(['psql','-h','localhost','-p','5433','-U','postgres','-d','vah_test','-Atc','select email from "user" where id=10'],capture_output=True,text=True,env={'PGPASSWORD':'postgres','PATH':'/usr/bin:/bin:/usr/lib/postgresql/16/bin'}).stdout.strip()
b=sess()
for pw in ["Sandbox!Passw0rd#1","Sandbox!Passw0rd#2","Sandbox!Other#1"]:
    r=b.post(FE+"/api/bff/auth/login",json=dict(email=em,password=pw))
    if r.status_code==200: break
print("login",r.status_code,r.text[:80])
b.get(BE+"/api/csrf"); bh={'x-csrf-token':csrf(b) or ''}
show("own mail list",b.get(BE+"/api/mail-items"),120)
show("other's mail item",b.get(BE+"/api/mail-items/2"),120)
show("other's scan-url",b.get(BE+"/api/mail-items/2/scan-url"),120)
show("other's download",b.get(BE+"/api/mail-items/2/download"),120)
show("tag other's item",b.post(BE+"/api/mail-items/2/tag",json=dict(tag="x"),headers=bh),120)
show("archive other's item",b.patch(BE+"/api/mail-items/2",json=dict(deleted=True),headers=bh),120)
show("forward other's item",b.post(BE+"/api/forwarding/requests",json=dict(mail_item_id=2,to_name="X",address1="1 St",city="L",postal="SW1A 1AA",country="GB"),headers=bh),160)
show("other's forwarding req",b.get(BE+"/api/forwarding/requests/1"),120)
show("forwarding list",b.get(BE+"/api/forwarding/requests"),120)
show("other's invoice",b.get(BE+"/api/billing/invoices/1"),120)
show("other's invoice dl",b.get(BE+"/api/billing/invoices/1/download"),120)
show("other's ticket close",b.post(BE+"/api/support/tickets/1/close",json={},headers=bh),120)
show("other's owner resend",b.post(BE+"/api/business-owners/1/resend",json={},headers=bh),120)
show("mail search",b.get(BE+"/api/mail-search?q=HMRC"),120)
show("admin users",b.get(BE+"/api/admin/users"),80)
show("pdf proxy w/ arbitrary url",b.get(FE+"/api/bff/mail/scan-url?mailItemId=2"),120)
