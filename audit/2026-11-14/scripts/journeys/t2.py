from lib import *
import time,sys
em=f"cust{int(time.time())}@example.test"
payload=dict(first_name="Test",last_name="Customer",email=em,password="Sandbox!Passw0rd#1",phone="+447700900001",
 business_type="limited_company",country_of_incorporation="GB",company_number="12345678",company_name="Sandbox Widgets Ltd",
 forward_to_first_name="Test",forward_to_last_name="Customer",address_line1="1 Test Street",city="London",postcode="SW1A 1AA",forward_country="GB",
 billing="monthly",price="9.99",isSoleController=True,additionalControllersCount=0)
s=sess()
show("signup",s.post(FE+"/api/bff/auth/signup",json=payload))
print("cookies after signup:",[c.name for c in s.cookies])
show("whoami (after signup)",s.get(FE+"/api/bff/auth/whoami"),500)
s3=sess(); show("login right after signup (same pw)",s3.post(FE+"/api/bff/auth/login",json=dict(email=em,password="Sandbox!Passw0rd#1")))
for p in ["/api/bff/dashboard/bootstrap","/api/bff/account","/api/bff/profile","/api/bff/mail-items","/api/bff/billing/overview","/api/bff/payments/stripe/publishable-key","/api/bff/profile/compliance"]:
    show(p,s.get(FE+p),330)
show("stripe embedded checkout",s.post(FE+"/api/bff/payments/stripe/checkout-session-embedded",json=dict(billing_period="monthly")),300)
show("gc redirect flow",s.post(FE+"/api/bff/payments/redirect-flows",json=dict(billing_period="monthly")),300)
show("kyc start",s.post(FE+"/api/bff/kyc/start",json={}),300)
open("last_email.txt","w").write(em)
