vi.mock('../../lib/mailer', () => ({sendMailForwarded:vi.fn(async()=>{})}));
import {sendMailForwarded} from '../../lib/mailer';
import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import express from 'express';
import request from 'supertest';
import * as pool from '../../server/db';
import mailRouter from '../../server/routes/admin-mail-items';
import forwardingRouter from '../../server/routes/admin-forwarding';
import blogRouter from '../../server/routes/admin-blog';
const {PGlite}=createRequire(import.meta.url)('@electric-sql/pglite');
let db:any;
const app=express();
app.use((req,_res,next)=>{req.user={id:50,is_admin:true} as any;next();});
app.use(express.json());
app.use('/admin',mailRouter,blogRouter,forwardingRouter);
beforeAll(async()=>{
 db=new PGlite();
 await db.exec(`CREATE TABLE "user" (id bigint PRIMARY KEY,email text,first_name text,last_name text);
 CREATE TABLE file(id bigint,name text,size bigint,web_url text);
 CREATE TABLE mail_item(id bigint PRIMARY KEY,user_id bigint,file_id bigint,subject text,sender_name text,tag text,status text,forwarding_status text,created_at bigint,received_date date,received_at_ms bigint,scanned boolean,deleted boolean,file_size bigint,scan_file_url text,physical_destruction_date timestamptz,expires_at bigint);
 INSERT INTO "user" VALUES(53,'jamie@example.test','Jamie','Taylor');
 INSERT INTO mail_item(id,user_id,subject,created_at,received_at_ms,scanned,deleted) SELECT i,53,CASE WHEN i=1 THEN 'Rare old letter' ELSE 'Regular letter' END,1000000000000+i,1000000000000+i,true,false FROM generate_series(1,65)i;
 -- Older fallback dates must not override the preferred, recent receipt date.
 INSERT INTO mail_item(id,user_id,subject,created_at,received_at_ms,scanned,deleted) VALUES(66,53,'Recent receipt',1000000000000,(extract(epoch from now())*1000)::bigint,true,false);
 INSERT INTO mail_item(id,user_id,subject,created_at,scanned,deleted) VALUES(67,53,'Undated',NULL,true,false);
 CREATE TABLE blog_posts(slug text,title text,description text,content text,excerpt text,date timestamptz,updated timestamptz,tags text[],cover text,status text,og_title text,og_desc text,noindex boolean,author_name text,author_title text,author_image text);
 INSERT INTO blog_posts(slug,title,content,date,status,tags) SELECT 'post-'||i,CASE WHEN i=1 THEN 'Needle article' ELSE 'Ordinary article' END,'Example',now()+i*INTERVAL '1 day',CASE WHEN i=1 THEN 'draft' ELSE 'published' END,CASE WHEN i=1 THEN ARRAY['Special'] ELSE ARRAY['General'] END FROM generate_series(1,25)i;`);
 vi.spyOn(pool,'getPool').mockReturnValue({query:(sql:string,args?:unknown[])=>db.query(sql,args)} as any);
},30000);
afterAll(async()=>{vi.restoreAllMocks();await db.close();});
it('searches mail across pages and returns matching counts',async()=>{
 const response=await request(app).get('/admin/mail-items?q=Rare&limit=1');
 expect(response.status).toBe(200);expect(response.body.total).toBe(1);expect(Number(response.body.items[0].id)).toBe(1);
 const page=await request(app).get('/admin/mail-items?limit=50&offset=50');
 expect(page.body.total).toBe(66);expect(page.body.items).toHaveLength(16);
});
it('uses the preferred receipt date for destruction eligibility and counts',async()=>{
 const response=await request(app).get('/admin/mail-items?needs_destruction=true&limit=500');
 expect(response.status).toBe(200);expect(response.body.total).toBe(65);
 expect(response.body.items.every((item:any)=>item.past_30_days && Number(item.id)!==66)).toBe(true);
});
it('applies blog search, status and tag before pagination',async()=>{
 const response=await request(app).get('/admin/blog/posts?includeDrafts=true&q=Needle&status=draft&tag=Special&pageSize=1');
 expect(response.status).toBe(200);expect(response.body.total).toBe(1);expect(response.body.items[0].slug).toBe('post-1');
 const noDrafts=await request(app).get('/admin/blog/posts?q=Needle');expect(noDrafts.body.total).toBe(0);
});

it('forwarding lists include delivered requests when requested, search full names, and paginate', async()=>{
 await db.exec(`CREATE TABLE forwarding_request(id bigint PRIMARY KEY,user_id bigint,mail_item_id bigint,status text,created_at bigint,updated_at bigint,to_name text,postal text,courier text,tracking_number text);
 INSERT INTO forwarding_request(id,user_id,mail_item_id,status,created_at) SELECT i,53,1,CASE WHEN i=1 THEN 'Delivered' ELSE 'Requested' END,1000+i FROM generate_series(1,101)i;`);
 const page=await request(app).get('/admin/forwarding/requests?status=all&limit=100&offset=100&q=Jamie%20Taylor');
 expect(page.status).toBe(200);expect(page.body.data).toHaveLength(1);expect(page.body.data[0].status).toBe('Delivered');
 const missing=await request(app).post('/admin/forwarding/requests/999/status').send({status:'in_progress'});
 expect(missing.status).toBe(404);
});

it('rejects stale forwarding updates and sends dispatch notifications only once', async()=>{
 await db.exec(`ALTER TABLE forwarding_request ADD COLUMN address1 text; ALTER TABLE forwarding_request ADD COLUMN city text; ALTER TABLE forwarding_request ADD COLUMN country text;`);
 const update=(body:any)=>request(app).post('/admin/forwarding/requests/2/status').send(body);
 expect((await update({status:'in_progress',expected_status:'Requested'})).status).toBe(200);
 expect((await update({status:'dispatched',expected_status:'Requested'})).status).toBe(409);
 expect((await update({status:'dispatched',expected_status:'in_progress'})).status).toBe(200);
 const changed=(await db.query('SELECT updated_at FROM forwarding_request WHERE id=2')).rows[0].updated_at;
 expect((await update({status:'dispatched',expected_status:'in_progress'})).status).toBe(200);
 expect((await db.query('SELECT updated_at FROM forwarding_request WHERE id=2')).rows[0].updated_at).toBe(changed);
 expect(sendMailForwarded).toHaveBeenCalledTimes(1);
});
