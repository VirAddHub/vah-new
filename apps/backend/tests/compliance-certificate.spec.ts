/**
 * Identity verification compliance and certificate gating tests.
 * See docs/IDENTITY_VERIFICATION_ENGINEERING_SPEC.md
 */
import express from "express";
import request from "supertest";

const queryMock = jest.fn();
jest.mock("../src/server/db", () => ({
  getPool: () => ({ query: queryMock }),
}));

import profileRouter from "../src/server/routes/profile";
import {
  computeIdentityCompliance,
  computeIdentityComplianceByUserId,
  type UserRow,
} from "../src/server/services/compliance";

describe("computeIdentityCompliance", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns action_required when primary user not approved", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ count: "0" }] });
    const user: UserRow = { id: 1, kyc_status: "pending", companies_house_number: "12345678" };
    const result = await computeIdentityCompliance(user);
    expect(result.verificationState).toBe("action_required");
    expect(result.isPrimaryUserVerified).toBe(false);
    expect(result.canDownloadProofOfAddressCertificate).toBe(false);
  });

  it("returns pending_others when primary approved but owner pending", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ count: "1" }] });
    const user: UserRow = { id: 1, kyc_status: "approved", companies_house_number: "12345678" };
    const result = await computeIdentityCompliance(user);
    expect(result.verificationState).toBe("pending_others");
    expect(result.isPrimaryUserVerified).toBe(true);
    expect(result.allRequiredOwnersVerified).toBe(false);
    expect(result.canDownloadProofOfAddressCertificate).toBe(false);
  });

  it("returns verified when primary approved and all required owners verified", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ count: "0" }] });
    const user: UserRow = { id: 1, kyc_status: "approved", companies_house_number: "12345678" };
    const result = await computeIdentityCompliance(user);
    expect(result.verificationState).toBe("verified");
    expect(result.isFullyCompliant).toBe(true);
    expect(result.canDownloadProofOfAddressCertificate).toBe(true);
  });

  it("certificate blocked when company number missing even if verified", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ count: "0" }] });
    const user: UserRow = { id: 1, kyc_status: "approved", companies_house_number: "" };
    const result = await computeIdentityCompliance(user);
    expect(result.verificationState).toBe("verified");
    expect(result.hasCompanyNumber).toBe(false);
    expect(result.canDownloadProofOfAddressCertificate).toBe(false);
  });
});

describe("computeIdentityComplianceByUserId", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns null when user not found", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const result = await computeIdentityComplianceByUserId(999);
    expect(result).toBeNull();
  });

  it("returns compliance when user found", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            kyc_status: "approved",
            companies_house_number: "SC123456",
            company_number: null,
            ch_verification_status: null,
            companies_house_verified: false,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: "0" }] });
    const result = await computeIdentityComplianceByUserId(1);
    expect(result).not.toBeNull();
    expect(result!.verificationState).toBe("verified");
    expect(result!.hasCompanyNumber).toBe(true);
  });
});

describe("GET /api/profile/compliance", () => {
  beforeEach(() => queryMock.mockReset());

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as express.Request & { user: { id: number } }).user = { id: 1 };
    next();
  });
  app.use("/api/profile", profileRouter);

  it("returns 200 with compliance flags", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            kyc_status: "approved",
            companies_house_number: "12345678",
            company_number: null,
            ch_verification_status: null,
            companies_house_verified: false,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: "0" }] });
    const res = await request(app).get("/api/profile/compliance");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toMatchObject({
      verificationState: "verified",
      isPrimaryUserVerified: true,
      canDownloadProofOfAddressCertificate: true,
    });
  });
});

describe("GET /api/profile/certificate-url", () => {
  beforeEach(() => queryMock.mockReset());

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as express.Request & { user: { id: number } }).user = { id: 1 };
    next();
  });
  app.use("/api/profile", profileRouter);

  it("returns 403 primary_user_not_verified when KYC not approved", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ plan_status: "active" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            kyc_status: "pending",
            companies_house_number: "12345678",
            company_number: null,
            ch_verification_status: null,
            companies_house_verified: false,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: "0" }] });
    const res = await request(app).get("/api/profile/certificate-url");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("primary_user_not_verified");
  });

  it("returns 403 owners_pending when required owner not verified", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ plan_status: "active" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            kyc_status: "approved",
            companies_house_number: "12345678",
            company_number: null,
            ch_verification_status: null,
            companies_house_verified: false,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: "1" }] });
    const res = await request(app).get("/api/profile/certificate-url");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("owners_pending");
  });

  it("returns 403 company_number_missing when no company number", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ plan_status: "active" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            kyc_status: "approved",
            companies_house_number: null,
            company_number: null,
            ch_verification_status: null,
            companies_house_verified: false,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: "0" }] });
    const res = await request(app).get("/api/profile/certificate-url");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("company_number_missing");
  });

  it("returns 200 with url when all requirements met", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ plan_status: "active" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            kyc_status: "approved",
            companies_house_number: "SC123456",
            company_number: null,
            ch_verification_status: null,
            companies_house_verified: false,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: "0" }] });
    const res = await request(app).get("/api/profile/certificate-url");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual({ url: "/api/profile/certificate" });
  });
});
