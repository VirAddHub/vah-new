import requests,json,re
FE="http://localhost:3000"; BE="http://localhost:4000"
def sess(): 
    s=requests.Session(); s.headers['Origin']=FE; return s
def show(tag,r,n=260):
    b=r.text.replace("\n"," ")
    print(f"{tag}: {r.status_code} {b[:n]}")
    return r
def csrf(s):
    for c in s.cookies:
        if c.name=='vah_csrf_token': return requests.utils.unquote(c.value)
    return None
