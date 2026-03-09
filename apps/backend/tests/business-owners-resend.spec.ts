/**
 * Business owners resend invite endpoint tests.
 * See docs/IDENTITY_VERIFICATION_ENGINEERING_SPEC.md
 */
import express from "express";
import request from "supertest";

const queryMock = jest.fn();
jest.mock("../src/server/db", () => ({
  getPool: () => ({ query: queryMock }),
}));

const resendBusinessOwnerInviteMock = jest.fn();
jest.mock("../src/server/services/businessOwners", () => ({
  ...jest.requireActual("../src/server/services/businessOwners"),
  resendBusinessOwnerInvite: (ownerId: number) => resendBusinessOwnerInviteMock(ownerId),
}));

import businessOwnersRouter from "../src/server/routes/businessOwners";

describe("POST /api/business-owners/:id/resend", () => {
  beforeEach(() => {
    queryMock.mockReset();
    resendBusinessOwnerInviteMock.mockReset();
  });

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as express.Request & { user: { id: number } }).user = { id: 100 };
    next();
  });
  app.use("/api/business-owners", businessOwnersRouter);

  it("returns 404 when owner not found", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post("/api/business-owners/999/resend");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("not_found");
  });

  it("returns 200 with alreadyVerified when owner status is verified", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { id: 1, status: "verified", requires_verification: true },
      ],
    });
    const res = await request(app).post("/api/business-owners/1/resend");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.alreadyVerified).toBe(true);
    expect(res.body.data.message).toContain("already completed verification");
    expect(resendBusinessOwnerInviteMock).not.toHaveBeenCalled();
  });

  it("returns 200 and calls resend when owner pending", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { id: 1, status: "pending", requires_verification: true },
      ],
    });
    resendBusinessOwnerInviteMock.mockResolvedValueOnce("new-token");
    const res = await request(app).post("/api/business-owners/1/resend");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.message).toBe("Verification email sent");
    expect(resendBusinessOwnerInviteMock).toHaveBeenCalledWith(1);
  });

  it("returns 404 when owner belongs to different user", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post("/api/business-owners/1/resend");
    expect(res.status).toBe(404);
    expect(resendBusinessOwnerInviteMock).not.toHaveBeenCalled();
  });
});
