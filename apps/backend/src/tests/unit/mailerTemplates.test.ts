import { vi } from 'vitest';
// Ported from apps/backend/tests (legacy Jest suite, which could no longer run); see audit/LEGACY-TESTS.md.
// apps/backend/tests/unit/mailer.templates.spec.ts
// The real package exports ServerClient by name only (no default export); mock the same shape.
vi.mock('postmark', () => ({
    ServerClient: vi.fn().mockImplementation(() => ({
        sendEmailWithTemplate: vi.fn().mockResolvedValue({ MessageID: 'mock-template' }),
        sendEmail: vi.fn().mockResolvedValue({ MessageID: 'mock-fallback' }),
    })),
}));

const ORIGINAL_ENV = { ...process.env };

describe('template sends (guarded)', () => {
    beforeEach(() => {
        vi.resetModules();
        process.env = {
            ...ORIGINAL_ENV,
            POSTMARK_TOKEN: 'test-token',
            EMAIL_FROM: 'noreply@example.com',
            APP_BASE_URL: 'https://app.example.com',
            EMAIL_BILLING: '1',
            EMAIL_KYC: '1',
            EMAIL_MAIL: '1',
            EMAIL_ONBOARDING: '1',
            EMAIL_SUPPORT: '1',
            EMAIL_SECURITY: '1',
        };
    });

    afterAll(() => {
        process.env = ORIGINAL_ENV;
    });


    test('guard prevents send when flag is disabled', async () => {
        process.env.EMAIL_KYC = '0';
        const { sendKycSubmitted } = await import('../../lib/mailer');
        const res = await sendKycSubmitted({ email: 'u@example.com' });
        expect(res).toBeUndefined();
    });

    test('guard prevents send when flag is false', async () => {
        process.env.EMAIL_BILLING = 'false';
        const { sendPlanCancelled } = await import('../../lib/mailer');
        const res = await sendPlanCancelled({ email: 'u@example.com' });
        expect(res).toBeUndefined();
    });

    test('fallback email sent when template fails', async () => {
        // Reset modules to get fresh mocks
        vi.resetModules();

        // Create a new mock with specific behavior
        const mockSendEmailWithTemplate = vi.fn().mockRejectedValueOnce(new Error('Template not found'));
        const mockSendEmail = vi.fn().mockResolvedValue({ MessageID: 'fallback' });

        vi.doMock('postmark', () => ({
            ServerClient: vi.fn().mockImplementation(() => ({
                sendEmailWithTemplate: mockSendEmailWithTemplate,
                sendEmail: mockSendEmail,
            })),
        }));

        const { sendPlanCancelled } = await import('../../lib/mailer');

        await sendPlanCancelled({ email: 'u@example.com', firstName: 'User' });

        expect(mockSendEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                From: 'VirtualAddressHub <hello@virtualaddresshub.co.uk>',
                To: 'u@example.com',
                Subject: 'Notification',
                MessageStream: 'outbound',
                ReplyTo: 'support@virtualaddresshub.co.uk',
                HtmlBody: expect.stringContaining('Hi'),
            })
        );
    });

    test('no-op when no token provided', async () => {
        process.env.POSTMARK_TOKEN = '';
        const { sendPlanCancelled } = await import('../../lib/mailer');
        const res = await sendPlanCancelled({ email: 'u@example.com' });
        expect(res).toBeUndefined();
    });

    // Auth / Security tests
    test('password reset uses correct alias and cta_url', async () => {
        const postmark = (await import('postmark')) as any;
        const { sendPasswordResetEmail } = await import('../../lib/mailer');
        await sendPasswordResetEmail({
            email: 'u@example.com',
            firstName: 'User',
            cta_url: 'https://app.example.com/reset?token=abc123'
        });

        const client = (postmark.ServerClient as vi.Mock).mock.results[0].value;
        expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                TemplateAlias: 'password-reset-email',
                To: 'u@example.com',
                TemplateModel: expect.objectContaining({
                    reset_link: 'https://app.example.com/reset?token=abc123',
                    first_name: 'User',
                    name: 'User', // backward compatibility
                    expiry_minutes: '30',
                }),
            }),
        );
    });

    test('password reset falls back to "there" when firstName is missing', async () => {
        const postmark = (await import('postmark')) as any;
        const { sendPasswordResetEmail } = await import('../../lib/mailer');
        await sendPasswordResetEmail({
            email: 'u@example.com',
            cta_url: 'https://app.example.com/reset?token=abc123'
        });

        const client = (postmark.ServerClient as vi.Mock).mock.results[0].value;
        expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                TemplateModel: expect.objectContaining({
                    first_name: 'there',
                    name: 'there',
                }),
            }),
        );
    });

    test('password changed confirmation uses correct alias', async () => {
        const postmark = (await import('postmark')) as any;
        const { sendPasswordChangedConfirmation } = await import('../../lib/mailer');
        await sendPasswordChangedConfirmation({ email: 'u@example.com', firstName: 'User' });

        const client = (postmark.ServerClient as vi.Mock).mock.results[0].value;
        expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                TemplateAlias: 'password-changed-confirmation',
                To: 'u@example.com',
                TemplateModel: expect.objectContaining({
                    first_name: 'User',
                    name: 'User', // backward compatibility
                }),
            }),
        );
    });

    // Welcome & onboarding tests
    test('welcome email uses correct alias and cta_url', async () => {
        const postmark = (await import('postmark')) as any;
        const { sendWelcomeEmail } = await import('../../lib/mailer');
        await sendWelcomeEmail({
            email: 'u@example.com',
            firstName: 'User',
            cta_url: 'https://app.example.com/dashboard'
        });

        const client = (postmark.ServerClient as vi.Mock).mock.results[0].value;
        expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                TemplateAlias: 'welcome-email',
                To: 'u@example.com',
                TemplateModel: expect.objectContaining({
                    dashboard_link: 'https://app.example.com/dashboard',
                    first_name: 'User',
                    name: 'User', // backward compatibility
                }),
            }),
        );
    });

    // Billing & invoices tests
    test('plan cancelled uses correct alias and optional fields', async () => {
        const postmark = (await import('postmark')) as any;
        const { sendPlanCancelled } = await import('../../lib/mailer');
        await sendPlanCancelled({
            email: 'u@example.com',
            firstName: 'User',
            end_date: '2024-12-31'
        });

        const client = (postmark.ServerClient as vi.Mock).mock.results[0].value;
        expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                TemplateAlias: 'plan-cancelled',
                To: 'u@example.com',
                TemplateModel: expect.objectContaining({
                    end_date: '2024-12-31',
                    first_name: 'User',
                    name: 'User', // backward compatibility
                }),
            }),
        );
    });

    test('invoice sent includes invoice_number and amount', async () => {
        const postmark = (await import('postmark')) as any;
        const { sendInvoiceSent } = await import('../../lib/mailer');
        await sendInvoiceSent({
            email: 'u@example.com',
            firstName: 'User',
            invoice_number: 'INV-123',
            amount: '£29.99'
        });

        const client = (postmark.ServerClient as vi.Mock).mock.results[0].value;
        expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                TemplateAlias: 'invoice-sent',
                To: 'u@example.com',
                TemplateModel: expect.objectContaining({
                    invoice_number: 'INV-123',
                    amount: '£29.99',
                    first_name: 'User',
                    name: 'User', // backward compatibility
                }),
            }),
        );
    });

    test('payment failed uses correct alias and cta_url', async () => {
        const postmark = (await import('postmark')) as any;
        const { sendPaymentFailed } = await import('../../lib/mailer');
        await sendPaymentFailed({
            email: 'u@example.com',
            firstName: 'User',
            cta_url: 'https://app.example.com/billing#payment'
        });

        const client = (postmark.ServerClient as vi.Mock).mock.results[0].value;
        expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                TemplateAlias: 'payment-failed',
                To: 'u@example.com',
                TemplateModel: expect.objectContaining({
                    cta_url: 'https://app.example.com/billing#payment',
                    first_name: 'User',
                    name: 'User', // backward compatibility
                }),
            }),
        );
    });

    // KYC tests
    test('kyc submitted uses correct alias', async () => {
        const postmark = (await import('postmark')) as any;
        const { sendKycSubmitted } = await import('../../lib/mailer');
        await sendKycSubmitted({ email: 'u@example.com', firstName: 'User' });

        const client = (postmark.ServerClient as vi.Mock).mock.results[0].value;
        expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                TemplateAlias: 'kyc-submitted',
                To: 'u@example.com',
                TemplateModel: expect.objectContaining({
                    first_name: 'User',
                    name: 'User', // backward compatibility
                }),
            }),
        );
    });

    test('kyc approved uses correct alias', async () => {
        const postmark = (await import('postmark')) as any;
        const { sendKycApproved } = await import('../../lib/mailer');
        await sendKycApproved({ email: 'u@example.com', firstName: 'User' });

        const client = (postmark.ServerClient as vi.Mock).mock.results[0].value;
        expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                TemplateAlias: 'kyc-approved',
                To: 'u@example.com',
                TemplateModel: expect.objectContaining({
                    first_name: 'User',
                }),
            }),
        );
    });

    test('kyc rejected includes reason', async () => {
        const postmark = (await import('postmark')) as any;
        const { sendKycRejected } = await import('../../lib/mailer');
        await sendKycRejected({
            email: 'u@example.com',
            firstName: 'User',
            reason: 'Document quality insufficient'
        });

        const client = (postmark.ServerClient as vi.Mock).mock.results[0].value;
        expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                TemplateAlias: 'kyc-rejected',
                To: 'u@example.com',
                TemplateModel: expect.objectContaining({
                    reason: 'Document quality insufficient',
                    first_name: 'User',
                    name: 'User', // backward compatibility
                }),
            }),
        );
    });

    // Support tests
    test('support request received includes ticket_id', async () => {
        const postmark = (await import('postmark')) as any;
        const { sendSupportRequestReceived } = await import('../../lib/mailer');
        await sendSupportRequestReceived({
            email: 'u@example.com',
            firstName: 'User',
            ticket_id: 'TICKET-456'
        });

        const client = (postmark.ServerClient as vi.Mock).mock.results[0].value;
        expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                TemplateAlias: 'support-request-received',
                To: 'u@example.com',
                TemplateModel: expect.objectContaining({
                    ticket_id: 'TICKET-456',
                    first_name: 'User',
                    name: 'User', // backward compatibility
                }),
            }),
        );
    });

    test('support request closed includes ticket_id', async () => {
        const postmark = (await import('postmark')) as any;
        const { sendSupportRequestClosed } = await import('../../lib/mailer');
        await sendSupportRequestClosed({
            email: 'u@example.com',
            firstName: 'User',
            ticket_id: 'TICKET-456'
        });

        const client = (postmark.ServerClient as vi.Mock).mock.results[0].value;
        expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                TemplateAlias: 'support-request-closed',
                To: 'u@example.com',
                TemplateModel: expect.objectContaining({
                    ticket_id: 'TICKET-456',
                    first_name: 'User',
                    name: 'User', // backward compatibility
                }),
            }),
        );
    });

    // Mail events tests
    test('mail scanned includes subject', async () => {
        const postmark = (await import('postmark')) as any;
        const { sendMailScanned } = await import('../../lib/mailer');
        await sendMailScanned({
            email: 'u@example.com',
            firstName: 'User',
            subject: 'Bank statement received'
        });

        const client = (postmark.ServerClient as vi.Mock).mock.results[0].value;
        expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                TemplateAlias: 'mail-scanned',
                To: 'u@example.com',
                TemplateModel: expect.objectContaining({
                    subject: 'Bank statement received',
                    first_name: 'User',
                    name: 'User', // backward compatibility
                }),
            }),
        );
    });

    test('mail scanned falls back to "there" when firstName is missing', async () => {
        const postmark = (await import('postmark')) as any;
        const { sendMailScanned } = await import('../../lib/mailer');
        await sendMailScanned({
            email: 'u@example.com',
            subject: 'Bank statement received'
        });

        const client = (postmark.ServerClient as vi.Mock).mock.results[0].value;
        expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                TemplateModel: expect.objectContaining({
                    first_name: 'there',
                    name: 'there',
                }),
            }),
        );
    });

    test('mail forwarded includes forwarding details', async () => {
        const postmark = (await import('postmark')) as any;
        const { sendMailForwarded } = await import('../../lib/mailer');
        await sendMailForwarded({
            email: 'u@example.com',
            firstName: 'User',
            forwarding_address: '123 Test Street, London, SW1A 1AA, United Kingdom',
            forwarded_date: '09/10/2025'
        });

        const client = (postmark.ServerClient as vi.Mock).mock.results[0].value;
        expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                TemplateAlias: 'mail-forwarded',
                To: 'u@example.com',
                TemplateModel: expect.objectContaining({
                    first_name: 'User',
                    forwarding_address: '123 Test Street, London, SW1A 1AA, United Kingdom',
                    forwarded_date: '09/10/2025',
                }),
            }),
        );
    });

    test('mail received after cancellation includes subject', async () => {
        const postmark = (await import('postmark')) as any;
        const { sendMailReceivedAfterCancellation } = await import('../../lib/mailer');
        await sendMailReceivedAfterCancellation({
            email: 'u@example.com',
            firstName: 'User',
            subject: 'Important document received'
        });

        const client = (postmark.ServerClient as vi.Mock).mock.results[0].value;
        expect(client.sendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                TemplateAlias: 'mail-received-after-cancellation',
                To: 'u@example.com',
                TemplateModel: expect.objectContaining({
                    subject: 'Important document received',
                    first_name: 'User',
                    name: 'User', // backward compatibility
                }),
            }),
        );
    });
});
