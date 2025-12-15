import express from "express";
import request from "supertest";

// Mock DB pool used by the profile router (shared query mock)
const queryMock = jest.fn();
jest.mock("../src/server/db", () => {
  return {
    getPool: () => ({
      query: queryMock,
    }),
  };
});

import profileRouter from "../src/server/routes/profile";
import { getPool } from "../src/server/db";

describe("GET /api/profile/registered-office-address", () => {
  it("returns 403 KYC_REQUIRED when KYC not approved", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          kyc_status: "pending",
          ch_verification_status: null,
          companies_house_verified: false,
        },
      ],
    });

    const app = express();
    app.use(express.json());
    // inject auth user
    app.use((req, _res, next) => {
      (req as any).user = { id: 123, is_admin: false };
      next();
    });
    app.use("/api/profile", profileRouter);

    const res = await request(app).get("/api/profile/registered-office-address");
    expect(res.status).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        ok: false,
        error: "KYC_REQUIRED",
      })
    );
  });

  it("returns 200 with address + inline when KYC approved", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          kyc_status: "verified",
          ch_verification_status: null,
          companies_house_verified: false,
        },
      ],
    });

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).user = { id: 123, is_admin: false };
      next();
    });
    app.use("/api/profile", profileRouter);

    const res = await request(app).get("/api/profile/registered-office-address");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          line1: expect.any(String),
          line2: expect.any(String),
          city: expect.any(String),
          postcode: expect.any(String),
          country: expect.any(String),
          inline: expect.any(String),
        }),
      })
    );
  });
});

