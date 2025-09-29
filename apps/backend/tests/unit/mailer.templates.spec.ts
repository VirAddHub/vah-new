// apps/backend/tests/unit/mailer.templates.spec.ts
jest.mock('postmark', () => ({
  __esModule: true,
  default: {
    ServerClient: jest.fn().mockImplementation(() => ({
      sendEmailWithTemplate: jest.fn().mockResolvedValue({ MessageID: 'mock-template' }),
      sendEmail: jest.fn().mockResolvedValue({ MessageID: 'mock-fallback' }),
    })),
  },
}));

const ORIGINAL_ENV = { ...process.env };

describe('template sends (guarded)', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV,
      POSTMARK_TOKEN: 'test-token',
      EMAIL_FROM: 'noreply@example.com',
      APP_BASE_URL: 'https://app.example.com',
      EMAIL_BILLING: '1',
      EMAIL_KYC: '1',
      EMAIL_MAIL: '1',
    };
  });
  
  afterAll(() => { 
    process.env = ORIGINAL_ENV; 
  });

  test('billing reminder uses alias & action_url', async () => {
    const postmark = (await import('postmark')).default as any;
    const { sendBillingReminder } = await import('../../src/lib/mailer');
    await sendBillingReminder({ email: 'u@example.com', name: 'U' });

    const client = (postmark.ServerClient as jest.Mock).mock.results[0].value;
    expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        TemplateAlias: 'billing-reminder',
        To: 'u@example.com',
        TemplateModel: expect.objectContaining({
          action_url: 'https://app.example.com/billing#payment',
          name: 'U',
        }),
      }),
    );
  });

  test('kyc reminder uses correct alias and model', async () => {
    const postmark = (await import('postmark')).default as any;
    const { sendKycReminder } = await import('../../src/lib/mailer');
    await sendKycReminder({ email: 'u@example.com', name: 'User' });

    const client = (postmark.ServerClient as jest.Mock).mock.results[0].value;
    expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        TemplateAlias: 'kyc-reminder',
        To: 'u@example.com',
        TemplateModel: expect.objectContaining({
          action_url: 'https://app.example.com/profile',
          name: 'User',
        }),
      }),
    );
  });

  test('mail received includes preview in model', async () => {
    const postmark = (await import('postmark')).default as any;
    const { sendMailReceived } = await import('../../src/lib/mailer');
    await sendMailReceived({ 
      email: 'u@example.com', 
      name: 'User', 
      preview: 'New message from John...' 
    });

    const client = (postmark.ServerClient as jest.Mock).mock.results[0].value;
    expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        TemplateAlias: 'mail-received',
        To: 'u@example.com',
        TemplateModel: expect.objectContaining({
          action_url: 'https://app.example.com/mail',
          name: 'User',
          preview: 'New message from John...',
        }),
      }),
    );
  });

  test('guard prevents send when flag is disabled', async () => {
    process.env.EMAIL_KYC = '0';
    const { sendKycReminder } = await import('../../src/lib/mailer');
    const res = await sendKycReminder({ email: 'u@example.com' });
    expect(res).toBeUndefined();
  });

  test('guard prevents send when flag is false', async () => {
    process.env.EMAIL_BILLING = 'false';
    const { sendBillingReminder } = await import('../../src/lib/mailer');
    const res = await sendBillingReminder({ email: 'u@example.com' });
    expect(res).toBeUndefined();
  });

  test('fallback email sent when template fails', async () => {
    // Reset modules to get fresh mocks
    jest.resetModules();
    
    // Create a new mock with specific behavior
    const mockSendEmailWithTemplate = jest.fn().mockRejectedValueOnce(new Error('Template not found'));
    const mockSendEmail = jest.fn().mockResolvedValue({ MessageID: 'fallback' });
    
    jest.doMock('postmark', () => ({
      __esModule: true,
      default: {
        ServerClient: jest.fn().mockImplementation(() => ({
          sendEmailWithTemplate: mockSendEmailWithTemplate,
          sendEmail: mockSendEmail,
        })),
      },
    }));
    
    const { sendBillingReminder } = await import('../../src/lib/mailer');
    
    await sendBillingReminder({ email: 'u@example.com', name: 'User' });
    
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        From: 'noreply@example.com',
        To: 'u@example.com',
        Subject: 'Complete your payment',
        MessageStream: 'outbound',
        HtmlBody: expect.stringContaining('Hi'),
      })
    );
  });

  test('no-op when no token provided', async () => {
    process.env.POSTMARK_TOKEN = '';
    const { sendBillingReminder } = await import('../../src/lib/mailer');
    const res = await sendBillingReminder({ email: 'u@example.com' });
    expect(res).toBeUndefined();
  });
});
