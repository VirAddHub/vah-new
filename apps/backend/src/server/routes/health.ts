// Pure health route - never touches DB, never crashes
import { Router } from "express";

export const health = Router();

health.get("/", (_req, res) => {
  res.status(200).json({ ok: true });
});

health.get("/api/ready", (_req, res) => {
  res.status(200).json({ status: "ready" });
});
