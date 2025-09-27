const request = require('supertest');

async function tryLogin(agent, email, password) {
  if (!email || !password) return { ok: false, status: 0, body: { error: 'missing_creds' } };
  const r = await agent.post('/api/auth/login').send({ email, password });
  if (r.status === 200) return { ok: true, r };
  return { ok: false, status: r.status, body: r.body };
}

async function maybeProvisionAdmin(agent, email, password, setupSecret) {
  try {
    await agent
      .post('/api/create-admin-user')
      .set('x-admin-setup-secret', setupSecret)
      .send({ email, password });
  } catch (_) { /* ignore 4xx if already exists / route locked down */ }
}

async function loginAdmin(agent) {
  const envEmail = process.env.TEST_ADMIN_EMAIL;
  const envPass  = process.env.TEST_ADMIN_PASSWORD;
  const setupSecret = process.env.ADMIN_SETUP_SECRET || 'setup-secret-2024';

  const candidates = [
    [envEmail, envPass],
    ['admin@example.com', 'Password123!'],
    ['admin@test.local', 'Password123!'],
  ].filter(([e,p]) => e && p);

  let lastErr = { status: 0, body: { error: 'no_attempts' } };

  for (const [email, password] of candidates) {
    await maybeProvisionAdmin(agent, email, password, setupSecret);
    const res = await tryLogin(agent, email, password);
    if (res.ok) return res.r;
    lastErr = { status: res.status, body: res.body };
    // If Joi says invalid email, skip to next candidate
    if (res.body?.details?.includes('must be a valid email')) continue;
  }

  throw new Error(`Admin login failed (${lastErr.status}): ${JSON.stringify(lastErr.body)}`);
}

module.exports = { loginAdmin };
