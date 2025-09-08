const express = require("express");
const { registry } = require("../lib/metrics");

const router = express.Router();

function basicAuthOk(req) {
    const user = process.env.METRICS_USER || "";
    const pass = process.env.METRICS_PASS || "";
    if (!user || !pass) return process.env.NODE_ENV !== "production"; // allow in dev if not set
    const hdr = req.headers.authorization || "";
    if (!hdr.startsWith("Basic ")) return false;
    const [u, p] = Buffer.from(hdr.slice(6), "base64").toString("utf8").split(":");
    return u === user && p === pass;
}

function ipAllowed(req) {
    const allow = (process.env.METRICS_ALLOWED_IPS || "")
        .split(",").map(s => s.trim()).filter(Boolean);
    if (!allow.length) return true;
    const ip = (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim();
    return allow.includes(ip);
}

router.get("/", async (req, res) => {
    if (!basicAuthOk(req) || !ipAllowed(req)) return res.status(401).send("unauthorized");
    res.set("Content-Type", registry.contentType);
    res.end(await registry.metrics());
});

module.exports = router;
