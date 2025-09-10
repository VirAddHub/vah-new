const client = require("prom-client");

const forwardingCounter = new client.Counter({
    name: "vah_forward_requests_total",
    help: "Forwarding request outcomes",
    labelNames: ["result"], // requested | blocked | override
});

module.exports = { forwardingCounter };
