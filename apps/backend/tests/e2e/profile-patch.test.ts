import { api, auth } from './client';

const maybe = (process.env.AUTH_TOKEN ? describe : describe.skip);

maybe('PATCH /api/profile - Safety Guarantees', () => {
  it('should reject updates to registered office address fields', async () => {
    const res = await api()
      .patch('/api/profile')
      .set(auth())
      .send({
        address_line1: '123 Test Street'
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      ok: false,
      error: 'registered_office_immutable',
      message: 'Registered office address cannot be changed here.'
    });
  });

  it('should reject updates to payment/mandate fields', async () => {
    const res = await api()
      .patch('/api/profile')
      .set(auth())
      .send({
        gocardless_mandate_id: 'MD123'
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      ok: false,
      error: 'payment_fields_immutable',
      message: 'Payment and mandate fields cannot be changed via profile endpoint.'
    });
  });

  it('should reject email updates', async () => {
    const res = await api()
      .patch('/api/profile')
      .set(auth())
      .send({
        email: 'newemail@example.com'
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      ok: false,
      error: 'email_change_not_allowed',
      message: 'Email changes require verification. Please contact support.'
    });
  });

  it('should allow and update first_name', async () => {
    const res = await api()
      .patch('/api/profile')
      .set(auth())
      .send({
        first_name: 'TestFirstName'
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      ok: true,
      data: expect.objectContaining({
        first_name: 'TestFirstName'
      })
    }));
  });

  it('should allow partial updates (multiple allowed fields)', async () => {
    const res = await api()
      .patch('/api/profile')
      .set(auth())
      .send({
        first_name: 'John',
        last_name: 'Doe',
        phone: '+44 20 1234 5678'
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      ok: true,
      data: expect.objectContaining({
        first_name: 'John',
        last_name: 'Doe',
        phone: '+44 20 1234 5678'
      })
    }));
  });

  it('should reject multiple denied fields', async () => {
    const res = await api()
      .patch('/api/profile')
      .set(auth())
      .send({
        address_line1: '123 Test',
        gocardless_mandate_id: 'MD123',
        email: 'test@example.com'
      });

    expect(res.status).toBe(400);
    // Should prioritize registered office error message
    expect(res.body.error).toBe('registered_office_immutable');
  });
});
