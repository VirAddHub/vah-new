// server/lib/safe-logger.js
// Safe logging utilities that prevent infinite recursion

const _error = console.error.bind(console);
const _warn = console.warn.bind(console);
const _log = console.log.bind(console);

// Safe logging functions that use the original console methods
const log = (...args) => _log(...args);
const warn = (...args) => _warn(...args);
const crit = (...args) => _error('🚨 CRITICAL:', ...args);

// Specialized DB error logger that detects critical errors
const dbError = (err, sql, params) => {
    const message = err?.message || String(err);
    if (message.includes('[pg.query] error: 42703') || message.includes('[pg.query] error: 42P01')) {
        crit('DB ERROR DETECTED:', err, { sql, params });
        // In production, you might want to send this to your alerting system
        // e.g., sendToSlack('Critical DB error: ' + message);
    }
    _error('[db] error:', err?.code, err?.message, '\nSQL:', sql, '\nParams:', params);
};

module.exports = { log, warn, crit, dbError };
