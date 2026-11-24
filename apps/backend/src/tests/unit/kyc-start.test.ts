import { beforeEach, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
const mocks = vi.hoisted(() => ({query:vi.fn(),fetch:vi.fn(),error:vi.fn(),email:vi.fn()}));
vi.mock('../../server/db',()=>({getPool:()=>({query:mocks.query})}));
vi.mock('../../lib/sumsub',()=>({sumsubFetch:mocks.fetch,sumsubGetApplicantForUserSync:vi.fn()}));
vi.mock('../../lib/sumsubConfig',()=>({resolveSumsubApiConfig:()=>({mode:'sandbox'}),resolveSumsubLevelName:()=>({levelName:'ID + liveness'})}));
vi.mock('../../lib/logger',()=>({logger:{error:mocks.error,info:vi.fn(),warn:vi.fn()}}));
vi.mock('../../lib/mailer',()=>({sendKycSubmitted:mocks.email,buildAppUrl:()=> 'https://example.test/profile'}));
vi.mock('../../lib/routeGroupRateLimits',()=>({kycWriteUserLimiter:(_req:any,_res:any,next:any)=>next()}));
import router from '../../server/routes/kyc';
const app=express();
app.use(express.json());
app.use((req,_res,next)=>{req.user={id:53} as any;next();});
app.use('/api/kyc',router);
beforeEach(()=>{
 vi.resetAllMocks();
 mocks.query.mockResolvedValue({rows:[{id:53,email:'customer@example.test',first_name:'Test',last_name:'Customer'}]});
 mocks.email.mockResolvedValue(undefined);
});
it('creates applicants with an encoded configured level and uses the same level for SDK tokens',async()=>{
 mocks.fetch.mockImplementation(async(_method,path,body)=>{
  if(path.startsWith('/resources/applicants')) {
   if(new URL(path,'https://example.test').searchParams.get('levelName')!=='ID + liveness') throw new Error('Existing level should be specified to create an applicant');
   return {id:'applicant-test'};
  }
  expect(body.levelName).toBe('ID + liveness');
  return {token:'sdk-test-token'};
 });
 const res=await request(app).post('/api/kyc/start');
 expect(res.status).toBe(200);
 expect(res.body).toEqual({ok:true,token:'sdk-test-token',applicantId:'applicant-test'});
 expect(mocks.fetch.mock.calls[0][1]).toBe('/resources/applicants?levelName=ID%20%2B%20liveness');
 expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining('SET sumsub_applicant_id'),['applicant-test',53]);
});
it('reuses existing applicants without creating a duplicate',async()=>{
 mocks.query.mockResolvedValue({rows:[{id:53,email:'customer@example.test',sumsub_applicant_id:'existing'}]});
 mocks.fetch.mockResolvedValue({token:'sdk-test-token'});
 const res=await request(app).post('/api/kyc/start');
 expect(res.status).toBe(200);
 expect(mocks.fetch).toHaveBeenCalledTimes(1);
 expect(mocks.fetch.mock.calls[0][1]).toBe('/resources/accessTokens/sdk');
 expect(mocks.email).not.toHaveBeenCalled();
});
it('records an actionable error string instead of an empty Error object',async()=>{
 mocks.fetch.mockRejectedValue(new Error('Sumsub POST /resources/applicants 400: Existing level should be specified'));
 const res=await request(app).post('/api/kyc/start');
 expect(res.status).toBe(500);
 expect(mocks.error).toHaveBeenCalledWith('[kyc/start] error',expect.objectContaining({error:expect.stringContaining('Existing level should be specified'),errorName:'Error'}));
 expect(mocks.query).toHaveBeenCalledTimes(1);
});
