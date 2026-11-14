const puppeteer=require('puppeteer-core');const fs=require('fs');const axeSrc=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
// usage: node shot.cjs <outPrefix> <w>x<h> [--login email pw] url1 url2 ...
(async()=>{
  const args=process.argv.slice(2); const prefix=args.shift(); const [w,h]=args.shift().split('x').map(Number);
  let login=null; if(args[0]==='--login'){args.shift();login=[args.shift(),args.shift()];}
  const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars']});
  const page=await browser.newPage(); await page.setViewport({width:w,height:h,isMobile:w<600,hasTouch:w<600,deviceScaleFactor:1});
  const report=[];
  if(login){ await page.goto('http://localhost:3000/login',{waitUntil:'networkidle2',timeout:120000});
    const r=await page.evaluate(async(e,p)=>{const x=await fetch('/api/bff/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:e,password:p}),credentials:'include'});return x.status;},login[0],login[1]); report.push({login:r}); }
  for(const url of args){
    const errs=[];const failed=[];
    const onC=m=>{if(m.type()==='error')errs.push(m.text().slice(0,160));};const onR=r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url().replace('http://localhost:3000','').slice(0,90));};
    page.on('console',onC);page.on('response',onR);
    let status=null;
    try{const resp=await page.goto('http://localhost:3000'+url,{waitUntil:'networkidle2',timeout:120000});status=resp&&resp.status();}catch(e){errs.push('NAV '+e.message.slice(0,100));}
    await new Promise(r=>setTimeout(r,1500));
    const name=prefix+'_'+(url.replace(/[^a-z0-9]+/gi,'_').replace(/^_|_$/g,'')||'home');
    const info=await page.evaluate(()=>({finalUrl:location.pathname+location.search,title:document.title,h1:[...document.querySelectorAll('h1')].map(x=>x.innerText.trim().slice(0,80)),desc:(document.querySelector('meta[name=description]')||{}).content||null,canonical:(document.querySelector('link[rel=canonical]')||{}).href||null,robots:(document.querySelector('meta[name=robots]')||{}).content||null,og:!!document.querySelector('meta[property="og:title"]'),jsonld:document.querySelectorAll('script[type="application/ld+json"]').length,scrollW:document.documentElement.scrollWidth,clientW:document.documentElement.clientWidth,imgsNoAlt:[...document.images].filter(i=>!i.hasAttribute('alt')).length,imgs:document.images.length,brokenImgs:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src.replace(location.origin,'').slice(0,60)),links:[...new Set([...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')))].slice(0,80),buttons:[...document.querySelectorAll('button')].map(b=>(b.innerText||b.getAttribute('aria-label')||'').trim().slice(0,30)).filter(Boolean).slice(0,40),textLen:document.body.innerText.length,bodyStart:document.body.innerText.trim().slice(0,200).replace(/\s+/g,' ')}));
    let axe=null; try{await page.evaluate(axeSrc);axe=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:['wcag2a','wcag2aa']});return r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length}));});}catch(e){axe='axe failed '+e.message.slice(0,60);}
    try{await page.screenshot({path:`/home/claude/shots/${name}.png`,fullPage:false});}catch(e){}
    report.push({url,status,...info,overflowX:info.scrollW>info.clientW+2,axe,consoleErrors:[...new Set(errs)].slice(0,6),failedRequests:[...new Set(failed)].slice(0,10)});
    page.off('console',onC);page.off('response',onR);
  }
  fs.writeFileSync(`/home/claude/shots/${prefix}.json`,JSON.stringify(report,null,1)); await browser.close();
})();
