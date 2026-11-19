from lib import *
import time,json,sys
em,uid=open("pay_user.txt").read().split(); uid=int(uid); PW="Sandbox!Passw0rd#1"
c=sess(); show("customer login (after manual activation)",c.post(FE+"/api/bff/auth/login",json=dict(email=em,password=PW)))
show("whoami",c.get(FE+"/api/bff/auth/whoami"),150)
show("mail-items (empty)",c.get(FE+"/api/bff/mail-items"),200)
a=sess(); show("admin login",a.post(FE+"/api/bff/auth/login",json=dict(email="admin@example.test",password="Sandbox!Admin#2026")))
a.get(BE+"/api/csrf"); 
def ah(): 
    t=csrf(a); return {'x-csrf-token':t} if t else {}
def ch():
    t=csrf(c); return {'x-csrf-token':t} if t else {}
print("--- admin records mail ---")
r=show("admin POST mail-items (via FE /api/admin/mail-items)",a.post(FE+"/api/admin/mail-items",json=dict(user_id=uid,subject="HMRC letter",sender_name="HMRC",tag="HMRC",notes="sandbox",scan_file_url="https://example.test/scan.pdf",received_date="2026-11-14")),300)
r2=show("internal from-onedrive (worker path)",requests.post(BE+"/api/internal/from-onedrive",json=dict(userId=uid,sourceSlug="hmrc",fileName=f"user{uid}_2026-11-14_HMRC.pdf",oneDriveFileId="sbx-file-1",oneDriveDownloadUrl="https://example.test/f.pdf",receivedAt="2026-11-14T10:00:00Z"),headers={'x-mail-import-secret':'sandbox-mail-import-secret'}),400)
show("internal from-onedrive wrong secret",requests.post(BE+"/api/internal/from-onedrive",json={},headers={'x-mail-import-secret':'nope'}))
show("admin GET mail-items",a.get(FE+"/api/admin/mail-items"),300)
r=show("customer mail-items",c.get(FE+"/api/bff/mail-items"),500)
try:
    d=r.json(); items=d.get('items') or d.get('data',{}).get('items') or d.get('data') or []
    mid=items[0]['id'] if items else None
except Exception as e: mid=None
print("mail id:",mid)
if mid:
    show("scan-url",c.get(FE+f"/api/bff/mail/scan-url?mailItemId={mid}&disposition=inline"),200)
    show("BE mail-items/:id",c.get(BE+f"/api/mail-items/{mid}"),200)
    show("BE mail-items/:id/scan-url",c.get(BE+f"/api/mail-items/{mid}/scan-url"),200)
    show("tag",c.post(BE+f"/api/mail-items/{mid}/tag",json=dict(tag="Tax"),headers=ch()),200)
    show("PATCH (mark read) via BFF",c.patch(FE+f"/api/bff/mail-items/{mid}",json=dict(is_read=True)),200)
    show("tags list",c.get(FE+"/api/bff/tags"),200)
    show("tags rename",c.post(FE+"/api/bff/tags/rename",json={"from":"Tax","to":"Taxes"}),200)
    show("archive (DELETE) via BFF",c.delete(FE+f"/api/bff/mail-items/{mid}"),200)
    show("list after archive",c.get(FE+"/api/bff/mail-items"),160)
    show("restore via BFF",c.post(FE+f"/api/bff/mail-items/{mid}/restore"),200)
    show("mail search",c.get(BE+"/api/mail-search/search?q=HMRC"),200)
    print("--- forwarding ---")
    fr=show("forwarding request create via BFF",c.post(FE+"/api/bff/forwarding/requests",json=dict(mail_item_id=mid,to_name="Pay Customer",address1="2 Test Street",city="London",postal="SW1A 1AA",country="GB",reason="test")),400)
    show("forwarding list",c.get(FE+"/api/bff/forwarding/requests"),300)
    show("forwarding bulk via BFF",c.post(FE+"/api/bff/forwarding/requests/bulk",json=dict(ids=[mid])),200)
    q=show("admin forwarding requests",a.get(FE+"/api/admin/forwarding/requests"),400)
    show("admin forwarding queue (FE route)",a.get(FE+"/api/admin/forwarding/queue"),200)
    try:
        frs=q.json(); L=frs.get('data') or frs.get('items') or []
        if isinstance(L,dict): L=L.get('items') or L.get('requests') or []
        fid=L[0]['id'] if L else None
    except Exception: fid=None
    print("forwarding id:",fid)
    if fid:
        show("admin lock",a.post(BE+f"/api/admin/forwarding/requests/{fid}/lock",headers=ah()),200)
        for st in ["Reviewed","Processing","Dispatched","Delivered"]:
            show(f"admin status -> {st}",a.post(FE+f"/api/admin/forwarding/requests/{fid}/status",json=dict(action=st,status=st)),220)
        show("admin unlock",a.post(FE+f"/api/admin/forwarding/requests/{fid}/unlock"),200)
        show("customer sees status",c.get(FE+f"/api/bff/forwarding/requests/{fid}"),250)
    print("--- access control ---")
    o=sess(); show("other customer signup",o.post(FE+"/api/bff/auth/signup",json=dict(first_name="Other",last_name="User",email=f"other{int(time.time())}@example.test",password=PW,business_type="sole_trader",country_of_incorporation="GB",company_name="Other Co",forward_to_first_name="O",forward_to_last_name="U",address_line1="3 St",city="Leeds",postcode="LS1 1AA",forward_country="GB",isSoleController=True)),120)
    show("other user reads my mail item",o.get(BE+f"/api/mail-items/{mid}"),150)
    show("other user scan-url of my item",o.get(BE+f"/api/bff/mail/scan-url?mailItemId={mid}"),150)
show("customer -> admin users",c.get(FE+"/api/admin/users"),150)
show("customer -> bff admin overview",c.get(FE+"/api/bff/admin/overview"),150)
show("customer -> admin plans POST",c.post(FE+"/api/admin/plans",json=dict(name="x")),150)
show("anon -> FE /api/admin/users/create (legacy)",requests.post(FE+"/api/admin/users/create",json=dict(email="h@example.test",password="Abcdefg1!",first_name="H",last_name="K",role="admin",is_admin=True)),250)
show("anon -> FE /api/admin?endpoint=stats (legacy)",requests.get(FE+"/api/admin?endpoint=stats"),200)
show("anon -> FE /api/admin/password-reset (legacy)",requests.post(FE+"/api/admin/password-reset",json=dict(email="admin@example.test")),200)
