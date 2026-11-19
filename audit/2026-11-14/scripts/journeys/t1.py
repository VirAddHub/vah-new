from lib import *
s=sess()
payload=dict(first_name="Test",last_name="Customer",email="cust1@example.test",password="Sandbox!Passw0rd#1",phone="+447700900001",
 business_type="limited_company",country_of_incorporation="GB",company_number="12345678",company_name="Sandbox Widgets Ltd",
 forward_to_first_name="Test",forward_to_last_name="Customer",address_line1="1 Test Street",city="London",postcode="SW1A 1AA",forward_country="GB",
 billing="monthly",price="9.99",isSoleController=True,additionalControllersCount=0)
r=show("signup via BFF",s.post(FE+"/api/bff/auth/signup",json=payload))
print("cookies:",[c.name for c in s.cookies])
show("whoami",s.get(FE+"/api/bff/auth/whoami"))
show("dup signup",sess().post(FE+"/api/bff/auth/signup",json=payload))
bad=dict(payload,email="x2@example.test",password="short")
show("weak pw",sess().post(FE+"/api/bff/auth/signup",json=bad))
show("logout",s.post(FE+"/api/bff/auth/logout"))
show("whoami after logout",s.get(FE+"/api/bff/auth/whoami"))
s2=sess()
show("login wrong pw",s2.post(FE+"/api/bff/auth/login",json=dict(email="cust1@example.test",password="nope")))
show("login ok",s2.post(FE+"/api/bff/auth/login",json=dict(email="cust1@example.test",password="Sandbox!Passw0rd#1")))
print("cookies:",[(c.name,c.secure,c.has_nonstandard_attr('HttpOnly')) for c in s2.cookies])
for p in ["/api/bff/account","/api/bff/profile","/api/bff/dashboard/bootstrap","/api/bff/mail-items","/api/bff/billing/overview","/api/bff/billing/invoices","/api/bff/profile/compliance","/api/bff/forwarding/requests","/api/bff/business-owners","/api/bff/account/businesses","/api/bff/tags","/api/bff/profile/registered-office-address","/api/bff/profile/certificate-url","/api/bff/plans"]:
    show(p,s2.get(FE+p),200)
