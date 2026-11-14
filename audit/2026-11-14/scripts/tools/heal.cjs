// Sandbox-only: records schema drift and adds missing columns so journeys can be traced.
const pg=require('/home/claude/vah/apps/backend/node_modules/pg'); const fs=require('fs');
const LOG='/home/claude/schema-heal.log'; const seen=new Set();
const side=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1});
function guessType(c){
  if(/^(is_|has_)|_enabled$|_verified$|^deleted$|^scanned$|_notified$|^forwarded_physically$|_sent$|^active$|^archived$/.test(c)) return 'boolean';
  if(/(_at|_ms|_until|_expires|_expiry|_date_ms)$/.test(c)) return 'bigint';
  if(/^(user_id|business_id|plan_id|mail_item_id|invoice_id|admin_id|owner_id|reviewer_id|actor_id|created_by|updated_by)$|(_count|_pence|_attempts|_size|_bytes)$/.test(c)) return 'bigint';
  return 'text';
}
function tableFromSql(sql){
  const m=/\b(?:INSERT\s+INTO|UPDATE|FROM)\s+(?:ONLY\s+)?("?[a-z_]+"?)/i.exec(sql||''); return m?m[1].replace(/"/g,''):null;
}
function aliasMap(sql){const map={};const re=/\b(?:FROM|JOIN|UPDATE|INTO)\s+("?[a-z_]+"?)(?:\s+(?:AS\s+)?([a-z_]+))?/gi;let m;while((m=re.exec(sql||''))){const t=m[1].replace(/"/g,'');map[t]=t;if(m[2]&&!/^(set|where|on|left|right|inner|join|order|group|limit|values|using|returning)$/i.test(m[2]))map[m[2]]=t;}return map;}
async function heal(err,sql){
  if(!err) return false;
  if(err.code==='42P01'){const k='TABLE '+err.message;if(!seen.has(k)){seen.add(k);fs.appendFileSync(LOG,k+'\n');}return false;}
  if(err.code!=='42703') return false;
  let t=null,c=null,m;
  if((m=/column "([^"]+)" of relation "([^"]+)" does not exist/.exec(err.message))){c=m[1];t=m[2];}
  else if((m=/column ([a-z_0-9]+)\.([a-z_0-9]+) does not exist/.exec(err.message))){c=m[2];t=aliasMap(sql)[m[1]]||m[1];}
  else if((m=/column "([^"]+)" does not exist/.exec(err.message))){c=m[1];t=tableFromSql(sql);}
  if(!t||!c) {fs.appendFileSync(LOG,'UNRESOLVED '+err.message+'\n');return false;}
  const k=`COLUMN ${t}.${c}`; if(seen.has(k)) return false; seen.add(k);
  const ty=guessType(c);
  try{await side.query(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "${c}" ${ty}`);fs.appendFileSync(LOG,`${k} (added as ${ty})\n`);return true;}
  catch(e){fs.appendFileSync(LOG,`${k} (could not add: ${e.message})\n`);return false;}
}
for(const K of [pg.Pool,pg.Client]){
  const orig=K.prototype.query;
  K.prototype.query=function(...a){
    if(this===side||typeof a[a.length-1]==='function') return orig.apply(this,a);
    const sql=typeof a[0]==='string'?a[0]:(a[0]&&a[0].text);
    const run=()=>orig.apply(this,a);
    const isPool=this instanceof pg.Pool;
    const p=run();
    if(!p||!p.then) return p;
    return p.catch(async e=>{ let n=0; let err=e;
      while(n++<25 && await heal(err,sql)){ if(!isPool) break; try{return await run();}catch(e2){err=e2;} }
      throw err; });
  };
}
