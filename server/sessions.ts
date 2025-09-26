// server/sessions.ts - PostgreSQL session store configuration
import session from 'express-session';
import pgSimple from 'connect-pg-simple';

const PgSession = pgSimple(session);

export const sessions = session({
    name: 'sid',
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
        conString: process.env.DATABASE_URL,
        tableName: 'user_sessions',
        createTableIfMissing: true,
    }),
    cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        path: '/',
    },
});
