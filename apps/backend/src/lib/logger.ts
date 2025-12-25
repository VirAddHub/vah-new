import winston from "winston";

const isProd = process.env.NODE_ENV === "production";

// Keep logs structured and low-volume in production.
// - prod: warn/error only
// - dev: debug+
export const logger = winston.createLogger({
    level: isProd ? "warn" : "debug",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
    ],
});


