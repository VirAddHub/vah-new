import {beforeEach,expect,it,vi} from 'vitest';
import express from 'express';
import request from 'supertest';
vi.mock('../../server/db-helpers',()=>({selectMany:vi.fn()}));
import {selectMany} from '../../server/db-helpers';
import router from '../../server/routes/public/plans';
const app=express();app.use('/api',router);
const plan={id:3,name:'Monthly',price_pence:1234,interval:'month',currency:'GBP',features_json:'[]',active:true};
beforeEach(()=>vi.clearAllMocks());
it('returns real prices and changes the cache validator when prices change',async()=>{
 vi.mocked(selectMany).mockResolvedValueOnce([plan]);
 const first=await request(app).get('/api/plans');
 expect(first.body.data[0].price).toBe(12.34);
 vi.mocked(selectMany).mockResolvedValueOnce([{...plan,price_pence:1500}]);
 const second=await request(app).get('/api/plans').set('If-None-Match',first.headers.etag);
 expect(second.status).toBe(200);expect(second.body.data[0].price).toBe(15);
 expect(second.headers.etag).not.toBe(first.headers.etag);
});
it('returns 503 without fictional plans during a database outage',async()=>{
 vi.mocked(selectMany).mockRejectedValueOnce(new Error('database unavailable'));
 const response=await request(app).get('/api/plans');
 expect(response.status).toBe(503);expect(response.body).toEqual({ok:false,error:'pricing_unavailable'});
 expect(response.headers['cache-control']).toBe('no-store');
});
it('returns 304 only when the returned plans have not changed',async()=>{
 vi.mocked(selectMany).mockResolvedValue([plan]);
 const first=await request(app).get('/api/plans');
 expect((await request(app).get('/api/plans').set('If-None-Match',first.headers.etag)).status).toBe(304);
});
