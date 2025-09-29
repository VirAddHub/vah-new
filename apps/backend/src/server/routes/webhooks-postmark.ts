// apps/backend/src/server/routes/webhooks-postmark.ts
import { Router } from "express";
export const postmarkWebhook = Router();

const USER = process.env.POSTMARK_WEBHOOK_USER;
const PASS = process.env.POSTMARK_WEBHOOK_PASS;

postmarkWebhook.post("/", (req, res) => {
  if (USER || PASS) {
    const auth = req.headers.authorization || "";
    const ok = auth.startsWith("Basic ")
      && Buffer.from(auth.slice(6), "base64").toString() === `${USER}:${PASS}`;
    if (!ok) return res.status(401).send("unauthorized");
  }

  const evt = req.body || {};
  console.log("[postmark-webhook]", evt?.RecordType, evt?.MessageID || evt?.RecordID);
  res.sendStatus(204);
});
