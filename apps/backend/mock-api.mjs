import express from "express"; import cookieParser from "cookie-parser";
const app = express(); app.use(express.json()); app.use(cookieParser());
const PORT=4000, PREFIX="/api";
let MAIL=[{id:1,subject:"Welcome to VAH",received_date:"2025-09-01T10:00:00Z",tag:"info"},
          {id:2,subject:"Your invoice",received_date:"2025-09-02T12:30:00Z",tag:"billing"}];
app.get(`${PREFIX}/health`,(_req,res)=>res.json({ok:true}));
app.post(`${PREFIX}/auth/login`,(req,res)=>{const {email,password}=req.body||{};
  if(!email||!password) return res.status(400).json({error:"Missing credentials"});
  res.cookie("vah_session","dev123",{httpOnly:true,sameSite:"lax",secure:false,path:"/",maxAge:7*24*3600e3});
  res.json({message:"ok",token:"dev123"});});
app.get(`${PREFIX}/mail`,(_req,res)=>res.json(MAIL));
app.get(`${PREFIX}/mail/:id`,(req,res)=>{const id=Number(req.params.id);const it=MAIL.find(m=>m.id===id);
  if(!it) return res.status(404).json({error:"Not found"}); res.json({...it,scan_file_url:"https://example.com/scan.pdf"});});
app.post(`${PREFIX}/mail/:id/forward-request`,(_req,res)=>res.status(204).end());
app.delete(`${PREFIX}/mail/:id`,(req,res)=>{const id=Number(req.params.id); MAIL=MAIL.filter(m=>m.id!==id); res.status(204).end();});
app.listen(PORT,()=>console.log(`Mock API on http://localhost:${PORT}${PREFIX}`));
