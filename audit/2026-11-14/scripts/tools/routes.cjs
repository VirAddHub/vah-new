const express=require('/home/claude/vah/node_modules/express');
function tag(orig){return function(p,...h){ if(typeof p==='string'||Array.isArray(p)){ for(const x of h.flat(5)) if(x&&x.stack){ x.__mp=(x.__mp||[]).concat(p);} } return orig.apply(this,arguments)}}
express.application.use=tag(express.application.use);
const R=express.Router; const proto=Object.getPrototypeOf(R());
proto.use=tag(proto.use);
const m=require('/home/claude/vah/apps/backend/dist/src/app.js');
const fn=m.createApp||m.default||m.app;
const app=typeof fn==='function'&&!fn.use?fn():fn;
const out=new Set();
function walk(stack,prefixes,guards){
  let g=guards.slice();
  for(const l of stack){
    if(l.route){
      const ms=Object.keys(l.route.methods).map(x=>x.toUpperCase());
      const hs=l.route.stack.map(s=>s.name||'anon');
      for(const p of [].concat(l.route.path)) for(const pre of prefixes)
        out.add(ms.join(',')+' '+(pre+p).replace(/\/+/g,'/').replace(/(.)\/$/,'$1')+'  ['+[...new Set(g.concat(hs).filter(n=>/require|admin|limit|devOnly|secret|authenticate/i.test(n)))].join(',')+']');
    } else if(l.handle&&l.handle.stack){
      const mps=l.handle.__mp||[''];
      const np=[]; for(const pre of prefixes) for(const mp of mps) np.push(pre+mp);
      walk(l.handle.stack,np,g);
    } else if(l.name&&/require|devOnly/i.test(l.name)){ g.push(l.name+'*'); }
  }
}
const router=app.router||app._router;
walk(router.stack,[''],[]);
require("fs").writeFileSync("/home/claude/be_routes.txt",[...out].sort((a,b)=>a.split(' ')[1].localeCompare(b.split(' ')[1])).join("\n"));process.exit(0);
