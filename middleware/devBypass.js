// Dev bypass middleware for testing
// Only works when DEV_MODE=1 and X-Dev-Admin header is present

module.exports = function devBypass(req, res, next) {
    if (process.env.DEV_MODE === "1" && req.headers["x-dev-admin"] === "1") {
        req.user = { id: 1, role: "admin", email: "dev@local" }; // numeric id
        req.isAuthenticated = () => true;
        req.__devBypass = true;
    }
    next();
};
