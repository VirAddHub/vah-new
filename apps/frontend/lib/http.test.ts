/**
 * Unit tests for unified HTTP client
 * Run with: npm test -- lib/http.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import api from "./http";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("api client", () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("normalises ok responses with { ok: true, data }", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true, data: { ping: "pong" } }), {
                status: 200,
                headers: { "content-type": "application/json" },
            })
        );

        const res = await api.get("/healthz");

        expect(res.ok).toBe(true);
        if (res.ok) {
            expect(res.data.ping).toBe("pong");
        }
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/bff/healthz"),
            expect.objectContaining({
                credentials: "include",
                method: "GET",
            })
        );
    });

    it("normalises ok responses without wrapper", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ result: "success" }), {
                status: 200,
                headers: { "content-type": "application/json" },
            })
        );

        const res = await api.get("/test");

        expect(res.ok).toBe(true);
        if (res.ok) {
            expect(res.data.result).toBe("success");
        }
    });

    it("normalises error responses", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ error: "bad_request", message: "Invalid input" }), {
                status: 400,
                headers: { "content-type": "application/json" },
            })
        );

        const res = await api.get("/oops");

        expect(res.ok).toBe(false);
        if (!res.ok) {
            expect(res.status).toBe(400);
            expect(res.message).toBe("Invalid input");
            expect(res.code).toBe("bad_request");
        }
    });

    it("handles non-JSON error responses", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response("Not Found", {
                status: 404,
                headers: { "content-type": "text/plain" },
            })
        );

        const res = await api.get("/notfound");

        expect(res.ok).toBe(false);
        if (!res.ok) {
            expect(res.status).toBe(404);
            expect(res.message).toBe("Request failed");
        }
    });

    it("includes credentials in all requests", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true, data: {} }), {
                status: 200,
                headers: { "content-type": "application/json" },
            })
        );

        await api.post("/test", { data: "test" });

        expect(mockFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                credentials: "include",
            })
        );
    });

    it("stringifies JSON body for POST", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true, data: {} }), {
                status: 200,
                headers: { "content-type": "application/json" },
            })
        );

        await api.post("/test", { name: "test", value: 123 });

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[1].body).toBe(JSON.stringify({ name: "test", value: 123 }));
    });
});

