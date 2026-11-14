from lib import *
import time,hmac,hashlib,json
em=f"pay{int(time.time())}@example.test"; PW="Sandbox!Passw0rd#1"
payload=dict(first_name="Pay",last_name="Customer",email=em,password=PW,phone="+447700900002",business_type="limited_company",country_of_incorporation="GB",company_number="12345678",company_name="Sandbox Pay Ltd",forward_to_first_name="Pay",forward_to_last_name="Customer",address_line1="2 Test Street",city="London",postcode="SW1A 1AA",forward_country="GB",billing="monthly",price="9.99",isSoleController=True,additionalControllersCount=0)
s=sess(); r=show("signup",s.post(FE+"/api/bff/auth/signup",json=payload)); uid=int(r.json()['data']['user']['user_id'])
show("publishable key",s.get(FE+"/api/bff/payments/stripe/publishable-key"))
show("embedded checkout (dummy key, no network)",s.post(FE+"/api/bff/payments/stripe/checkout-session-embedded",json=dict(billing_period="monthly")),300)
show("billing overview (pending)",s.get(FE+"/api/bff/billing/overview"),300)
def stripe_evt(typ,obj):
    body=json.dumps(dict(id=f"evt_sandbox_{int(time.time()*1000)}",object="event",type=typ,data=dict(object=obj),created=int(time.time()),livemode=False,api_version="2024-06-20"))
    t=str(int(time.time())); sig=hmac.new(b"whsec_sandboxdummysecret000000000000",f"{t}.{body}".encode(),hashlib.sha256).hexdigest()
    return requests.post(BE+"/api/webhooks/stripe",data=body,headers={"content-type":"application/json","stripe-signature":f"t={t},v1={sig}"})
show("stripe webhook bad signature",requests.post(BE+"/api/webhooks/stripe",data="{}",headers={"content-type":"application/json","stripe-signature":"t=1,v1=bad"}))
show("webhook checkout.session.completed",stripe_evt("checkout.session.completed",dict(id="cs_test_sbx",object="checkout.session",mode="subscription",customer="cus_sbx1",subscription="sub_sbx1",metadata=dict(userId=str(uid),billing_period="monthly"),payment_status="paid")))
show("webhook customer.subscription.created",stripe_evt("customer.subscription.created",dict(id="sub_sbx1",object="subscription",customer="cus_sbx1",status="active",metadata=dict(userId=str(uid)),current_period_start=int(time.time()),current_period_end=int(time.time())+2592000,items=dict(data=[dict(price=dict(id="price_sandbox_monthly",recurring=dict(interval="month"),unit_amount=999))]))))
show("webhook invoice.paid",stripe_evt("invoice.paid",dict(id="in_sbx1",object="invoice",customer="cus_sbx1",subscription="sub_sbx1",amount_paid=999,currency="gbp",payment_intent="pi_sbx1",period_start=int(time.time()),period_end=int(time.time())+2592000,metadata=dict(userId=str(uid)),lines=dict(data=[dict(period=dict(start=int(time.time()),end=int(time.time())+2592000))]))))
show("whoami after payment",s.get(FE+"/api/bff/auth/whoami"),420)
show("billing overview (after)",s.get(FE+"/api/bff/billing/overview"),420)
show("invoices",s.get(FE+"/api/bff/billing/invoices"),420)
show("mail-items",s.get(FE+"/api/bff/mail-items"),200)
s.post(FE+"/api/bff/auth/logout")
s2=sess(); show("LOGIN after paying",s2.post(FE+"/api/bff/auth/login",json=dict(email=em,password=PW)))
open("pay_user.txt","w").write(f"{em} {uid}")
