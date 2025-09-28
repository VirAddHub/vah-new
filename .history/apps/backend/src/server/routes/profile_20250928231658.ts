import { Router } from "express";
const r = Router();
// minimal stub
r.get("/me", (_req, res) => res.json({ ok: true, data: { me: null } }));
export default r;
