// lib/cookies.js
function isSecureEnv() {
    // prod/staging behind HTTPS
    if (process.env.NODE_ENV === "production") return true;
    // allow override if you run HTTPS locally via a proxy
    if (String(process.env.COOKIE_SECURE || "").toLowerCase() === "true") return true;
    return false;
}

function sessionCookieOptions() {
    const secure = isSecureEnv();
    // In dev (HTTP), use Lax & not Secure so browser/curl can send it.
    // In prod, SameSite=None; Secure for cross-site (Next/BFF).
    return secure
        ? {
            httpOnly: true,
            secure: true,          // required for SameSite=None
            sameSite: 'none',      // cross-site
            path: '/',
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        }
        : {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
        };
}

module.exports = { sessionCookieOptions, isSecureEnv };
