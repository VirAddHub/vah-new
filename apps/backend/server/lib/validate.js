// server/lib/validate.js
const { z } = require('zod');

function validate(bodySchema = null, querySchema = null, paramsSchema = null) {
    return (req, res, next) => {
        try {
            if (bodySchema) req.body = bodySchema.parse(req.body);
            if (querySchema) req.query = querySchema.parse(req.query);
            if (paramsSchema) req.params = paramsSchema.parse(req.params);
            next();
        } catch (err) {
            if (err?.issues) {
                return res.status(400).json({ error: 'validation_error', details: err.issues });
            }
            next(err);
        }
    };
}

module.exports = { validate, z };
