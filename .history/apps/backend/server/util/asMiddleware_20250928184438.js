// Safe middleware loader utility to avoid "argument handler must be a function" crashes
function asMiddleware(maybe, name = "middleware") {
  if (typeof maybe === "function") return maybe;
  return (_req, _res, next) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[asMiddleware] skipped ${name}`);
    }
    next();
  };
}

module.exports = { asMiddleware };
