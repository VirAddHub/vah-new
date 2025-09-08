import express from "express";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());
app.use(cookieParser());

const PORT = 4000;
const PREFIX = "/api";

const SESSIONS = new Map(); // sid -> user

function makeJwt(user, days = 7) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
  const payload = Buffer.from(JSON.stringify({ id: user.id, is_admin: !!user.is_admin, exp })).toString("base64url");
  return `${header}.${payload}.`; // unsigned, enough for your decodeToken()
}

let MAIL = [
  { id: 1, subject: "Welcome to VAH", received_date: "2025-09-01T10:00:00Z", tag: "info" },
  { id: 2, subject: "Your invoice",  received_date: "2025-09-02T12:30:00Z", tag: "billing" }
];

app.get(`${PREFIX}/health`, (_req, res) => res.json({ ok: true }));

app.post(`${PREFIX}/auth/login`, (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Missing credentials" });

  const user = { id: 1, email, name: "VAH User", is_admin: /admin/i.test(email) };
  const sid = "dev123";
  SESSIONS.set(sid, user);

  const token = makeJwt(user);

  // set both session cookie and token cookie (frontend also stores token in localStorage)
  res.cookie("vah_session", sid, { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 7*24*3600*1000 });
  res.cookie("vah_token", token, { httpOnly: false, sameSite: "lax", secure: false, path: "/", maxAge: 7*24*3600*1000 });

  res.json({ message: "ok", token, user });
});

app.get(`${PREFIX}/auth/me`, (req, res) => {
  const sid = req.cookies?.vah_session;
  if (!sid || !SESSIONS.has(sid)) return res.status(401).json({ error: "Unauthorized" });
  res.json(SESSIONS.get(sid));
});

app.post(`${PREFIX}/auth/logout`, (req, res) => {
  const sid = req.cookies?.vah_session;
  if (sid) SESSIONS.delete(sid);
  res.clearCookie("vah_session", { path: "/" });
  res.clearCookie("vah_token", { path: "/" });
  res.status(204).end();
});

app.get(`${PREFIX}/mail`, (_req, res) => res.json(MAIL));
app.get(`${PREFIX}/mail/:id`, (req, res) => {
  const id = Number(req.params.id);
  const item = MAIL.find(m => m.id === id);
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json({ ...item, scan_file_url: "https://example.com/scan.pdf" });
});
app.post(`${PREFIX}/mail/:id/forward-request`, (_req, res) => res.status(204).end());
app.delete(`${PREFIX}/mail/:id`, (req, res) => {
  const id = Number(req.params.id);
  MAIL = MAIL.filter(m => m.id !== id);
  res.status(204).end();
});

app.listen(PORT, () => console.log(`Mock API on http://localhost:${PORT}${PREFIX}`));
