const BASE = process.env.API_BASE || 'http://localhost:4000/api';

// Try common signup endpoints until one works
const ENDPOINTS = ['/auth/signup', '/auth/register', '/signup', '/users'];

const users = [
  { email: 'user@vah.local',  password: 'Passw0rd!', name: 'VAH User',  is_admin: false },
  { email: 'admin@vah.local', password: 'Passw0rd!', name: 'VAH Admin', is_admin: true  },
];

async function tryCreate(u) {
  for (const ep of ENDPOINTS) {
    const url = BASE + ep;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
        body: JSON.stringify(u),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        console.log(`✔ Created/exists @ ${ep}:`, u.email, data?.id ?? '');
        return true;
      }
      const text = await res.text();
      if (res.status === 409 || /exists/i.test(text)) {
        console.log(`• Already exists @ ${ep}:`, u.email);
        return true;
      }
      // Try next endpoint
    } catch (e) {
      // Try next endpoint
    }
  }
  console.error(`✖ Failed to create: ${u.email} (no compatible signup endpoint found)`);
  return false;
}

(async () => {
  for (const u of users) await tryCreate(u);
  console.log('\nDone. Try logging in now.');
})();
