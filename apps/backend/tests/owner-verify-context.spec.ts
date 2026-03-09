/**
 * Owner verification context (GET /api/business-owners/verify) response shape.
 * Ensures token_used, expired, alreadyVerified are explicit for frontend.
 */
import express from "express";
import request from "supertest";

const getOwnerVerificationContextMock = jest.fn();
jest.mock("../src/server/services/businessOwners", () => ({
  getOwnerVerificationContext: (token: string) => getOwnerVerificationContextMock(token),
}));

import businessOwnersRouter from "../src/server/routes/businessOwners";

describe("GET /api/business-owners/verify", () => {
  beforeEach(() => getOwnerVerificationContextMock.mockReset());

  const app = express();
  app.use(express.json());
  app.use("/api/business-owners", businessOwnersRouter);

  it("returns valid: false and tokenExpired when context has tokenExpired", async () => {
    getOwnerVerificationContextMock.mockResolvedValueOnce({
      valid: true,
      canStart: false,
      ownerId: 1,
      fullName: "Jane Doe",
      email: "jane@example.com",
      status: "pending",
      tokenUsed: false,
      tokenExpired: true,
    });

    const res = await request(app).get("/api/business-owners/verify").query({ token: "abc" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.valid).toBe(false);
    expect(res.body.data.tokenExpired).toBe(true);
    expect(res.body.data.message).toContain("expired");
  });

  it("returns valid: true, canStart: false, tokenUsed: true when link already used", async () => {
    getOwnerVerificationContextMock.mockResolvedValueOnce({
      valid: true,
      canStart: false,
      ownerId: 1,
      fullName: "Jane Doe",
      email: "jane@example.com",
      status: "pending",
      tokenUsed: true,
      tokenExpired: false,
    });

    const res = await request(app).get("/api/business-owners/verify").query({ token: "used" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.canStart).toBe(false);
    expect(res.body.data.tokenUsed).toBe(true);
    expect(res.body.data.owner).toEqual(
      expect.objectContaining({ id: 1, fullName: "Jane Doe", email: "jane@example.com", status: "pending" })
    );
  });

  it("returns alreadyVerified: true when owner status is verified", async () => {
    getOwnerVerificationContextMock.mockResolvedValueOnce({
      valid: true,
      canStart: false,
      ownerId: 1,
      fullName: "Jane Doe",
      email: "jane@example.com",
      status: "verified",
      tokenUsed: true,
      tokenExpired: false,
    });

    const res = await request(app).get("/api/business-owners/verify").query({ token: "done" });

    expect(res.status).toBe(200);
    expect(res.body.data.alreadyVerified).toBe(true);
    expect(res.body.data.owner.status).toBe("verified");
  });

  it("returns valid: false when context is null (invalid token)", async () => {
    getOwnerVerificationContextMock.mockResolvedValueOnce(null);

    const res = await request(app).get("/api/business-owners/verify").query({ token: "bad" });

    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(false);
    expect(res.body.data.tokenExpired).toBeUndefined();
  });
});
