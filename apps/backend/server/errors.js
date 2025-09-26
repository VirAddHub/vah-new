// server/errors.js - Proper error handling for auth endpoints

class HttpError extends Error {
    constructor(status, message, code) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

// Global error handler - must be last middleware
function errorMiddleware(err, req, res, next) {
    console.error('[api:error]', {
        message: err.message,
        status: err.status,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method
    });

    const status = typeof err?.status === 'number' ? err.status : 500;
    const message = err?.message || 'Server error';
    const code = err?.code;

    res.status(status).json({ message, code });
}

module.exports = { HttpError, errorMiddleware };
