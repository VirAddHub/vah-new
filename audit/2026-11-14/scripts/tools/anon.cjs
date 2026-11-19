const puppeteer=require('puppeteer-core');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});const p=await b.newPage();
for(const u of ['/mail','/account/overview','/account/billing','/admin/dashboard','/admin/invoices','/dev-api-check']){await p.goto('http://localhost:3000'+u,{waitUntil:'networkidle2',timeout:120000});await new Promise(r=>setTimeout(r,2500));console.log(u,'->',await p.evaluate(()=>location.pathname+location.search));}
await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});await p.goto('http://localhost:3000/',{waitUntil:'networkidle2',timeout:120000});
const before=await p.evaluate(()=>[...document.querySelectorAll('a')].filter(a=>a.offsetParent!==null&&a.getBoundingClientRect().width>0).length);
await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.innerText).includes('Open menu')).click());await new Promise(r=>setTimeout(r,800));
const after=await p.evaluate(()=>({links:[...document.querySelectorAll('[role=dialog] a, nav a')].filter(a=>a.offsetParent!==null).map(a=>a.innerText.trim()).filter(Boolean).slice(0,12),dialog:!!document.querySelector('[role=dialog]'),expanded:[...document.querySelectorAll('button[aria-expanded]')].map(b=>b.getAttribute('aria-expanded'))}));
console.log('mobile menu',before,JSON.stringify(after));await p.screenshot({path:'/home/claude/shots/mobile_menu.png'});await b.close();})();
