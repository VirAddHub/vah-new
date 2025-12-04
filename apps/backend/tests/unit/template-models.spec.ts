// apps/backend/tests/unit/template-models.spec.ts
import { modelBuilders } from '../../src/lib/template-models';
import { Templates } from '../../src/lib/postmark-templates';

describe('Template Model Builders - Name Resolution', () => {
  describe('resolveFirstName fallback logic', () => {
    // Test all templates to ensure they use resolveFirstName correctly
    const templatesToTest = [
      Templates.PasswordReset,
      Templates.PasswordChanged,
      Templates.Welcome,
      Templates.PlanCancelled,
      Templates.InvoiceSent,
      Templates.PaymentFailed,
      Templates.KycSubmitted,
      Templates.KycApproved,
      Templates.KycRejected,
      Templates.SupportRequestReceived,
      Templates.SupportRequestClosed,
      Templates.MailScanned,
      Templates.MailForwarded,
      Templates.MailAfterCancellation,
      Templates.ChVerificationNudge,
      Templates.ChVerificationReminder,
      Templates.QuizDay0,
    ];

    templatesToTest.forEach((templateAlias) => {
      describe(`${templateAlias}`, () => {
        const builder = modelBuilders[templateAlias];

        test('sends both first_name and name when firstName is provided', () => {
          const result = builder({ firstName: 'Liban' });
          
          expect(result).toHaveProperty('first_name', 'Liban');
          expect(result).toHaveProperty('name', 'Liban');
          expect(result.first_name).toBe(result.name); // Same value
        });

        test('sends both first_name and name when name is provided (fallback)', () => {
          const result = builder({ name: 'John' });
          
          expect(result).toHaveProperty('first_name', 'John');
          expect(result).toHaveProperty('name', 'John');
          expect(result.first_name).toBe(result.name); // Same value
        });

        test('prioritizes firstName over name when both provided', () => {
          const result = builder({ firstName: 'Liban', name: 'John' });
          
          expect(result).toHaveProperty('first_name', 'Liban');
          expect(result).toHaveProperty('name', 'Liban');
        });

        test('falls back to "there" when both are missing', () => {
          const result = builder({});
          
          expect(result).toHaveProperty('first_name', 'there');
          expect(result).toHaveProperty('name', 'there');
        });

        test('falls back to "there" when firstName is null', () => {
          const result = builder({ firstName: null });
          
          expect(result).toHaveProperty('first_name', 'there');
          expect(result).toHaveProperty('name', 'there');
        });

        test('falls back to "there" when name is null', () => {
          const result = builder({ name: null });
          
          expect(result).toHaveProperty('first_name', 'there');
          expect(result).toHaveProperty('name', 'there');
        });

        test('trims whitespace from firstName', () => {
          const result = builder({ firstName: '  Liban  ' });
          
          expect(result).toHaveProperty('first_name', 'Liban');
          expect(result).toHaveProperty('name', 'Liban');
        });

        test('trims whitespace from name', () => {
          const result = builder({ name: '  John  ' });
          
          expect(result).toHaveProperty('first_name', 'John');
          expect(result).toHaveProperty('name', 'John');
        });

        test('falls back to "there" when firstName is empty string', () => {
          const result = builder({ firstName: '' });
          
          expect(result).toHaveProperty('first_name', 'there');
          expect(result).toHaveProperty('name', 'there');
        });

        test('falls back to "there" when name is empty string', () => {
          const result = builder({ name: '' });
          
          expect(result).toHaveProperty('first_name', 'there');
          expect(result).toHaveProperty('name', 'there');
        });

        test('falls back to "there" when firstName is only whitespace', () => {
          const result = builder({ firstName: '   ' });
          
          expect(result).toHaveProperty('first_name', 'there');
          expect(result).toHaveProperty('name', 'there');
        });

        test('falls back to "there" when name is only whitespace', () => {
          const result = builder({ name: '   ' });
          
          expect(result).toHaveProperty('first_name', 'there');
          expect(result).toHaveProperty('name', 'there');
        });
      });
    });
  });

  describe('Template-specific fields', () => {
    test('PasswordReset includes reset_link and expiry_minutes', () => {
      const result = modelBuilders[Templates.PasswordReset]({
        firstName: 'Liban',
        resetLink: 'https://example.com/reset',
        expiryMinutes: 30,
      });

      expect(result).toHaveProperty('first_name', 'Liban');
      expect(result).toHaveProperty('name', 'Liban');
      expect(result).toHaveProperty('reset_link', 'https://example.com/reset');
      expect(result).toHaveProperty('expiry_minutes', '30');
    });

    test('MailScanned includes subject and dashboard_link', () => {
      const result = modelBuilders[Templates.MailScanned]({
        firstName: 'Liban',
        subjectLine: 'New mail received',
        ctaUrl: 'https://example.com/mail',
      });

      expect(result).toHaveProperty('first_name', 'Liban');
      expect(result).toHaveProperty('name', 'Liban');
      expect(result).toHaveProperty('subject', 'New mail received');
      expect(result).toHaveProperty('dashboard_link', 'https://example.com/mail');
    });

    test('MailForwarded includes forwarding_address and forwarded_date', () => {
      const result = modelBuilders[Templates.MailForwarded]({
        firstName: 'Liban',
        forwarding_address: '123 Test St',
        forwarded_date: '2025-01-01',
      });

      expect(result).toHaveProperty('first_name', 'Liban');
      expect(result).toHaveProperty('name', 'Liban');
      expect(result).toHaveProperty('forwarding_address', '123 Test St');
      expect(result).toHaveProperty('forwarded_date', '2025-01-01');
    });

    test('KycApproved includes virtual address fields', () => {
      const result = modelBuilders[Templates.KycApproved]({
        firstName: 'Liban',
        virtualAddressLine1: '123 Business St',
        virtualAddressLine2: 'Suite 100',
        postcode: 'SW1A 1AA',
        dashboardUrl: 'https://example.com/dashboard',
      });

      expect(result).toHaveProperty('first_name', 'Liban');
      expect(result).toHaveProperty('name', 'Liban');
      expect(result).toHaveProperty('virtual_address_line_1', '123 Business St');
      expect(result).toHaveProperty('virtual_address_line_2', 'Suite 100');
      expect(result).toHaveProperty('postcode', 'SW1A 1AA');
      expect(result).toHaveProperty('dashboard_link', 'https://example.com/dashboard');
    });
  });
});

