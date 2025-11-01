import { jest } from "@jest/globals";

// Mock postmark module
const mockSendEmailWithTemplate = jest.fn();
const mockSendEmail = jest.fn();
const mockServerClient = jest.fn(() => ({
    sendEmailWithTemplate: mockSendEmailWithTemplate,
    sendEmail: mockSendEmail,
}));

jest.mock("postmark", () => ({
    default: {
        ServerClient: mockServerClient,
    },
}));

// Import after mocking
import * as mailer from "./mailer";

describe("sendTemplateEmail", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.NODE_ENV = "test";
        process.env.POSTMARK_TOKEN = "test-token";
        process.env.DEV_EMAIL_OVERRIDE = "dev@example.com";
        // Reset client singleton
        (mailer as any)._client = null;
    });

    it("prefers alias send", async () => {
        mockSendEmailWithTemplate.mockResolvedValueOnce({});

        const mode = await mailer.sendTemplateEmail({
            to: "real@user.com",
            alias: mailer.Templates.QuizDay0,
            templateIdFallback: 42035123,
            model: {
                name: "Alex",
                score: 72,
                segment_label: "Mid",
                cta_label: "View",
                cta_url: "https://x",
            },
        });

        expect(mode).toBe("template");
        expect(mockSendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                TemplateAlias: "quiz-day0",
                To: "dev@example.com", // DEV_EMAIL_OVERRIDE
            })
        );
        expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("falls back to TemplateId when alias fails", async () => {
        mockSendEmailWithTemplate
            .mockRejectedValueOnce(new Error("alias missing"))
            .mockResolvedValueOnce({});

        const mode = await mailer.sendTemplateEmail({
            to: "real@user.com",
            alias: mailer.Templates.QuizDay0,
            templateIdFallback: 42035123,
            model: {
                name: "Dana",
                score: 90,
                segment_label: "High",
                cta_label: "Go",
                cta_url: "https://x",
            },
        });

        expect(mode).toBe("templateId");
        expect(mockSendEmailWithTemplate).toHaveBeenCalledTimes(2);
        expect(mockSendEmailWithTemplate).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ TemplateAlias: "quiz-day0" })
        );
        expect(mockSendEmailWithTemplate).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ TemplateId: 42035123 })
        );
    });

    it("falls back to plain email when both template methods fail", async () => {
        mockSendEmailWithTemplate
            .mockRejectedValueOnce(new Error("alias missing"))
            .mockRejectedValueOnce(new Error("template id missing"));
        mockSendEmail.mockResolvedValueOnce({});

        const mode = await mailer.sendTemplateEmail({
            to: "real@user.com",
            alias: mailer.Templates.QuizDay0,
            templateIdFallback: 42035123,
            model: {
                name: "Jordan",
                score: 45,
                segment_label: "Low",
                cta_label: "Learn More",
                cta_url: "https://x",
            },
        });

        expect(mode).toBe("fallback");
        expect(mockSendEmailWithTemplate).toHaveBeenCalledTimes(2);
        expect(mockSendEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                Subject: expect.stringContaining("Compliance Score"),
                TextBody: expect.stringContaining("Hi Jordan"),
            })
        );
    });

    it("uses real recipient email in production", async () => {
        process.env.NODE_ENV = "production";
        delete process.env.DEV_EMAIL_OVERRIDE;
        mockSendEmailWithTemplate.mockResolvedValueOnce({});

        await mailer.sendTemplateEmail({
            to: "real@user.com",
            alias: mailer.Templates.QuizDay0,
            templateIdFallback: 42035123,
            model: { name: "Test", score: 80 },
        });

        expect(mockSendEmailWithTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                To: "real@user.com",
            })
        );
    });
});

