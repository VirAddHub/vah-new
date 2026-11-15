// Rate limits, at the shipping values. Run LAST: it deliberately exhausts the failed-login allowance
// for this address for 15 minutes (restart the API to clear it locally).
import { Session, step, expect, report, API, ORIGIN } from './lib.mjs';
const post = (path, body, headers = {}) => fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers }, body: JSON.stringify(body) }).then(r => r.status);

await step('L1', 'The session check is never rate limited (200 calls)', async () => {
  const s = new Session(); let limited = 0;
  for (let i = 0; i < 200; i++) if ((await s.get('/api/auth/whoami')).status === 429) limited++;
  expect(limited === 0, `${limited} of 200 session checks were limited`);
});
await step('L2', 'Successful logins are not counted (40 in a row)', async () => {
  for (let i = 0; i < 40; i++) { const st = await post('/api/auth/login', { email: 'admin@example.test', password: 'Local!Admin#2026' }); expect(st === 200, `login ${i + 1} returned ${st}`); }
});
await step('L3', 'Password guessing is stopped after 30 failures', async () => {
  const seen = []; for (let i = 0; i < 40; i++) seen.push(await post('/api/auth/login', { email: 'admin@example.test', password: 'wrong-password' }));
  const firstBlock = seen.indexOf(429); expect(firstBlock > 0 && firstBlock <= 30, `first 429 at attempt ${firstBlock + 1}`); expect(seen.slice(firstBlock).every(x => x === 429), 'limit did not hold');
  return `blocked from attempt ${firstBlock + 1}`;
});
await step('L4', 'A forged visitor-address header does not escape the limit', async () => {
  const st = await post('/api/auth/login', { email: 'admin@example.test', password: 'wrong-password' }, { 'x-vah-client-ip': '203.0.113.9', 'x-vah-client-sig': 'deadbeef' });
  expect(st === 429, `forged header got ${st}`);
});
process.exit(report() ? 0 : 1);
