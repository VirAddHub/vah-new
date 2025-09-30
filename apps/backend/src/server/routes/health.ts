// Pure health route - never touches DB, never crashes
// Updated for Render health check fix
import { Router } from "express";

export const health = Router();

health.get("/healthz", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.type("text/plain").status(200).send("ok");
});

health.get("/ready", (_req, res) => {
  res.status(200).json({ status: "ready" });
});
