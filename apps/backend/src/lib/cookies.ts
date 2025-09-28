import type { Response } from "express";

export function setAuthCookies(res: Response, token: string) {
    // tweak options to your needs
    res.cookie("auth", token, { httpOnly: true, sameSite: "lax", secure: false, path: "/" });
}

export function clearAuthCookies(res: Response) {
    res.clearCookie("auth", { path: "/" });
}

// Legacy exports for compatibility
export const sessionCookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false,
    path: "/"
};

export const isSecureEnv = false;
