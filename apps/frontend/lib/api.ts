// apps/frontend/lib/api.ts
import { fetchJson } from "./apiClient"; // <- this matches your step 6 filename
import type { Plan } from "@/types/plans";

export const getReady = () =>
    fetchJson<{ status: string }>("/api/ready");

export const getPlans = () =>
    fetchJson<{ ok: boolean; data: Plan[] }>("/api/plans");

export const getMe = () =>
    fetchJson<{ ok: boolean; data: { user: any } }>("/api/me");

export const patchMe = (body: any) =>
    fetchJson<{ ok: boolean; data: { user: any } }>("/api/me/profile", {
        method: "PATCH",
        body,
    });
