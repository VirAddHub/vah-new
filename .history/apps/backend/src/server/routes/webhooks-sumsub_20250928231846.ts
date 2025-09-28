import { Router } from "express";
const r = Router();
// stub webhook endpoint
r.post("/webhooks/sumsub", (_req, res) => res.status(204).end());
export default r;
