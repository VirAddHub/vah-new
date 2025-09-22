const express = require('express');
const request = require('supertest');

// Mock withPgClient to simulate DB
jest.mock('../server/db', () => {
  const state = {
    slots: [
      { id: 1, location_id: 1, mailbox_no: 'Suite 001', status: 'available' },
      { id: 2, location_id: 1, mailbox_no: 'Suite 002', status: 'available' },
    ],
    location: { id: 1, name: 'London HQ', line1: '123 Example Street', line2: null, city: 'London', postcode: 'EC1A 1AA', country: 'United Kingdom' },
    assigned: {}, // userId -> slotId
  };

  // Simple SQL router based on strings we use in route
  function dbRouter(sql, params) {
    sql = sql.replace(/\s+/g, ' ').trim().toLowerCase();

    if (sql.includes('from public.address_slot s join public.location l') && sql.includes('where s.assigned_to = $1')) {
      const userId = params[0];
      const slotId = state.assigned[userId];
      if (!slotId) return undefined;
      const s = state.slots.find(x => x.id === slotId);
      return { ...s, ...state.location };
    }

    if (sql.startsWith('with c as ( select id from public.address_slot')) {
      const [locationId, userId] = params;
      const free = state.slots.find(x => x.status === 'available' && x.location_id === locationId);
      if (!free) return null;
      free.status = 'assigned';
      free.assigned_to = userId;
      state.assigned[userId] = free.id;
      return { ...free };
    }

    if (sql.includes('from public.address_slot s join public.location l') && sql.includes('where s.id = $1')) {
      const slotId = params[0];
      const s = state.slots.find(x => x.id === slotId);
      if (!s) return undefined;
      return { ...s, ...state.location };
    }

    return undefined;
  }

  const db = {
    one: async (sql, params) => dbRouter(sql, params),
    all: async (sql, params) => [],
    run: async (sql, params) => ({})
  };

  return {
    withPgClient: async (fn) => fn(db),
  };
});

const addressRoutes = require('../routes/address');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { /* pretend auth middleware */ next(); });
  app.use(addressRoutes);
  return app;
}

describe('Address routes', () => {
  test('GET /api/me/address returns 401 when unauthenticated', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/me/address');
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/me/address/assign assigns address and returns it', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/me/address/assign')
      .set('x-user-id', '42')
      .send({ locationId: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.address?.components?.suite).toBe('Suite 001');
  });

  test('GET /api/me/address returns existing address afterwards', async () => {
    const app = makeApp();
    // first assign
    await request(app).post('/api/me/address/assign').set('x-user-id', '7').send({ locationId: 1 });
    // now read
    const res = await request(app).get('/api/me/address').set('x-user-id', '7');
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.address?.components?.suite).toBeTruthy();
  });

  test('POST /api/me/address/assign returns 409 when pool empty', async () => {
    const app = makeApp();
    // consume two available slots
    await request(app).post('/api/me/address/assign').set('x-user-id', '100').send({ locationId: 1 });
    await request(app).post('/api/me/address/assign').set('x-user-id', '101').send({ locationId: 1 });
    // third should fail
    const res = await request(app).post('/api/me/address/assign').set('x-user-id', '102').send({ locationId: 1 });
    expect(res.statusCode).toBe(409);
  });
});
