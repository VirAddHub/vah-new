// lib/metrics.js
const client = require("prom-client");

// Registry (single registry app-wide)
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: "vah_" });

// HTTP metrics
const httpReqs = new client.Counter({
    name: "vah_http_requests_total",
    help: "Total HTTP requests",
    labelNames: ["method", "route", "code"],
});
const httpDur = new client.Histogram({
    name: "vah_http_request_duration_ms",
    help: "HTTP request duration in ms",
    labelNames: ["method", "route", "code"],
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
});

// DB metrics (optional; you can increment these around heavy queries)
const dbQueries = new client.Counter({
    name: "vah_db_queries_total",
    help: "Total DB queries",
    labelNames: ["op"], // e.g. get|all|run|exec
});
const dbDur = new client.Histogram({
    name: "vah_db_query_duration_ms",
    help: "DB query duration in ms",
    labelNames: ["op"],
    buckets: [1, 2, 5, 10, 20, 50, 100, 200, 500],
});

registry.registerMetric(httpReqs);
registry.registerMetric(httpDur);
registry.registerMetric(dbQueries);
registry.registerMetric(dbDur);

// Express middleware to time requests
function httpMetricsMiddleware() {
    return function (req, res, next) {
        const start = process.hrtime.bigint();
        // low-cardinality route label: prefer route.path if present
        function routeLabel() {
            const base = req.baseUrl || "";
            const route = req.route && req.route.path ? req.route.path : "";
            return (base + route) || req.path || req.originalUrl || "/";
        }
        res.on("finish", () => {
            const end = process.hrtime.bigint();
            const ms = Number(end - start) / 1e6;
            const labels = {
                method: (req.method || "GET").toUpperCase(),
                route: routeLabel(),
                code: String(res.statusCode || 0),
            };
            httpReqs.inc(labels, 1);
            httpDur.observe(labels, ms);
        });
        next();
    };
}

// Minimal helpers for DB timing where you care
function timeDb(op, fn) {
    const start = process.hrtime.bigint();
    try {
        const r = fn();
        const end = process.hrtime.bigint();
        const ms = Number(end - start) / 1e6;
        dbQueries.inc({ op }, 1);
        dbDur.observe({ op }, ms);
        return r;
    } catch (e) {
        const end = process.hrtime.bigint();
        const ms = Number(end - start) / 1e6;
        dbQueries.inc({ op }, 1);
        dbDur.observe({ op }, ms);
        throw e;
    }
}

module.exports = { registry, httpMetricsMiddleware, timeDb };
