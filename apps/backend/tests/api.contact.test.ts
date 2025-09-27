import request from "supertest";
import http from "http";
import next from "next";

let server: http.Server;

beforeAll(async () => {
    const app = next({ dev: true, dir: process.cwd() });
    const handle = app.getRequestHandler();
    await app.prepare();
    server = http.createServer((req, res) => handle(req, res));
    await new Promise<void>(r => server.listen(0, r));
});

afterAll(async () => {
    await new Promise<void>(r => server.close(() => r()));
});

function baseUrl() {
    const addr = server.address();
    if (addr && typeof addr === "object") return `http://127.0.0.1:${addr.port}`;
    throw new Error("No server address");
}

describe("POST /api/contact", () => {
    it("rejects missing fields", async () => {
        const res = await request(baseUrl())
            .post("/api/contact")
            .send({ email: "bad", website: "" });
        expect([400, 422]).toContain(res.status);
    });

    it("accepts a valid submission", async () => {
        const res = await request(baseUrl())
            .post("/api/contact")
            .send({
                name: "Test",
                email: "test@example.com",
                subject: "Hello",
                message: "From Jest",
                website: "" // honeypot empty
            });
        expect([200, 202]).toContain(res.status);
    });

    it("rejects spam (honeypot filled)", async () => {
        const res = await request(baseUrl())
            .post("/api/contact")
            .send({
                name: "Spam Bot",
                email: "spam@example.com",
                subject: "Spam",
                message: "Spam message",
                website: "http://spam.com" // honeypot filled
            });
        expect(res.status).toBe(400);
        expect(res.body.error).toContain("Spam detected");
    });

    it("validates email format", async () => {
        const res = await request(baseUrl())
            .post("/api/contact")
            .send({
                name: "Test",
                email: "invalid-email",
                subject: "Test",
                message: "Test message",
                website: ""
            });
        expect(res.status).toBe(400);
        expect(res.body.error).toContain("email");
    });

    it("requires all mandatory fields", async () => {
        const res = await request(baseUrl())
            .post("/api/contact")
            .send({
                name: "Test",
                email: "test@example.com",
                // missing subject and message
                website: ""
            });
        expect(res.status).toBe(400);
    });
});
